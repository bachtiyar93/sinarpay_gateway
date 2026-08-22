import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { QrisSimulatorService } from './qris-simulator.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SearchTransactionsDto } from './dto/search-transactions.dto';
import { CreatePaymentResponse } from './dto/create-payment-response.interface';
import {
  isValidTransition,
  normalizeTransactionStatus,
  TransactionStatus,
} from './transaction-state-machine';

const CURRENCY_WHITELIST = ['IDR', 'USD', 'SGD'];

@Injectable()
export class TransactionService {
  constructor(
    private prisma: PrismaService,
    private qrisSimulator: QrisSimulatorService,
    private idempotency: IdempotencyService,
  ) {}

  async createTransaction(
    merchantId: string,
    dto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    // Validate currency
    if (!CURRENCY_WHITELIST.includes(dto.currency)) {
      throw new BadRequestException(`Currency ${dto.currency} not supported`);
    }

    // Check idempotency cache
    const cached = await this.idempotency.get<CreatePaymentResponse>(
      dto.idempotencyKey,
    );
    if (cached) {
      return cached;
    }

    // Verify merchant exists and is active
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (merchant.status !== 'ACTIVE') {
      throw new ForbiddenException('Merchant is not active');
    }

    // Create transaction
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const transaction = await this.prisma.transaction.create({
      data: {
        merchantId,
        amount: dto.amount,
        currency: dto.currency,
        status: 'PENDING' as any,
        idempotencyKey: dto.idempotencyKey,
        expiredAt,
        qrisPayload: '',
      },
    });

    // Generate QRIS
    const qrisString = this.qrisSimulator.generateQrisString(transaction.id);

    // Update transaction with QRIS payload
    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { qrisPayload: qrisString },
    });

    // Create initial history record
    await this.prisma.transactionHistory.create({
      data: {
        transactionId: transaction.id,
        fromStatus: null,
        toStatus: 'PENDING' as any,
        reason: 'Transaction created',
      },
    });

    const response: CreatePaymentResponse = {
      transactionId: updated.id,
      qrisString,
      amount: updated.amount.toNumber(),
      currency: updated.currency,
      status: 'PENDING',
      expiresAt: expiredAt.toISOString(),
    };

    // Store in idempotency cache
    await this.idempotency.set(dto.idempotencyKey, response);

    return response;
  }

  @Cron('*/30 * * * * *')
  async expirePendingTransactions(): Promise<void> {
    const expiredTransactions = await this.prisma.transaction.findMany({
      where: {
        status: 'PENDING' as any,
        expiredAt: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const transaction of expiredTransactions) {
      await this.transitionStatus(
        transaction.id,
        'EXPIRED',
        'Payment expired due to timeout',
      );
    }
  }

  async transitionStatus(
    transactionId: string,
    toStatus: TransactionStatus | string,
    reason?: string,
  ): Promise<void> {
    const normalizedToStatus = normalizeTransactionStatus(toStatus) as any;
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const currentStatus = normalizeTransactionStatus(transaction.status) as any;

    if (!isValidTransition(currentStatus, normalizedToStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${normalizedToStatus}`,
      );
    }

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: normalizedToStatus },
    });

    await this.prisma.transactionHistory.create({
      data: {
        transactionId,
        fromStatus: currentStatus,
        toStatus: normalizedToStatus,
        reason: reason || undefined,
      },
    });
  }

  async getTransactionById(transactionId: string, merchantId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { history: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Enforce merchant scope
    if (transaction.merchantId !== merchantId) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }

    return transaction;
  }

  async searchTransactions(merchantId: string, dto: SearchTransactionsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      merchantId,
    };

    // Filter by status if provided
    if (dto.status && dto.status !== 'ALL') {
      where.status = normalizeTransactionStatus(dto.status);
    }

    // Search by transaction ID
    if (dto.search) {
      where.id = { contains: dto.search, mode: 'insensitive' };
    }

    // Execute query with pagination
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        amount: item.amount,
        status: item.status,
        date: item.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }
}

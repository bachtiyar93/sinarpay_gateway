import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QrisSimulatorService } from './qris-simulator.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentResponse } from './dto/create-payment-response.interface';
import {
  isValidTransition,
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
        status: 'ISSUED',
        idempotencyKey: dto.idempotencyKey,
        expiredAt,
        qrisPayload: '', // Will be set below
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
        toStatus: 'ISSUED',
        reason: 'Transaction created',
      },
    });

    const response: CreatePaymentResponse = {
      transactionId: updated.id,
      qrisString,
      amount: updated.amount.toNumber(),
      currency: updated.currency,
      status: updated.status,
      expiresAt: expiredAt.toISOString(),
    };

    // Store in idempotency cache
    await this.idempotency.set(dto.idempotencyKey, response);

    return response;
  }

  async transitionStatus(
    transactionId: string,
    toStatus: TransactionStatus,
    reason?: string,
  ): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Validate transition
    if (!isValidTransition(transaction.status, toStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${transaction.status} to ${toStatus}`,
      );
    }

    // Update transaction status with type casting
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: toStatus },
    });

    // Record history with type casting
    await this.prisma.transactionHistory.create({
      data: {
        transactionId,
        fromStatus: transaction.status,
        toStatus,
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
}

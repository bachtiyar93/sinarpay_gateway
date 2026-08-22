import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import {
  Transaction,
  TransactionStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';

// Strict State Machine transition lookup table
const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.ISSUED]: [
    TransactionStatus.PAID,
    TransactionStatus.EXPIRED,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.PAID]: [],
  [TransactionStatus.EXPIRED]: [],
  [TransactionStatus.CANCELLED]: [],
};

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly webhooksService: WebhooksService,
  ) {}

  /**
   * Generates standard simulated QRIS payload string (EMVCo format simulation)
   */
  private generateQrisPayload(
    transactionId: string,
    merchantId: string,
    amount: number,
  ): string {
    const paddedMerchant = merchantId.replace(/-/g, '').slice(0, 15).padEnd(15, '0');
    const paddedTx = transactionId.replace(/-/g, '').slice(0, 15).padEnd(15, '0');
    return `00020101021226540014ID.SINARPAY.WWW0118${paddedMerchant}0215${paddedTx}520458125303360540${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}5802ID5913SINARPAY STORE6007JAKARTA6304`;
  }

  /**
   * Create new QRIS Payment with Idempotency Protection
   */
  async createPayment(
    merchantId: string,
    idempotencyKey: string,
    dto: CreateTransactionDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    // 1. Check Idempotency in Redis
    const cached = await this.redis.getIdempotencyRecord<any>(idempotencyKey);
    if (cached) {
      this.logger.log(`Idempotent hit for key: ${idempotencyKey}`);
      return {
        ...cached,
        isIdempotentReplay: true,
      };
    }

    // 2. Check if IdempotencyKey already in Database
    const existingDbTx = await this.prisma.transaction.findUnique({
      where: { idempotencyKey },
    });

    if (existingDbTx) {
      if (existingDbTx.merchantId !== merchantId) {
        throw new ConflictException('Idempotency key belongs to another merchant');
      }
      return existingDbTx;
    }

    const expiryMinutes = dto.expiryMinutes || 15;
    const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const txId = crypto.randomUUID();
    const qrisPayload = this.generateQrisPayload(txId, merchantId, dto.amount);

    // 3. Persist transaction and history atomically
    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          id: txId,
          merchantId,
          amount: new Prisma.Decimal(dto.amount),
          currency: dto.currency || 'IDR',
          status: TransactionStatus.ISSUED,
          qrisPayload,
          idempotencyKey,
          expiredAt,
        },
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: createdTx.id,
          fromStatus: null,
          toStatus: TransactionStatus.ISSUED,
          reason: dto.description || 'Payment created',
        },
      });

      return createdTx;
    });

    const responseData = {
      id: transaction.id,
      merchantId: transaction.merchantId,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      qrisPayload: transaction.qrisPayload,
      idempotencyKey: transaction.idempotencyKey,
      expiredAt: transaction.expiredAt,
      createdAt: transaction.createdAt,
    };

    // 4. Save to Redis Idempotency store (TTL 24 hours)
    await this.redis.setIdempotencyRecord(idempotencyKey, responseData, 86400);

    return responseData;
  }

  /**
   * Centralized Strict State Machine Transition Method
   */
  async transitionStatus(
    transactionId: string,
    toStatus: TransactionStatus,
    reason?: string,
    externalRef?: string,
  ): Promise<Transaction> {
    const { updatedTx, merchant } = await this.prisma.$transaction(
      async (tx) => {
        const currentTx = await tx.transaction.findUnique({
          where: { id: transactionId },
          include: { merchant: true },
        });

        if (!currentTx) {
          throw new NotFoundException(`Transaction ${transactionId} not found`);
        }

        // Validate state transition validity
        const allowedNextStates = ALLOWED_TRANSITIONS[currentTx.status];
        if (!allowedNextStates.includes(toStatus)) {
          throw new BadRequestException(
            `Illegal status transition: cannot transition from ${currentTx.status} to ${toStatus}`,
          );
        }

        // If target is PAID and already expired
        if (
          toStatus === TransactionStatus.PAID &&
          new Date() > currentTx.expiredAt
        ) {
          throw new BadRequestException(
            `Transaction ${transactionId} has already expired at ${currentTx.expiredAt.toISOString()}`,
          );
        }

        // Update transaction
        const updated = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: toStatus,
            externalRef: externalRef || currentTx.externalRef,
          },
        });

        // Record status history audit trail
        await tx.transactionHistory.create({
          data: {
            transactionId,
            fromStatus: currentTx.status,
            toStatus,
            reason: reason || `Transitioned to ${toStatus}`,
          },
        });

        // If PAID, increment merchant balance
        if (toStatus === TransactionStatus.PAID) {
          await tx.merchant.update({
            where: { id: currentTx.merchantId },
            data: {
              balance: {
                increment: currentTx.amount,
              },
            },
          });
        }

        return { updatedTx: updated, merchant: currentTx.merchant };
      },
    );

    this.logger.log(
      `Transaction ${transactionId} transitioned to ${toStatus} (reason: ${reason})`,
    );

    // Trigger Outbound Webhook to merchant asynchronously
    this.webhooksService
      .dispatchTransactionStatusUpdate(updatedTx, merchant)
      .catch((err) =>
        this.logger.error(
          `Failed to dispatch webhook for transaction ${transactionId}: ${err.message}`,
        ),
      );

    return updatedTx;
  }

  /**
   * Find transactions with flexible filters and merchant isolation
   */
  async findAll(filters: FilterTransactionDto, merchantId?: string) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (merchantId) {
      where.merchantId = merchantId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          merchant: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get transaction details by ID with history
   */
  async findById(transactionId: string, merchantId?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        merchant: {
          select: { id: true, name: true, webhookUrl: true },
        },
        history: {
          orderBy: { createdAt: 'asc' },
        },
        webhookDeliveries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (merchantId && transaction.merchantId !== merchantId) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    return transaction;
  }

  /**
   * Cancel an ISSUED payment
   */
  async cancelPayment(transactionId: string, merchantId?: string, reason = 'Cancelled by user') {
    const tx = await this.findById(transactionId, merchantId);
    return this.transitionStatus(tx.id, TransactionStatus.CANCELLED, reason);
  }
}

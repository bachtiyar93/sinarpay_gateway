import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
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
const PAYMENT_EXPIRY_MS = 60 * 1000;

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
    const expiredAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);

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

  @Cron('*/5 * * * * *')
  async expirePendingTransactions(): Promise<void> {
    const expiredTransactions = await this.prisma.transaction.findMany({
      where: {
        status: 'PENDING' as any,
        OR: [
          { expiredAt: { lte: new Date() } },
          { createdAt: { lte: new Date(Date.now() - PAYMENT_EXPIRY_MS) } },
        ],
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

  async getTransactionDetail(transactionId: string, merchantId: string) {
    await this.expirePendingTransactions();

    const transaction = await this.getTransactionById(transactionId, merchantId);

    return {
      id: transaction.id,
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      status: transaction.status,
      date: transaction.createdAt.toISOString(),
      reference: transaction.externalRef || undefined,
      expiresAt: transaction.expiredAt.toISOString(),
      history: transaction.history
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((item) => ({
          fromStatus: item.fromStatus,
          status: item.toStatus,
          reason: item.reason || undefined,
          at: item.createdAt.toISOString(),
        })),
    };
  }

  async refundTransaction(transactionId: string, merchantId: string) {
    await this.getTransactionById(transactionId, merchantId);
    await this.transitionStatus(
      transactionId,
      'REFUNDED',
      'Refund requested by merchant',
    );

    return this.getTransactionDetail(transactionId, merchantId);
  }

  async getMerchantProfile(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        balance: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return {
      id: merchant.id,
      name: merchant.name,
      email: null,
      status: merchant.status,
      createdAt: merchant.createdAt.toISOString(),
      balance: merchant.balance.toNumber(),
    };
  }

  async getMerchantApiKeys(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        apiKeyHash: true,
        createdAt: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return [
      {
        id: merchant.id,
        key: merchant.apiKeyHash,
        createdAt: merchant.createdAt.toISOString(),
        lastUsedAt: null,
      },
    ];
  }

  async regenerateMerchantApiKey(merchantId: string, keyId: string) {
    if (merchantId !== keyId) {
      throw new NotFoundException('API key not found');
    }

    const newApiKey = `merchant-${randomUUID().replace(/-/g, '')}`;
    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { apiKeyHash: newApiKey },
      select: {
        id: true,
        apiKeyHash: true,
        createdAt: true,
      },
    });

    return {
      id: merchant.id,
      key: merchant.apiKeyHash,
      createdAt: merchant.createdAt.toISOString(),
      lastUsedAt: null,
    };
  }

  async getMerchantAnalytics(merchantId: string) {
    await this.expirePendingTransactions();

    const [merchant, totalTransactions, successfulTransactions, successfulSum] =
      await Promise.all([
        this.prisma.merchant.findUnique({
          where: { id: merchantId },
          select: { balance: true },
        }),
        this.prisma.transaction.count({
          where: { merchantId },
        }),
        this.prisma.transaction.count({
          where: { merchantId, status: 'SUCCESS' as any },
        }),
        this.prisma.transaction.aggregate({
          where: { merchantId, status: 'SUCCESS' as any },
          _sum: { amount: true },
        }),
      ]);

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return {
      tpv: successfulSum._sum.amount?.toNumber() ?? 0,
      successRate:
        totalTransactions === 0
          ? 0
          : Number(((successfulTransactions / totalTransactions) * 100).toFixed(1)),
      balance: merchant.balance.toNumber(),
      totalTransactions,
    };
  }

  async getMerchantTrend(merchantId: string, daysParam?: string) {
    await this.expirePendingTransactions();

    const days = Math.max(1, Math.min(90, Number(daysParam) || 30));
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, { amount: number; count: number }>();
    for (let index = 0; index < days; index += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, { amount: 0, count: 0 });
    }

    for (const transaction of transactions) {
      const key = transaction.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) {
        continue;
      }
      bucket.amount += transaction.amount.toNumber();
      bucket.count += 1;
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      amount: value.amount,
      count: value.count,
    }));
  }

  async getWebhookConfig(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { webhookUrl: true, updatedAt: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return {
      url: merchant.webhookUrl ?? '',
      enabled: Boolean(merchant.webhookUrl),
      lastTestAt: null,
    };
  }

  async updateWebhookUrl(merchantId: string, url: string) {
    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { webhookUrl: url },
      select: { webhookUrl: true },
    });

    return {
      url: merchant.webhookUrl ?? '',
      enabled: Boolean(merchant.webhookUrl),
      lastTestAt: null,
    };
  }

  async testWebhook(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { webhookUrl: true, name: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!merchant.webhookUrl) {
      throw new BadRequestException('Webhook URL is not configured');
    }

    const payload = {
      event: 'webhook.test',
      merchantName: merchant.name,
      sentAt: new Date().toISOString(),
      message: 'SinarPay webhook connectivity test',
    };

    const response = await fetch(merchant.webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    return {
      success: response.ok,
      statusCode: response.status,
      response: responseText || response.statusText || 'No response body',
    };
  }

  async searchTransactions(merchantId: string, dto: SearchTransactionsDto) {
    await this.expirePendingTransactions();

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
        amount: item.amount.toNumber(),
        status: item.status,
        date: item.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }
}

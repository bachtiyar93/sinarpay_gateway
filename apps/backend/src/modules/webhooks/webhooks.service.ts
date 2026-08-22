import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { WebhookJobData, WebhookPayload } from './dto/webhook-event.dto';
import { Transaction, Merchant, WebhookDeliveryStatus } from '@prisma/client';

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue(WEBHOOK_QUEUE_NAME) private readonly webhookQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async dispatchTransactionStatusUpdate(
    transaction: Transaction,
    merchant: Merchant,
  ) {
    if (!merchant.webhookUrl) {
      this.logger.debug(
        `Merchant ${merchant.id} has no webhookUrl configured. Skipping webhook dispatch.`,
      );
      return;
    }

    const payload: WebhookPayload = {
      event: `transaction.${transaction.status.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      data: {
        transactionId: transaction.id,
        merchantId: transaction.merchantId,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        status: transaction.status,
        externalRef: transaction.externalRef,
        createdAt: transaction.createdAt.toISOString(),
        paidAt:
          transaction.status === 'PAID'
            ? transaction.updatedAt.toISOString()
            : null,
      },
    };

    // 1. Create WebhookDelivery record in DB
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        transactionId: transaction.id,
        merchantId: merchant.id,
        payload: payload as any,
        status: WebhookDeliveryStatus.PENDING,
        attemptCount: 0,
      },
    });

    const jobData: WebhookJobData = {
      deliveryId: delivery.id,
      merchantId: merchant.id,
      transactionId: transaction.id,
      webhookUrl: merchant.webhookUrl,
      payload,
    };

    // 2. Enqueue into BullMQ with exponential backoff
    await this.webhookQueue.add('send-webhook', jobData, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000, // 3s, 6s, 12s, 24s...
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(
      `Enqueued webhook delivery ${delivery.id} for transaction ${transaction.id} to ${merchant.webhookUrl}`,
    );
  }

  async getDeliveriesByMerchant(merchantId: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getDeliveriesByTransaction(transactionId: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

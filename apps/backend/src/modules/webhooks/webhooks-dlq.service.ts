import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { WebhookQueueService } from './webhooks-queue.service';

interface DlqRecord {
  deliveryId: string;
  transactionId: string;
  merchantId: string;
  reason: string;
  payload: Record<string, unknown>;
  failedAt: string;
}

@Injectable()
export class WebhookDlqService {
  private readonly redis: Redis;

  constructor(
    private prisma: PrismaService,
    private queueService: WebhookQueueService,
  ) {
    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    this.redis = new Redis(redisUrl);
  }

  async put(record: DlqRecord): Promise<void> {
    await this.redis.set(
      `dlq:webhook:${record.deliveryId}`,
      JSON.stringify(record),
    );
  }

  async get(deliveryId: string): Promise<DlqRecord | null> {
    const raw = await this.redis.get(`dlq:webhook:${deliveryId}`);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as DlqRecord;
  }

  async replay(deliveryId: string): Promise<boolean> {
    const record = await this.get(deliveryId);
    if (!record) {
      return false;
    }

    await this.queueService.enqueueWebhook(record.deliveryId);
    await this.redis.del(`dlq:webhook:${deliveryId}`);
    return true;
  }

  async fromDelivery(deliveryId: string, reason: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { merchant: true },
    });

    if (!delivery) {
      return;
    }

    await this.put({
      deliveryId: delivery.id,
      transactionId: delivery.transactionId,
      merchantId: delivery.merchantId,
      reason,
      payload: delivery.payload as Record<string, unknown>,
      failedAt: new Date().toISOString(),
    });
  }
}

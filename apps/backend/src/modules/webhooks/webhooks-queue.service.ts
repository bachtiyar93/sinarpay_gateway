import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export interface WebhookJobData {
  deliveryId: string;
}

@Injectable()
export class WebhookQueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue('webhook-delivery', {
      connection: this.connection() as never,
    });
  }

  async enqueueWebhook(deliveryId: string): Promise<void> {
    await this.queue.add('deliver-webhook', { deliveryId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  private connection(): RedisOptions {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    };
  }
}

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { WebhookService } from './webhooks.service';
import { WebhookCircuitBreakerService } from './webhooks-circuit-breaker.service';
import { WebhookDlqService } from './webhooks-dlq.service';

@Injectable()
export class WebhookProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookProcessorService.name);
  private worker?: Worker<{ deliveryId: string }>;

  constructor(
    private prisma: PrismaService,
    private webhookService: WebhookService,
    private breaker: WebhookCircuitBreakerService,
    private dlqService: WebhookDlqService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<{ deliveryId: string }>(
      'webhook-delivery',
      async (job) => this.process(job),
      {
        connection: this.connection() as never,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Webhook job failed for delivery ${job?.data.deliveryId}: ${error.message}`,
      );

      if (job && job.attemptsMade >= 5) {
        void this.dlqService.fromDelivery(
          job.data.deliveryId,
          `Max retries exceeded: ${error.message}`,
        );
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async process(job: Job<{ deliveryId: string }>): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: job.data.deliveryId },
      include: { merchant: true },
    });

    if (!delivery) {
      throw new Error(`Webhook delivery not found: ${job.data.deliveryId}`);
    }

    if (!delivery.merchant.webhookUrl) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          responseBody: 'Merchant webhook URL missing',
        },
      });
      await this.dlqService.fromDelivery(
        delivery.id,
        'Merchant webhook URL missing',
      );
      return;
    }

    if (!this.breaker.canAttempt(delivery.merchantId)) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          nextRetryAt: new Date(Date.now() + 30_000),
        },
      });
      throw new Error(`Circuit open for merchant ${delivery.merchantId}`);
    }

    const signature = this.webhookService.generateSignature(
      delivery.payload as Record<string, unknown>,
      delivery.merchant.apiSecretHash,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let response: Response;

    try {
      response = await fetch(delivery.merchant.webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-signature': signature,
        },
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      });
    } catch (error) {
      this.breaker.recordFailure(delivery.merchantId);
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await response.text();

    if (response.ok) {
      this.breaker.recordSuccess(delivery.merchantId);
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          status: 'DELIVERED',
          responseCode: response.status,
          responseBody,
        },
      });
      return;
    }

    if (response.status >= 400 && response.status < 500) {
      this.breaker.recordSuccess(delivery.merchantId);
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          status: 'FAILED',
          responseCode: response.status,
          responseBody,
        },
      });
      await this.dlqService.fromDelivery(
        delivery.id,
        `Permanent webhook failure: ${response.status}`,
      );
      return;
    }

    this.breaker.recordFailure(delivery.merchantId);
    await this.prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        status: 'FAILED',
        responseCode: response.status,
        responseBody,
        nextRetryAt: new Date(Date.now() + 5000),
      },
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed with status ${response.status}`);
    }
  }

  private connection(): RedisOptions {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    };
  }
}

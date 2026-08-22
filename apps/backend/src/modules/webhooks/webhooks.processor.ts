import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { MerchantsService } from '../merchants/merchants.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { WebhookJobData } from './dto/webhook-event.dto';
import { WebhookDeliveryStatus } from '@prisma/client';
import CircuitBreaker from 'opossum';

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery';

@Processor(WEBHOOK_QUEUE_NAME)
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantsService: MerchantsService,
    private readonly crypto: CryptoService,
  ) {
    super();
  }

  private getCircuitBreaker(host: string): CircuitBreaker {
    if (!this.circuitBreakers.has(host)) {
      const breaker = new CircuitBreaker(
        async (url: string, options: any) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          try {
            const response = await fetch(url, {
              ...options,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        {
          timeout: 10000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
        },
      );

      breaker.on('open', () =>
        this.logger.warn(`Circuit breaker OPEN for host: ${host}`),
      );
      breaker.on('halfOpen', () =>
        this.logger.log(`Circuit breaker HALF-OPEN for host: ${host}`),
      );
      breaker.on('close', () =>
        this.logger.log(`Circuit breaker CLOSED for host: ${host}`),
      );

      this.circuitBreakers.set(host, breaker);
    }

    return this.circuitBreakers.get(host)!;
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { deliveryId, merchantId, webhookUrl, payload } = job.data;
    const attempt = job.attemptsMade + 1;
    this.logger.log(
      `Processing webhook delivery ${deliveryId} to ${webhookUrl} (Attempt ${attempt})`,
    );

    let secret = '';
    try {
      secret = await this.merchantsService.getDecryptedSecret(merchantId);
    } catch (err) {
      this.logger.error(`Could not retrieve merchant secret: ${err.message}`);
      await this.markDeliveryFailed(deliveryId, attempt, 500, `Merchant secret error: ${err.message}`);
      return;
    }

    const rawPayload = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signaturePayload = `${timestamp}.${rawPayload}`;
    const hmacSignature = this.crypto.createHmacSignature(signaturePayload, secret);
    const signatureHeader = `t=${timestamp},v1=${hmacSignature}`;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(webhookUrl);
    } catch {
      await this.markDeliveryFailed(deliveryId, attempt, 400, 'Invalid webhook URL format');
      return;
    }

    const breaker = this.getCircuitBreaker(parsedUrl.host);

    try {
      const response: Response = await breaker.fire(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SinarPay-Webhook-Engine/1.0',
          'X-SinarPay-Signature': signatureHeader,
          'X-SinarPay-Delivery': deliveryId,
        },
        body: rawPayload,
      });

      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        await this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: WebhookDeliveryStatus.DELIVERED,
            attemptCount: attempt,
            lastAttemptAt: new Date(),
            responseCode: response.status,
            responseBody: responseBody.slice(0, 1000), // Cap length
          },
        });
        this.logger.log(`Webhook delivery ${deliveryId} SUCCESS (Status ${response.status})`);
      } else {
        throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 200)}`);
      }
    } catch (error) {
      this.logger.warn(`Webhook delivery ${deliveryId} attempt ${attempt} failed: ${error.message}`);
      const isLastAttempt = attempt >= 5;

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: isLastAttempt
            ? WebhookDeliveryStatus.FAILED
            : WebhookDeliveryStatus.PENDING,
          attemptCount: attempt,
          lastAttemptAt: new Date(),
          nextRetryAt: isLastAttempt ? null : new Date(Date.now() + Math.pow(2, attempt) * 3000),
          responseBody: error.message?.slice(0, 1000),
        },
      });

      // Re-throw so BullMQ triggers retry if attempts remain
      throw error;
    }
  }

  private async markDeliveryFailed(
    deliveryId: string,
    attempt: number,
    code: number,
    body: string,
  ) {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.FAILED,
        attemptCount: attempt,
        lastAttemptAt: new Date(),
        responseCode: code,
        responseBody: body,
      },
    });
  }
}

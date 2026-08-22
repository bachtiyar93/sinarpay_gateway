import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HmacService } from '../../common/services/hmac.service';
import { WebhookQueueService } from './webhooks-queue.service';
import { WebhookService } from './webhooks.service';
import { WebhookProcessorService } from './webhooks.processor.service';
import { WebhookCircuitBreakerService } from './webhooks-circuit-breaker.service';
import { WebhookDlqService } from './webhooks-dlq.service';

@Module({
  providers: [
    PrismaService,
    HmacService,
    WebhookQueueService,
    WebhookService,
    WebhookProcessorService,
    WebhookCircuitBreakerService,
    WebhookDlqService,
  ],
  exports: [
    WebhookService,
    WebhookQueueService,
    WebhookCircuitBreakerService,
    WebhookDlqService,
  ],
})
export class WebhookModule {}

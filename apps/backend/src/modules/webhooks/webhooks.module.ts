import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HmacService } from '../../common/services/hmac.service';
import { WebhookQueueService } from './webhooks-queue.service';
import { WebhookService } from './webhooks.service';
import { WebhookProcessorService } from './webhooks.processor.service';

@Module({
  providers: [
    PrismaService,
    HmacService,
    WebhookQueueService,
    WebhookService,
    WebhookProcessorService,
  ],
  exports: [WebhookService, WebhookQueueService],
})
export class WebhookModule {}

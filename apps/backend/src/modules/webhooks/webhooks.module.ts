import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksService, WEBHOOK_QUEUE_NAME } from './webhooks.service';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksController } from './webhooks.controller';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE_NAME,
    }),
    MerchantsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}

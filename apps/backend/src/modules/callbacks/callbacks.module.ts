import { Module } from '@nestjs/common';
import { TransactionModule } from '../transactions/transactions.module';
import { WebhookModule } from '../webhooks/webhooks.module';
import { CallbacksController } from './callbacks.controller';
import { CallbacksService } from './callbacks.service';

@Module({
  imports: [TransactionModule, WebhookModule],
  controllers: [CallbacksController],
  providers: [CallbacksService],
})
export class CallbacksModule {}

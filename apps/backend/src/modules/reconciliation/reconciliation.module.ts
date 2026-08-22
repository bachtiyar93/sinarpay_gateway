import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { TransactionModule } from '../transactions/transactions.module';
import { WebhookModule } from '../webhooks/webhooks.module';
import { AuditService } from '../../common/audit/audit.service';
import { StructuredLoggerService } from '../../common/services/structured-logger.service';
import { SettlementSimulatorService } from './settlement-simulator.service';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';

@Module({
  imports: [PrismaModule, TransactionModule, WebhookModule],
  providers: [
    StructuredLoggerService,
    AuditService,
    SettlementSimulatorService,
    ReconciliationService,
  ],
  controllers: [ReconciliationController],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}

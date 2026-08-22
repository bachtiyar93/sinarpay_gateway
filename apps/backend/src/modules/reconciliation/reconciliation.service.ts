import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { TransactionService } from '../transactions/transactions.service';
import {
  SettlementSimulatorService,
  SettlementRow,
} from './settlement-simulator.service';
import { AuditService } from '../../common/audit/audit.service';
import { StructuredLoggerService } from '../../common/services/structured-logger.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private settlementSimulator: SettlementSimulatorService,
    private auditService: AuditService,
    private structuredLogger: StructuredLoggerService,
  ) {}

  async performDailyReconciliation() {
    this.logger.log('Starting reconciliation run');
    this.structuredLogger.log(
      'info',
      ReconciliationService.name,
      'Reconciliation started',
    );

    const settlementFile = await this.settlementSimulator.getSettlementFile();
    const rows = await this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const results: Array<Record<string, unknown>> = [];

    for (const transaction of rows) {
      const settlement = settlementFile.find(
        (row) => row.txnId === transaction.id,
      );
      const bankStatus = settlement?.status ?? 'FAILED';
      const bankTxnId = settlement?.txnId ?? null;
      const internalStatus = transaction.status;
      const isMatch =
        (internalStatus === 'SUCCESS' && bankStatus === 'SUCCESS') ||
        (internalStatus !== 'SUCCESS' && bankStatus === 'FAILED');

      if (!isMatch && bankStatus === 'SUCCESS') {
        await this.transactionService.transitionStatus(
          transaction.id,
          'SUCCESS',
          'Reconciliation correction',
        );

        await this.auditService.logAction({
          actorId: null,
          actorType: 'SYSTEM',
          action: 'RECONCILIATION_CORRECTION',
          resourceType: 'transaction',
          resourceId: transaction.id,
          metadata: {
            internalStatus,
            bankStatus,
            bankTxnId,
          },
        });
      }

      const reconciliation = await this.prisma.reconciliation.upsert({
        where: { internalTxnId: transaction.id },
        create: {
          internalTxnId: transaction.id,
          bankTxnId: bankTxnId ?? undefined,
          status: isMatch ? 'MATCHED' : 'RESOLVED',
          discrepancy: isMatch
            ? null
            : `Internal ${internalStatus} vs Bank ${bankStatus}`,
          resolvedAt: isMatch ? null : new Date(),
        },
        update: {
          bankTxnId: bankTxnId ?? undefined,
          status: isMatch ? 'MATCHED' : 'RESOLVED',
          discrepancy: isMatch
            ? null
            : `Internal ${internalStatus} vs Bank ${bankStatus}`,
          resolvedAt: isMatch ? null : new Date(),
        },
      });

      results.push(reconciliation);
    }

    this.logger.log('Reconciliation run completed');
    this.structuredLogger.log(
      'info',
      ReconciliationService.name,
      'Reconciliation completed',
      {
        count: results.length,
      },
    );

    return results;
  }

  @Cron('0 2 * * *')
  async runScheduledReconciliation(): Promise<void> {
    await this.performDailyReconciliation();
  }

  getReport(): Promise<unknown[]> {
    return this.prisma.reconciliation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getSettlementFile(): Promise<SettlementRow[]> {
    return this.settlementSimulator.getSettlementFile();
  }
}

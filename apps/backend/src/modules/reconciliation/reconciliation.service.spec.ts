/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../../database/prisma.service';
import { TransactionService } from '../transactions/transactions.service';
import { SettlementSimulatorService } from './settlement-simulator.service';
import { AuditService } from '../../common/audit/audit.service';
import { StructuredLoggerService } from '../../common/services/structured-logger.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prisma: PrismaService;
  let transactionService: TransactionService;
  let settlementSimulator: SettlementSimulatorService;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        StructuredLoggerService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              findMany: jest.fn(),
            },
            reconciliation: {
              upsert: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: TransactionService,
          useValue: {
            transitionStatus: jest.fn(),
          },
        },
        {
          provide: SettlementSimulatorService,
          useValue: {
            getSettlementFile: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    prisma = module.get<PrismaService>(PrismaService);
    transactionService = module.get<TransactionService>(TransactionService);
    settlementSimulator = module.get<SettlementSimulatorService>(
      SettlementSimulatorService,
    );
    auditService = module.get<AuditService>(AuditService);
  });

  it('corrects a mismatch and records reconciliation', async () => {
    (settlementSimulator.getSettlementFile as jest.Mock).mockResolvedValue([
      {
        txnId: 'txn-1',
        amount: 1000,
        status: 'PAID',
        settledAt: new Date().toISOString(),
      },
    ]);
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'txn-1',
        status: 'ISSUED',
        merchantId: 'merchant-1',
      },
    ]);
    (prisma.reconciliation.upsert as jest.Mock).mockResolvedValue({
      id: 'rec-1',
      internalTxnId: 'txn-1',
      status: 'RESOLVED',
    });

    const result = await service.performDailyReconciliation();

    expect(result).toHaveLength(1);
    const transitionMock = transactionService.transitionStatus as jest.Mock;
    const auditMock = auditService.logAction as jest.Mock;
    expect(transitionMock.mock.calls).toHaveLength(1);
    expect(transitionMock.mock.calls[0]).toEqual([
      'txn-1',
      'PAID',
      'Reconciliation correction',
    ]);
    expect(auditMock.mock.calls.length).toBeGreaterThan(0);
  });

  it('returns reconciliation report', async () => {
    (prisma.reconciliation.findMany as jest.Mock).mockResolvedValue([
      { id: 'rec-1' },
    ]);
    await expect(service.getReport()).resolves.toEqual([{ id: 'rec-1' }]);
  });
});

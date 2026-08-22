/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { PrismaService } from '../../database/prisma.service';
import { QrisSimulatorService } from './qris-simulator.service';
import { IdempotencyService } from '../../common/services/idempotency.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let prisma: PrismaService;
  let idempotency: IdempotencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            transactionHistory: {
              create: jest.fn(),
            },
            merchant: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: QrisSimulatorService,
          useValue: {
            generateQrisString: jest.fn().mockReturnValue('fake-qris'),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    prisma = module.get<PrismaService>(PrismaService);
    idempotency = module.get<IdempotencyService>(IdempotencyService);
  });

  describe('createTransaction', () => {
    it('should create transaction with QRIS', async () => {
      const merchantId = 'merchant-1';
      const dto = {
        amount: 100000,
        currency: 'IDR',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      };

      (idempotency.get as jest.Mock).mockResolvedValue(null);
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({
        id: merchantId,
        status: 'ACTIVE',
      });
      (prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'txn-1',
        merchantId,
        amount: { toNumber: () => dto.amount },
        currency: dto.currency,
        status: 'ISSUED',
        expiredAt: new Date(),
      });
      (prisma.transaction.update as jest.Mock).mockResolvedValue({
        id: 'txn-1',
        amount: { toNumber: () => dto.amount },
        currency: dto.currency,
        status: 'ISSUED',
        qrisPayload: 'fake-qris',
      });

      const result = await service.createTransaction(merchantId, dto);

      expect(result).toHaveProperty('transactionId', 'txn-1');
      expect(result).toHaveProperty('qrisString', 'fake-qris');
      const setMock = idempotency.set as jest.Mock;
      expect(setMock.mock.calls.length).toBeGreaterThan(0);
    });

    it('should return cached result on idempotent retry', async () => {
      const merchantId = 'merchant-1';
      const dto = {
        amount: 100000,
        currency: 'IDR',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      };
      const cached = {
        transactionId: 'txn-1',
        qrisString: 'fake-qris',
        amount: 100000,
        currency: 'IDR',
        status: 'ISSUED',
        expiresAt: new Date().toISOString(),
      };

      (idempotency.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.createTransaction(merchantId, dto);

      expect(result).toEqual(cached);
      const createMock = prisma.transaction.create as jest.Mock;
      expect(createMock.mock.calls.length).toBe(0);
    });

    it('should reject invalid currency', async () => {
      const merchantId = 'merchant-1';
      const dto = {
        amount: 100000,
        currency: 'XXX',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      };

      (idempotency.get as jest.Mock).mockResolvedValue(null);

      await expect(service.createTransaction(merchantId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('transitionStatus', () => {
    it('should transition from ISSUED to PAID', async () => {
      const transactionId = 'txn-1';
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: transactionId,
        status: 'ISSUED',
      });

      await service.transitionStatus(transactionId, 'PAID', 'Manual approval');

      const updateMock = prisma.transaction.update as jest.Mock;
      expect(updateMock.mock.calls.length).toBeGreaterThan(0);
      const createHistoryMock = prisma.transactionHistory.create as jest.Mock;
      expect(createHistoryMock.mock.calls.length).toBeGreaterThan(0);
    });

    it('should reject invalid transition', async () => {
      const transactionId = 'txn-1';
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: transactionId,
        status: 'PAID',
      });

      await expect(
        service.transitionStatus(transactionId, 'ISSUED'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw not found for non-existent transaction', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.transitionStatus('invalid', 'PAID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction for authorized merchant', async () => {
      const transactionId = 'txn-1';
      const merchantId = 'merchant-1';

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: transactionId,
        merchantId,
        status: 'ISSUED',
        history: [],
      });

      const result = await service.getTransactionById(
        transactionId,
        merchantId,
      );

      expect(result).toHaveProperty('id', transactionId);
    });

    it('should forbid access for unauthorized merchant', async () => {
      const transactionId = 'txn-1';
      const unauthorizedMerchantId = 'merchant-2';

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: transactionId,
        merchantId: 'merchant-1',
      });

      await expect(
        service.getTransactionById(transactionId, unauthorizedMerchantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

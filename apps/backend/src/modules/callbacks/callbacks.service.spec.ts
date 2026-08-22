/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CallbacksService } from './callbacks.service';
import { PrismaService } from '../../database/prisma.service';
import { TransactionService } from '../transactions/transactions.service';
import { WebhookService } from '../webhooks/webhooks.service';
import { HmacService } from '../../common/services/hmac.service';

describe('CallbacksService', () => {
  let service: CallbacksService;
  let hmacService: HmacService;
  let prisma: PrismaService;
  let transactionService: TransactionService;
  let webhookService: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallbacksService,
        HmacService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              findUnique: jest.fn(),
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
          provide: WebhookService,
          useValue: {
            sendWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CallbacksService>(CallbacksService);
    hmacService = module.get<HmacService>(HmacService);
    prisma = module.get<PrismaService>(PrismaService);
    transactionService = module.get<TransactionService>(TransactionService);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  it('validates bank signatures', () => {
    const payload = {
      transactionId: 'txn-1',
      status: 'PAID' as const,
      externalRef: 'ref-1',
    };
    const signature = hmacService.generateSignature(
      payload,
      process.env.BANK_CALLBACK_SECRET ||
        'sinarpay_bank_simulator_secret_key_minimum_32_characters!',
    );

    expect(
      service.validateBankSignature({ ...payload, bankSignature: signature }),
    ).toBe(true);
  });

  it('rejects invalid bank signatures', async () => {
    await expect(
      service.handleBankNotification({
        transactionId: 'txn-1',
        status: 'PAID',
        externalRef: 'ref-1',
        bankSignature: 'bad-signature',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('processes a signed bank callback and queues webhook', async () => {
    const payload = {
      transactionId: 'txn-1',
      status: 'PAID' as const,
      externalRef: 'ref-1',
    };
    const signature = hmacService.generateSignature(
      payload,
      process.env.BANK_CALLBACK_SECRET ||
        'sinarpay_bank_simulator_secret_key_minimum_32_characters!',
    );

    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 'txn-1',
      merchantId: 'merchant-1',
      amount: { toNumber: () => 1000 },
      currency: 'IDR',
      merchant: { id: 'merchant-1', apiSecretHash: 'merchant-secret' },
    });

    (transactionService.transitionStatus as jest.Mock).mockResolvedValue(
      undefined,
    );
    (webhookService.sendWebhook as jest.Mock).mockResolvedValue({
      id: 'delivery-1',
    });

    const result = await service.handleBankNotification({
      ...payload,
      bankSignature: signature,
    });

    expect(result).toEqual({
      success: true,
      transactionId: 'txn-1',
      status: 'PAID',
    });
    const transitionMock = transactionService.transitionStatus as jest.Mock;
    const webhookMock = webhookService.sendWebhook as jest.Mock;
    expect(transitionMock.mock.calls).toHaveLength(1);
    expect(transitionMock.mock.calls[0]).toEqual(['txn-1', 'PAID', 'ref-1']);
    expect(webhookMock.mock.calls).toHaveLength(1);
  });
});

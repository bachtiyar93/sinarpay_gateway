import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessorService } from './webhooks.processor.service';
import { PrismaService } from '../../database/prisma.service';
import { WebhookService } from './webhooks.service';
import { WebhookCircuitBreakerService } from './webhooks-circuit-breaker.service';
import { WebhookDlqService } from './webhooks-dlq.service';

describe('WebhookProcessorService', () => {
  let service: WebhookProcessorService;
  let prisma: PrismaService;
  let breaker: WebhookCircuitBreakerService;
  let dlq: WebhookDlqService;
  let webhookService: WebhookService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessorService,
        {
          provide: PrismaService,
          useValue: {
            webhookDelivery: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: WebhookService,
          useValue: {
            generateSignature: jest.fn().mockReturnValue('signature'),
          },
        },
        {
          provide: WebhookCircuitBreakerService,
          useValue: {
            canAttempt: jest.fn().mockReturnValue(true),
            recordFailure: jest.fn(),
            recordSuccess: jest.fn(),
          },
        },
        {
          provide: WebhookDlqService,
          useValue: {
            fromDelivery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookProcessorService>(WebhookProcessorService);
    prisma = module.get<PrismaService>(PrismaService);
    breaker = module.get<WebhookCircuitBreakerService>(
      WebhookCircuitBreakerService,
    );
    dlq = module.get<WebhookDlqService>(WebhookDlqService);
    webhookService = module.get<WebhookService>(WebhookService);
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('marks permanent 4xx failures as failed and stores dlq', async () => {
    (prisma.webhookDelivery.findUnique as jest.Mock).mockResolvedValue({
      id: 'delivery-1',
      transactionId: 'txn-1',
      merchantId: 'merchant-1',
      payload: { transactionId: 'txn-1' },
      merchant: {
        webhookUrl: 'https://merchant.test/webhook',
        apiSecretHash: 'secret',
      },
    });
    fetchSpy.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        text: () => Promise.resolve('bad request'),
      } as Response),
    );

    await (
      service as unknown as {
        process: (job: { data: { deliveryId: string } }) => Promise<void>;
      }
    ).process({
      data: { deliveryId: 'delivery-1' },
    });

    expect((breaker.recordFailure as jest.Mock).mock.calls.length).toBe(0);
    expect((dlq.fromDelivery as jest.Mock).mock.calls.length).toBe(1);
    expect(
      (webhookService.generateSignature as jest.Mock).mock.calls.length,
    ).toBe(1);
  });

  it('throws on transient 5xx failures', async () => {
    (prisma.webhookDelivery.findUnique as jest.Mock).mockResolvedValue({
      id: 'delivery-1',
      transactionId: 'txn-1',
      merchantId: 'merchant-1',
      payload: { transactionId: 'txn-1' },
      merchant: {
        webhookUrl: 'https://merchant.test/webhook',
        apiSecretHash: 'secret',
      },
    });
    fetchSpy.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('server error'),
      } as Response),
    );

    await expect(
      (
        service as unknown as {
          process: (job: { data: { deliveryId: string } }) => Promise<void>;
        }
      ).process({
        data: { deliveryId: 'delivery-1' },
      }),
    ).rejects.toThrow();
    expect((breaker.recordFailure as jest.Mock).mock.calls.length).toBe(1);
  });
});

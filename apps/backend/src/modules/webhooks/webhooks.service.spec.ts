/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhooks.service';
import { PrismaService } from '../../database/prisma.service';
import { WebhookQueueService } from './webhooks-queue.service';
import { HmacService } from '../../common/services/hmac.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: PrismaService;
  let queueService: WebhookQueueService;
  let hmacService: HmacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        HmacService,
        {
          provide: PrismaService,
          useValue: {
            webhookDelivery: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: WebhookQueueService,
          useValue: {
            enqueueWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prisma = module.get<PrismaService>(PrismaService);
    queueService = module.get<WebhookQueueService>(WebhookQueueService);
    hmacService = module.get<HmacService>(HmacService);
  });

  it('generates a deterministic signature', () => {
    const payload = { transactionId: 'txn-1', status: 'PAID' };
    const signature = service.generateSignature(payload, 'merchant-secret');
    expect(signature).toBe(
      hmacService.generateSignature(payload, 'merchant-secret'),
    );
  });

  it('creates webhook delivery and queues job', async () => {
    (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({
      id: 'delivery-1',
    });

    await service.sendWebhook('txn-1', 'merchant-1', {
      transactionId: 'txn-1',
    });

    const createMock = prisma.webhookDelivery.create as jest.Mock;
    const queueMock = queueService.enqueueWebhook as jest.Mock;
    expect(createMock.mock.calls).toHaveLength(1);
    expect(queueMock.mock.calls).toHaveLength(1);
    expect(queueMock.mock.calls[0]).toEqual(['delivery-1']);
  });
});

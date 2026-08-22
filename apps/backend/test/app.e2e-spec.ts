/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { WebhookQueueService } from '../src/modules/webhooks/webhooks-queue.service';
import { WebhookProcessorService } from '../src/modules/webhooks/webhooks.processor.service';
import { WebhookDlqService } from '../src/modules/webhooks/webhooks-dlq.service';
import { EncryptionService } from '../src/common/services/encryption.service';
import { HmacService } from '../src/common/services/hmac.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('SinarPay API (e2e)', () => {
  let app: INestApplication;
  const transactions = new Map<string, Record<string, unknown>>();
  const webhooks: Array<Record<string, unknown>> = [];

  const merchant = {
    id: 'merchant-1',
    name: 'Demo Merchant',
    apiKeyHash: 'merchant-api-key',
    apiSecretHash: 'enc:merchant-secret',
    webhookUrl: 'https://merchant.test/webhook',
    balance: { toNumber: () => 0 },
    status: 'ACTIVE',
  };

  const user = {
    id: 'user-1',
    email: 'admin@sinarpay.test',
    passwordHash: 'hashed-password',
    name: 'Admin',
    role: 'OPS',
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(async ({ where }) =>
        where.email === user.email || where.id === user.id ? user : null,
      ),
      create: jest.fn(),
    },
    merchant: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.apiKeyHash === merchant.apiKeyHash) {
          return merchant;
        }
        if (where.id === merchant.id) {
          return merchant;
        }
        return null;
      }),
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(async ({ data }) => {
        const transaction = {
          id: `txn-${transactions.size + 1}`,
          merchantId: data.merchantId,
          amount: { toNumber: () => data.amount },
          currency: data.currency,
          status: data.status,
          qrisPayload: data.qrisPayload,
          idempotencyKey: data.idempotencyKey,
          expiredAt: data.expiredAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          merchant,
        };
        transactions.set(transaction.id, transaction);
        return transaction;
      }),
      update: jest.fn(async ({ where, data }) => {
        const existing = transactions.get(where.id);
        if (!existing) {
          throw new Error('Transaction not found');
        }
        const updated = { ...existing, ...data, updatedAt: new Date() };
        transactions.set(where.id, updated);
        return updated;
      }),
      findUnique: jest.fn(async ({ where }) => {
        return transactions.get(where.id) ?? null;
      }),
      findMany: jest.fn(async () => Array.from(transactions.values())),
    },
    transactionHistory: {
      create: jest.fn(async ({ data }) => data),
    },
    webhookDelivery: {
      create: jest.fn(async ({ data }) => {
        const delivery = {
          id: `delivery-${webhooks.length + 1}`,
          transactionId: data.transactionId,
          merchantId: data.merchantId,
          payload: data.payload,
          status: 'PENDING',
          attemptCount: 0,
          merchant,
          transaction: transactions.get(data.transactionId),
        };
        webhooks.push(delivery);
        return delivery;
      }),
      findUnique: jest.fn(async ({ where }) => {
        return webhooks.find((item) => item.id === where.id) ?? null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const delivery = webhooks.find((item) => item.id === where.id);
        if (!delivery) {
          return null;
        }
        Object.assign(delivery, data);
        return delivery;
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }) => data),
    },
    reconciliation: {
      upsert: jest.fn(async ({ create }) => create),
      findMany: jest.fn(async () => []),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(() => {
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-test-jwt-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-test-refresh-secret-test';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.BANK_CALLBACK_SECRET = 'test-bank-secret-test-bank-secret-test';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  beforeEach(async () => {
    transactions.clear();
    webhooks.length = 0;
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(IdempotencyService)
      .useValue({
        get: jest.fn(async () => null),
        set: jest.fn(async () => undefined),
        clear: jest.fn(async () => undefined),
      })
      .overrideProvider(WebhookQueueService)
      .useValue({
        enqueueWebhook: jest.fn(async () => undefined),
        onModuleDestroy: jest.fn(async () => undefined),
      })
      .overrideProvider(WebhookProcessorService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(async () => undefined),
      })
      .overrideProvider(WebhookDlqService)
      .useValue({
        fromDelivery: jest.fn(async () => undefined),
        replay: jest.fn(async () => true),
      })
      .overrideProvider(EncryptionService)
      .useValue({
        encrypt: jest.fn((value: string) => `enc:${value}`),
        decrypt: jest.fn((value: string) => value.replace(/^enc:/, '')),
      })
      .overrideProvider(HmacService)
      .useValue({
        generateSignature: jest.fn(() => 'signature'),
        verifySignature: jest.fn(() => true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.restoreAllMocks();
  });

  it('runs the payment and callback journey', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/health').expect(200);

    const loginResponse = await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('accessToken');

    const paymentResponse = await request(server)
      .post('/api/v1/payments')
      .set('x-api-key', merchant.apiKeyHash)
      .send({
        amount: 100000,
        currency: 'IDR',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      })
      .expect(201);

    const transactionId = paymentResponse.body.transactionId as string;
    expect(transactionId).toBeTruthy();

    const callbackPayload = {
      transactionId,
      status: 'PAID',
      externalRef: 'bank-ref-1',
    };
    await request(server)
      .post('/api/callbacks/bank-notification')
      .send({
        ...callbackPayload,
        bankSignature: 'signature',
      })
      .expect(201);

    expect(transactions.get(transactionId)?.status).toBe('PAID');
    expect(webhooks.length).toBe(1);
  });
});

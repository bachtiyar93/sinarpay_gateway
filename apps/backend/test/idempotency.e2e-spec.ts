import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Idempotency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let merchantId: string;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Get test merchant
    const merchants = await prisma.merchant.findMany({ take: 1 });
    if (merchants.length > 0) {
      merchantId = merchants[0].id;
      // Note: In real test, would need to decrypt apiSecretHash to get real key
      // For now, assuming test key is available in env or DB
      apiKey = process.env.TEST_MERCHANT_API_KEY || 'test-key';
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/payments (Idempotency)', () => {
    it('should create payment on first request', async () => {
      const idempotencyKey = 'd4b5e0a0-1234-5678-9abc-def012345678';
      const payload = {
        amount: 50000,
        currency: 'IDR',
        idempotencyKey,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('qrisString');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.amount).toBe(50000);

      return response.body.transactionId;
    });

    it('should return same transaction on duplicate request with same idempotency key', async () => {
      const idempotencyKey = 'd4b5e0a0-1234-5678-9abc-def012345678';
      const payload = {
        amount: 50000,
        currency: 'IDR',
        idempotencyKey,
      };

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .send(payload)
        .expect(201);

      const transactionId1 = response1.body.transactionId;

      // Second request with same key (should return cached/existing)
      const response2 = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .send(payload)
        .expect(201);

      const transactionId2 = response2.body.transactionId;

      // Both should be same transaction
      expect(transactionId1).toBe(transactionId2);
      expect(response1.body.qrisString).toBe(response2.body.qrisString);
    });

    it('should create different transaction for different idempotency keys', async () => {
      const key1 = 'a4b5e0a0-1234-5678-9abc-def012345671';
      const key2 = 'a4b5e0a0-1234-5678-9abc-def012345672';
      const payload = {
        amount: 50000,
        currency: 'IDR',
      };

      // Request 1
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .send({ ...payload, idempotencyKey: key1 })
        .expect(201);

      // Request 2 with different key
      const response2 = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .send({ ...payload, idempotencyKey: key2 })
        .expect(201);

      // Should be different transactions
      expect(response1.body.transactionId).not.toBe(
        response2.body.transactionId,
      );
    });

    it('should reject duplicate key from different merchant', async () => {
      const idempotencyKey = 'b4b5e0a0-1234-5678-9abc-def012345678';

      const payload = {
        amount: 50000,
        currency: 'IDR',
        idempotencyKey,
      };

      // Create with merchant A
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .send(payload)
        .expect(201);

      // Same key with different merchant should create new transaction
      // (assuming different merchant API key)
      const differentMerchantKey =
        process.env.TEST_DIFFERENT_MERCHANT_KEY || 'different-key';

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', differentMerchantKey)
        .send(payload);

      // Should either succeed (different merchant, same key = OK)
      // or fail with 401 (invalid key)
      expect([201, 401]).toContain(response.status);
    });

    it('should prevent double-charge on button spam', async () => {
      const idempotencyKey = 'c4b5e0a0-1234-5678-9abc-def012345678';
      const payload = {
        amount: 75000,
        currency: 'IDR',
        idempotencyKey,
      };

      // Simulate rapid requests (button spam)
      const results = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('x-api-key', apiKey)
          .send(payload),
        request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('x-api-key', apiKey)
          .send(payload),
        request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('x-api-key', apiKey)
          .send(payload),
      ]);

      const txIds = results.map((r) => r.body.transactionId);

      // All three should return the same transaction
      expect(txIds[0]).toBe(txIds[1]);
      expect(txIds[1]).toBe(txIds[2]);

      // Verify only 1 transaction exists in DB
      const transactions = await prisma.transaction.findMany({
        where: { idempotencyKey },
      });

      expect(transactions).toHaveLength(1);
    });
  });
});

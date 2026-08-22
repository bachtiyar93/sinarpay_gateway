/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './transactions.controller';
import { TransactionService } from './transactions.service';
import { AuthService } from '../auth/auth.service';
import type { MerchantRequest } from './transactions.controller';
import type { CreatePaymentDto } from './dto/create-payment.dto';

describe('TransactionController', () => {
  let controller: TransactionController;
  let service: TransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: {
            createTransaction: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get<TransactionService>(TransactionService);
  });

  describe('createPayment', () => {
    it('should create payment', async () => {
      const dto = {
        amount: 100000,
        currency: 'IDR',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      };
      const response = {
        transactionId: 'txn-1',
        qrisString: 'fake-qris',
        amount: 100000,
        currency: 'IDR',
        status: 'ISSUED',
        expiresAt: new Date().toISOString(),
      };

      (service.createTransaction as jest.Mock).mockResolvedValue(response);

      const req = {
        user: { merchantId: 'merchant-1' },
      } as unknown as MerchantRequest;

      const result = await controller.createPayment(dto, req);

      expect(result).toEqual(response);
      const createMock = service.createTransaction as jest.Mock;
      expect(createMock.mock.calls).toHaveLength(1);
      const firstCall = createMock.mock.calls[0] as [string, CreatePaymentDto];
      expect(firstCall[0]).toEqual('merchant-1');
      expect(firstCall[1]).toEqual(dto);
    });
  });
});

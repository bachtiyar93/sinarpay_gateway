import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const prismaUserMock = {
      findUnique: jest.fn(),
      create: jest.fn(),
    };

    const prismaMerchantMock = {
      findUnique: jest.fn(),
      create: jest.fn(),
    };

    const prismaMock = {
      user: prismaUserMock,
      merchant: prismaMerchantMock,
    };

    const jwtServiceMock = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'OPS',
      };
      const tokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access')
        .mockResolvedValueOnce('refresh');

      const result = await service.login(dto);
      expect(result).toEqual(tokens);
    });

    it('should throw on invalid email', async () => {
      const dto = { email: 'notfound@example.com', password: 'password123' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on invalid password', async () => {
      const dto = { email: 'test@example.com', password: 'wrong' };
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'OPS',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateApiKey', () => {
    it('should return merchantId on valid active merchant', async () => {
      const merchant = { id: '123', status: 'ACTIVE', apiKeyHash: 'key' };
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(merchant);

      const result = await service.validateApiKey('key');
      expect(result).toBe('123');
    });

    it('should throw on invalid API key', async () => {
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.validateApiKey('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on inactive merchant', async () => {
      const merchant = { id: '123', status: 'SUSPENDED', apiKeyHash: 'key' };
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(merchant);

      await expect(service.validateApiKey('key')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const email = 'new@example.com';
      const password = 'password123';
      const name = 'Test User';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        email,
        name,
        role: 'OPS',
      });

      const result = await service.createUser(email, password, name);
      expect(result).toHaveProperty('id', '1');
      expect(
        (prisma.user.create as jest.Mock).mock.calls.length,
      ).toBeGreaterThan(0);
    });

    it('should throw on duplicate email', async () => {
      const email = 'existing@example.com';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email,
      });

      await expect(
        service.createUser(email, 'password123', 'Test'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

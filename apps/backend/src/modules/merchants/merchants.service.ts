import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { UpdateMerchantStatusDto } from './dto/update-merchant-status.dto';
import { MerchantStatus } from '@prisma/client';

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async create(dto: CreateMerchantDto) {
    const rawApiKey = this.crypto.generateApiKey();
    const rawApiSecret = this.crypto.generateApiSecret();

    const apiKeyHash = this.crypto.hashSha256(rawApiKey);
    const apiSecretHash = this.crypto.encrypt(rawApiSecret);

    const merchant = await this.prisma.merchant.create({
      data: {
        name: dto.name,
        apiKeyHash,
        apiSecretHash,
        webhookUrl: dto.webhookUrl || null,
        status: MerchantStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        balance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Plaintext API Key and Secret are only returned upon creation
    return {
      ...merchant,
      apiKey: rawApiKey,
      apiSecret: rawApiSecret,
    };
  }

  async regenerateKeys(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    const rawApiKey = this.crypto.generateApiKey();
    const rawApiSecret = this.crypto.generateApiSecret();

    const apiKeyHash = this.crypto.hashSha256(rawApiKey);
    const apiSecretHash = this.crypto.encrypt(rawApiSecret);

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        apiKeyHash,
        apiSecretHash,
      },
    });

    return {
      id: merchant.id,
      name: merchant.name,
      apiKey: rawApiKey,
      apiSecret: rawApiSecret,
      message: 'API Key & Secret regenerated. Please store them securely.',
    };
  }

  async updateWebhook(merchantId: string, dto: UpdateWebhookDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { webhookUrl: dto.webhookUrl },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async updateStatus(merchantId: string, dto: UpdateMerchantStatusDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: dto.status },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        balance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        balance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    return merchant;
  }

  /**
   * Helper to retrieve decrypted secret for internal webhook signing
   */
  async getDecryptedSecret(merchantId: string): Promise<string> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { apiSecretHash: true },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    return this.crypto.decrypt(merchant.apiSecretHash);
  }
}

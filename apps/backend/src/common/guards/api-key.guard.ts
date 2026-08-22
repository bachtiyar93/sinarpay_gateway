import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MerchantStatus } from '@prisma/client';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey =
      request.headers['x-api-key'] ||
      (request.headers['authorization']?.startsWith('Bearer sp_')
        ? request.headers['authorization'].replace('Bearer ', '').trim()
        : null);

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing X-API-KEY header');
    }

    const apiKeyHash = this.crypto.hashSha256(apiKey);

    const merchant = await this.prisma.merchant.findUnique({
      where: { apiKeyHash },
    });

    if (!merchant || merchant.status !== MerchantStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or inactive API Key');
    }

    // Attach merchant to request context for downstream controllers & services
    request.merchant = merchant;
    return true;
  }
}

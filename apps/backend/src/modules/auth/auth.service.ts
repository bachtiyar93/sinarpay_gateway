import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { TokenResponse, AuthPayload } from './dto/auth-payload.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<AuthPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.issueTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateApiKey(apiKey: string): Promise<string> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { apiKeyHash: apiKey },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (merchant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Merchant is not active');
    }

    return merchant.id;
  }

  async createUser(
    email: string,
    password: string,
    name: string,
    role: 'ADMIN' | 'OPS' = 'OPS',
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.user.create({
      data: { email, passwordHash, name, role },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async createMerchant(
    name: string,
    apiKeyHash: string,
    apiSecretHash: string,
    webhookUrl?: string,
  ) {
    return this.prisma.merchant.create({
      data: { name, apiKeyHash, apiSecretHash, webhookUrl },
      select: { id: true, name: true, status: true },
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenResponse> {
    const payload: AuthPayload = {
      sub: userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'secret',
      expiresIn: 3600,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      expiresIn: 604800, // 7 days
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }
}

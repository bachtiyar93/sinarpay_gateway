import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { TokenResponse, AuthPayload } from './dto/auth-payload.interface';
import * as bcrypt from 'bcrypt';
import { EncryptionService } from '../../common/services/encryption.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
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
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
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

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateCurrentUser(
    userId: string,
    updates: { email?: string; password?: string },
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    const nextEmail = updates.email?.trim();
    const nextPassword = updates.password?.trim();

    if (!nextEmail && !nextPassword) {
      throw new BadRequestException('Email or password update is required');
    }

    if (nextEmail && nextEmail !== existingUser.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
      if (emailOwner && emailOwner.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
    }

    if (nextPassword && nextPassword.length < 8) {
      throw new BadRequestException('Password minimal 8 karakter');
    }

    const data: { email?: string; passwordHash?: string } = {};
    if (nextEmail) {
      data.email = nextEmail;
    }
    if (nextPassword) {
      data.passwordHash = await bcrypt.hash(nextPassword, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
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
      data: {
        name,
        apiKeyHash,
        apiSecretHash: this.encryptionService.encrypt(apiSecretHash),
        webhookUrl,
      },
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
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: 3600,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: 604800,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }
}

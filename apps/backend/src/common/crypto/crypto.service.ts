import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('security.encryptionKey') || this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY must be a 32-byte hex string (64 characters)',
      );
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypt plaintext string using AES-256-GCM.
   * Returns formatted string: ivHex:authTagHex:ciphertextHex
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 12-byte IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${ivHex}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext string formatted as ivHex:authTagHex:ciphertextHex
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generates a standard SHA-256 hash (hex)
   */
  hashSha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generates HMAC-SHA256 signature for a payload with a secret key
   */
  createHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifies an HMAC-SHA256 signature using timingSafeEqual to prevent timing attacks
   */
  verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
    try {
      const computed = this.createHmacSignature(payload, secret);
      const computedBuf = Buffer.from(computed, 'hex');
      const signatureBuf = Buffer.from(signature, 'hex');

      if (computedBuf.length !== signatureBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuf, signatureBuf);
    } catch {
      return false;
    }
  }

  /**
   * Generate Merchant API Key (e.g. sp_live_...)
   */
  generateApiKey(): string {
    return `sp_live_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Generate Merchant API Secret (e.g. sps_...)
   */
  generateApiSecret(): string {
    return `sps_${crypto.randomBytes(24).toString('hex')}`;
  }
}

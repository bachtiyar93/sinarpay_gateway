import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  encrypt(value: string): string {
    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(value: string): string {
    const [ivHex, tagHex, encryptedHex] = value.split(':');
    if (!ivHex || !tagHex || !encryptedHex) {
      return value;
    }

    const key = this.key();
    const decipher = createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private key(): Buffer {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw) {
      throw new Error('ENCRYPTION_KEY is required');
    }

    return Buffer.from(raw, 'hex');
  }
}

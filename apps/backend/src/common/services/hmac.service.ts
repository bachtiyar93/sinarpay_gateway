import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class HmacService {
  generateSignature(
    payload: string | Record<string, unknown>,
    secret: string,
  ): string {
    const data =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  verifySignature(
    payload: string | Record<string, unknown>,
    secret: string,
    signature: string,
  ): boolean {
    const expected = this.generateSignature(payload, secret);
    if (expected.length !== signature.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}

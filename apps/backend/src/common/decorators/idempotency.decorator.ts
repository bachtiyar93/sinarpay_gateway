import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Extract and validate Idempotency-Key header from request.
 * Enforces idempotency for payment operations to prevent double-charging.
 */
export const IdempotencyKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const key = request.headers['idempotency-key'] as string;

    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    // Validate UUID format (simple regex)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(key)) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID');
    }

    return key;
  },
);

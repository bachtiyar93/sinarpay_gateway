import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService {
  private readonly redis: Redis;
  private readonly ttl = 86400; // 24 hours

  constructor() {
    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    this.redis = new Redis(redisUrl);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(`idempotency:${key}`);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.redis.setex(
      `idempotency:${key}`,
      this.ttl,
      JSON.stringify(value),
    );
  }

  async clear(key: string): Promise<void> {
    await this.redis.del(`idempotency:${key}`);
  }
}

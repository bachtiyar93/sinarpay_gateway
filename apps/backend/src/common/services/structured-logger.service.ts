import { Injectable } from '@nestjs/common';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

@Injectable()
export class StructuredLoggerService {
  log(
    level: LogLevel,
    context: string,
    message: string,
    metadata: Record<string, unknown> = {},
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      metadata: this.mask(metadata),
    };

    // Centralized JSON logging for app services.
    console.log(JSON.stringify(entry));
  }

  private mask(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.mask(item));
    }

    if (value && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};

      Object.keys(source).forEach((key) => {
        const lower = key.toLowerCase();
        if (
          lower.includes('password') ||
          lower.includes('secret') ||
          lower.includes('token') ||
          lower.includes('signature')
        ) {
          output[key] = '[REDACTED]';
          return;
        }

        output[key] = this.mask(source[key]);
      });

      return output;
    }

    return value;
  }
}

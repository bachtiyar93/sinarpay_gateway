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
      metadata,
    };

    // Centralized JSON logging for app services.
    console.log(JSON.stringify(entry));
  }
}

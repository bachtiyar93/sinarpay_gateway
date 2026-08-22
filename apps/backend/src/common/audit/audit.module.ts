import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../database/prisma.module';
import { StructuredLoggerService } from '../services/structured-logger.service';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [
    StructuredLoggerService,
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService, StructuredLoggerService],
})
export class AuditModule {}

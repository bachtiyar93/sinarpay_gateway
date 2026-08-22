import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLoggerService } from '../services/structured-logger.service';

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private logger: StructuredLoggerService,
  ) {}

  async logAction(params: {
    actorId?: string | null;
    actorType: 'MERCHANT' | 'OPS' | 'SYSTEM';
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorType: params.actorType,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        metadata: (params.metadata ?? {}) as never,
      },
    });

    this.logger.log('info', 'AuditService', params.action, {
      actorId: params.actorId ?? null,
      actorType: params.actorType,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      metadata: params.metadata ?? {},
    });
  }
}

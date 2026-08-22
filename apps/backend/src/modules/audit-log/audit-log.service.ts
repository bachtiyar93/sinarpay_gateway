import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActorType, Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  actorId?: string;
  actorType: ActorType;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: CreateAuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorType: params.actorType,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        metadata: (params.metadata as Prisma.InputJsonValue) || undefined,
      },
    });
  }

  async findAll(page = 1, limit = 50, action?: string, actorType?: ActorType) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (action) where.action = action;
    if (actorType) where.actorType = actorType;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

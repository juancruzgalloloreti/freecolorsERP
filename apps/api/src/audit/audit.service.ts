import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type AuditInput = {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  record(data: AuditInput) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        summary: data.summary,
        metadata: (data.metadata ?? {}) as any,
      },
    });
  }

  list(tenantId: string, query: { entityType?: string; entityId?: string; action?: string; limit?: string | number }) {
    const limit = Math.min(Math.max(Number(query.limit || 100), 1), 300);
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

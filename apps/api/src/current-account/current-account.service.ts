import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { pageParams, paged } from '../common/pagination';

@Injectable()
export class CurrentAccountService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number | string; limit?: number | string; customerId?: string; dateFrom?: string; dateTo?: string } = {}): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 100, 300);
    const where: any = { tenantId, customerId: query.customerId };
    if (query.dateFrom || query.dateTo) {
      where.date = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);

    let realBalance: number | undefined;
    if (query.customerId) {
      const { _sum } = await this.prisma.currentAccountEntry.aggregate({
        where: { tenantId, customerId: query.customerId },
        _sum: { amount: true },
      });
      realBalance = this.roundMoney(Number(_sum.amount ?? 0));
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        customerId: string;
        customerName: string;
        description: string | null;
        amount: number;
        runningBalance: number;
        type: string;
        date: Date;
        createdAt: Date;
      }>
    >`
      WITH filtered AS (
        SELECT
          e.id,
          e."customerId",
          c.name as "customerName",
          e.description,
          e.amount,
          e.type,
          e.date,
          e."createdAt"
        FROM "current_account_entries" e
        JOIN "customers" c ON c.id = e."customerId"
        WHERE e."tenantId" = ${tenantId}
          ${query.customerId ? Prisma.sql`AND e."customerId" = ${query.customerId}` : Prisma.empty}
          ${query.dateFrom ? Prisma.sql`AND e."date" >= ${new Date(query.dateFrom)}` : Prisma.empty}
          ${query.dateTo ? Prisma.sql`AND e."date" <= ${new Date(query.dateTo)}` : Prisma.empty}
        ORDER BY e."customerId", e."date" ASC, e.id ASC
      )
      SELECT
        f.id,
        f."customerId",
        f."customerName",
        f.description,
        f.amount,
        f.type,
        f.date,
        f."createdAt",
        SUM(f.amount) OVER (
          PARTITION BY f."customerId"
          ORDER BY f.date ASC, f.id ASC
        )::float as "runningBalance"
      FROM filtered f
      ${shouldPage ? Prisma.sql`LIMIT ${limit} OFFSET ${skip}` : Prisma.sql`LIMIT 200 OFFSET 0`}
    `;

    const total = realBalance !== undefined
      ? await this.prisma.currentAccountEntry.count({ where })
      : rows.length;

    const formatted = rows.map((row) => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName,
      description: row.description,
      amount: this.roundMoney(row.amount),
      balance: this.roundMoney(row.runningBalance),
      type: row.type,
      date: row.date,
      createdAt: row.createdAt,
    }));

    formatted.reverse();

    if (realBalance !== undefined) {
      return shouldPage
        ? { ...paged(formatted, total, page, limit), balance: realBalance }
        : { data: formatted, balance: realBalance };
    }
    return shouldPage ? paged(formatted, total, page, limit) : formatted;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  addEntry(tenantId: string, userId: string, role: string, data: any): any {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo la cuenta owner puede cargar ajustes manuales de cuenta corriente');
    }

    return this.prisma.currentAccountEntry.create({
      data: {
        tenantId,
        createdById: userId,
        customerId: data.customerId,
        documentId: data.documentId || null,
        type: data.type || 'ADJUSTMENT',
        amount: Number(data.amount || 0),
        description: data.description || 'Ajuste manual',
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }
}
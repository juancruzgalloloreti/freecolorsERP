import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { pageParams, paged } from '../common/pagination';

@Injectable()
export class CurrentAccountService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number | string; limit?: number | string; customerId?: string; dateFrom?: string; dateTo?: string; search?: string } = {}): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 100, 300);
    const where: any = { tenantId, customerId: query.customerId };
    if (query.dateFrom || query.dateTo) {
      where.date = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
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
        documentId: string | null;
        documentType: string | null;
        documentNumber: number | null;
        puntoDeVentaNumber: number | null;
      }>
    >`
      WITH running AS (
        SELECT
          e.id,
          e."customerId",
          c.name as "customerName",
          e.description,
          e.amount,
          e.type,
          e.date,
          e."createdAt",
          e."documentId",
          d.type::text as "documentType",
          d.number as "documentNumber",
          pv.number as "puntoDeVentaNumber",
          SUM(e.amount) OVER (
            PARTITION BY e."customerId"
            ORDER BY e.date ASC, e.id ASC
          )::float as "runningBalance"
        FROM "current_account_entries" e
        JOIN "customers" c ON c.id = e."customerId"
        LEFT JOIN "documents" d ON d.id = e."documentId"
        LEFT JOIN "puntos_de_venta" pv ON pv.id = d."puntoDeVentaId"
        WHERE e."tenantId" = ${tenantId}
          ${query.customerId ? Prisma.sql`AND e."customerId" = ${query.customerId}` : Prisma.empty}
          ${query.search ? Prisma.sql`AND (e.description ILIKE ${'%' + query.search + '%'} OR c.name ILIKE ${'%' + query.search + '%'})` : Prisma.empty}
      )
      SELECT
        r.id,
        r."customerId",
        r."customerName",
        r.description,
        r.amount,
        r.type,
        r.date,
        r."createdAt",
        r."documentId",
        r."documentType",
        r."documentNumber",
        r."puntoDeVentaNumber",
        r."runningBalance"
      FROM running r
      WHERE 1=1
        ${query.dateFrom ? Prisma.sql`AND r."date" >= ${new Date(query.dateFrom)}` : Prisma.empty}
        ${query.dateTo ? Prisma.sql`AND r."date" <= ${new Date(query.dateTo)}` : Prisma.empty}
      ORDER BY r.date DESC, r.id DESC
      ${shouldPage ? Prisma.sql`LIMIT ${limit} OFFSET ${skip}` : Prisma.sql`LIMIT 200 OFFSET 0`}
    `;

    const total = await this.prisma.currentAccountEntry.count({ where });

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
      documentId: row.documentId,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      puntoDeVentaNumber: row.puntoDeVentaNumber,
    }));

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

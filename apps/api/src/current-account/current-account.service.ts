import { ForbiddenException, Injectable } from '@nestjs/common';
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
    const [entries, total, balanceRows] = await Promise.all([
      this.prisma.currentAccountEntry.findMany({
        where,
        include: { customer: true, document: true },
        orderBy: { date: 'desc' },
        skip: shouldPage ? skip : undefined,
        take: shouldPage || query.limit ? limit : 200,
      }),
      shouldPage ? this.prisma.currentAccountEntry.count({ where }) : Promise.resolve(0),
      this.prisma.currentAccountEntry.groupBy({
        by: ['customerId'],
        where: { tenantId },
        _sum: { amount: true },
      }),
    ]);
    const balances = new Map<string, number>();
    for (const row of balanceRows) {
      balances.set(row.customerId, Number(row._sum.amount ?? 0));
    }
    const rows = entries.map((entry) => ({
      id: entry.id,
      customerId: entry.customerId,
      customerName: entry.customer.name,
      description: entry.description,
      amount: Number(entry.amount),
      balance: balances.get(entry.customerId) ?? 0,
      type: entry.type,
      date: entry.date,
      createdAt: entry.createdAt,
    }));
    return shouldPage ? paged(rows, total, page, limit) : rows;
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



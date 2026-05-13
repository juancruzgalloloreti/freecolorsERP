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
    const entries = await this.prisma.currentAccountEntry.findMany({
      where,
      include: { customer: true, document: true },
      orderBy: { date: 'asc' },
      skip: shouldPage ? skip : undefined,
      take: (shouldPage || query.limit) ? limit : 200,
    });
    const total = shouldPage ? await this.prisma.currentAccountEntry.count({ where }) : entries.length;

    // Compute running balance per entry (cumulative by date)
    const runningBalance = new Map<string, number>();
    const rows = entries.map((entry) => {
      const prev = runningBalance.get(entry.customerId) ?? 0;
      const amount = Number(entry.amount);
      const balance = this.roundMoney(prev + amount);
      runningBalance.set(entry.customerId, balance);
      return {
        id: entry.id,
        customerId: entry.customerId,
        customerName: entry.customer.name,
        description: entry.description,
        amount,
        balance,
        type: entry.type,
        date: entry.date,
        createdAt: entry.createdAt,
      };
    });
    // Reverse to show most recent first (entries were fetched chronological)
    rows.reverse();
    return shouldPage ? paged(rows, total, page, limit) : rows;
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



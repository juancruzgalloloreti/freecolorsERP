import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type SalesSummaryGroup = 'month' | 'cuit' | 'document' | 'receipt' | 'pos' | 'locality' | 'account' | 'user' | 'userMl';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<any> {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [totalProducts, totalCustomers, documentsThisMonth, salesDocs, lowStockRows] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.document.count({ where: { tenantId, date: { gte: start } } }),
      this.prisma.document.findMany({ where: { tenantId, status: 'CONFIRMED', date: { gte: start }, type: { in: ['INVOICE_A', 'INVOICE_B', 'INVOICE_C'] } }, select: { total: true } }),
      this.prisma.stockMovement.groupBy({ by: ['productId', 'depositId'], where: { tenantId }, _sum: { quantity: true } }),
    ]);

    return {
      totalProducts,
      totalCustomers,
      documentsThisMonth,
      salesThisMonth: salesDocs.reduce((sum, doc) => sum + Number(doc.total), 0),
      lowStockCount: lowStockRows.filter((row) => Number(row._sum.quantity ?? 0) > 0 && Number(row._sum.quantity ?? 0) < 5).length,
    };
  }

  async salesSummary(tenantId: string, query: { dateFrom?: string; dateTo?: string; groupBy?: SalesSummaryGroup; receiptType?: string }): Promise<any> {
    const today = new Date();
    const start = query.dateFrom ? this.startOfDay(new Date(query.dateFrom)) : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = query.dateTo ? this.endExclusive(new Date(query.dateTo)) : this.endExclusive(today);
    const groupBy = this.normalizeSalesGroup(query.groupBy);
    const allowedTypes = ['INVOICE_A', 'INVOICE_B', 'INVOICE_C', 'CREDIT_NOTE_A', 'CREDIT_NOTE_B'];
    const typeFilter = query.receiptType && allowedTypes.includes(query.receiptType) ? [query.receiptType] : allowedTypes;

    const docs = await this.prisma.document.findMany({
      where: {
        tenantId,
        status: 'CONFIRMED',
        type: { in: typeFilter as any[] },
        date: { gte: start, lt: end },
      },
      include: {
        customer: true,
        puntoDeVenta: true,
        createdBy: true,
        payments: true,
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    const rows = new Map<string, any>();
    for (const doc of docs) {
      const sign = String(doc.type).startsWith('CREDIT_NOTE') ? -1 : 1;
      const key = this.salesGroupKey(doc, groupBy);
      const current = rows.get(key) ?? {
        key,
        concept: key,
        currentAccount: 0,
        cash: 0,
        net: 0,
        tax: 0,
        otherTaxes: 0,
        total: 0,
        count: 0,
      };
      const paidToAccount = doc.payments
        .filter((payment: any) => payment.method === 'CURRENT_ACCOUNT')
        .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
      const paidCash = doc.payments
        .filter((payment: any) => payment.method !== 'CURRENT_ACCOUNT')
        .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
      const total = Number(doc.total || 0);
      const cash = doc.payments.length > 0 ? paidCash : total;
      const account = doc.payments.length > 0 ? paidToAccount : 0;

      current.currentAccount += sign * account;
      current.cash += sign * cash;
      current.net += sign * Number(doc.subtotal || 0);
      current.tax += sign * Number(doc.taxAmount || 0);
      current.total += sign * total;
      current.count += 1;
      rows.set(key, current);
    }

    const data = [...rows.values()].sort((a, b) => String(a.concept).localeCompare(String(b.concept), 'es'));
    const totals = data.reduce((acc, row) => ({
      currentAccount: acc.currentAccount + row.currentAccount,
      cash: acc.cash + row.cash,
      net: acc.net + row.net,
      tax: acc.tax + row.tax,
      otherTaxes: acc.otherTaxes + row.otherTaxes,
      total: acc.total + row.total,
      count: acc.count + row.count,
    }), { currentAccount: 0, cash: 0, net: 0, tax: 0, otherTaxes: 0, total: 0, count: 0 });

    return {
      groupBy,
      dateFrom: start,
      dateTo: new Date(end.getTime() - 1),
      rows: data.map((row) => this.roundSalesRow(row)),
      totals: this.roundSalesRow({ concept: 'Totales', ...totals }),
    };
  }

  async management(tenantId: string, query: { dateFrom?: string; dateTo?: string } = {}): Promise<any> {
    const today = new Date();
    const start = query.dateFrom ? this.startOfDay(new Date(query.dateFrom)) : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = query.dateTo ? this.endExclusive(new Date(query.dateTo)) : this.endExclusive(today);
    const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    const previousEnd = new Date(start);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - periodDays);

    const invoiceTypes = ['INVOICE_A', 'INVOICE_B', 'INVOICE_C'];
    const [docs, previousDocs, draftBudgets, pendingOrders, ccEntries, stockRows, products] = await Promise.all([
      this.prisma.document.findMany({
        where: { tenantId, status: 'CONFIRMED', type: { in: invoiceTypes as any[] }, date: { gte: start, lt: end } },
        include: { items: { include: { product: { include: { brand: true, category: true } } } }, payments: true },
      }),
      this.prisma.document.findMany({
        where: { tenantId, status: 'CONFIRMED', type: { in: invoiceTypes as any[] }, date: { gte: previousStart, lt: previousEnd } },
        select: { total: true },
      }),
      this.prisma.document.count({ where: { tenantId, status: 'DRAFT', type: 'BUDGET', date: { gte: start, lt: end } } }),
      this.prisma.salesOrder.count({ where: { tenantId, status: { in: ['PENDING', 'PREPARATION', 'BILLABLE'] as any[] } } }),
      this.prisma.currentAccountEntry.findMany({ where: { tenantId, date: { lt: end } }, select: { amount: true } }),
      this.prisma.stockMovement.groupBy({ by: ['productId'], where: { tenantId }, _sum: { quantity: true } }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: { brand: true, category: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const salesTotal = docs.reduce((sum, doc) => sum + Number(doc.total || 0), 0);
    const previousSalesTotal = previousDocs.reduce((sum, doc) => sum + Number(doc.total || 0), 0);
    const cashTotal = docs.reduce((sum, doc) => {
      if (doc.payments.length === 0) return sum + Number(doc.total || 0);
      return sum + doc.payments
        .filter((payment: any) => payment.method !== 'CURRENT_ACCOUNT')
        .reduce((inner: number, payment: any) => inner + Number(payment.amount || 0), 0);
    }, 0);
    const accountTotal = docs.reduce((sum, doc) => sum + doc.payments
      .filter((payment: any) => payment.method === 'CURRENT_ACCOUNT')
      .reduce((inner: number, payment: any) => inner + Number(payment.amount || 0), 0), 0);
    const currentAccountBalance = ccEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const productSales = new Map<string, any>();
    for (const doc of docs) {
      for (const item of doc.items) {
        const current = productSales.get(item.productId) ?? {
          productId: item.productId,
          code: item.product?.code ?? '',
          name: item.product?.name ?? item.description,
          brandName: item.product?.brand?.name ?? null,
          categoryName: item.product?.category?.name ?? null,
          quantity: 0,
          total: 0,
        };
        current.quantity += Number(item.quantity || 0);
        current.total += Number(item.total || 0);
        productSales.set(item.productId, current);
      }
    }

    const stockByProduct = new Map(stockRows.map((row) => [row.productId, Number(row._sum.quantity ?? 0)]));
    const lowStock = products
      .map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        brandName: product.brand?.name ?? null,
        stock: stockByProduct.get(product.id) ?? 0,
      }))
      .filter((product) => product.stock > 0 && product.stock < 5)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8);
    const missingCost = products
      .filter((product) => product.replacementCost === null && product.lastPurchaseCost === null && product.averageCost === null)
      .slice(0, 8)
      .map((product) => ({ id: product.id, code: product.code, name: product.name }));

    const insights = [
      currentAccountBalance > 0 ? `Hay ${this.formatMoney(currentAccountBalance)} pendientes en cuenta corriente.` : '',
      lowStock.length > 0 ? `${lowStock.length} productos activos están por debajo de 5 unidades.` : '',
      missingCost.length > 0 ? `${missingCost.length} productos no tienen costo cargado; no se puede medir margen real.` : '',
      draftBudgets > 0 ? `${draftBudgets} presupuestos del periodo siguen en borrador.` : '',
      pendingOrders > 0 ? `${pendingOrders} pedidos siguen pendientes/preparación/facturables.` : '',
      previousSalesTotal > 0 && salesTotal < previousSalesTotal ? `La venta del periodo está ${Math.abs((salesTotal / previousSalesTotal - 1) * 100).toFixed(1)}% debajo del periodo anterior.` : '',
    ].filter(Boolean);

    return {
      dateFrom: start,
      dateTo: new Date(end.getTime() - 1),
      kpis: {
        salesTotal: this.roundMoney(salesTotal),
        previousSalesTotal: this.roundMoney(previousSalesTotal),
        salesVariationPct: previousSalesTotal > 0 ? this.roundMoney((salesTotal / previousSalesTotal - 1) * 100) : null,
        ticketAverage: docs.length > 0 ? this.roundMoney(salesTotal / docs.length) : 0,
        confirmedDocuments: docs.length,
        cashTotal: this.roundMoney(cashTotal),
        currentAccountSales: this.roundMoney(accountTotal),
        currentAccountBalance: this.roundMoney(currentAccountBalance),
        draftBudgets,
        pendingOrders,
      },
      topProducts: [...productSales.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
        .map((row) => ({ ...row, quantity: this.roundMoney(row.quantity), total: this.roundMoney(row.total) })),
      lowStock,
      missingCost,
      insights,
    };
  }

  async sales(tenantId: string, query: { dateFrom?: string; dateTo?: string; type?: string; status?: string } = {}): Promise<any> {
    const today = new Date();
    const start = query.dateFrom ? this.startOfDay(new Date(query.dateFrom)) : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = query.dateTo ? this.endExclusive(new Date(query.dateTo)) : this.endExclusive(today);
    const allowedTypes = ['INVOICE_A', 'INVOICE_B', 'INVOICE_C', 'CREDIT_NOTE_A', 'CREDIT_NOTE_B', 'REMITO', 'BUDGET'];
    const type = query.type && allowedTypes.includes(query.type) ? query.type : undefined;
    const status = query.status && ['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(query.status) ? query.status : undefined;

    const docs = await this.prisma.document.findMany({
      where: {
        tenantId,
        ...(type ? { type: type as any } : { type: { in: allowedTypes as any[] } }),
        ...(status ? { status: status as any } : {}),
        date: { gte: start, lt: end },
      },
      include: { customer: true, puntoDeVenta: true, createdBy: true, payments: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    return docs.map((doc) => ({
      id: doc.id,
      date: doc.date,
      type: doc.type,
      typeLabel: this.documentTypeLabel(doc.type),
      status: doc.status,
      number: doc.number,
      puntoDeVenta: doc.puntoDeVenta?.number ?? null,
      customerName: doc.customer?.name ?? 'Consumidor final',
      customerCuit: doc.customer?.cuit ?? null,
      userName: doc.createdBy ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : '',
      paymentMethods: doc.payments.map((payment: any) => payment.method).join(', '),
      subtotal: Number(doc.subtotal || 0),
      taxAmount: Number(doc.taxAmount || 0),
      total: Number(doc.total || 0),
    }));
  }

  async stock(tenantId: string): Promise<any> {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      include: { brand: true, category: true },
      orderBy: { name: 'asc' },
    });
    const movements = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId },
      _sum: { quantity: true },
      _avg: { unitCost: true },
    });
    const stockByProduct = new Map(movements.map((row) => [row.productId, row]));

    return products.map((product) => {
      const stock = stockByProduct.get(product.id);
      const quantity = Number(stock?._sum.quantity ?? 0);
      const unitCost = Number(stock?._avg.unitCost ?? 0);
      return {
        id: product.id,
        code: product.code,
        name: product.name,
        brandName: product.brand?.name ?? null,
        categoryName: product.category?.name ?? null,
        unit: product.unit,
        isActive: product.isActive,
        quantity,
        unitCost: this.roundMoney(unitCost),
        stockValue: this.roundMoney(quantity * unitCost),
        status: quantity <= 0 ? 'out' : quantity < 5 ? 'low' : 'ok',
      };
    });
  }

  private salesGroupKey(doc: any, groupBy: SalesSummaryGroup): string {
    if (groupBy === 'month') {
      return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(doc.date);
    }
    if (groupBy === 'cuit') return doc.customer?.cuit || 'Sin CUIT';
    if (groupBy === 'document') return doc.customer ? `${doc.customer.name}${doc.customer.cuit ? ` - ${doc.customer.cuit}` : ''}` : 'Consumidor final';
    if (groupBy === 'receipt') return this.documentTypeLabel(doc.type);
    if (groupBy === 'pos') return doc.puntoDeVenta ? `${String(doc.puntoDeVenta.number).padStart(4, '0')} - ${doc.puntoDeVenta.name}` : 'Sin punto de venta';
    if (groupBy === 'locality') return doc.customer?.city || 'Sin localidad';
    if (groupBy === 'account') return doc.customer?.name || 'Consumidor final';
    if (groupBy === 'user' || groupBy === 'userMl') return doc.createdBy ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : 'Sin usuario';
    return 'Sin agrupar';
  }

  private normalizeSalesGroup(value?: string): SalesSummaryGroup {
    const valid = new Set(['month', 'cuit', 'document', 'receipt', 'pos', 'locality', 'account', 'user', 'userMl']);
    return valid.has(String(value)) ? value as SalesSummaryGroup : 'month';
  }

  private startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private endExclusive(date: Date): Date {
    const next = this.startOfDay(date);
    next.setDate(next.getDate() + 1);
    return next;
  }

  private roundSalesRow(row: any): any {
    return {
      ...row,
      currentAccount: this.roundMoney(row.currentAccount),
      cash: this.roundMoney(row.cash),
      net: this.roundMoney(row.net),
      tax: this.roundMoney(row.tax),
      otherTaxes: this.roundMoney(row.otherTaxes),
      total: this.roundMoney(row.total),
    };
  }

  private roundMoney(value: number): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  private documentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      INVOICE_A: 'Factura A',
      INVOICE_B: 'Factura B',
      INVOICE_C: 'Factura C',
      CREDIT_NOTE_A: 'Nota credito A',
      CREDIT_NOTE_B: 'Nota credito B',
    };
    return labels[type] || type;
  }
}



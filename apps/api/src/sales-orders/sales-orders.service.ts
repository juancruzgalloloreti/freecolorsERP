import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, SalesOrderStatus } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission } from '../common/permissions';
import { pageParams, paged } from '../common/pagination';

type SalesOrderItemInput = {
  productId?: string;
  description?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  discount?: string | number;
  taxRate?: string | number;
};

type SalesOrderWriteData = {
  customerId?: string | null;
  date?: string;
  dueDate?: string;
  notes?: string | null;
  items?: SalesOrderItemInput[];
};

@Injectable()
export class SalesOrdersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string, query: { status?: string; search?: string; page?: string | number; limit?: string | number }): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 60, 200);
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { number: Number(query.search) || -1 },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: { customer: true, createdBy: true, document: true, items: true },
        orderBy: [{ date: 'desc' }, { number: 'desc' }],
        skip: shouldPage ? skip : undefined,
        take: shouldPage || query.limit ? limit : 200,
      }),
      shouldPage ? this.prisma.salesOrder.count({ where }) : Promise.resolve(0),
    ]);
    const rows = orders.map((order) => this.toListDto(order));
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }

  async get(tenantId: string, id: string): Promise<any> {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        createdBy: true,
        document: true,
        items: { include: { product: { include: { brand: true, category: true } } }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Pedido inexistente');
    return this.toDetailDto(order);
  }

  async create(tenantId: string, userId: string, role: string, data: SalesOrderWriteData): Promise<any> {
    assertPermission(role, 'documents.create');
    const order = await this.prisma.$transaction(async (tx) => {
      const computed = this.computeItems(data.items ?? []);
      if (computed.length === 0) throw new BadRequestException('El pedido necesita al menos un item');
      const totals = this.computeTotals(computed);
      const next = await tx.salesOrder.aggregate({ where: { tenantId }, _max: { number: true } });
      return tx.salesOrder.create({
        data: {
          tenantId,
          createdById: userId,
          number: Number(next._max.number ?? 0) + 1,
          customerId: data.customerId || null,
          date: data.date ? new Date(data.date) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes || null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          items: { create: this.itemCreates(computed) },
        },
        include: { customer: true, createdBy: true, document: true, items: true },
      });
    });
    await this.audit.record({
      tenantId,
      userId,
      action: 'sales_orders.create',
      entityType: 'SalesOrder',
      entityId: order.id,
      summary: `Pedido #${order.number} creado`,
      metadata: { total: order.total },
    });
    return this.toDetailDto(order);
  }

  async update(tenantId: string, role: string, id: string, data: SalesOrderWriteData): Promise<any> {
    assertPermission(role, 'documents.create');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.salesOrder.findFirst({ where: { id, tenantId }, select: { id: true, status: true } });
      if (!current) throw new NotFoundException('Pedido inexistente');
      if (current.status === SalesOrderStatus.INVOICED || current.status === SalesOrderStatus.CANCELLED) {
        throw new BadRequestException('No se puede editar un pedido facturado o cancelado');
      }
      const computed = this.computeItems(data.items ?? []);
      if (computed.length === 0) throw new BadRequestException('El pedido necesita al menos un item');
      const totals = this.computeTotals(computed);
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
      const order = await tx.salesOrder.update({
        where: { id },
        data: {
          customerId: data.customerId === undefined ? undefined : data.customerId || null,
          date: data.date ? new Date(data.date) : undefined,
          dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes === undefined ? undefined : data.notes || null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          items: { create: this.itemCreates(computed) },
        },
        include: { customer: true, createdBy: true, document: true, items: true },
      });
      return this.toDetailDto(order);
    });
  }

  async changeStatus(tenantId: string, userId: string, role: string, id: string, rawStatus: string): Promise<any> {
    assertPermission(role, 'documents.create');
    const status = String(rawStatus || '').toUpperCase() as SalesOrderStatus;
    if (!Object.values(SalesOrderStatus).includes(status)) throw new BadRequestException('Estado de pedido inválido');
    const current = await this.prisma.salesOrder.findFirst({ where: { id, tenantId }, select: { id: true, number: true, status: true } });
    if (!current) throw new NotFoundException('Pedido inexistente');
    if (current.status === SalesOrderStatus.INVOICED && status !== SalesOrderStatus.INVOICED) {
      throw new BadRequestException('Un pedido facturado no vuelve de estado');
    }
    const order = await this.prisma.salesOrder.update({
      where: { id },
      data: { status },
      include: { customer: true, createdBy: true, document: true, items: true },
    });
    await this.audit.record({
      tenantId,
      userId,
      action: 'sales_orders.status',
      entityType: 'SalesOrder',
      entityId: id,
      summary: `Pedido #${current.number}: ${current.status} -> ${status}`,
      metadata: { from: current.status, to: status },
    });
    return this.toDetailDto(order);
  }

  async convertToDocument(tenantId: string, userId: string, role: string, id: string, data: { type?: DocumentType; puntoDeVentaId?: string | null }): Promise<any> {
    assertPermission(role, 'documents.create');
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Pedido inexistente');
      if (order.status === SalesOrderStatus.CANCELLED) throw new BadRequestException('No se puede facturar un pedido cancelado');
      if (order.documentId) throw new BadRequestException('El pedido ya tiene documento asociado');
      const type = data.type ?? DocumentType.INVOICE_B;
      const document = await tx.document.create({
        data: {
          tenantId,
          createdById: userId,
          type,
          status: DocumentStatus.DRAFT,
          customerId: order.customerId,
          puntoDeVentaId: this.needsPuntoDeVenta(type) ? data.puntoDeVentaId || null : null,
          date: new Date(),
          notes: this.appendNote(order.notes, `Generado desde pedido #${order.number}`),
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          total: order.total,
          items: {
            create: order.items.map((item: any) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxRate: item.taxRate,
              subtotal: item.subtotal,
              taxAmount: item.taxAmount,
              total: item.total,
              sortOrder: item.sortOrder,
            })),
          },
        },
      });
      const updated = await tx.salesOrder.update({
        where: { id },
        data: { status: SalesOrderStatus.INVOICED, documentId: document.id },
        include: { customer: true, createdBy: true, document: true, items: true },
      });
      await this.audit.record({
        tenantId,
        userId,
        action: 'sales_orders.to_document',
        entityType: 'SalesOrder',
        entityId: id,
        summary: `Pedido #${order.number} convertido a documento`,
        metadata: { documentId: document.id, type },
      });
      return this.toDetailDto(updated);
    });
  }

  async exportCsv(tenantId: string, query: { status?: string }): Promise<string> {
    const rows = await this.prisma.salesOrder.findMany({
      where: { tenantId, ...(query.status ? { status: query.status as SalesOrderStatus } : {}) },
      include: { customer: true, items: true },
      orderBy: [{ date: 'desc' }, { number: 'desc' }],
      take: 1000,
    });
    const lines = [['Numero', 'Fecha', 'Estado', 'Cliente', 'Items', 'Subtotal', 'IVA', 'Total'].map((cell) => this.csvCell(cell)).join(';')];
    for (const order of rows) {
      lines.push([
        order.number,
        order.date.toISOString().slice(0, 10),
        order.status,
        order.customer?.name || 'Consumidor final',
        order.items.length,
        this.formatNumber(Number(order.subtotal)),
        this.formatNumber(Number(order.taxAmount)),
        this.formatNumber(Number(order.total)),
      ].map((cell) => this.csvCell(cell)).join(';'));
    }
    return lines.join('\r\n');
  }

  private computeItems(items: SalesOrderItemInput[]): Array<Required<SalesOrderItemInput> & { subtotal: number; taxAmount: number; total: number; sortOrder: number }> {
    return items
      .filter((item) => item.productId)
      .map((item, index) => {
        const quantity = this.toPositiveNumber(item.quantity, 'Cantidad');
        const unitPrice = this.toNumber(item.unitPrice);
        const discount = Math.min(Math.max(this.toNumber(item.discount), 0), 100);
        const taxRate = Math.min(Math.max(this.toNumber(item.taxRate), 0), 100);
        const subtotal = quantity * unitPrice * (1 - discount / 100);
        const taxAmount = subtotal * taxRate / 100;
        return {
          productId: String(item.productId),
          description: item.description || 'Item',
          quantity,
          unitPrice,
          discount,
          taxRate,
          subtotal,
          taxAmount,
          total: subtotal + taxAmount,
          sortOrder: index,
        };
      });
  }

  private computeTotals(items: Array<{ subtotal: number; taxAmount: number }>): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = this.roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
    const taxAmount = this.roundMoney(items.reduce((sum, item) => sum + item.taxAmount, 0));
    return { subtotal, taxAmount, total: this.roundMoney(subtotal + taxAmount) };
  }

  private itemCreates(items: ReturnType<SalesOrdersService['computeItems']>): any[] {
    return items.map((item) => ({
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      subtotal: this.roundMoney(item.subtotal),
      taxAmount: this.roundMoney(item.taxAmount),
      total: this.roundMoney(item.total),
      sortOrder: item.sortOrder,
    }));
  }

  private toListDto(order: any): any {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      customerName: order.customer?.name ?? null,
      date: order.date,
      dueDate: order.dueDate,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      itemCount: order.items?.length ?? 0,
      documentId: order.documentId,
      createdByName: order.createdBy ? `${order.createdBy.firstName} ${order.createdBy.lastName}` : '',
      notes: order.notes,
    };
  }

  private toDetailDto(order: any): any {
    return {
      ...this.toListDto(order),
      customer: order.customer,
      document: order.document,
      items: (order.items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productCode: item.product?.code,
        brandName: item.product?.brand?.name,
        categoryName: item.product?.category?.name,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
        subtotal: Number(item.subtotal),
        taxAmount: Number(item.taxAmount),
        total: Number(item.total),
        sortOrder: item.sortOrder,
      })),
    };
  }

  private needsPuntoDeVenta(type: DocumentType): boolean {
    const fiscalTypes: DocumentType[] = [DocumentType.INVOICE_A, DocumentType.INVOICE_B, DocumentType.INVOICE_C, DocumentType.CREDIT_NOTE_A, DocumentType.CREDIT_NOTE_B, DocumentType.DEBIT_NOTE_A, DocumentType.DEBIT_NOTE_B];
    return fiscalTypes.includes(type);
  }

  private toNumber(value: unknown): number {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toPositiveNumber(value: unknown, label: string): number {
    const parsed = this.toNumber(value);
    if (parsed <= 0) throw new BadRequestException(`${label} debe ser mayor a cero`);
    return parsed;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private appendNote(notes: string | null | undefined, next: string): string {
    return [notes, next].filter(Boolean).join('\n');
  }

  private formatNumber(value: number): string {
    return String(Math.round(value * 100) / 100);
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? '');
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}

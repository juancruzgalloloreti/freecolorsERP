import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, PaymentMethod, StockMovementType } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashService } from '../cash/cash.service';
import { assertPermission, maxDiscountForRole } from '../common/permissions';
import { pageParams, paged } from '../common/pagination';

type DocumentWriteData = {
  type?: DocumentType;
  customerId?: string | null;
  supplierId?: string | null;
  puntoDeVentaId?: string | null;
  depositId?: string | null;
  priceListId?: string | null;
  date?: string;
  dueDate?: string;
  notes?: string | null;
  roundTotal?: boolean;
  items?: DocumentItemInput[];
};

type DocumentItemInput = {
  productId?: string;
  description?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  discount?: string | number;
  taxRate?: string | number;
};

type ConfirmPayload = {
  depositId?: string;
  allowNegativeStock?: boolean;
  paymentMode?: 'CASH' | 'CURRENT_ACCOUNT' | 'MIXED';
  payments?: Array<{
    method?: PaymentMethod;
    amount?: string | number;
    reference?: string;
    notes?: string;
  }>;
};

const STOCK_DOCUMENT_TYPES = new Set<DocumentType>([
  DocumentType.INVOICE_A,
  DocumentType.INVOICE_B,
  DocumentType.INVOICE_C,
  DocumentType.REMITO,
]);

const CUSTOMER_CHARGE_TYPES = new Set<DocumentType>([
  DocumentType.INVOICE_A,
  DocumentType.INVOICE_B,
  DocumentType.INVOICE_C,
]);

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private cash: CashService) {}

  async findAll(tenantId: string, query: { types?: string; status?: string; type?: string; search?: string; page?: string | number; limit?: string | number; dateFrom?: string; dateTo?: string }): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 60, 200);
    const where: any = { tenantId };
    if (query.types) where.type = { in: query.types.split(',').filter(Boolean) };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.date = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [docs, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: { customer: true, supplier: true, puntoDeVenta: true, createdBy: true, items: true, payments: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: shouldPage ? skip : undefined,
        take: shouldPage || query.limit ? limit : 200,
      }),
      shouldPage ? this.prisma.document.count({ where }) : Promise.resolve(0),
    ]);
    const q = query.search?.toLowerCase().trim();
    const rows = docs.map((d) => this.toListDto(d)).filter((d) => !q || [
      d.customerName,
      d.customerCuit,
      d.supplierName,
      d.number,
      d.type,
      d.status,
      d.notes,
    ].join(' ').toLowerCase().includes(q));
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }

  async get(tenantId: string, id: string): Promise<any> {
    const document = await this.prisma.document.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        supplier: true,
        puntoDeVenta: true,
        createdBy: true,
        payments: true,
        ccEntries: true,
        stockMovements: { include: { product: true, deposit: true }, orderBy: { createdAt: 'asc' } },
        items: { include: { product: { include: { brand: true, category: true } } }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!document) throw new NotFoundException('Documento inexistente');
    return this.toDetailDto(document);
  }

  puntos(tenantId: string): any {
    return this.prisma.puntoDeVenta.findMany({ where: { tenantId, isActive: true }, orderBy: { number: 'asc' } });
  }

  async create(tenantId: string, userId: string, role: string, data: DocumentWriteData): Promise<any> {
    assertPermission(role, 'documents.create');
    const document = await this.prisma.$transaction(async (tx) => this.writeDraft(tx, tenantId, userId, role, data));
    await this.audit.record({
      tenantId,
      userId,
      action: 'documents.create',
      entityType: 'Document',
      entityId: document.id,
      summary: `Documento ${document.type} creado`,
      metadata: { total: document.total, type: document.type },
    });
    return document;
  }

  async update(tenantId: string, role: string, id: string, data: DocumentWriteData): Promise<any> {
    assertPermission(role, 'documents.create');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.document.findFirst({ where: { id, tenantId }, select: { id: true, status: true, createdById: true } });
      if (!current) throw new NotFoundException('Documento inexistente');
      if (current.status !== DocumentStatus.DRAFT) {
        throw new BadRequestException('Solo se pueden editar documentos en borrador');
      }

      const computed = this.computeItems(data.items ?? []);
      await this.assertPricesAllowed(tx, tenantId, role, data.priceListId, computed);
      const totals = this.computeTotals(computed, data.roundTotal);
      await tx.documentItem.deleteMany({ where: { documentId: id } });
      const updated = await tx.document.update({
        where: { id },
        data: {
          type: data.type,
          customerId: data.customerId === undefined ? undefined : data.customerId || null,
          supplierId: data.supplierId === undefined ? undefined : data.supplierId || null,
          puntoDeVentaId: data.puntoDeVentaId === undefined ? undefined : data.puntoDeVentaId || null,
          date: data.date ? new Date(data.date) : undefined,
          dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes === undefined ? undefined : data.notes || null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          items: { create: this.itemCreates(computed) },
        },
        include: { items: true, customer: true, supplier: true, puntoDeVenta: true, createdBy: true, payments: true },
      });
      return this.toDetailDto(updated);
    });
  }

  async confirm(tenantId: string, userId: string, role: string, id: string, payload: ConfirmPayload = {}): Promise<any> {
    assertPermission(role, 'documents.confirm');
    await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: { id, tenantId },
        include: { items: true, customer: true, puntoDeVenta: true, payments: true },
      });
      if (!document) throw new NotFoundException('Documento inexistente');
      if (document.status !== DocumentStatus.DRAFT) {
        throw new BadRequestException('Solo se pueden confirmar documentos en borrador');
      }
      if (document.items.length === 0) {
        throw new BadRequestException('No se puede confirmar un documento sin items');
      }
      this.assertDiscountAllowed(role, document.items);

      const depositId = await this.resolveDepositId(tx, tenantId, payload.depositId);
      if (STOCK_DOCUMENT_TYPES.has(document.type)) {
        await this.createSaleStockMovements(tx, tenantId, userId, document, depositId, role, Boolean(payload.allowNegativeStock));
      }

      await this.createPaymentsAndCc(tx, tenantId, userId, document, payload);

      const number = document.number ?? await this.nextNumber(tx, tenantId, document.type, document.puntoDeVentaId);
      await tx.document.update({
        where: { id },
        data: { status: DocumentStatus.CONFIRMED, number },
      });
    }, { timeout: 30_000 });
    await this.audit.record({
      tenantId,
      userId,
      action: 'documents.confirm',
      entityType: 'Document',
      entityId: id,
      summary: 'Documento confirmado',
      metadata: { paymentMode: payload.paymentMode },
    });
    return this.get(tenantId, id);
  }

  async cancel(tenantId: string, userId: string, role: string, id: string, payload: { reason?: string } = {}): Promise<any> {
    assertPermission(role, 'documents.cancel');
    if (!payload.reason?.trim()) throw new BadRequestException('La anulacion requiere motivo');
    await this.prisma.$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: { id, tenantId },
        include: { stockMovements: true, ccEntries: true },
      });
      if (!document) throw new NotFoundException('Documento inexistente');
      if (document.status === DocumentStatus.CANCELLED) {
        throw new BadRequestException('El documento ya estaba anulado');
      }

      if (document.status === DocumentStatus.CONFIRMED) {
        for (const movement of document.stockMovements) {
          await tx.stockMovement.create({
            data: {
              tenantId,
              createdById: userId,
              productId: movement.productId,
              depositId: movement.depositId,
              type: Number(movement.quantity) < 0 ? StockMovementType.RETURN_IN : StockMovementType.RETURN_OUT,
              quantity: Number(movement.quantity) * -1,
              unitCost: movement.unitCost,
              documentId: id,
              notes: `Reversa por anulacion${payload.reason ? `: ${payload.reason}` : ''}`,
            },
          });
        }

        for (const entry of document.ccEntries) {
          await tx.currentAccountEntry.create({
            data: {
              tenantId,
              createdById: userId,
              customerId: entry.customerId,
              documentId: id,
              type: entry.type,
              amount: Number(entry.amount) * -1,
              description: `Reversa CC por anulacion${payload.reason ? `: ${payload.reason}` : ''}`,
              date: new Date(),
            },
          });
        }
      }

      await tx.document.update({
        where: { id },
        data: { status: DocumentStatus.CANCELLED, notes: payload.reason ? this.appendNote(document.notes, `Anulado: ${payload.reason}`) : document.notes },
      });
    }, { timeout: 30_000 });
    await this.audit.record({
      tenantId,
      userId,
      action: 'documents.cancel',
      entityType: 'Document',
      entityId: id,
      summary: `Documento anulado: ${payload.reason}`,
      metadata: { reason: payload.reason },
    });
    return this.get(tenantId, id);
  }

  async convert(tenantId: string, userId: string, role: string, id: string, data: DocumentWriteData): Promise<any> {
    assertPermission(role, 'documents.create');
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.document.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });
      if (!source) throw new NotFoundException('Documento inexistente');
      const targetType = data.type ?? DocumentType.INVOICE_B;
      let puntoDeVentaId = data.puntoDeVentaId ?? source.puntoDeVentaId;
      if (this.needsPuntoDeVenta(targetType) && !puntoDeVentaId) {
        const punto = await tx.puntoDeVenta.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { number: 'asc' },
          select: { id: true },
        });
        puntoDeVentaId = punto?.id ?? null;
      }
      const converted = await this.writeDraft(tx, tenantId, userId, role, {
        ...data,
        type: targetType,
        customerId: data.customerId ?? source.customerId,
        supplierId: data.supplierId ?? source.supplierId,
        puntoDeVentaId,
        priceListId: data.priceListId,
        notes: this.appendNote(data.notes ?? source.notes, `Convertido desde ${source.type}${source.number ? ` #${source.number}` : ''}`),
        items: data.items ?? source.items.map((item) => ({
          productId: item.productId,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          taxRate: Number(item.taxRate),
        })),
      });
      return converted;
    });
  }

  private async writeDraft(tx: any, tenantId: string, userId: string, role: string, data: DocumentWriteData): Promise<any> {
    const type = data.type ?? DocumentType.BUDGET;
    const computed = this.computeItems(data.items ?? []);
    await this.assertPricesAllowed(tx, tenantId, role, data.priceListId, computed);
    const totals = this.computeTotals(computed, data.roundTotal);
    if (computed.length === 0) {
      throw new BadRequestException('El documento necesita al menos un item');
    }
    const document = await tx.document.create({
      data: {
        tenantId,
        createdById: userId,
        type,
        status: DocumentStatus.DRAFT,
        customerId: data.customerId || null,
        supplierId: data.supplierId || null,
        puntoDeVentaId: data.puntoDeVentaId || null,
        date: data.date ? new Date(data.date) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        items: { create: this.itemCreates(computed) },
      },
      include: { items: true, customer: true, supplier: true, puntoDeVenta: true, createdBy: true, payments: true },
    });
    return this.toDetailDto(document);
  }

  private computeItems(items: DocumentItemInput[]): Array<Required<DocumentItemInput> & { subtotal: number; taxAmount: number; total: number; sortOrder: number }> {
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

  private computeTotals(items: Array<{ subtotal: number; taxAmount: number }>, roundTotal?: boolean): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = this.roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
    const taxAmount = this.roundMoney(items.reduce((sum, item) => sum + item.taxAmount, 0));
    const total = roundTotal ? Math.round(subtotal + taxAmount) : this.roundMoney(subtotal + taxAmount);
    return { subtotal, taxAmount, total };
  }

  private itemCreates(items: ReturnType<DocumentsService['computeItems']>): any[] {
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

  private async resolveDepositId(tx: any, tenantId: string, depositId?: string): Promise<string> {
    if (depositId) {
      const deposit = await tx.deposit.findFirst({ where: { id: depositId, tenantId, isActive: true }, select: { id: true } });
      if (!deposit) throw new BadRequestException('Depósito inválido');
      return deposit.id;
    }
    const defaultDeposit = await tx.deposit.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true },
    });
    if (!defaultDeposit) throw new BadRequestException('Falta un depósito activo');
    return defaultDeposit.id;
  }

  private async createSaleStockMovements(tx: any, tenantId: string, userId: string, document: any, depositId: string, role: string, allowNegativeStock: boolean): Promise<void> {
    for (const item of document.items) {
      const current = await tx.stockMovement.aggregate({
        where: { tenantId, productId: item.productId, depositId },
        _sum: { quantity: true },
        _avg: { unitCost: true },
      });
      const available = Number(current._sum.quantity ?? 0);
      const quantity = Number(item.quantity);
      if (available < quantity && !(role === 'OWNER' && allowNegativeStock)) {
        throw new BadRequestException(`Stock insuficiente para ${item.description}. Disponible: ${available}`);
      }
      await tx.stockMovement.create({
        data: {
          tenantId,
          createdById: userId,
          productId: item.productId,
          depositId,
          type: StockMovementType.SALE,
          quantity: quantity * -1,
          unitCost: Number(current._avg.unitCost ?? 0),
          documentId: document.id,
          notes: `Salida por ${document.type}`,
        },
      });
    }
  }

  private async createPaymentsAndCc(tx: any, tenantId: string, userId: string, document: any, payload: ConfirmPayload): Promise<void> {
    if (!CUSTOMER_CHARGE_TYPES.has(document.type)) return;

    const existingPayments = await tx.payment.count({ where: { documentId: document.id } });
    const existingCc = await tx.currentAccountEntry.count({ where: { documentId: document.id } });
    if (existingPayments || existingCc) return;

    const total = Number(document.total);
    const rawPayments = Array.isArray(payload.payments) ? payload.payments : [];
    const payments = rawPayments
      .map((payment) => ({
        method: payment.method ?? PaymentMethod.CASH,
        amount: this.toNumber(payment.amount),
        reference: payment.reference || null,
        notes: payment.notes || null,
      }))
      .filter((payment) => payment.amount > 0);

    if (payments.length === 0) {
      payments.push({
        method: payload.paymentMode === 'CURRENT_ACCOUNT' ? PaymentMethod.CURRENT_ACCOUNT : PaymentMethod.CASH,
        amount: total,
        reference: null,
        notes: payload.paymentMode === 'CURRENT_ACCOUNT' ? 'Venta a cuenta corriente' : 'Caja mostrador',
      });
    }

    for (const payment of payments) {
      await tx.payment.create({
        data: {
          tenantId,
          documentId: document.id,
          method: payment.method,
          amount: this.roundMoney(payment.amount),
          reference: payment.reference,
          notes: payment.notes,
          createdById: userId,
        },
      });
      if (payment.method !== PaymentMethod.CURRENT_ACCOUNT) {
        await this.cash.recordSalePayment(
          tx,
          tenantId,
          userId,
          document.id,
          payment.method,
          payment.amount,
          payment.notes || `Cobro ${document.type}`,
        );
      }
    }

    const currentAccountAmount = payments
      .filter((payment) => payment.method === PaymentMethod.CURRENT_ACCOUNT)
      .reduce((sum, payment) => sum + payment.amount, 0);
    if (currentAccountAmount > 0) {
      if (!document.customerId) {
        throw new BadRequestException('La cuenta corriente requiere un cliente');
      }
      await tx.currentAccountEntry.create({
        data: {
          tenantId,
          createdById: userId,
          customerId: document.customerId,
          documentId: document.id,
          type: 'INVOICE',
          amount: this.roundMoney(currentAccountAmount),
          description: `Venta ${document.type}`,
          date: new Date(),
        },
      });
    }
  }

  private async nextNumber(tx: any, tenantId: string, type: DocumentType, puntoDeVentaId: string | null): Promise<number | null> {
    if (type === DocumentType.BUDGET || type === DocumentType.REMITO || type === DocumentType.PURCHASE_ORDER) {
      const lastInternal = await tx.document.aggregate({
        where: { tenantId, type, number: { not: null } },
        _max: { number: true },
      });
      return Number(lastInternal._max.number ?? 0) + 1;
    }
    if (!puntoDeVentaId) throw new BadRequestException('El documento fiscal necesita punto de venta');
    const last = await tx.document.aggregate({
      where: { tenantId, type, puntoDeVentaId, number: { not: null } },
      _max: { number: true },
    });
    return Number(last._max.number ?? 0) + 1;
  }

  private needsPuntoDeVenta(type: DocumentType): boolean {
    return new Set<DocumentType>([
      DocumentType.INVOICE_A,
      DocumentType.INVOICE_B,
      DocumentType.INVOICE_C,
      DocumentType.CREDIT_NOTE_A,
      DocumentType.CREDIT_NOTE_B,
      DocumentType.DEBIT_NOTE_A,
      DocumentType.DEBIT_NOTE_B,
    ]).has(type);
  }

  private toListDto(d: any): any {
    return {
      id: d.id,
      type: d.type,
      status: d.status,
      number: d.number,
      puntoDeVenta: d.puntoDeVenta?.number ?? null,
      puntoDeVentaId: d.puntoDeVentaId,
      customerName: d.customer?.name ?? null,
      customerCuit: d.customer?.cuit ?? null,
      supplierName: d.supplier?.name ?? null,
      date: d.date,
      total: Number(d.total),
      subtotal: Number(d.subtotal),
      taxAmount: Number(d.taxAmount),
      paidAmount: d.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) ?? 0,
      itemCount: d.items.length,
      createdByName: `${d.createdBy.firstName} ${d.createdBy.lastName}`,
      notes: d.notes,
    };
  }

  private toDetailDto(d: any): any {
    return {
      ...this.toListDto({ ...d, payments: d.payments ?? [], items: d.items ?? [] }),
      customer: d.customer,
      supplier: d.supplier,
      puntoDeVenta: d.puntoDeVenta,
      createdBy: d.createdBy ? { id: d.createdBy.id, firstName: d.createdBy.firstName, lastName: d.createdBy.lastName, email: d.createdBy.email } : null,
      dueDate: d.dueDate,
      items: (d.items ?? []).map((item: any) => ({
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
      payments: (d.payments ?? []).map((payment: any) => ({
        id: payment.id,
        method: payment.method,
        amount: Number(payment.amount),
        reference: payment.reference,
        notes: payment.notes,
        date: payment.date,
      })),
      ccEntries: (d.ccEntries ?? []).map((entry: any) => ({
        id: entry.id,
        type: entry.type,
        amount: Number(entry.amount),
        description: entry.description,
        date: entry.date,
      })),
      stockMovements: (d.stockMovements ?? []).map((movement: any) => ({
        id: movement.id,
        type: movement.type,
        quantity: Number(movement.quantity),
        unitCost: Number(movement.unitCost),
        productName: movement.product?.name,
        depositName: movement.deposit?.name,
        notes: movement.notes,
        createdAt: movement.createdAt,
      })),
    };
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

  private async assertPricesAllowed(tx: any, tenantId: string, role: string, priceListId: string | null | undefined, items: ReturnType<DocumentsService['computeItems']>): Promise<void> {
    if (role === 'OWNER') return;
    const defaultList = priceListId ? null : await tx.priceList.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true },
    });
    const effectivePriceListId = priceListId || defaultList?.id;
    if (!effectivePriceListId) throw new BadRequestException('Falta lista de precio para validar precios');

    const prices = await tx.priceListItem.findMany({
      where: { priceListId: effectivePriceListId, productId: { in: items.map((item) => item.productId) } },
      select: { productId: true, price: true },
    });
    const products = await tx.product.findMany({
      where: { tenantId, id: { in: items.map((item) => item.productId) } },
      select: { id: true, categoryId: true },
    });
    const categoryByProduct = new Map<string, string | null>(products.map((product: any) => [product.id, product.categoryId]));
    const coefficients = await this.activePriceCoefficients(tx, tenantId, items.map((item) => item.productId), products.map((product: any) => product.categoryId).filter(Boolean));
    const priceByProduct = new Map<string, number>(prices.map((price: any) => [price.productId, Number(price.price)]));
    for (const item of items) {
      const basePrice = priceByProduct.get(item.productId);
      if (basePrice === undefined) throw new BadRequestException(`El producto ${item.description} no tiene precio en la lista seleccionada`);
      const expected = this.roundMoney(basePrice * this.bestCoefficientForProduct(coefficients, item.productId, categoryByProduct.get(item.productId)).multiplier);
      if (Math.abs(Number(item.unitPrice) - expected) > 0.01) {
        throw new BadRequestException(`Solo OWNER puede modificar precio unitario. Revisá ${item.description}`);
      }
    }
  }

  private async activePriceCoefficients(tx: any, tenantId: string, productIds: string[], categoryIds: string[]): Promise<any[]> {
    const now = new Date();
    return tx.priceCoefficient.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { productId: { in: productIds } },
          { categoryId: { in: categoryIds } },
        ],
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        ],
      },
      select: { name: true, multiplier: true, productId: true, categoryId: true },
    });
  }

  private bestCoefficientForProduct(coefficients: any[], productId: string, categoryId?: string | null): { multiplier: number; name: string | null } {
    let best = { multiplier: 1, name: null as string | null };
    for (const coefficient of coefficients) {
      if (coefficient.productId !== productId && (!categoryId || coefficient.categoryId !== categoryId)) continue;
      const multiplier = Number(coefficient.multiplier || 1);
      if (multiplier > best.multiplier) {
        best = { multiplier, name: coefficient.name };
      }
    }
    return best;
  }

  private assertDiscountAllowed(role: string, items: Array<{ discount: unknown; description: string }>): void {
    const maxDiscount = maxDiscountForRole(role);
    for (const item of items) {
      const discount = Number(item.discount);
      if (discount > 0) assertPermission(role, 'sales.discount.apply');
      if (discount > maxDiscount) {
        throw new BadRequestException(`El descuento de ${item.description} supera el maximo permitido para tu rol (${maxDiscount}%)`);
      }
    }
  }
}

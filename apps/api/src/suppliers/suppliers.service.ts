import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { pageParams, paged } from '../common/pagination';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}
  async findAll(tenantId: string, query: { search?: string; ivaCondition?: string; pendingOrdersOnly?: string | boolean; page?: number | string; limit?: number | string }): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 80, 300);
    const searchPattern = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const ivaCondition = query.ivaCondition?.trim() || null;
    const pendingOrdersOnly = this.isTruthy(query.pendingOrdersOnly);
    const filters = Prisma.sql`
      s."tenantId" = ${tenantId}
      ${searchPattern ? Prisma.sql`AND (s.name ILIKE ${searchPattern} OR s.cuit ILIKE ${searchPattern})` : Prisma.empty}
      ${ivaCondition ? Prisma.sql`AND s."ivaCondition"::text = ${ivaCondition}` : Prisma.empty}
      ${pendingOrdersOnly ? Prisma.sql`AND COALESCE(po."pendingOrders", 0) > 0` : Prisma.empty}
    `;
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      WITH cc AS (
        SELECT "supplierId", SUM(amount)::float AS balance
        FROM "supplier_account_entries"
        WHERE "tenantId" = ${tenantId}
        GROUP BY "supplierId"
      ),
      po AS (
        SELECT
          "supplierId",
          MAX("orderDate") AS "lastOrderDate",
          COUNT(*) FILTER (WHERE status IN ('PENDING', 'SENT', 'PARTIALLY_RECEIVED'))::int AS "pendingOrders"
        FROM "purchase_orders"
        WHERE "tenantId" = ${tenantId}
        GROUP BY "supplierId"
      )
      SELECT
        s.id, s.name, s.cuit, s.phone, s.email, s.address, s."ivaCondition", s."isActive", s.notes, s."createdAt",
        COALESCE(cc.balance, 0)::float AS "ccBalance",
        po."lastOrderDate",
        COALESCE(po."pendingOrders", 0)::int AS "pendingOrders"
      FROM "suppliers" s
      LEFT JOIN cc ON cc."supplierId" = s.id
      LEFT JOIN po ON po."supplierId" = s.id
      WHERE ${filters}
      ORDER BY s.name ASC
      LIMIT ${limit} OFFSET ${shouldPage ? skip : 0}
    `);
    const [{ total } = { total: 0 }] = shouldPage
      ? await this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        WITH po AS (
          SELECT
            "supplierId",
            COUNT(*) FILTER (WHERE status IN ('PENDING', 'SENT', 'PARTIALLY_RECEIVED'))::int AS "pendingOrders"
          FROM "purchase_orders"
          WHERE "tenantId" = ${tenantId}
          GROUP BY "supplierId"
        )
        SELECT COUNT(*)::int AS total
        FROM "suppliers" s
        LEFT JOIN po ON po."supplierId" = s.id
        WHERE ${filters}
      `)
      : [{ total: 0 }];
    const mapped = rows.map((s) => ({
      id: s.id,
      name: s.name,
      razonSocial: s.name,
      cuit: s.cuit,
      telefono: s.phone,
      email: s.email,
      direccion: s.address,
      condicionIva: s.ivaCondition,
      condicionPago: '',
      notas: s.notes,
      createdAt: s.createdAt,
      ccBalance: Number(s.ccBalance || 0),
      lastOrderDate: s.lastOrderDate,
      pendingOrders: Number(s.pendingOrders || 0),
    }));
    return shouldPage ? paged(mapped, total, page, limit) : mapped;
  }
  async create(tenantId: string, role: string, data: any): Promise<any> {
    this.assertManager(role);
    const normalized = await this.normalizeSupplierData(tenantId, data, true);
    return this.prisma.supplier.create({ data: { ...normalized, tenantId } });
  }

  async update(tenantId: string, role: string, id: string, data: any): Promise<any> {
    this.assertManager(role);
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Proveedor inexistente');
    const normalized = await this.normalizeSupplierData(tenantId, data, false, id);
    return this.prisma.supplier.update({ where: { id }, data: normalized });
  }

  async remove(tenantId: string, role: string, id: string): Promise<any> {
    this.assertManager(role);
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Proveedor inexistente');
    const documents = await this.prisma.document.count({ where: { tenantId, supplierId: id } });
    if (documents) {
      const archived = await this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
      return { ...archived, deleted: false, archived: true };
    }
    const deleted = await this.prisma.supplier.delete({ where: { id } });
    return { ...deleted, deleted: true, archived: false };
  }

  async account(tenantId: string, supplierId: string): Promise<any> {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true, name: true } });
    if (!supplier) throw new NotFoundException('Proveedor inexistente');
    const [entries, balanceRows] = await Promise.all([
      this.prisma.supplierAccountEntry.findMany({
        where: { tenantId, supplierId },
        include: { document: true },
        orderBy: { date: 'desc' },
        take: 200,
      }),
      this.prisma.supplierAccountEntry.aggregate({
        where: { tenantId, supplierId },
        _sum: { amount: true },
      }),
    ]);
    const balance = Number(balanceRows._sum.amount ?? 0);
    return {
      supplier,
      balance,
      entries: entries.map((entry) => ({
        id: entry.id,
        documentId: entry.documentId,
        documentType: entry.document?.type ?? null,
        documentNumber: entry.document?.number ?? null,
        type: entry.type,
        amount: Number(entry.amount),
        description: entry.description,
        date: entry.date,
      })),
    };
  }

  products(tenantId: string, supplierId: string): any {
    return this.prisma.supplierProduct.findMany({
      where: { tenantId, supplierId },
      include: { product: true },
      orderBy: [{ isPreferred: 'desc' }, { supplierName: 'asc' }],
    });
  }

  async upsertProduct(tenantId: string, role: string, supplierId: string, data: any): Promise<any> {
    this.assertManager(role);
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Proveedor inexistente');
    const product = await this.prisma.product.findFirst({ where: { id: data.productId, tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Producto inexistente');
    return this.prisma.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId: product.id } },
      update: {
        supplierCode: data.supplierCode || null,
        supplierName: data.supplierName || null,
        lastCost: data.lastCost === undefined ? undefined : Number(data.lastCost || 0),
        leadTimeDays: data.leadTimeDays === undefined ? undefined : Number(data.leadTimeDays || 0),
        isPreferred: Boolean(data.isPreferred),
      },
      create: {
        tenantId,
        supplierId,
        productId: product.id,
        supplierCode: data.supplierCode || null,
        supplierName: data.supplierName || null,
        lastCost: data.lastCost === undefined ? null : Number(data.lastCost || 0),
        leadTimeDays: data.leadTimeDays === undefined ? null : Number(data.leadTimeDays || 0),
        isPreferred: Boolean(data.isPreferred),
      },
    });
  }

  private assertManager(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo la cuenta owner puede modificar proveedores');
    }
  }

  private async normalizeSupplierData(tenantId: string, data: any, requireName: boolean, currentId?: string): Promise<any> {
    const name = this.nullableString(data.name ?? data.razonSocial);
    if (requireName && !name) {
      throw new BadRequestException('La razón social del proveedor es obligatoria.');
    }

    if (name) {
      const existing = await this.prisma.supplier.findFirst({
        where: { tenantId, name, ...(currentId ? { id: { not: currentId } } : {}) },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Ya existe un proveedor con esa razón social.');
    }

    const ivaCondition = data.ivaCondition ?? data.condicionIva;
    const normalized: Record<string, unknown> = {
      name,
      email: this.nullableString(data.email),
      phone: this.nullableString(data.phone ?? data.telefono),
      address: this.nullableString(data.address ?? data.direccion),
      cuit: this.nullableString(data.cuit),
      ivaCondition: ivaCondition === undefined ? undefined : this.parseIva(String(ivaCondition)),
      isActive: data.isActive === undefined ? undefined : Boolean(data.isActive),
      notes: this.nullableString(data.notes ?? data.notas),
    };
    Object.keys(normalized).forEach((key) => normalized[key] === undefined && delete normalized[key]);
    return normalized;
  }

  private nullableString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    const text = String(value ?? '').trim();
    return text || null;
  }

  private isTruthy(value: unknown): boolean {
    return value === true || value === 'true' || value === '1' || value === 'yes';
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private parseIva(value: string): any {
    if (['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'CONSUMIDOR_FINAL', 'EXENTO', 'NO_CATEGORIZADO'].includes(value)) {
      return value;
    }
    const text = this.normalizeText(value);
    if (text.includes('responsable') || text === 'ri') return 'RESPONSABLE_INSCRIPTO';
    if (text.includes('mono')) return 'MONOTRIBUTISTA';
    if (text.includes('exento')) return 'EXENTO';
    if (text.includes('no responsable') || text.includes('no categ')) return 'NO_CATEGORIZADO';
    return 'RESPONSABLE_INSCRIPTO';
  }
}


import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { pageParams, paged } from '../common/pagination';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}
  async findAll(tenantId: string, query: { search?: string; page?: number | string; limit?: number | string }): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 80, 300);
    const where: any = { tenantId };
    if (query.search) where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }, { cuit: { contains: query.search, mode: 'insensitive' } }];
    const [rows, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: shouldPage ? skip : undefined,
        take: query.limit || shouldPage ? limit : 500,
      }),
      shouldPage ? this.prisma.supplier.count({ where }) : Promise.resolve(0),
    ]);
    return shouldPage ? paged(rows, total, page, limit) : rows;
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
    const entries = await this.prisma.supplierAccountEntry.findMany({
      where: { tenantId, supplierId },
      include: { document: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
    const balance = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
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



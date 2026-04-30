import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { pageParams, paged } from '../common/pagination';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { search?: string; page?: number | string; limit?: number | string }): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 80, 300);
    const where: any = { tenantId };
    if (query.search) where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { cuit: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: shouldPage ? skip : undefined,
        take: query.limit || shouldPage ? limit : 500,
      }),
      shouldPage ? this.prisma.customer.count({ where }) : Promise.resolve(0),
    ]);
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }

  async create(tenantId: string, role: string, data: any): Promise<any> {
    this.assertManager(role);
    const normalized = await this.normalizeCustomerData(tenantId, data, true);
    return this.prisma.customer.create({ data: { ...normalized, tenantId } });
  }

  async update(tenantId: string, role: string, id: string, data: any): Promise<any> {
    this.assertManager(role);
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Cliente inexistente');
    const normalized = await this.normalizeCustomerData(tenantId, data, false, id);
    return this.prisma.customer.update({ where: { id }, data: normalized });
  }

  async remove(tenantId: string, role: string, id: string): Promise<any> {
    this.assertManager(role);
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Cliente inexistente');
    const [documents, entries] = await Promise.all([
      this.prisma.document.count({ where: { tenantId, customerId: id } }),
      this.prisma.currentAccountEntry.count({ where: { tenantId, customerId: id } }),
    ]);
    if (documents || entries) {
      const archived = await this.prisma.customer.update({ where: { id }, data: { isActive: false } });
      return { ...archived, deleted: false, archived: true };
    }
    const deleted = await this.prisma.customer.delete({ where: { id } });
    return { ...deleted, deleted: true, archived: false };
  }

  async account(tenantId: string, customerId: string, query: { page?: number | string; limit?: number | string } = {}): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 100, 300);
    const where = { tenantId, customerId };
    const [rows, total] = await Promise.all([
      this.prisma.currentAccountEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { customer: true, document: true },
        skip: shouldPage ? skip : undefined,
        take: shouldPage || query.limit ? limit : 300,
      }),
      shouldPage ? this.prisma.currentAccountEntry.count({ where }) : Promise.resolve(0),
    ]);
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }

  accountLegacy(tenantId: string, customerId: string): any {
    return this.prisma.currentAccountEntry.findMany({
      where: { tenantId, customerId },
      orderBy: { date: 'desc' },
      include: { customer: true, document: true },
    });
  }

  async exportCustomers(tenantId: string, role: string): Promise<string> {
    this.assertManager(role);
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: { priceList: true },
      orderBy: { name: 'asc' },
    });
    const headers = ['Nombre', 'CUIT', 'Telefono', 'Email', 'Direccion', 'Ciudad', 'Provincia', 'Condicion IVA', 'Lista de precio', 'Limite cuenta corriente', 'Activo', 'Notas'];
    const lines = [headers.map((header) => this.csvCell(header)).join(';')];
    customers.forEach((customer) => {
      lines.push([
        customer.name,
        customer.cuit || '',
        customer.phone || '',
        customer.email || '',
        customer.address || '',
        customer.city || '',
        customer.province || '',
        customer.ivaCondition,
        customer.priceList?.name || '',
        customer.creditLimit ?? '',
        customer.isActive ? 'Si' : 'No',
        customer.notes || '',
      ].map((value) => this.csvCell(value)).join(';'));
    });
    return lines.join('\r\n');
  }

  async importCustomers(tenantId: string, role: string, rows: any[]): Promise<any> {
    this.assertManager(role);
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('rows must contain at least one customer');
    }
    this.validateImportRows(rows);

    const summary = { total: rows.length, created: 0, updated: 0, skipped: 0 };
    await this.prisma.$transaction(async (tx) => {
      const priceLists = await tx.priceList.findMany({ where: { tenantId, isActive: true } });
      for (const raw of rows) {
        const name = this.value(raw, ['name', 'nombre', 'Nombre', 'razon social', 'Razon Social', 'Razón social', 'cliente', 'Cliente']);
        if (!name) {
          summary.skipped += 1;
          continue;
        }

        const cuit = this.optionalValue(raw, ['cuit', 'CUIT', 'Cuit', 'documento', 'Documento']);
        const priceListName = this.optionalValue(raw, ['lista', 'Lista', 'Lista de precio', 'lista de precio', 'priceList']);
        const priceList = priceListName ? priceLists.find((list) => this.normalizeText(list.name) === this.normalizeText(priceListName)) : null;
        const data = {
          name,
          cuit: cuit || null,
          email: this.optionalValue(raw, ['email', 'Email', 'mail', 'Mail']) || null,
          phone: this.optionalValue(raw, ['telefono', 'Telefono', 'Teléfono', 'phone', 'celular', 'Celular']) || null,
          address: this.optionalValue(raw, ['direccion', 'Direccion', 'Dirección', 'domicilio', 'Domicilio']) || null,
          city: this.optionalValue(raw, ['ciudad', 'Ciudad', 'localidad', 'Localidad']) || null,
          province: this.optionalValue(raw, ['provincia', 'Provincia']) || null,
          ivaCondition: this.parseIva(this.optionalValue(raw, ['iva', 'IVA', 'Condicion IVA', 'Condición IVA', 'condicion iva'])),
          creditLimit: this.parseMoney(this.pick(raw, ['limite', 'Límite', 'Limite cuenta corriente', 'Limite CC', 'creditLimit'])),
          priceListId: priceList?.id || null,
          notes: this.optionalValue(raw, ['notas', 'Notas', 'observaciones', 'Observaciones']) || null,
          isActive: this.parseBoolean(this.pick(raw, ['activo', 'Activo', 'isActive']), true),
        };

        const existing = cuit
          ? await tx.customer.findFirst({ where: { tenantId, cuit }, select: { id: true } })
          : await tx.customer.findFirst({ where: { tenantId, name }, select: { id: true } });

        if (existing) {
          await tx.customer.update({ where: { id: existing.id }, data });
          summary.updated += 1;
        } else {
          await tx.customer.create({ data: { ...data, tenantId } });
          summary.created += 1;
        }
      }
    }, { timeout: 120_000, maxWait: 20_000 });
    return summary;
  }

  private assertManager(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo la cuenta owner puede modificar clientes');
    }
  }

  private async normalizeCustomerData(tenantId: string, data: any, requireName: boolean, currentId?: string): Promise<any> {
    const name = data.name === undefined ? undefined : this.nullableString(data.name);
    if (requireName && !name) {
      throw new BadRequestException('El nombre del cliente es obligatorio.');
    }

    const cuit = this.nullableString(data.cuit);
    if (cuit) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, cuit, ...(currentId ? { id: { not: currentId } } : {}) },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Ya existe un cliente con ese CUIT.');
    }

    const priceListId = this.nullableString(data.priceListId);
    if (priceListId) {
      const priceList = await this.prisma.priceList.findFirst({
        where: { id: priceListId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!priceList) throw new BadRequestException('La lista de precio seleccionada no existe o está inactiva.');
    }

    const ivaCondition = data.ivaCondition === undefined ? undefined : this.parseIva(String(data.ivaCondition));
    const creditLimit = this.parseMoney(data.creditLimit);
    if (creditLimit !== null && creditLimit < 0) {
      throw new BadRequestException('El límite de cuenta corriente no puede ser negativo.');
    }

    const normalized: Record<string, unknown> = {
      name,
      email: this.nullableString(data.email),
      phone: this.nullableString(data.phone),
      address: this.nullableString(data.address),
      city: this.nullableString(data.city),
      province: this.nullableString(data.province),
      cuit,
      ivaCondition,
      creditLimit,
      priceListId,
      notes: this.nullableString(data.notes),
      isActive: data.isActive === undefined ? undefined : Boolean(data.isActive),
    };
    Object.keys(normalized).forEach((key) => normalized[key] === undefined && delete normalized[key]);
    return normalized;
  }

  private nullableString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    const text = String(value ?? '').trim();
    return text || null;
  }

  private validateImportRows(rows: any[]): void {
    const headers = new Set(rows.flatMap((row) => Object.keys(row || {}).map((header) => this.normalizeHeader(header))));
    const hasName = ['name', 'nombre', 'razonsocial', 'cliente'].some((header) => headers.has(header));
    if (!hasName) {
      throw new BadRequestException('No se importó nada. Falta la columna Nombre, Razón social o Cliente.');
    }

    const errors: string[] = [];
    const cuits = new Set<string>();
    rows.forEach((raw, index) => {
      const rowNumber = index + 2;
      const name = this.value(raw, ['name', 'nombre', 'Nombre', 'razon social', 'Razon Social', 'Razón social', 'cliente', 'Cliente']);
      const cuit = this.optionalValue(raw, ['cuit', 'CUIT', 'Cuit', 'documento', 'Documento']);
      if (!name) errors.push(`fila ${rowNumber}: falta Nombre`);
      if (cuit) {
        const normalizedCuit = cuit.replace(/\D/g, '');
        if (cuits.has(normalizedCuit)) errors.push(`fila ${rowNumber}: CUIT duplicado (${cuit})`);
        else cuits.add(normalizedCuit);
      }
    });

    if (errors.length > 0) {
      const visibleErrors = errors.slice(0, 12).join('; ');
      const extra = errors.length > 12 ? `; y ${errors.length - 12} error(es) mas` : '';
      throw new BadRequestException(`No se importó nada. Corregí el CSV: ${visibleErrors}${extra}.`);
    }
  }

  private pick(raw: any, aliases: string[]): unknown {
    for (const alias of aliases) {
      if (raw?.[alias] !== undefined && raw?.[alias] !== null && String(raw[alias]).trim() !== '') return raw[alias];
    }
    const normalizedAliases = new Set(aliases.map((alias) => this.normalizeHeader(alias)));
    const key = Object.keys(raw || {}).find((header) => normalizedAliases.has(this.normalizeHeader(header)));
    return key ? raw[key] : undefined;
  }

  private value(raw: any, aliases: string[]): string {
    return String(this.pick(raw, aliases) ?? '').trim();
  }

  private optionalValue(raw: any, aliases: string[]): string | undefined {
    const value = this.value(raw, aliases);
    return value || undefined;
  }

  private normalizeHeader(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private parseIva(value?: string): any {
    if (['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'CONSUMIDOR_FINAL', 'EXENTO', 'NO_CATEGORIZADO'].includes(value || '')) {
      return value;
    }
    const text = this.normalizeText(value || '');
    if (text.includes('responsable') || text === 'ri') return 'RESPONSABLE_INSCRIPTO';
    if (text.includes('mono')) return 'MONOTRIBUTISTA';
    if (text.includes('exento')) return 'EXENTO';
    if (text.includes('no categ')) return 'NO_CATEGORIZADO';
    return 'CONSUMIDOR_FINAL';
  }

  private parseBoolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    if (typeof value === 'boolean') return value;
    const text = this.normalizeText(String(value));
    if (['1', 'true', 'si', 's', 'yes', 'activo', 'active'].includes(text)) return true;
    if (['0', 'false', 'no', 'n', 'inactivo', 'inactive'].includes(text)) return false;
    return fallback;
  }

  private parseMoney(value: unknown): number | null {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    let text = String(value).trim().replace(/\s/g, '').replace(/\$/g, '');
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
      text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
    } else if (lastComma > -1) {
      text = text.replace(',', '.');
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? '');
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}



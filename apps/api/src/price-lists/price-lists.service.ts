import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PriceCoefficientScope } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { parseMoney } from '../common/money';

@Injectable()
export class PriceListsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, role = ''): Promise<any> {
    await this.ensureRequiredLists(tenantId);
    const lists = await this.prisma.priceList.findMany({ where: { tenantId }, include: { items: { include: { product: true } } }, orderBy: { name: 'asc' } });
    const visibleLists = role === 'EMPLOYEE'
      ? lists.filter((list) => !['CR', 'CU'].includes(this.priceListCode(list.name) || ''))
      : lists;
    return this.sortPriceLists(visibleLists);
  }

  create(tenantId: string, role: string, data: any): any {
    this.assertManager(role);
    throw new ForbiddenException('Las listas de precio son fijas: LP1, LP2, LP3, LP4, LP5, CR y CU. Usá coeficientes para reglas especiales.');
  }

  async updateItem(tenantId: string, role: string, priceListId: string, productId: string, price: number): Promise<any> {
    this.assertManager(role);
    const [priceList, product] = await Promise.all([
      this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId }, select: { id: true, name: true } }),
      this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } }),
    ]);
    if (!priceList || !product) {
      throw new NotFoundException('Lista o producto inexistente');
    }
    return this.prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId, productId } },
      update: { price, isManualOverride: this.priceListCode(priceList.name) === 'LP4' },
      create: { priceListId, productId, price, isManualOverride: this.priceListCode(priceList.name) === 'LP4' },
    });
  }

  async recalculateFromBase(tenantId: string, priceListId: string, role: string, data: any): Promise<any> {
    this.assertManager(role);
    const basePriceListId = String(data.basePriceListId || '');
    const multiplier = this.parsePositiveNumber(data.multiplier ?? (1 + Number(data.percentage || 0) / 100), 'coeficiente');
    const rounding = Number(data.rounding || 0);
    const operation = String(data.operation || 'multiply');
    const roundingMode = String(data.roundingMode || 'nearest');
    const onlyMissing = Boolean(data.onlyMissing);
    const includeManualOverrides = Boolean(data.includeManualOverrides);

    const [targetList, baseList] = await Promise.all([
      this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId }, select: { id: true, name: true } }),
      this.prisma.priceList.findFirst({ where: { id: basePriceListId, tenantId }, select: { id: true, name: true } }),
    ]);
    if (!targetList || !baseList) {
      throw new NotFoundException('Lista base o destino inexistente');
    }

    const baseItems = await this.prisma.priceListItem.findMany({
      where: { priceListId: basePriceListId },
      select: { productId: true, price: true },
    });

    let updated = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.priceList.update({
        where: { id: targetList.id },
        data: {
          formulaBaseCode: this.priceListCode(baseList.name),
          formulaOperation: operation,
          formulaCoefficient: multiplier,
          formulaRoundingMode: roundingMode,
          formulaRoundingValue: rounding > 0 ? rounding : null,
        },
      });

      for (const item of baseItems) {
        const current = onlyMissing
          ? await tx.priceListItem.findUnique({
              where: { priceListId_productId: { priceListId, productId: item.productId } },
              select: { id: true, isManualOverride: true },
            })
          : this.priceListCode(targetList.name) === 'LP4' && !includeManualOverrides
            ? await tx.priceListItem.findUnique({
                where: { priceListId_productId: { priceListId, productId: item.productId } },
                select: { id: true, isManualOverride: true },
              })
            : null;

        if (current && (onlyMissing || current.isManualOverride)) {
          skipped += 1;
          continue;
        }

        const price = this.calculateFormulaPrice(Number(item.price || 0), operation, multiplier, roundingMode, rounding);

        await tx.priceListItem.upsert({
          where: { priceListId_productId: { priceListId, productId: item.productId } },
          update: { price, isManualOverride: false },
          create: { priceListId, productId: item.productId, price, isManualOverride: false },
        });
        updated += 1;
      }
    });

    return { updated, skipped, total: baseItems.length };
  }

  async updateFormula(tenantId: string, role: string, priceListId: string, data: any): Promise<any> {
    this.assertManager(role);
    const baseCode = this.priceListCode(String(data.baseCode || ''));
    if (!baseCode) throw new BadRequestException('Elegí una lista base válida');
    const list = await this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId }, select: { id: true } });
    if (!list) throw new NotFoundException('Lista inexistente');
    const multiplier = this.parsePositiveNumber(data.multiplier, 'coeficiente');
    const rounding = Number(data.roundingValue || 0);
    return this.prisma.priceList.update({
      where: { id: priceListId },
      data: {
        formulaBaseCode: baseCode,
        formulaOperation: String(data.operation || 'multiply'),
        formulaCoefficient: multiplier,
        formulaRoundingMode: String(data.roundingMode || 'nearest'),
        formulaRoundingValue: Number.isFinite(rounding) && rounding > 0 ? rounding : null,
      },
    });
  }

  coefficients(tenantId: string): any {
    return this.prisma.priceCoefficient.findMany({
      where: { tenantId },
      include: { product: { select: { id: true, code: true, name: true } }, category: { select: { id: true, name: true } } },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createCoefficient(tenantId: string, role: string, data: any): Promise<any> {
    this.assertManager(role);
    const scope = String(data.scope || '').toUpperCase() as PriceCoefficientScope;
    const productId = data.productId ? String(data.productId) : null;
    const categoryId = data.categoryId ? String(data.categoryId) : null;
    const multiplier = this.parsePositiveNumber(data.multiplier, 'coeficiente');
    if (![PriceCoefficientScope.PRODUCT, PriceCoefficientScope.CATEGORY].includes(scope)) {
      throw new BadRequestException('El alcance debe ser producto o categoria');
    }
    if (scope === PriceCoefficientScope.PRODUCT && !productId) throw new BadRequestException('Elegí un producto');
    if (scope === PriceCoefficientScope.CATEGORY && !categoryId) throw new BadRequestException('Elegí una categoría');

    if (productId) {
      const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } });
      if (!product) throw new NotFoundException('Producto inexistente');
    }
    if (categoryId) {
      const category = await this.prisma.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } });
      if (!category) throw new NotFoundException('Categoría inexistente');
    }

    return this.prisma.priceCoefficient.create({
      data: {
        tenantId,
        scope,
        productId: scope === PriceCoefficientScope.PRODUCT ? productId : null,
        categoryId: scope === PriceCoefficientScope.CATEGORY ? categoryId : null,
        name: String(data.name || '').trim() || (scope === 'PRODUCT' ? 'Coeficiente producto' : 'Coeficiente categoría'),
        multiplier,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async removeCoefficient(tenantId: string, role: string, id: string): Promise<any> {
    this.assertManager(role);
    const coefficient = await this.prisma.priceCoefficient.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!coefficient) throw new NotFoundException('Coeficiente inexistente');
    await this.prisma.priceCoefficient.delete({ where: { id } });
    return { id, deleted: true };
  }

  async remove(tenantId: string, role: string, id: string): Promise<any> {
    this.assertManager(role);
    const list = await this.prisma.priceList.findFirst({ where: { id, tenantId }, select: { id: true, isDefault: true, name: true } });
    if (!list) throw new NotFoundException('Lista inexistente');
    if (this.priceListCode(list.name)) {
      throw new ForbiddenException('LP1, LP2, LP3, LP4, LP5, CR y CU son listas obligatorias de Aguila y no se pueden eliminar');
    }

    const totalLists = await this.prisma.priceList.count({ where: { tenantId } });
    if (totalLists <= 1) {
      throw new ForbiddenException('No se puede eliminar la única lista de precio');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.customer.updateMany({ where: { tenantId, priceListId: id }, data: { priceListId: null } });
      await tx.priceList.delete({ where: { id } });

      if (list.isDefault) {
        const next = await tx.priceList.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true },
        });
        if (next) {
          await tx.priceList.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }

      return { id, deleted: true };
    });
  }

  private assertManager(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo la cuenta owner puede administrar listas de precio');
    }
  }

  private parsePositiveNumber(value: unknown, label: string): number {
    const parsed = parseMoney(value);
    if (parsed <= 0) {
      throw new BadRequestException(`El valor de ${label} debe ser mayor a cero`);
    }
    return parsed;
  }

  private calculateFormulaPrice(basePrice: number, operation: string, coefficient: number, roundingMode: string, rounding: number): number {
    let calculated = basePrice;
    if (operation === 'add') calculated = basePrice + coefficient;
    else if (operation === 'subtract') calculated = Math.max(basePrice - coefficient, 0);
    else calculated = basePrice * coefficient;
    if (rounding > 0) {
      if (roundingMode === 'up') calculated = Math.ceil(calculated / rounding) * rounding;
      else if (roundingMode === 'down') calculated = Math.floor(calculated / rounding) * rounding;
      else calculated = Math.round(calculated / rounding) * rounding;
    }
    return Number(calculated.toFixed(4));
  }

  private priceListCode(name: string): string | null {
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (normalized.startsWith('lp1')) return 'LP1';
    if (normalized.startsWith('lp2')) return 'LP2';
    if (normalized.startsWith('lp3')) return 'LP3';
    if (normalized.startsWith('lp4')) return 'LP4';
    if (normalized.startsWith('lp5')) return 'LP5';
    if (normalized.startsWith('cr') || normalized.includes('costoreposicion')) return 'CR';
    if (normalized.startsWith('cu') || normalized.includes('costoultimacompra') || normalized.includes('costoultcp')) return 'CU';
    return null;
  }

  private sortPriceLists<T extends { name: string }>(lists: T[]): T[] {
    const order = ['LP1', 'LP2', 'LP3', 'LP4', 'LP5', 'CR', 'CU'];
    return [...lists].sort((a, b) => {
      const ai = order.indexOf(this.priceListCode(a.name) || '');
      const bi = order.indexOf(this.priceListCode(b.name) || '');
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.name.localeCompare(b.name, 'es');
    });
  }

  private async ensureRequiredLists(tenantId: string): Promise<void> {
    const required = [
      { name: 'LP1 - Lista Precios 1', isDefault: true },
      { name: 'LP2 - Lista Precios 2', isDefault: false, formulaBaseCode: 'LP1', formulaCoefficient: 0.6 },
      { name: 'LP3 - Lista Precios 3', isDefault: false, formulaBaseCode: 'LP1', formulaCoefficient: 0.8 },
      { name: 'LP4 - Lista Precios 4', isDefault: false, formulaBaseCode: 'CR', formulaCoefficient: 1.2 },
      { name: 'LP5 - Lista Precios 5', isDefault: false, formulaBaseCode: 'CR', formulaCoefficient: 1 },
      { name: 'CR - Costo Reposición', isDefault: false },
      { name: 'CU - Costo Ultima Compra', isDefault: false },
    ];

    const existing = await this.prisma.priceList.findMany({
      where: { tenantId },
      select: { id: true, name: true, isDefault: true },
    });
    const names = new Set(existing.map((list) => list.name));

    await this.prisma.$transaction(async (tx) => {
      for (const list of required) {
        if (!names.has(list.name)) {
          await tx.priceList.create({
            data: {
              tenantId,
              name: list.name,
              isDefault: false,
              isActive: true,
              formulaBaseCode: list.formulaBaseCode,
              formulaCoefficient: list.formulaCoefficient,
              formulaRoundingMode: list.formulaBaseCode ? 'nearest' : undefined,
              formulaRoundingValue: list.formulaBaseCode ? 10 : undefined,
            },
          });
        }
      }

      const lp1 = existing.find((list) => list.name === required[0].name)
        || await tx.priceList.findFirst({ where: { tenantId, name: required[0].name }, select: { id: true } });
      if (lp1) {
        await tx.priceList.updateMany({ where: { tenantId, isDefault: true, NOT: { id: lp1.id } }, data: { isDefault: false } });
        await tx.priceList.update({ where: { id: lp1.id }, data: { isDefault: true, isActive: true } });
      }
    });
  }
}



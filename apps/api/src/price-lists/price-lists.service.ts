import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PriceCoefficientScope } from '@erp/db';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PriceListsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string): any {
    return this.prisma.priceList.findMany({ where: { tenantId }, include: { items: { include: { product: true } } }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
  }

  create(tenantId: string, role: string, data: any): any {
    this.assertManager(role);
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.priceList.updateMany({ where: { tenantId }, data: { isDefault: false } });
      }
      return tx.priceList.create({ data: { tenantId, name: data.name, isDefault: Boolean(data.isDefault), isActive: data.isActive ?? true } });
    });
  }

  async updateItem(tenantId: string, role: string, priceListId: string, productId: string, price: number): Promise<any> {
    this.assertManager(role);
    const [priceList, product] = await Promise.all([
      this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId }, select: { id: true } }),
      this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } }),
    ]);
    if (!priceList || !product) {
      throw new NotFoundException('Lista o producto inexistente');
    }
    return this.prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId, productId } },
      update: { price },
      create: { priceListId, productId, price },
    });
  }

  async recalculateFromBase(tenantId: string, priceListId: string, role: string, data: any): Promise<any> {
    this.assertManager(role);
    const basePriceListId = String(data.basePriceListId || '');
    const percentage = Number(data.percentage || 0);
    const rounding = Number(data.rounding || 0);
    const onlyMissing = Boolean(data.onlyMissing);

    const [targetList, baseList] = await Promise.all([
      this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId }, select: { id: true } }),
      this.prisma.priceList.findFirst({ where: { id: basePriceListId, tenantId }, select: { id: true } }),
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
      for (const item of baseItems) {
        const current = onlyMissing
          ? await tx.priceListItem.findUnique({
              where: { priceListId_productId: { priceListId, productId: item.productId } },
              select: { id: true },
            })
          : null;

        if (current) {
          skipped += 1;
          continue;
        }

        const basePrice = Number(item.price || 0);
        const calculated = basePrice * (1 + percentage / 100);
        const price = rounding > 0 ? Math.round(calculated / rounding) * rounding : calculated;

        await tx.priceListItem.upsert({
          where: { priceListId_productId: { priceListId, productId: item.productId } },
          update: { price },
          create: { priceListId, productId: item.productId, price },
        });
        updated += 1;
      }
    });

    return { updated, skipped, total: baseItems.length };
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
    const parsed = Number(String(value ?? '').replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`El valor de ${label} debe ser mayor a cero`);
    }
    return parsed;
  }
}



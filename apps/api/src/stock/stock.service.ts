import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { pageParams, paged } from '../common/pagination';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService, private permissions: PermissionsService) {}

  async current(tenantId: string, role: string, query: { search?: string; page?: number | string; limit?: number | string }): Promise<any> {
    const isOwner = role === 'OWNER';
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 100, 300);
    const q = query.search?.toLowerCase().trim();

    const productFilter: any = { tenantId, isActive: true };
    if (q) {
      productFilter.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (shouldPage) {
      const [total, products, deposits] = await Promise.all([
        this.prisma.product.count({ where: productFilter }),
        this.prisma.product.findMany({
          where: productFilter,
          include: { brand: true, category: true },
          skip,
          take: limit,
        }),
        this.prisma.deposit.findMany({ where: { tenantId } }),
      ]);
      if (products.length === 0) return paged([], total, page, limit);

      const productIds = products.map((p) => p.id);
      const depositMap = new Map(deposits.map((d) => [d.id, d]));
      const movements = await this.prisma.stockMovement.groupBy({
        by: ['productId', 'depositId'],
        where: { tenantId, productId: { in: productIds } },
        _sum: { quantity: true },
      });

      const rows = movements.map((m) => {
        const product = products.find((p) => p.id === m.productId);
        const deposit = depositMap.get(m.depositId);
        const quantity = Number(m._sum.quantity ?? 0);
        const unitCost = Number(product?.averageCost ?? 0);
        return {
          productId: m.productId,
          productCode: product?.code ?? '',
          productName: product?.name ?? '',
          brandName: product?.brand?.name,
          categoryName: product?.category?.name,
          unit: product?.unit ?? 'un',
          depositId: m.depositId,
          depositName: deposit?.name ?? '',
          qty: quantity,
          quantity,
          ...(isOwner ? { avgCost: unitCost, unitCost, totalValue: quantity * unitCost } : {}),
        };
      });
      return paged(rows, total, page, limit);
    }

    const products = await this.prisma.product.findMany({
      where: productFilter,
      include: { brand: true, category: true },
    });
    if (products.length === 0) return [];

    const productIds = products.map((p) => p.id);
    const [movements, deposits] = await Promise.all([
      this.prisma.stockMovement.groupBy({
        by: ['productId', 'depositId'],
        where: { tenantId, productId: { in: productIds } },
        _sum: { quantity: true },
      }),
      this.prisma.deposit.findMany({ where: { tenantId } }),
    ]);
    const activeProductIds = new Set(products.map((product) => product.id));
    const depositMap = new Map(deposits.map((d) => [d.id, d]));

    const rows = movements.filter((m) => activeProductIds.has(m.productId)).map((m) => {
      const product = products.find((p) => p.id === m.productId);
      const deposit = depositMap.get(m.depositId);
      const quantity = Number(m._sum.quantity ?? 0);
      const unitCost = Number(product?.averageCost ?? 0);
      return {
        productId: m.productId,
        productCode: product?.code ?? '',
        productName: product?.name ?? '',
        brandName: product?.brand?.name,
        categoryName: product?.category?.name,
        unit: product?.unit ?? 'un',
        depositId: m.depositId,
        depositName: deposit?.name ?? '',
        qty: quantity,
        quantity,
        ...(isOwner ? { avgCost: unitCost, unitCost, totalValue: quantity * unitCost } : {}),
      };
    });
    return rows.slice(0, 1000);
  }

  async movements(tenantId: string, role: string, query: { page?: number | string; limit?: number | string; productId?: string; depositId?: string; type?: string; dateFrom?: string; dateTo?: string }): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 100, 300);
    const where: any = {
      tenantId,
      productId: query.productId,
      depositId: query.depositId,
      type: query.type,
    };
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: { product: true, deposit: true },
        orderBy: { createdAt: 'desc' },
        skip: shouldPage ? skip : undefined,
        take: shouldPage || query.limit ? limit : 100,
      }),
      shouldPage ? this.prisma.stockMovement.count({ where }) : Promise.resolve(0),
    ]);
    const rows: any[] = role === 'OWNER' ? movements : movements.map((movement) => ({ ...movement, unitCost: undefined }));
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }

  deposits(tenantId: string): any {
    return this.prisma.deposit.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async record(tenantId: string, userId: string, role: string, data: any): Promise<any> {
    await this.assertCanAdjust(tenantId, userId, role);

    const ALLOWED_MANUAL_TYPES = ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT'];
    if (!ALLOWED_MANUAL_TYPES.includes(data.type)) {
      throw new BadRequestException('Tipo de movimiento no permitido para registro manual');
    }

    const negative = ['ADJUSTMENT_OUT', 'RETURN_OUT'].includes(data.type);
    const quantity = Math.abs(Number(data.quantity || 0)) * (negative ? -1 : 1);

    if (!data.depositId) {
      throw new BadRequestException('depositId is required');
    }

    const deposit = await this.prisma.deposit.findFirst({
      where: { id: data.depositId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!deposit) {
      throw new BadRequestException('Depósito inválido');
    }

    if (!data.productId && (!data.product?.code || !data.product?.name)) {
      throw new BadRequestException('productId or product code/name is required');
    }

    return this.prisma.$transaction(async (tx) => {
      let productId = data.productId as string | undefined;

      if (!productId) {
        const product = await tx.product.upsert({
          where: { tenantId_code: { tenantId, code: String(data.product.code).trim() } },
          update: {
            name: String(data.product.name).trim(),
            description: data.product.description || undefined,
            notes: data.product.notes || undefined,
            isActive: true,
          },
          create: {
            tenantId,
            code: String(data.product.code).trim(),
            name: String(data.product.name).trim(),
            description: data.product.description || null,
            notes: data.product.notes || null,
            unit: 'item',
            isActive: true,
          },
        });
        productId = product.id;
      }

      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${productId}))`);

      if (quantity < 0) {
        const current = await tx.stockMovement.aggregate({
          where: { tenantId, productId, depositId: data.depositId },
          _sum: { quantity: true },
        });
        if (Number(current._sum.quantity ?? 0) + quantity < 0) {
          throw new BadRequestException('Stock insuficiente para el movimiento');
        }
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          createdById: userId,
          productId,
          depositId: data.depositId,
          type: data.type,
          quantity,
          unitCost: Number(data.unitCost || 0),
          notes: data.notes || null,
        },
      });
      if (quantity > 0) {
        await this.recalculateAverageCost(tx, tenantId, productId);
      }
      return movement;
    });
  }

  private async assertCanAdjust(tenantId: string, userId: string, role: string): Promise<void> {
    if (role === 'OWNER') return;
    const hasPermission = await this.permissions.hasPermission(userId, 'stock.adjust');
    if (!hasPermission) {
      throw new ForbiddenException('No tenés permiso para registrar movimientos manuales de stock');
    }
  }

  private async recalculateAverageCost(tx: any, tenantId: string, productId: string): Promise<void> {
    const rows = await tx.$queryRaw(Prisma.sql`
      SELECT
        COALESCE(SUM("quantity"), 0)::float AS "quantity",
        COALESCE(SUM("quantity" * "unitCost"), 0)::float AS "value"
      FROM "stock_movements"
      WHERE "tenantId" = ${tenantId}
        AND "productId" = ${productId}
    `) as Array<{ quantity: number; value: number }>;
    const totalQty = Number(rows[0]?.quantity ?? 0);
    if (totalQty <= 0) return;
    await tx.product.update({
      where: { id: productId },
      data: { averageCost: Math.round((Number(rows[0]?.value ?? 0) / totalQty) * 10_000) / 10_000 },
    });
  }
}



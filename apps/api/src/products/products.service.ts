import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { pageParams, paged } from '../common/pagination';

const REQUIRED_AGUILA_PRICE_LISTS = [
  { name: 'LP1 - Lista Precios 1', isDefault: true },
  { name: 'LP2 - Lista Precios 2', isDefault: false },
  { name: 'LP3 - Lista Precios 3', isDefault: false },
  { name: 'LP4 - Lista Precios 4', isDefault: false },
  { name: 'LP5 - Lista Precios 5', isDefault: false },
  { name: 'CR - Costo Reposición', isDefault: false },
  { name: 'CU - Costo Ultima Compra', isDefault: false },
];

type PriceListForFormula = { id: string; name: string; isDefault?: boolean | null };
type PriceListItemForFormula = { priceListId: string; price: unknown };
type ProductForFormula = {
  priceListItems: PriceListItemForFormula[];
  replacementCost?: unknown;
  lastPurchaseCost?: unknown;
  averageCost?: unknown;
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { search?: string; page?: number | string; limit?: number | string; includeInactive?: string | boolean }): Promise<any> {
    const includeInactive = query.includeInactive === true || query.includeInactive === 'true';
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 80, 300);
    const where: any = { tenantId };
    if (!includeInactive) where.isActive = true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { barcodeAlt: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { brand: true, category: true },
        orderBy: { name: 'asc' },
        skip: shouldPage ? skip : undefined,
        take: query.limit || shouldPage ? limit : 500,
      }),
      shouldPage ? this.prisma.product.count({ where }) : Promise.resolve(0),
    ]);
    const rows = await this.withStockQuantity(tenantId, products);
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }

  async get(tenantId: string, id: string): Promise<any> {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId }, include: { brand: true, category: true } });
    if (!product) return null;
    const [withStock] = await this.withStockQuantity(tenantId, [product]);
    return withStock;
  }

  async search(tenantId: string, query: { q?: string; priceListId?: string; depositId?: string; limit?: number }): Promise<any> {
    const q = String(query.q ?? '').trim();
    const terms = this.searchTerms(q);
    const limit = Math.min(Math.max(Number(query.limit || 40), 1), 120);
    const where: any = { tenantId, isActive: true };
    if (terms.length > 0) {
      where.AND = terms.map((term) => ({
        OR: [
          { code: { contains: term, mode: 'insensitive' } },
          { barcode: { contains: term, mode: 'insensitive' } },
          { barcodeAlt: { contains: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { notes: { contains: term, mode: 'insensitive' } },
          { brand: { name: { contains: term, mode: 'insensitive' } } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
        ],
      }));
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { brand: true, category: true, priceListItems: true },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      take: limit,
    });
    const productIds = products.map((product) => product.id);
    if (productIds.length === 0) return [];

    const [stockByDeposit, priceLists] = await Promise.all([
      this.prisma.stockMovement.groupBy({
        by: ['productId', 'depositId'],
        where: {
          tenantId,
          productId: { in: productIds },
          ...(query.depositId ? { depositId: query.depositId } : {}),
        },
        _sum: { quantity: true },
      }),
      this.prisma.priceList.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: { id: true, name: true, isDefault: true },
      }),
    ]);
    const defaultList = priceLists.find((list) => list.isDefault) || priceLists[0];
    const priceListId = query.priceListId || defaultList?.id;
    const coefficients = await this.activePriceCoefficients(tenantId, productIds, products.map((product) => product.categoryId).filter((id): id is string => Boolean(id)));
    const stockMap = new Map<string, number>();
    const totalStockMap = new Map<string, number>();
    stockByDeposit.forEach((row) => {
      const quantity = Number(row._sum.quantity ?? 0);
      stockMap.set(`${row.productId}:${row.depositId}`, quantity);
      totalStockMap.set(row.productId, (totalStockMap.get(row.productId) ?? 0) + quantity);
    });

    return products.map((product) => {
      const formula = this.formulaPriceForProduct(product, priceLists, priceListId);
      const basePrice = formula.price;
      const coefficient = this.bestCoefficientForProduct(coefficients, product.id, product.categoryId);
      const price = this.roundMoney(basePrice * coefficient.multiplier);
      const appliedNames = [formula.name, coefficient.name].filter(Boolean);
      const stockBySelectedDeposit = query.depositId ? stockMap.get(`${product.id}:${query.depositId}`) ?? 0 : undefined;
      const stockTotal = totalStockMap.get(product.id) ?? 0;
      return {
        id: product.id,
        code: product.code,
        barcode: product.barcode,
        barcodeAlt: product.barcodeAlt,
        name: product.name,
        description: product.description,
        unit: product.unit,
        taxRate: Number(product.taxRate ?? 0),
        purchaseUnitCoefficient: product.purchaseUnitCoefficient === null ? null : Number(product.purchaseUnitCoefficient),
        replacementCost: product.replacementCost === null ? null : Number(product.replacementCost),
        averageCost: product.averageCost === null ? null : Number(product.averageCost),
        lastPurchaseCost: product.lastPurchaseCost === null ? null : Number(product.lastPurchaseCost),
        minStock: product.minStock === null ? null : Number(product.minStock),
        maxStock: product.maxStock === null ? null : Number(product.maxStock),
        baseCurrency: product.baseCurrency,
        foreignBasePrice: product.basePrice === null ? null : Number(product.basePrice),
        brandName: product.brand?.name ?? null,
        categoryName: product.category?.name ?? null,
        price,
        basePrice,
        appliedCoefficient: this.roundMoney(formula.multiplier * coefficient.multiplier),
        appliedCoefficientName: appliedNames.join(' + '),
        priceListId,
        stock: stockBySelectedDeposit ?? stockTotal,
        stockTotal,
      };
    });
  }

  async create(tenantId: string, userId: string | undefined, role: string, data: any): Promise<any> {
    this.assertManager(role);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...this.normalizeProductData(data), tenantId } });
      await this.syncPrices(tx, tenantId, product.id, data.prices);
      await this.syncStockQuantity(tx, tenantId, userId, product.id, data.stockQuantity);
      return product;
    });
  }

  async update(tenantId: string, userId: string | undefined, role: string, id: string, data: any): Promise<any> {
    this.assertManager(role);
    const product = await this.prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Producto inexistente');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: this.normalizeProductData(data) });
      await this.syncPrices(tx, tenantId, id, data.prices);
      await this.syncStockQuantity(tx, tenantId, userId, id, data.stockQuantity);
      return updated;
    });
  }

  async bulkRemove(tenantId: string, role: string, ids: unknown): Promise<any> {
    this.assertOwner(role);
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids must contain at least one product id');
    }

    const uniqueIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('ids must contain at least one product id');
    }
    if (uniqueIds.length > 200) {
      throw new BadRequestException('No se pueden eliminar mas de 200 productos por vez');
    }

    const summary = {
      total: uniqueIds.length,
      deleted: 0,
      archived: 0,
      failed: [] as { id: string; reason: string }[],
    };

    for (const id of uniqueIds) {
      try {
        const result = await this.remove(tenantId, role, id);
        if (result.archived) summary.archived += 1;
        else summary.deleted += 1;
      } catch (error: any) {
        summary.failed.push({ id, reason: error?.message || 'No se pudo eliminar' });
      }
    }

    return summary;
  }

  async remove(tenantId: string, role: string, id: string): Promise<any> {
    this.assertOwner(role);
    const product = await this.prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Producto inexistente');
    const [stockMovements, documentItems] = await Promise.all([
      this.prisma.stockMovement.count({ where: { tenantId, productId: id } }),
      this.prisma.documentItem.count({ where: { productId: id, document: { tenantId } } }),
    ]);

    if (stockMovements > 0 || documentItems > 0) {
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      return { id, deleted: false, archived: true };
    }

    await this.prisma.product.delete({ where: { id } });
    return { id, deleted: true, archived: false };
  }

  listBrands(tenantId: string): any {
    return this.prisma.brand.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  createBrand(tenantId: string, role: string, data: any): any {
    this.assertManager(role);
    const name = String(data.name || '').trim();
    if (!name) throw new BadRequestException('El nombre de marca es requerido');
    return this.prisma.brand.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: { isActive: true },
      create: { tenantId, name, isActive: true },
    });
  }

  listCategories(tenantId: string): any {
    return this.prisma.category.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  createCategory(tenantId: string, role: string, data: any): any {
    this.assertManager(role);
    const name = String(data.name || '').trim();
    if (!name) throw new BadRequestException('El nombre de categoría es requerido');
    return this.prisma.category.upsert({
      where: { tenantId_name_parentId: { tenantId, name, parentId: data.parentId || null } },
      update: {},
      create: { tenantId, name, parentId: data.parentId || null },
    });
  }

  async exportProducts(tenantId: string, role: string): Promise<string> {
    this.assertOwner(role);
    const [products, priceLists, stockRows] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: { brand: true, category: true, priceListItems: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.priceList.findMany({ where: { tenantId, isActive: true }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }),
      this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: { tenantId },
        _sum: { quantity: true },
      }),
    ]);
    const stockByProduct = new Map(stockRows.map((row) => [row.productId, Number(row._sum.quantity ?? 0)]));
    const headers = [
      'Codigo',
      'Equivalencia',
      'Nombre',
      'Precio lista sin iva',
      'Precio lista con iva',
      'Stock',
      'Precio Oferta',
      'Vto Oferta',
      'Mercado Libre',
      'Precio Lista 4 sin iva',
      'IVA',
      'Unidad',
      'Coeficiente Compra',
      'Rotacion',
      'Clasificacion s/rotacion',
      'Dias sin Venta',
      'Clasificacion segun dias sin venta',
      'Lote GM',
      'Codigo en Origen',
      'Marca',
      'Proveedor',
      'Fecha Act. Precio',
      'Costo Reposicion',
      'Costo Promedio',
      'Costo Ult.Cp.',
      'Emergencia',
      'Estanteria',
      'Clasificaciones',
    ];
    const defaultList = priceLists[0];
    const fourthList = priceLists[3];
    const lines = [headers.map((h) => this.csvCell(h)).join(';')];

    products.forEach((product) => {
      const defaultPrice = this.priceForExport(product.priceListItems, defaultList?.id);
      const fourthPrice = this.priceForExport(product.priceListItems, fourthList?.id);
      const row = [
        product.code,
        '',
        product.name,
        defaultPrice ? this.formatCsvNumber(defaultPrice / 1.21) : '',
        defaultPrice ? this.formatCsvNumber(defaultPrice) : '',
        this.formatCsvNumber(stockByProduct.get(product.id) ?? 0),
        '',
        '',
        'No',
        fourthPrice ? this.formatCsvNumber(fourthPrice / 1.21) : '',
        this.formatCsvNumber(Number(product.taxRate ?? 0)),
        product.unit || '',
        product.purchaseUnitCoefficient ? this.formatCsvNumber(Number(product.purchaseUnitCoefficient)) : '',
        '',
        '',
        '',
        '',
        '',
        product.brand?.name || '',
        product.brand?.name || '',
        '',
        product.replacementCost ? this.formatCsvNumber(Number(product.replacementCost)) : '',
        product.averageCost ? this.formatCsvNumber(Number(product.averageCost)) : '',
        product.lastPurchaseCost ? this.formatCsvNumber(Number(product.lastPurchaseCost)) : '',
        '',
        '',
        product.category?.name || '',
      ];
      lines.push(row.map((value) => this.csvCell(value)).join(';'));
    });

    return lines.join('\r\n');
  }

  async importProducts(tenantId: string, userId: string | undefined, role: string, rows: any[], options: any = {}): Promise<any> {
    this.assertOwner(role);
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('rows must contain at least one product');
    }
    this.validateImportRows(rows);

    const summary = { total: rows.length, created: 0, updated: 0, skipped: 0, stockAdjusted: 0, errors: [] as any[] };

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.ensureAguilaPriceLists(tx, tenantId);
        const priceLists = await tx.priceList.findMany({ where: { tenantId, isActive: true }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
        const allowedPriceListIds = new Set(priceLists.map((list) => list.id));
        const defaultDeposit = await tx.deposit.findFirst({
          where: { tenantId, isActive: true },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          select: { id: true },
        });
        for (const [index, raw] of rows.entries()) {
          const baseCode = this.value(raw, ['code', 'codigo', 'Codigo', 'CODIGO', 'Código', 'Código principal', 'Codigo principal', 'codigo principal', 'A']);
          const code = this.buildAguilaCode(baseCode, raw, options);
          const name = this.value(raw, ['name', 'nombre', 'Nombre', 'NOMBRE', 'Nombre del producto', 'Producto', 'E']);

          if (!code || !name) {
            summary.skipped += 1;
            summary.errors.push({ row: index + 1, reason: 'Falta código o nombre' });
            continue;
          }

          const brandName = this.value(raw, ['brandName', 'brand', 'marca', 'Marca']);
          const categoryName = this.value(raw, ['categoryName', 'category', 'categoria', 'Categoria', 'Clasificaciones', 'clasificaciones']);
          const isActive = this.parseBoolean(this.value(raw, ['isActive', 'activo', 'Activo']), true);
          const description = this.optionalValue(raw, this.aguilaAliases(raw, ['description', 'descripcion', 'Descripcion', 'Descripción', 'Descripción del producto', 'Descripcion del producto'], ['F']));
          const equivalenceCode = this.optionalValue(raw, this.aguilaAliases(raw, ['Equivalencia', 'equivalencia', 'Código Equivalencia', 'Codigo Equivalencia', 'codigo equivalencia'], ['C']));
          const originCode = this.optionalValue(raw, this.aguilaAliases(raw, ['Código en origen', 'Codigo en origen', 'codigo en origen', 'Codigo en Origen'], ['D', 'P']));
          const purchaseUnitCoefficient = this.parseMoney(this.pick(raw, this.aguilaAliases(raw, ['Coeficiente de conversión para compras', 'Coeficiente conversion compras', 'Coeficiente Conversión', 'Coeficiente Compra'], ['M'])));
          const taxRate = this.deriveTaxRate(raw);
          const replacementCost = this.parseMoney(this.pick(raw, ['Costo reposición', 'Costo Reposicion', 'Costo reposicion', 'H']));
          const averageCost = this.parseMoney(this.pick(raw, this.aguilaAliases(raw, ['Costo Promedio', 'Costo promedio'], ['I'])));
          const lastPurchaseCost = this.parseMoney(this.pick(raw, ['Costo última compra', 'Costo ultima compra', 'Costo Ult.Cp.', 'Costo Ult Cp', 'J', 'U']));
          const notes = [
            this.optionalValue(raw, ['notes', 'notas', 'Notas']),
            equivalenceCode ? `Codigo equivalencia: ${equivalenceCode}` : '',
            originCode ? `Codigo origen: ${originCode}` : '',
            options.supplierId ? `Proveedor asociado: ${options.supplierId}` : '',
          ].filter(Boolean).join('\n') || undefined;

          const brand = brandName
            ? await tx.brand.upsert({
                where: { tenantId_name: { tenantId, name: brandName } },
                update: { isActive: true },
                create: { tenantId, name: brandName, isActive: true },
              })
            : null;

          let category = categoryName
            ? await tx.category.findFirst({ where: { tenantId, name: categoryName, parentId: null } })
            : null;

          if (categoryName && !category) {
            category = await tx.category.create({ data: { tenantId, name: categoryName } });
          }

          const existingByCode = await tx.product.findUnique({
            where: { tenantId_code: { tenantId, code } },
            select: { id: true },
          });

          const nameMatches = existingByCode ? [] : await tx.product.findMany({
            where: { tenantId, name },
            select: { id: true },
            take: 2,
          });
          if (nameMatches.length > 1) {
            throw new BadRequestException(`No se importó nada. El nombre "${name}" ya existe más de una vez en productos; no puedo decidir cuál actualizar.`);
          }

          const existing = existingByCode ?? nameMatches[0] ?? null;
          if (!existing && options.addNewCodes === false) {
            summary.skipped += 1;
            continue;
          }
          const productData = {
            code,
            name,
            description,
            notes,
            barcode: this.optionalValue(raw, ['barcode', 'Codigo de barras', 'Código de barras', 'EAN', 'EAN13']),
            barcodeAlt: this.optionalValue(raw, ['barcodeAlt', 'codigo alternativo', 'Codigo alternativo', 'Código alternativo']),
            brandId: brand?.id ?? undefined,
            categoryId: category?.id ?? undefined,
            unit: this.value(raw, this.aguilaAliases(raw, ['Unidad de medida', 'Unidad', 'unit'], ['L'])) || undefined,
            purchaseUnitCoefficient,
            taxRate: taxRate ?? undefined,
            replacementCost,
            averageCost,
            lastPurchaseCost,
            minStock: this.parseMoney(this.pick(raw, ['Stock minimo', 'Stock mínimo', 'minStock'])),
            maxStock: this.parseMoney(this.pick(raw, ['Stock maximo', 'Stock máximo', 'maxStock'])),
            isActive,
          };
          const product = existing
            ? await tx.product.update({ where: { id: existing.id }, data: productData })
            : await tx.product.create({
                data: {
                  tenantId,
                  code,
                  name,
                  description: description ?? null,
                  notes: notes ?? null,
                  barcode: this.optionalValue(raw, ['barcode', 'Codigo de barras', 'Código de barras', 'EAN', 'EAN13']) ?? null,
                  barcodeAlt: this.optionalValue(raw, ['barcodeAlt', 'codigo alternativo', 'Codigo alternativo', 'Código alternativo']) ?? null,
                  brandId: brand?.id,
                  categoryId: category?.id,
                  unit: this.value(raw, this.aguilaAliases(raw, ['Unidad de medida', 'Unidad', 'unit'], ['L'])) || 'un',
                  purchaseUnitCoefficient,
                  taxRate: taxRate ?? 21,
                  replacementCost,
                  averageCost,
                  lastPurchaseCost,
                  minStock: this.parseMoney(this.pick(raw, ['Stock minimo', 'Stock mínimo', 'minStock'])),
                  maxStock: this.parseMoney(this.pick(raw, ['Stock maximo', 'Stock máximo', 'maxStock'])),
                  isActive,
                },
              });
          await this.syncPrices(tx, tenantId, product.id, this.extractPrices(raw, priceLists), allowedPriceListIds);
          const stock = this.parseMoney(this.pick(raw, ['stock', 'Stock', 'STOCK']));
          if (stock !== null && defaultDeposit) {
            const currentStock = await tx.stockMovement.aggregate({
              where: { tenantId, productId: product.id, depositId: defaultDeposit.id },
              _sum: { quantity: true },
            });
            const currentQuantity = Number(currentStock._sum.quantity ?? 0);
            const diff = stock - currentQuantity;
            if (Math.abs(diff) > 0.0001) {
              await tx.stockMovement.create({
                data: {
                  tenantId,
                  createdById: userId,
                  productId: product.id,
                  depositId: defaultDeposit.id,
                  type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                  quantity: diff,
                  unitCost: lastPurchaseCost ?? replacementCost ?? averageCost ?? this.firstMoney(raw, ['Costo Ult.Cp.', 'Costo Reposicion', 'Costo Reposición', 'Precio lista sin iva']) ?? 0,
                  notes: 'Importacion Aguila productos',
                },
              });
              summary.stockAdjusted += 1;
            }
          }

          if (existing) summary.updated += 1;
          else summary.created += 1;
        }
      }, { timeout: 120_000, maxWait: 20_000 });
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Product import failed', error);
      if (error?.code === 'P2028') {
        throw new BadRequestException('No se importó nada. La importación tardó demasiado; probá con un CSV más chico o reintentá.');
      }
      throw new BadRequestException('No se importó nada. No se pudo completar la importación con los datos recibidos.');
    }

    return summary;
  }

  private validateImportRows(rows: any[]): void {
    const requiredColumns = [
      { label: 'Codigo', aliases: ['code', 'codigo', 'Codigo', 'CODIGO', 'Código', 'Código principal', 'Codigo principal', 'A'] },
      { label: 'Nombre', aliases: ['name', 'nombre', 'Nombre', 'NOMBRE', 'Nombre del producto', 'Producto', 'E'] },
      { label: 'Precio', aliases: ['precio', 'Precio', 'PRECIO', 'LP1', 'lp1', 'Precio LP1', 'Precio Lista 1', 'Precio lista 1', 'Precio lista sin iva', 'Precio lista 1 sin IVA', 'Precio de venta lista 1 sin IVA', 'Precio lista con iva', 'Precio lista c/iva', 'Precio Lista con IVA', 'Precio de venta', 'G'] },
    ];

    const headers = new Set(
      rows.flatMap((row) => Object.keys(row || {}).map((header) => this.normalizeHeader(header))),
    );
    const missingColumns = requiredColumns
      .filter((column) => !column.aliases.some((alias) => headers.has(this.normalizeHeader(alias))))
      .map((column) => column.label);

    if (missingColumns.length > 0) {
      throw new BadRequestException(`No se importó nada. Faltan columnas obligatorias: ${missingColumns.join(', ')}.`);
    }

    const errors: string[] = [];
    const codes = new Set<string>();
    const names = new Set<string>();

    rows.forEach((raw, index) => {
      const rowNumber = index + 2;
      const code = this.value(raw, ['code', 'codigo', 'Codigo', 'CODIGO', 'Código', 'Código principal', 'Codigo principal', 'A']);
      const name = this.value(raw, ['name', 'nombre', 'Nombre', 'NOMBRE', 'Nombre del producto', 'Producto', 'E']);
      const price = this.parseMoney(this.pick(raw, ['precio', 'Precio', 'PRECIO', 'LP1', 'lp1', 'Precio LP1', 'Precio Lista 1', 'Precio lista 1', 'Precio lista sin iva', 'Precio lista 1 sin IVA', 'Precio de venta lista 1 sin IVA', 'Precio lista con iva', 'Precio lista c/iva', 'Precio Lista con IVA', 'Precio de venta', 'G']));
      const stock = this.parseMoney(this.pick(raw, ['stock', 'Stock', 'STOCK']));

      if (!code) errors.push(`fila ${rowNumber}: falta Codigo`);
      else if (codes.has(code)) errors.push(`fila ${rowNumber}: Codigo duplicado (${code})`);
      else codes.add(code);

      if (!name) errors.push(`fila ${rowNumber}: falta Nombre`);
      else if (names.has(this.normalizeProductName(name))) errors.push(`fila ${rowNumber}: Nombre duplicado (${name})`);
      else names.add(this.normalizeProductName(name));
      if (price === null || price < 0) errors.push(`fila ${rowNumber}: falta o es invalido Precio lista con iva`);
      if (stock !== null && stock < 0) errors.push(`fila ${rowNumber}: Stock no puede ser negativo`);
    });

    if (errors.length > 0) {
      const visibleErrors = errors.slice(0, 12).join('; ');
      const extra = errors.length > 12 ? `; y ${errors.length - 12} error(es) mas` : '';
      throw new BadRequestException(`No se importó nada. Corregí el CSV: ${visibleErrors}${extra}.`);
    }
  }

  private normalizeProductData(data: any): any {
    const productData: any = {
      code: data.code,
      barcode: data.barcode === undefined ? undefined : data.barcode || null,
      barcodeAlt: data.barcodeAlt === undefined ? undefined : data.barcodeAlt || null,
      name: data.name,
      unit: data.unit === undefined ? undefined : data.unit || 'item',
      brandId: data.brandId === undefined ? undefined : data.brandId || null,
      categoryId: data.categoryId === undefined ? undefined : data.categoryId || null,
      description: data.description === undefined ? undefined : data.description || null,
      notes: data.notes === undefined ? undefined : data.notes || null,
      purchaseUnitCoefficient: data.purchaseUnitCoefficient === undefined ? undefined : this.parseNullableNonNegativeMoney(data.purchaseUnitCoefficient, 'coeficiente de compra'),
      taxRate: data.taxRate === undefined ? undefined : this.parseNullableNonNegativeMoney(data.taxRate, 'IVA') ?? 21,
      replacementCost: data.replacementCost === undefined ? undefined : this.parseNullableNonNegativeMoney(data.replacementCost, 'costo reposicion'),
      averageCost: data.averageCost === undefined ? undefined : this.parseNullableNonNegativeMoney(data.averageCost, 'costo promedio'),
      lastPurchaseCost: data.lastPurchaseCost === undefined ? undefined : this.parseNullableNonNegativeMoney(data.lastPurchaseCost, 'costo ultima compra'),
      minStock: data.minStock === undefined ? undefined : this.parseNullableNonNegativeMoney(data.minStock, 'stock minimo'),
      maxStock: data.maxStock === undefined ? undefined : this.parseNullableNonNegativeMoney(data.maxStock, 'stock maximo'),
      baseCurrency: data.baseCurrency === undefined ? undefined : String(data.baseCurrency || 'ARS').toUpperCase(),
      basePrice: data.basePrice === undefined ? undefined : this.parseNullableNonNegativeMoney(data.basePrice, 'precio moneda base'),
      isActive: data.isActive,
    };
    Object.keys(productData).forEach((key) => productData[key] === undefined && delete productData[key]);
    return productData;
  }

  private async withStockQuantity(tenantId: string, products: any[]): Promise<any[]> {
    if (products.length === 0) return products;
    const stockRows = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId, productId: { in: products.map((product) => product.id) } },
      _sum: { quantity: true },
    });
    const stockByProduct = new Map(stockRows.map((row) => [row.productId, Number(row._sum.quantity ?? 0)]));
    return products.map((product) => ({
      ...product,
      stockQuantity: stockByProduct.get(product.id) ?? 0,
    }));
  }

  private async syncStockQuantity(tx: any, tenantId: string, userId: string | undefined, productId: string, rawTarget: unknown): Promise<void> {
    const target = this.parseMoney(rawTarget);
    if (target === null) return;

    const defaultDeposit = await tx.deposit.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true },
    });
    if (!defaultDeposit) {
      throw new BadRequestException('No se pudo ajustar stock: falta un depósito activo.');
    }

    const currentStock = await tx.stockMovement.aggregate({
      where: { tenantId, productId, depositId: defaultDeposit.id },
      _sum: { quantity: true },
    });
    const currentQuantity = Number(currentStock._sum.quantity ?? 0);
    const diff = target - currentQuantity;
    if (Math.abs(diff) <= 0.0001) return;

    await tx.stockMovement.create({
      data: {
        tenantId,
        createdById: userId,
        productId,
        depositId: defaultDeposit.id,
        type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantity: diff,
        unitCost: 0,
        notes: 'Edicion manual de stock desde producto',
      },
    });
  }

  private async syncPrices(tx: any, tenantId: string, productId: string, prices: any, allowedPriceListIds?: Set<string>): Promise<void> {
    if (!prices || typeof prices !== 'object') return;
    const allowedIds = allowedPriceListIds ?? new Set(
      (await tx.priceList.findMany({ where: { tenantId }, select: { id: true } })).map((list: { id: string }) => list.id),
    );

    for (const [priceListId, rawPrice] of Object.entries(prices)) {
      if (!allowedIds.has(priceListId)) continue;
      const price = this.parseMoney(rawPrice);
      if (price === null || price < 0) continue;
      await tx.priceListItem.upsert({
        where: { priceListId_productId: { priceListId, productId } },
        update: { price },
        create: { priceListId, productId, price },
      });
    }
  }

  private async activePriceCoefficients(tenantId: string, productIds: string[], categoryIds: string[]): Promise<any[]> {
    const now = new Date();
    return this.prisma.priceCoefficient.findMany({
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

  private extractPrices(raw: any, priceLists: { id: string; name: string }[]): Record<string, number> {
    const prices: Record<string, number> = {};
    const ivaRate = this.deriveTaxRate(raw) ?? 0;
    priceLists.forEach((list, index) => {
      const listNumber = index + 1;
      const code = this.priceListCode(list.name);
      const candidates = [
        list.id,
        list.name,
        list.name.toLowerCase(),
        `precio ${list.name}`,
        `price ${list.name}`,
        ...(code ? this.priceListAliases(code) : []),
        `lista ${listNumber}`,
        `Lista ${listNumber}`,
        `l${listNumber}`,
        `L${listNumber}`,
        `L${listNumber} C/IVA`,
        `l${listNumber} c/iva`,
      ];
      if (code === 'LP1' || index === 0) {
        candidates.push(
          'price',
          'precio',
          'Precio',
          'PRECIO',
          'precio_lista',
          'precioLista',
          'Precio lista sin iva',
          'Precio lista 1 sin IVA',
          'Precio de venta lista 1 sin IVA',
          'Precio lista con iva',
          'Precio lista c/iva',
          'Precio Lista con IVA',
          'Precio de venta',
          'G',
        );
      }
      if (code === 'LP4' || index === 3) {
        candidates.push('Precio Lista 4 sin iva', 'Precio lista 4 sin iva', 'Lista 4 sin iva');
      }
      const value = this.pick(raw, candidates);
      let price = this.parseMoney(value);
      if ((code === 'LP1' || index === 0) && price !== null) {
        const explicitGross = this.pick(raw, ['Precio lista con iva', 'Precio lista c/iva', 'Precio Lista con IVA']);
        const explicitNet = this.pick(raw, ['Precio lista sin iva', 'Precio lista 1 sin IVA', 'Precio de venta lista 1 sin IVA', 'G']);
        const onlyGross = (explicitNet === undefined || explicitNet === null || String(explicitNet).trim() === '') && explicitGross !== undefined && explicitGross !== null && String(explicitGross).trim() !== '';
        if (onlyGross && ivaRate > 0) price = this.roundMoney(price / (1 + ivaRate / 100));
      }
      if (price !== null) prices[list.id] = price;
    });
    return prices;
  }

  private priceListCode(name: string): string | null {
    const normalized = this.normalizeHeader(name);
    if (normalized.startsWith('lp1')) return 'LP1';
    if (normalized.startsWith('lp2')) return 'LP2';
    if (normalized.startsWith('lp3')) return 'LP3';
    if (normalized.startsWith('lp4')) return 'LP4';
    if (normalized.startsWith('lp5')) return 'LP5';
    if (normalized.startsWith('cr') || normalized.includes('costoreposicion')) return 'CR';
    if (normalized.startsWith('cu') || normalized.includes('costoultimacompra') || normalized.includes('costoultcp')) return 'CU';
    return null;
  }

  private priceListAliases(code: string): string[] {
    const number = code.startsWith('LP') ? code.slice(2) : '';
    if (number) {
      return [
        code,
        code.toLowerCase(),
        `Precio ${code}`,
        `precio ${code}`,
        `Lista ${number}`,
        `lista ${number}`,
        `Precio Lista ${number}`,
        `Precio lista ${number}`,
        `Precio lista ${number} con iva`,
        `Precio lista ${number} c/iva`,
        `Precio lista ${number} sin iva`,
        `L${number}`,
        `l${number}`,
      ];
    }
    if (code === 'CR') {
      return ['CR', 'cr', 'Costo Reposición', 'Costo Reposicion', 'Costo reposicion', 'Costo de reposición', 'Costo de reposicion', 'Costo Rep.', 'Costo Rep', 'H'];
    }
    return ['CU', 'cu', 'Costo Ultima Compra', 'Costo última compra', 'Costo Ult.Cp.', 'Costo Ult Cp', 'Ultima Compra', 'Última Compra', 'U', 'J'];
  }

  private formulaPriceForProduct(product: ProductForFormula, priceLists: PriceListForFormula[], priceListId?: string | null): { price: number; multiplier: number; name: string } {
    const selected = priceLists.find((list) => list.id === priceListId) || priceLists.find((list) => list.isDefault) || priceLists[0];
    const selectedCode = selected ? this.priceListCode(selected.name) : 'LP1';
    const lp1 = this.directListPrice(product, this.listByCode(priceLists, 'LP1')) ?? this.directListPrice(product, selected) ?? 0;
    const cr = this.directListPrice(product, this.listByCode(priceLists, 'CR'))
      ?? this.moneyValue(product.replacementCost)
      ?? this.moneyValue(product.averageCost)
      ?? 0;
    const cu = this.directListPrice(product, this.listByCode(priceLists, 'CU'))
      ?? this.moneyValue(product.lastPurchaseCost)
      ?? this.moneyValue(product.replacementCost)
      ?? this.moneyValue(product.averageCost)
      ?? 0;

    if (selectedCode === 'LP2') return { price: this.roundMoney(lp1 * 0.6), multiplier: 0.6, name: 'LP2 = LP1 x 0.60' };
    if (selectedCode === 'LP3') return { price: this.roundMoney(lp1 * 0.8), multiplier: 0.8, name: 'LP3 = LP1 x 0.80' };
    if (selectedCode === 'LP4') return { price: this.roundMoney(cr * 1.2), multiplier: 1.2, name: 'LP4 = CR x 1.20' };
    if (selectedCode === 'LP5') return { price: this.roundMoney(cr), multiplier: 1, name: 'LP5 = CR' };
    if (selectedCode === 'CR') return { price: this.roundMoney(cr), multiplier: 1, name: 'CR' };
    if (selectedCode === 'CU') return { price: this.roundMoney(cu), multiplier: 1, name: 'CU' };

    const direct = this.directListPrice(product, selected);
    return { price: this.roundMoney(direct ?? lp1), multiplier: 1, name: selectedCode === 'LP1' ? 'LP1' : '' };
  }

  private listByCode(priceLists: PriceListForFormula[], code: string): PriceListForFormula | undefined {
    return priceLists.find((list) => this.priceListCode(list.name) === code);
  }

  private directListPrice(product: ProductForFormula, list?: PriceListForFormula): number | null {
    if (!list) return null;
    const item = product.priceListItems.find((price) => price.priceListId === list.id);
    return item ? this.moneyValue(item.price) : null;
  }

  private moneyValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async ensureAguilaPriceLists(tx: any, tenantId: string): Promise<void> {
    const existing = await tx.priceList.findMany({ where: { tenantId }, select: { id: true, name: true, isDefault: true } });
    const existingNames = new Set(existing.map((list: { name: string }) => list.name));
    for (const list of REQUIRED_AGUILA_PRICE_LISTS) {
      if (!existingNames.has(list.name)) {
        await tx.priceList.create({ data: { tenantId, name: list.name, isDefault: false, isActive: true } });
      }
    }

    const lp1 = existing.find((list: { name: string }) => list.name === REQUIRED_AGUILA_PRICE_LISTS[0].name)
      || await tx.priceList.findFirst({ where: { tenantId, name: REQUIRED_AGUILA_PRICE_LISTS[0].name }, select: { id: true } });
    if (lp1) {
      await tx.priceList.updateMany({ where: { tenantId, isDefault: true, NOT: { id: lp1.id } }, data: { isDefault: false } });
      await tx.priceList.update({ where: { id: lp1.id }, data: { isDefault: true, isActive: true } });
    }
  }

  private buildAguilaCode(baseCode: string, raw: any, options: any): string {
    const cleanBase = String(baseCode || '').trim();
    if (!cleanBase) return '';
    const rawSuffix = options?.alternateCode ?? this.value(raw, this.aguilaAliases(raw, ['Código alternativo', 'Codigo alternativo', 'codigo alternativo'], ['B']));
    const suffix = String(rawSuffix || '').replace(/\D/g, '').slice(0, 5);
    if (!suffix) return cleanBase.slice(0, 30);
    if (cleanBase.endsWith(suffix)) return cleanBase.slice(0, 30);
    return `${cleanBase.slice(0, 25)}${suffix.slice(0, 5)}`.slice(0, 30);
  }

  private aguilaAliases(raw: any, namedAliases: string[], letterAliases: string[]): string[] {
    return this.hasNamedAguilaHeaders(raw) ? namedAliases : [...namedAliases, ...letterAliases];
  }

  private hasNamedAguilaHeaders(raw: any): boolean {
    const headers = Object.keys(raw || {}).map((header) => this.normalizeHeader(header));
    return [
      'codigo',
      'equivalencia',
      'precio lista sin iva',
      'precio lista con iva',
      'codigo en origen',
      'costo ult.cp.',
    ].some((header) => headers.includes(this.normalizeHeader(header)));
  }

  private deriveTaxRate(raw: any): number | null {
    const explicit = this.parseMoney(this.pick(raw, this.aguilaAliases(raw, ['Tasa de IVA', 'IVA', 'iva'], ['K'])));
    if (explicit !== null) return explicit;

    const net = this.parseMoney(this.pick(raw, ['Precio lista sin iva', 'Precio lista 1 sin IVA', 'Precio de venta lista 1 sin IVA']));
    const gross = this.parseMoney(this.pick(raw, ['Precio lista con iva', 'Precio lista c/iva', 'Precio Lista con IVA']));
    if (net !== null && gross !== null && net > 0 && gross >= net) {
      return this.roundMoney(((gross / net) - 1) * 100);
    }
    return null;
  }

  private pick(raw: any, aliases: string[]): unknown {
    for (const alias of aliases) {
      if (raw?.[alias] !== undefined && raw?.[alias] !== null && String(raw[alias]).trim() !== '') {
        return raw[alias];
      }
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

  private firstMoney(raw: any, aliases: string[]): number | null {
    for (const alias of aliases) {
      const parsed = this.parseMoney(this.pick(raw, [alias]));
      if (parsed !== null && parsed > 0) return parsed;
    }
    return null;
  }

  private normalizeHeader(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private normalizeProductName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private searchTerms(value: string): string[] {
    const terms = value
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
    return [...new Set(terms)].slice(0, 8);
  }

  private priceForExport(items: { priceListId: string; price: unknown }[], priceListId?: string): number {
    if (!priceListId) return 0;
    const item = items.find((i) => i.priceListId === priceListId);
    return item ? Number(item.price || 0) : 0;
  }

  private formatCsvNumber(value: number): string {
    if (!Number.isFinite(value)) return '';
    return String(Math.round(value * 100) / 100);
  }

  private roundMoney(value: number): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? '');
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private parseBoolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    if (typeof value === 'boolean') return value;
    const text = String(value).trim().toLowerCase();
    if (['1', 'true', 'si', 'sí', 's', 'yes', 'activo', 'active'].includes(text)) return true;
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

  private parseNullableNonNegativeMoney(value: unknown, label: string): number | null {
    const parsed = this.parseMoney(value);
    if (parsed === null) return null;
    if (parsed < 0) throw new BadRequestException(`El valor de ${label} no puede ser negativo`);
    return parsed;
  }

  private assertManager(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo la cuenta owner puede modificar productos y precios');
    }
  }

  private assertOwner(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo la cuenta owner puede importar productos');
    }
  }
}



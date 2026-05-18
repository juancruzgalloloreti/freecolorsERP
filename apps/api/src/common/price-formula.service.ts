import { Injectable } from '@nestjs/common';

export interface ProductForFormula {
  basePrice?: unknown;
  replacementCost?: unknown;
  averageCost?: unknown;
  lastPurchaseCost?: unknown;
  priceListItems?: { priceListId: string; price: unknown; isManualOverride?: boolean }[];
}

export interface PriceListForFormula {
  id: string;
  name: string;
  isDefault?: boolean | null;
  formulaBaseCode?: string | null;
  formulaOperation?: string | null;
  formulaCoefficient?: unknown;
  formulaRoundingMode?: string | null;
  formulaRoundingValue?: unknown;
}

@Injectable()
export class PriceFormulaService {
  basePriceByCode(
    product: ProductForFormula,
    priceLists: PriceListForFormula[],
    code: string,
  ): number | null {
    const normalizedCode = this.priceListCode(code) || code;
    if (normalizedCode === 'CR') {
      return this.directListPrice(product, this.listByCode(priceLists, 'CR'))
        ?? this.moneyValue(product.replacementCost)
        ?? this.moneyValue(product.averageCost);
    }
    if (normalizedCode === 'CU') {
      return this.directListPrice(product, this.listByCode(priceLists, 'CU'))
        ?? this.moneyValue(product.lastPurchaseCost)
        ?? this.moneyValue(product.replacementCost)
        ?? this.moneyValue(product.averageCost);
    }
    return this.directListPrice(product, this.listByCode(priceLists, normalizedCode));
  }

  calculateFormulaPrice(
    basePrice: number,
    operation: string,
    coefficient: number,
    roundingMode: string,
    rounding: number,
  ): number {
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

  defaultFormulaForCode(code: string | null): {
    baseCode: string;
    operation: string;
    coefficient: number;
    roundingMode: string;
    rounding: number;
  } | null {
    if (code === 'LP2') return { baseCode: 'LP1', operation: 'multiply', coefficient: 0.6, roundingMode: 'nearest', rounding: 10 };
    if (code === 'LP3') return { baseCode: 'LP1', operation: 'multiply', coefficient: 0.8, roundingMode: 'nearest', rounding: 10 };
    if (code === 'LP4') return { baseCode: 'CR', operation: 'multiply', coefficient: 1.2, roundingMode: 'nearest', rounding: 10 };
    if (code === 'LP5') return { baseCode: 'CR', operation: 'multiply', coefficient: 1, roundingMode: 'nearest', rounding: 10 };
    return null;
  }

  priceListCode(name: string): string | null {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    if (normalized.startsWith('lp1')) return 'LP1';
    if (normalized.startsWith('lp2')) return 'LP2';
    if (normalized.startsWith('lp3')) return 'LP3';
    if (normalized.startsWith('lp4')) return 'LP4';
    if (normalized.startsWith('lp5')) return 'LP5';
    if (normalized.startsWith('cr') || normalized.includes('costoreposicion')) return 'CR';
    if (normalized.startsWith('cu') || normalized.includes('costoultimacompra') || normalized.includes('costoultcp')) return 'CU';
    return null;
  }

  listByCode(priceLists: PriceListForFormula[], code: string): PriceListForFormula | undefined {
    return priceLists.find((list) => this.priceListCode(list.name) === code);
  }

  directListPrice(product: ProductForFormula, priceList?: PriceListForFormula): number | null {
    if (!priceList || !product.priceListItems) return null;
    const item = product.priceListItems.find((p) => p.priceListId === priceList.id);
    return item ? this.moneyValue(item.price) : null;
  }

  moneyValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  roundMoney(value: number): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }
}

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { CONFIG } from './config';
import {
  ComprobanteRow,
  StockRow,
  DryRunReport,
  NeedsReviewEntry,
  OrphanProduct,
  CuitQuality,
  CuitCollision,
  NumberCollision,
  SignMismatch,
  LEGACY_TYPE_MAP,
  NEEDS_REVIEW_TYPES,
} from './types';

function normalizeCuit(raw: string): string | null {
  const cleaned = raw.replace(/[^\d]/g, '');
  if (!cleaned || cleaned.length < 10) return null;
  const placeholders = ['11111111', '1111111', '00000000000', '0', ''];
  if (placeholders.includes(cleaned)) return null;
  return cleaned;
}

function isValidCuit(cuit: string): boolean {
  if (cuit.length !== 11) return false;
  const base = cuit.slice(0, -1);
  const check = parseInt(cuit.slice(-1), 10);
  let sum = 0;
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 10; i++) {
    sum += parseInt(base[i], 10) * multipliers[i];
  }
  const mod = sum % 11;
  const expected = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  return expected === check;
}

function loadComprobantes(): ComprobanteRow[] {
  const wb = XLSX.readFile(CONFIG.comprobantesPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  return raw.map((r) => {
    const row: Record<string, unknown> = {};
    const keys = Object.keys(r);
    let col19Used = false;

    for (const k of keys) {
      const v = r[k];
      if (k === 'wPercGcias') {
        if (!col19Used) {
          row['wPercGcias_1'] = v;
          col19Used = true;
        } else {
          row['wPercGcias_2'] = v;
        }
      } else {
        row[k] = v;
      }
    }

    return {
      idcomprobante: Number(row.idcomprobante),
      NombreDefComprobante: String(row.NombreDefComprobante ?? ''),
      FechaComprobante: Number(row.FechaComprobante),
      TipoComprobante: String(row.TipoComprobante ?? ''),
      LetraComprobante: String(row.LetraComprobante ?? ''),
      PVComprobante: Number(row.PVComprobante ?? 0),
      NumeroComprobante: Number(row.NumeroComprobante ?? 0),
      RazonSocialComprobante: String(row.RazonSocialComprobante ?? ''),
      DomicilioComprobante: String(row.DomicilioComprobante ?? ''),
      LocalidadComprobante: String(row.LocalidadComprobante ?? ''),
      CondIVAComprobante: String(row.CondIVAComprobante ?? ''),
      CuitComprobante: String(row.CuitComprobante ?? ''),
      ProvinciaComprobante: String(row.ProvinciaComprobante ?? ''),
      wCaja: Number(row.wCaja ?? 0),
      wCtaCte: Number(row.wCtaCte ?? 0),
      wNeto: Number(row.wNeto ?? 0),
      wIVA: Number(row.wIVA ?? 0),
      wPercIIBB: Number(row.wPercIIBB ?? 0),
      wRetIIBB: Number(row.wRetIIBB ?? 0),
      wPercGcias_1: Number(row.wPercGcias_1 ?? 0),
      wRetRecibidas: Number(row.wRetRecibidas ?? 0),
      wPercIVA: Number(row.wPercIVA ?? 0),
      wImpuestoInterno: Number(row.wImpuestoInterno ?? 0),
      wPercGcias_2: Number(row.wPercGcias_2 ?? 0),
      wOtros: Number(row.wOtros ?? 0),
    };
  });
}

function loadStock(): StockRow[] {
  const wb = XLSX.readFile(CONFIG.stockPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  return raw.map((r) => ({
    idcomprobante: Number(r.idcomprobante),
    FechaComprobante: Number(r.FechaComprobante),
    TipoComprobante: String(r.TipoComprobante ?? ''),
    LetraComprobante: String(r.LetraComprobante ?? ''),
    PVComprobante: Number(r.PVComprobante ?? 0),
    NumeroComprobante: Number(r.NumeroComprobante ?? 0),
    CodigoStProducto: String(r.CodigoStProducto ?? '').trim(),
    NombreStProducto: String(r.NombreStProducto ?? '').trim(),
    CantidadStMovimiento: Number(r.CantidadStMovimiento ?? 0),
    CostoStMovimiento: Number(r.CostoStMovimiento ?? 0),
    VentaStMovimiento: Number(r.VentaStMovimiento ?? 0),
  }));
}

export async function runDryRun(): Promise<DryRunReport> {
  console.log('📋 Paso 0: Dry Run — Validación pre-importación');
  console.log('   Cargando XLSX...');

  const comprobantes = loadComprobantes();
  const stock = loadStock();

  console.log(`   ✓ ${comprobantes.length} comprobantes cargados`);
  console.log(`   ✓ ${stock.length} movimientos de stock cargados`);

  // --- Validación de relación cabecera-detalle ---
  const compIds = new Set(comprobantes.map((c) => c.idcomprobante));
  const stockIds = new Set(stock.map((s) => s.idcomprobante));
  const sinDetalle = comprobantes.filter((c) => !stockIds.has(c.idcomprobante));

  console.log(`   ✓ ${stockIds.size} comprobantes únicos con detalle`);
  console.log(`   ✓ ${sinDetalle.length} comprobantes sin detalle (esperados: financieros)`);

  // --- Productos únicos y huérfanos ---
  const productCodes = new Map<string, string>();
  for (const s of stock) {
    if (!productCodes.has(s.CodigoStProducto)) {
      productCodes.set(s.CodigoStProducto, s.NombreStProducto);
    }
  }
  console.log(`   ✓ ${productCodes.size} productos únicos detectados`);

  // Productos huérfanos (los que aparecen en movimientos con código vacío)
  const orphanProducts: OrphanProduct[] = [];
  for (const [code, name] of productCodes) {
    if (!code) {
      const count = stock.filter((s) => s.CodigoStProducto === code).length;
      orphanProducts.push({ code, name, occurrences: count });
    }
  }
  if (orphanProducts.length > 0) {
    console.log(`   ⚠ ${orphanProducts.length} productos con código vacío`);
  }

  // --- CUIT quality ---
  const cuitQuality: CuitQuality = { blank: 0, placeholder: 0, valid: 0, invalidNotPlaceholder: [] };
  const cuitMap = new Map<string, Set<string>>();

  for (const c of comprobantes) {
    const raw = c.CuitComprobante.trim();
    if (!raw) {
      cuitQuality.blank++;
      continue;
    }
    const normalized = normalizeCuit(raw);
    if (!normalized) {
      cuitQuality.placeholder++;
      continue;
    }
    if (isValidCuit(normalized)) {
      cuitQuality.valid++;
      if (!cuitMap.has(normalized)) {
        cuitMap.set(normalized, new Set());
      }
      cuitMap.get(normalized)!.add(c.RazonSocialComprobante.trim());
    } else {
      const existing = cuitQuality.invalidNotPlaceholder.find((i) => i.cuit === raw);
      if (existing) {
        existing.count++;
      } else {
        cuitQuality.invalidNotPlaceholder.push({ cuit: raw, razonSocial: c.RazonSocialComprobante, count: 1 });
      }
    }
  }

  console.log(`   ✓ CUIT: ${cuitQuality.blank} blank, ${cuitQuality.placeholder} placeholder, ${cuitQuality.valid} válidos, ${cuitQuality.invalidNotPlaceholder.length} inválidos no-placeholder`);

  // --- Colisiones de CUIT ---
  const cuitCollisions: CuitCollision[] = [];
  for (const [cuit, names] of cuitMap) {
    const uniqueNames = [...names].filter((n) => n.toLowerCase() !== 'consumidor final');
    if (uniqueNames.length > 1) {
      cuitCollisions.push({ cuit, razonesSociales: uniqueNames });
    }
  }
  if (cuitCollisions.length > 0) {
    console.log(`   ⚠ ${cuitCollisions.length} CUITs con razones sociales múltiples`);
  }

  // --- Comprobantes que no cierran (sign mismatch) ---
  const signMismatches: SignMismatch[] = [];
  for (const c of comprobantes) {
    const taxes = c.wPercIIBB + c.wRetIIBB + c.wPercGcias_1 + c.wPercGcias_2 + c.wRetRecibidas + c.wPercIVA + c.wImpuestoInterno + c.wOtros;
    const financialSum = -(c.wNeto + c.wIVA + taxes);
    const actualSum = c.wCaja + c.wCtaCte;
    const diff = Math.abs(actualSum - financialSum);
    if (diff > 1) {
      signMismatches.push({
        idcomprobante: c.idcomprobante,
        type: c.NombreDefComprobante,
        wCaja: c.wCaja,
        wCtaCte: c.wCtaCte,
        wNeto: c.wNeto,
        wIVA: c.wIVA,
        totalTaxes: taxes,
        difference: diff,
      });
    }
  }
  console.log(`   ✓ ${signMismatches.length} comprobantes no cierran financieramente`);

  // --- NEEDS_REVIEW ---
  const needsReview: NeedsReviewEntry[] = [];

  for (const sm of signMismatches) {
    needsReview.push({
      idcomprobante: sm.idcomprobante,
      type: sm.type,
      reason: `Diferencia financiera: ${sm.difference.toFixed(2)}`,
    });
  }

  for (const c of comprobantes) {
    const mapped = LEGACY_TYPE_MAP[c.NombreDefComprobante];
    if (mapped && NEEDS_REVIEW_TYPES.includes(mapped)) {
      if (!needsReview.find((n) => n.idcomprobante === c.idcomprobante)) {
        needsReview.push({
          idcomprobante: c.idcomprobante,
          type: c.NombreDefComprobante,
          reason: 'Transferencia entre depósitos sin datos de origen/destino',
        });
      }
    }
  }

  console.log(`   ⚠ ${needsReview.length} registros marcados como NEEDS_REVIEW`);

  // --- Colisiones de número (mismo tipo + PV + número) ---
  const numberKeys = new Map<string, number[]>();
  for (const c of comprobantes) {
    if (c.NumeroComprobante > 0) {
      const key = `${c.TipoComprobante}|${c.PVComprobante}|${c.NumeroComprobante}`;
      if (!numberKeys.has(key)) numberKeys.set(key, []);
      numberKeys.get(key)!.push(c.idcomprobante);
    }
  }
  const numberCollisions: NumberCollision[] = [];
  for (const [key, ids] of numberKeys) {
    if (ids.length > 1) {
      const [tipo, pv, num] = key.split('|');
      numberCollisions.push({ type: tipo, pv: Number(pv), number: Number(num), legacyIds: ids });
    }
  }
  if (numberCollisions.length > 0) {
    console.log(`   ⚠ ${numberCollisions.length} colisiones de número (mismo tipo+PV+numero)`);
  }

  // --- Reporte ---
  const report: DryRunReport = {
    totalComprobantes: comprobantes.length,
    totalStockMovements: stock.length,
    importableCount: comprobantes.length - needsReview.length,
    needsReview,
    orphanProducts,
    customerCuitQuality: cuitQuality,
    uniqueProducts: productCodes.size,
    cuitCollisions,
    numberCollisions,
    comprobantesSinDetalle: sinDetalle.length,
    signMismatches,
  };

  // Guardar reporte
  fs.writeFileSync('/tmp/dry-run-report.json', JSON.stringify(report, null, 2));
  console.log('   📄 Reporte guardado en /tmp/dry-run-report.json');

  return report;
}

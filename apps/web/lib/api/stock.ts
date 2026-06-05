// ─────────────────────────────────────────────────────────────
// STOCK API — tipos y fetchers
// Base URL: NEXT_PUBLIC_API_URL (ej: http://localhost:3001)
// ─────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

// ── Tipos ────────────────────────────────────────────────────

/** Stock actual por producto × depósito (calculado como SUM en el backend) */
export interface StockItem {
  productId: string
  productCode: string
  productName: string
  brandName: string | null
  categoryName: string | null
  depositId: string
  depositName: string
  unit: string
  /** SUM(quantity) de todos los movimientos */
  quantity: number
  /** Último costo promedio ponderado (solo OWNER) */
  unitCost?: number
  /** quantity × unitCost (solo OWNER) */
  totalValue?: number
}

/** KPIs para las tarjetas del dashboard */
export interface StockSummary {
  /** Cantidad de productos distintos con stock > 0 */
  totalProducts: number
  /** SUM(quantity × unitCost) de todo el inventario */
  totalInventoryValue: number
  /** Productos con quantity <= 0 */
  outOfStockCount: number
  /** Productos con quantity > 0 pero por debajo del umbral (stock_min) */
  lowStockCount: number
}

/** Movimiento individual de stock */
export interface StockMovement {
  id: string
  productCode: string
  productName: string
  depositName: string
  type: StockMovementType
  quantity: number
  unitCost?: number
  notes: string | null
  createdAt: string
}

export type StockMovementType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"

// ── Fetchers ─────────────────────────────────────────────────

/**
 * Devuelve el stock actual (agregado) de todos los productos.
 * Endpoint esperado: GET /stock
 * Query params opcionales: depositId, categoryId
 */
export async function getStock(params?: {
  depositId?: string
  categoryId?: string
}): Promise<StockItem[]> {
  const url = new URL(`${API_URL}/stock`)
  if (params?.depositId) url.searchParams.set("depositId", params.depositId)
  if (params?.categoryId) url.searchParams.set("categoryId", params.categoryId)

  const res = await fetch(url.toString(), {
    // revalidar cada 30 segundos (ISR ligera para el dashboard)
    next: { revalidate: 30 },
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    throw new Error(`Error al obtener stock: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

/**
 * Devuelve los KPIs de stock para el dashboard.
 * Endpoint esperado: GET /stock/summary
 */
export async function getStockSummary(): Promise<StockSummary> {
  const res = await fetch(`${API_URL}/stock/summary`, {
    next: { revalidate: 30 },
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    throw new Error(`Error al obtener resumen de stock: ${res.status}`)
  }

  return res.json()
}

/**
 * Devuelve los últimos movimientos de stock.
 * Endpoint esperado: GET /stock/movements?limit=50
 */
export async function getStockMovements(limit = 50): Promise<StockMovement[]> {
  const res = await fetch(`${API_URL}/stock/movements?limit=${limit}`, {
    next: { revalidate: 10 },
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    throw new Error(`Error al obtener movimientos: ${res.status}`)
  }

  return res.json()
}

// ── Helpers ──────────────────────────────────────────────────

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  ADJUSTMENT_IN: "Ajuste +",
  ADJUSTMENT_OUT: "Ajuste −",
  TRANSFER_IN: "Transferencia entrada",
  TRANSFER_OUT: "Transferencia salida",
  RETURN_IN: "Devolución recibida",
  RETURN_OUT: "Devolución enviada",
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatQuantity(value: number, unit: string): string {
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
  return `${formatted} ${unit}`
}

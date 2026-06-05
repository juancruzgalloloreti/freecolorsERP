'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { StockItem } from '@/app/(dashboard)/stock/page'

// ── Tipos ─────────────────────────────────────────────────────

type SortKey = keyof Pick<
  StockItem,
  'productCode' | 'productName' | 'brandName' | 'categoryName' | 'quantity' | 'unitCost' | 'totalValue'
>
type SortDir = 'asc' | 'desc'

// ── Helpers ───────────────────────────────────────────────────

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

function getStatusBadge(item: StockItem) {
  if (item.quantity <= 0)
    return (
      <Badge className="bg-red-950/60 text-red-400 border border-red-800/40 text-[10px] font-mono px-1.5 py-0">
        Sin stock
      </Badge>
    )
  const threshold = item.stockMin ?? 5
  if (item.quantity <= threshold)
    return (
      <Badge className="bg-amber-950/60 text-amber-400 border border-amber-800/40 text-[10px] font-mono px-1.5 py-0">
        Stock bajo
      </Badge>
    )
  return null
}

// ── Sub-componente: cabecera ordenable ────────────────────────

function SortHeader({
  label,
  col,
  current,
  dir,
  onSort,
  className = '',
}: {
  label: string
  col: SortKey
  current: SortKey
  dir: SortDir
  onSort: (col: SortKey) => void
  className?: string
}) {
  const active = current === col
  return (
    <th
      className={`px-3 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors whitespace-nowrap ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp size={12} className="text-amber-400" />
          ) : (
            <ChevronDown size={12} className="text-amber-400" />
          )
        ) : (
          <ChevronsUpDown size={12} className="text-zinc-700" />
        )}
      </span>
    </th>
  )
}

// ── Componente principal ──────────────────────────────────────

interface StockTableProps {
  items: StockItem[]
}

export function StockTable({ items }: StockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('productName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col)
      setSortDir('asc')
    }
  }

  const sorted = [...items].sort((a, b) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'es-AR', { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-lg border border-zinc-700/40 bg-zinc-800/30">
        <p className="text-sm text-zinc-600">Sin resultados para los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-700/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/80 border-b border-zinc-700/50">
            <tr>
              <SortHeader label="Código" col="productCode" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Producto" col="productName" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Marca" col="brandName" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <SortHeader label="Categoría" col="categoryName" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
              <th className="px-3 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-zinc-500 whitespace-nowrap hidden lg:table-cell">
                Depósito
              </th>
              <SortHeader label="Cant." col="quantity" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
              <SortHeader label="C. Unitario" col="unitCost" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right hidden md:table-cell" />
              <SortHeader label="Valor Total" col="totalValue" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map((item) => {
              const badge = getStatusBadge(item)
              return (
                <tr
                  key={`${item.productId}-${item.depositId}`}
                  className="bg-zinc-900/40 hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Código */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-zinc-500">{item.productCode}</span>
                  </td>

                  {/* Nombre */}
                  <td className="px-3 py-2.5">
                    <span className="text-zinc-200 font-medium text-sm">{item.productName}</span>
                  </td>

                  {/* Marca */}
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <span className="text-zinc-400 text-xs">{item.brandName ?? '—'}</span>
                  </td>

                  {/* Categoría */}
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <span className="text-zinc-500 text-xs">{item.categoryName ?? '—'}</span>
                  </td>

                  {/* Depósito */}
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <span className="text-zinc-500 text-xs">{item.depositName}</span>
                  </td>

                  {/* Cantidad */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`font-mono font-semibold tabular-nums text-sm ${
                        item.quantity <= 0
                          ? 'text-red-400'
                          : (item.quantity <= (item.stockMin ?? 5))
                          ? 'text-amber-400'
                          : 'text-zinc-100'
                      }`}
                    >
                      {item.quantity.toLocaleString('es-AR')}
                    </span>
                  </td>

                  {/* Costo unitario */}
                  <td className="px-3 py-2.5 text-right hidden md:table-cell">
                    <span className="font-mono text-xs text-zinc-400 tabular-nums">
                      {ARS.format(item.unitCost ?? 0)}
                    </span>
                  </td>

                  {/* Valor total */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono text-sm text-zinc-200 tabular-nums font-semibold">
                      {ARS.format(item.totalValue ?? 0)}
                    </span>
                  </td>

                  {/* Badge estado */}
                  <td className="px-3 py-2.5 text-right">
                    {badge ?? <span className="text-zinc-800">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

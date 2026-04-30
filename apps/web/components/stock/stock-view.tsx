'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { StockTable } from '@/components/stock/stock-table'
import type { StockItem } from '@/app/(dashboard)/stock/page'

// ── Filtro de estado ──────────────────────────────────────────

type StatusFilter = 'all' | 'ok' | 'low' | 'out'

function getStatus(item: StockItem): StatusFilter {
  if (item.quantity <= 0) return 'out'
  const threshold = item.stockMin ?? 5
  if (item.quantity <= threshold) return 'low'
  return 'ok'
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  ok: 'Normal',
  low: 'Stock bajo',
  out: 'Sin stock',
}

// ── Props ─────────────────────────────────────────────────────

interface StockViewProps {
  items: StockItem[]
}

// ── Componente ────────────────────────────────────────────────

export function StockView({ items }: StockViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')

  // Opciones únicas para los selects
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.categoryName).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [items])

  const brands = useMemo(() => {
    const set = new Set(items.map((i) => i.brandName).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [items])

  // Filtrado reactivo
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter((item) => {
      if (statusFilter !== 'all' && getStatus(item) !== statusFilter) return false
      if (categoryFilter !== 'all' && item.categoryName !== categoryFilter) return false
      if (brandFilter !== 'all' && item.brandName !== brandFilter) return false
      if (q) {
        const haystack = [
          item.productCode,
          item.productName,
          item.brandName ?? '',
          item.categoryName ?? '',
          item.depositName,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [items, search, statusFilter, categoryFilter, brandFilter])

  const hasFilters =
    search !== '' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    brandFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setCategoryFilter('all')
    setBrandFilter('all')
  }

  return (
    <div className="space-y-3">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto, código, marca…"
            className="pl-8 h-8 text-sm bg-zinc-800/60 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-amber-500/30"
          />
        </div>

        {/* Estado */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-8 w-36 text-xs bg-zinc-800/60 border-zinc-700 text-zinc-300 focus:ring-amber-500/30">
            <SlidersHorizontal size={12} className="mr-1 text-zinc-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs">
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((k) => (
              <SelectItem key={k} value={k} className="focus:bg-zinc-800">
                {STATUS_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Categoría */}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-40 text-xs bg-zinc-800/60 border-zinc-700 text-zinc-300 focus:ring-amber-500/30">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs">
              <SelectItem value="all" className="focus:bg-zinc-800">
                Todas las categorías
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="focus:bg-zinc-800">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Marca */}
        {brands.length > 0 && (
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="h-8 w-36 text-xs bg-zinc-800/60 border-zinc-700 text-zinc-300 focus:ring-amber-500/30">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs">
              <SelectItem value="all" className="focus:bg-zinc-800">
                Todas las marcas
              </SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b} className="focus:bg-zinc-800">
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Limpiar filtros */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
          >
            <X size={12} />
            Limpiar
          </button>
        )}

        {/* Contador */}
        <span className="text-xs text-zinc-600 tabular-nums ml-auto">
          {filtered.length} / {items.length} items
        </span>
      </div>

      {/* Tabla */}
      <StockTable items={filtered} />
    </div>
  )
}

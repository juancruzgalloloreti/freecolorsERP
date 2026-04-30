'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

type DocumentType =
  | 'INVOICE_A' | 'INVOICE_B' | 'INVOICE_C'
  | 'CREDIT_NOTE_A' | 'CREDIT_NOTE_B'
  | 'REMITO' | 'BUDGET'

type DocumentStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED'

interface VentaItem {
  id: string
  type: DocumentType
  status: DocumentStatus
  number: number | null
  puntoDeVenta: number | null
  customerName: string | null
  customerCuit: string | null
  date: string
  total: number
  itemCount: number
  createdByName: string
}

interface VentasViewProps {
  items: VentaItem[]
}

const TYPE_LABEL: Record<DocumentType, string> = {
  INVOICE_A: 'Factura A',
  INVOICE_B: 'Factura B',
  INVOICE_C: 'Factura C',
  CREDIT_NOTE_A: 'Nota Cred. A',
  CREDIT_NOTE_B: 'Nota Cred. B',
  REMITO: 'Remito',
  BUDGET: 'Presupuesto',
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Anulado',
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function statusClass(status: DocumentStatus) {
  if (status === 'CONFIRMED') return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
  if (status === 'CANCELLED') return 'bg-red-950/60 text-red-400 border-red-800/40'
  return 'bg-amber-950/60 text-amber-400 border-amber-800/40'
}

function documentNumber(item: VentaItem) {
  if (item.number == null) return '-'
  const point = item.puntoDeVenta == null ? '0000' : String(item.puntoDeVenta).padStart(4, '0')
  return `${point}-${String(item.number).padStart(8, '0')}`
}

export function VentasView({ items }: VentasViewProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items

    return items.filter((item) => {
      const haystack = [
        TYPE_LABEL[item.type],
        STATUS_LABEL[item.status],
        documentNumber(item),
        item.customerName ?? '',
        item.customerCuit ?? '',
        item.createdByName,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [items, search])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente, CUIT, numero..."
            className="pl-8 h-8 text-sm bg-zinc-800/60 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-amber-500/30"
          />
        </div>

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={12} />
            Limpiar
          </button>
        )}

        <span className="text-xs text-zinc-600 tabular-nums ml-auto">
          {filtered.length} / {items.length} documentos
        </span>
      </div>

      <div className="rounded-lg border border-zinc-700/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/80 border-b border-zinc-700/50">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-mono uppercase text-zinc-500">Fecha</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-mono uppercase text-zinc-500">Tipo</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-mono uppercase text-zinc-500">Numero</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-mono uppercase text-zinc-500">Cliente</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-mono uppercase text-zinc-500">Estado</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-mono uppercase text-zinc-500">Items</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-mono uppercase text-zinc-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-600">
                    Sin resultados para la busqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="bg-zinc-900/40 hover:bg-zinc-800/40 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                      {DATE.format(new Date(item.date))}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300 whitespace-nowrap">{TYPE_LABEL[item.type]}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-500 whitespace-nowrap">
                      {documentNumber(item)}
                    </td>
                    <td className="px-3 py-2.5 min-w-52">
                      <div className="text-zinc-200 font-medium">{item.customerName ?? 'Consumidor final'}</div>
                      <div className="text-xs text-zinc-600">{item.customerCuit ?? 'Sin CUIT'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={`border text-[10px] font-mono px-1.5 py-0 ${statusClass(item.status)}`}>
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-zinc-500 tabular-nums">
                      {item.itemCount}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-zinc-100 font-semibold tabular-nums">
                      {ARS.format(item.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

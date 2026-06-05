'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ccApi, customersApi } from '@/lib/api'
import { CreditCard, Plus, Search, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AccountRow {
  id?: string
  customerName?: string
  customer?: { name?: string }
  description?: string
  amount?: number
  balance?: number
  createdAt?: string
  date?: string
}

const DOCUMENT_LABELS: Record<string, string> = {
  INVOICE_A: 'Factura A',
  INVOICE_B: 'Factura B',
  INVOICE_C: 'Factura C',
  BUDGET: 'Presupuesto',
  REMITO: 'Remito',
}

function descriptionLabel(value?: string) {
  if (!value) return ''
  return value.replace(/\b(INVOICE_A|INVOICE_B|INVOICE_C|BUDGET|REMITO)\b/g, (type) => DOCUMENT_LABELS[type] || type)
}

/** Autocomplete de clientes: busca en el servidor con debounce */
function CustomerAutocomplete({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedName, setSelectedName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data: raw } = useQuery({
    queryKey: ['customers-ac', debounced],
    queryFn: () => customersApi.list({ search: debounced || undefined, limit: 30 }),
    enabled: open,
  })
  const options: { id: string; name: string }[] = Array.isArray(raw) ? raw : (raw as { data?: { id: string; name: string }[] })?.data || []

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(customer: { id: string; name: string }) {
    setSelectedName(customer.name)
    setQ('')
    setOpen(false)
    onChange(customer.id, customer.name)
  }

  function clear() {
    setSelectedName('')
    setQ('')
    onChange('', '')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {selectedName && !open ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="fc-input" style={{ flex: 1, color: 'var(--fc-text)', cursor: 'default' }}>{selectedName}</span>
          <button type="button" className="btn btn-icon btn-secondary btn-sm" onClick={clear} title="Cambiar cliente"><X size={12} /></button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="fc-input"
            style={{ paddingLeft: 30 }}
            placeholder="Buscar cliente..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--fc-bg)', border: '1px solid var(--fc-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
          {options.length === 0
            ? <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Sin resultados</div>
            : options.map(c => (
              <button key={c.id} type="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', color: 'var(--fc-text)', cursor: 'pointer' }}
                onMouseDown={() => select(c)}>{c.name}</button>
            ))
          }
        </div>
      )}
    </div>
  )
}

export default function CuentaCorrientePage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [search, setSearch] = useState('')
  const [ccPage, setCcPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ customerId: '', customerName: '', kind: 'PAYMENT', amount: '', description: '', date: new Date().toISOString().slice(0, 10) })
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { setCcPage(1) }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['current-account', search, ccPage],
    queryFn: () => ccApi.list({ search: search || undefined, page: ccPage, limit: 100 }),
  })

  const rows: AccountRow[] = Array.isArray(data) ? data : (data as { data?: AccountRow[] })?.data || []

  const addMutation = useMutation({
    mutationFn: () => {
      const rawAmount = Number(String(form.amount || 0).replace(',', '.'))
      const amount = form.kind === 'PAYMENT' ? Math.abs(rawAmount) * -1 : Math.abs(rawAmount)
      return ccApi.addEntry({
        customerId: form.customerId,
        type: form.kind === 'PAYMENT' ? 'PAYMENT' : 'ADJUSTMENT',
        amount,
        description: form.description || (form.kind === 'PAYMENT' ? 'Pago manual' : 'Ajuste manual'),
        date: form.date,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['current-account'] })
      setAdding(false)
      setForm({ customerId: '', customerName: '', kind: 'PAYMENT', amount: '', description: '', date: new Date().toISOString().slice(0, 10) })
      setMessage('Movimiento cargado.')
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const msg = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo cargar el movimiento'
      setMessage(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

  const totalPages = (data as { meta?: { pages?: number } })?.meta?.pages

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cuenta Corriente</h1>
          <p className="page-subtitle">Saldos y movimientos de clientes</p>
        </div>
        {isOwner && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={14} /> Movimiento
          </button>
        )}
      </div>

      {message && <div className="counter-alert success">{message}</div>}

      <div className="search-wrap">
        <Search size={14} />
        <input className="fc-input" placeholder="Buscar cliente o movimiento..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="fc-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={34} style={{ opacity: 0.32, marginBottom: 12 }} />
            <p>No hay movimientos de cuenta corriente todavía</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table">
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Importe</th><th style={{ textAlign: 'right' }}>Saldo</th></tr></thead>
                <tbody>{rows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.date || row.createdAt ? new Date(row.date || row.createdAt || '').toLocaleDateString('es-AR') : ''}</td>
                    <td style={{ fontWeight: 600 }}>{row.customerName || row.customer?.name || ''}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{descriptionLabel(row.description)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(row.amount ?? 0) >= 0 ? '#fca5a5' : '#86efac' }}>${Number(row.amount ?? 0).toLocaleString('es-AR')}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${Number(row.balance ?? 0).toLocaleString('es-AR')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderTop: '1px solid var(--fc-border)', alignItems: 'center' }}>
              <button className="fc-button fc-button-secondary" disabled={ccPage <= 1} onClick={() => setCcPage(p => Math.max(1, p - 1))}>Anterior</button>
              <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Pág. {ccPage}{totalPages ? ` de ${totalPages}` : ''}
              </span>
              <button className="fc-button fc-button-secondary" disabled={!totalPages || ccPage >= totalPages} onClick={() => setCcPage(p => p + 1)}>Siguiente</button>
            </div>
          </>
        )}
      </div>

      {adding && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Movimiento de cuenta corriente</h3>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gap: 12 }}>
              <label>
                <span className="fc-label">Cliente</span>
                <CustomerAutocomplete
                  value={form.customerId}
                  onChange={(id, name) => setForm(f => ({ ...f, customerId: id, customerName: name }))}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label><span className="fc-label">Tipo</span><select className="fc-input" value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}><option value="PAYMENT">Pago recibido</option><option value="CHARGE">Cargo / ajuste</option></select></label>
                <label><span className="fc-label">Fecha</span><input className="fc-input" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></label>
              </div>
              <label><span className="fc-label">Importe</span><input className="fc-input" inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0,00" /></label>
              <label><span className="fc-label">Detalle</span><input className="fc-input" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Recibo, ajuste, transferencia..." /></label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-secondary" disabled={addMutation.isPending} onClick={() => setAdding(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={!form.customerId || !form.amount || addMutation.isPending} onClick={() => addMutation.mutate()}>{addMutation.isPending ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

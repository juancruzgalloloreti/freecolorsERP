'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ccApi, customersApi } from '@/lib/api'
import { CreditCard, Plus, Search } from 'lucide-react'
import { useState } from 'react'
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

export default function CuentaCorrientePage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ customerId: '', kind: 'PAYMENT', amount: '', description: '', date: new Date().toISOString().slice(0, 10) })
  const [message, setMessage] = useState<string | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['current-account'], queryFn: () => ccApi.list() })
  const { data: customersRaw = [] } = useQuery({ queryKey: ['customers-cc'], queryFn: () => customersApi.list({ limit: 500 }) })
  const rows: AccountRow[] = Array.isArray(data) ? data : (data as { data?: AccountRow[] })?.data || []
  const customers = Array.isArray(customersRaw) ? customersRaw : (customersRaw as { data?: { id: string; name: string }[] })?.data || []
  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [row.customerName, row.customer?.name, row.description].filter(Boolean).join(' ').toLowerCase().includes(q)
  })
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
      setForm({ customerId: '', kind: 'PAYMENT', amount: '', description: '', date: new Date().toISOString().slice(0, 10) })
      setMessage('Movimiento cargado.')
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const msg = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo cargar el movimiento'
      setMessage(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

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
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={34} style={{ opacity: 0.32, marginBottom: 12 }} />
            <p>No hay movimientos de cuenta corriente todavía</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Importe</th><th style={{ textAlign: 'right' }}>Saldo</th></tr></thead>
              <tbody>{filtered.map((row, index) => (
                <tr key={row.id ?? index}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.date || row.createdAt ? new Date(row.date || row.createdAt || '').toLocaleDateString('es-AR') : '-'}</td>
                  <td style={{ fontWeight: 600 }}>{row.customerName || row.customer?.name || '-'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{row.description || '-'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(row.amount ?? 0) >= 0 ? '#fca5a5' : '#86efac' }}>${Number(row.amount ?? 0).toLocaleString('es-AR')}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${Number(row.balance ?? 0).toLocaleString('es-AR')}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Movimiento de cuenta corriente</h3>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gap: 12 }}>
              <label><span className="fc-label">Cliente</span><select className="fc-input" value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}><option value="">Seleccionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
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

'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownCircle, ArrowUpCircle, Lock, Unlock, WalletCards } from 'lucide-react'
import { cashApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type CashMovement = {
  id: string
  type: string
  method: string
  amount: number
  description: string
  reference?: string | null
  createdAt: string
}

type CashSession = {
  id: string
  status: 'OPEN' | 'CLOSED'
  openingAmount: number
  expectedAmount: number
  countedAmount?: number | null
  difference?: number | null
  openedAt: string
  closedAt?: string | null
  movements?: CashMovement[]
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })

function money(value: unknown) {
  return ARS.format(Number(value || 0))
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

export default function CajaPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [openingAmount, setOpeningAmount] = useState('')
  const [move, setMove] = useState({ type: 'CASH_IN', amount: '', description: '', reference: '' })
  const [countedAmount, setCountedAmount] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const { data: current, isLoading } = useQuery({ queryKey: ['cash-current'], queryFn: cashApi.current })
  const { data: sessionsRaw } = useQuery({ queryKey: ['cash-sessions'], queryFn: cashApi.sessions })
  const currentSession = current as CashSession | null
  const sessions: CashSession[] = Array.isArray(sessionsRaw) ? sessionsRaw : []
  const movements = useMemo(() => currentSession?.movements ?? [], [currentSession?.movements])
  const totals = useMemo(() => ({
    income: movements.filter((item) => Number(item.amount) > 0).reduce((sum, item) => sum + Number(item.amount), 0),
    outcome: Math.abs(movements.filter((item) => Number(item.amount) < 0).reduce((sum, item) => sum + Number(item.amount), 0)),
  }), [movements])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['cash-current'] })
    qc.invalidateQueries({ queryKey: ['cash-sessions'] })
  }

  const openMutation = useMutation({
    mutationFn: () => cashApi.open({ openingAmount, note: 'Apertura desde Caja' }),
    onSuccess: () => { refresh(); setOpeningAmount(''); setMessage('Caja abierta.') },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo abrir caja')),
  })

  const moveMutation = useMutation({
    mutationFn: () => cashApi.move(move),
    onSuccess: () => { refresh(); setMove({ type: 'CASH_IN', amount: '', description: '', reference: '' }); setMessage('Movimiento registrado.') },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo registrar el movimiento')),
  })

  const closeMutation = useMutation({
    mutationFn: () => cashApi.close({ countedAmount, note: 'Cierre desde Caja' }),
    onSuccess: () => { refresh(); setCountedAmount(''); setMessage('Caja cerrada.') },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo cerrar caja')),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Caja</h1>
          <p className="page-subtitle">Apertura, ingresos, egresos, cierre y arqueo diario</p>
        </div>
      </div>

      {message && <div className="counter-alert success">{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div className="stat-card"><div className="stat-value">{isLoading ? '...' : currentSession ? 'Abierta' : 'Cerrada'}</div><div className="stat-label">Estado</div></div>
        <div className="stat-card"><div className="stat-value">{money(currentSession?.expectedAmount)}</div><div className="stat-label">Saldo esperado</div></div>
        <div className="stat-card"><div className="stat-value">{money(totals.income)}</div><div className="stat-label">Entradas</div></div>
        <div className="stat-card"><div className="stat-value">{money(totals.outcome)}</div><div className="stat-label">Salidas</div></div>
      </div>

      {!currentSession ? (
        <section className="fc-card" style={{ maxWidth: 520 }}>
          <WalletCards size={26} style={{ color: '#a78bfa', marginBottom: 12 }} />
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Abrir caja</h2>
          <label className="fc-label">Saldo inicial</label>
          <input className="fc-input" inputMode="decimal" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="0,00" />
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!isOwner || openMutation.isPending} onClick={() => openMutation.mutate()}>
            <Unlock size={14} /> {openMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 420px) 1fr', gap: 14, alignItems: 'start' }}>
          <section className="fc-card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Movimiento rápido</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button className={`btn ${move.type === 'CASH_IN' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMove((current) => ({ ...current, type: 'CASH_IN' }))}><ArrowUpCircle size={14} /> Ingreso</button>
              <button className={`btn ${move.type === 'CASH_OUT' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMove((current) => ({ ...current, type: 'CASH_OUT' }))}><ArrowDownCircle size={14} /> Egreso</button>
            </div>
            <label className="fc-label">Importe</label>
            <input className="fc-input" inputMode="decimal" value={move.amount} onChange={(event) => setMove((current) => ({ ...current, amount: event.target.value }))} placeholder="0,00" />
            <label className="fc-label" style={{ marginTop: 10 }}>Concepto</label>
            <input className="fc-input" value={move.description} onChange={(event) => setMove((current) => ({ ...current, description: event.target.value }))} placeholder={move.type === 'CASH_OUT' ? 'Pago, retiro, gasto...' : 'Ingreso manual'} />
            <label className="fc-label" style={{ marginTop: 10 }}>Referencia</label>
            <input className="fc-input" value={move.reference} onChange={(event) => setMove((current) => ({ ...current, reference: event.target.value }))} placeholder="Opcional" />
            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!isOwner || !move.amount || moveMutation.isPending} onClick={() => moveMutation.mutate()}>
              Registrar
            </button>

            <div style={{ borderTop: '1px solid var(--fc-border)', marginTop: 18, paddingTop: 16 }}>
              <h2 style={{ fontSize: 16, marginBottom: 10 }}>Cerrar caja</h2>
              <label className="fc-label">Dinero contado</label>
              <input className="fc-input" inputMode="decimal" value={countedAmount} onChange={(event) => setCountedAmount(event.target.value)} placeholder={String(currentSession.expectedAmount || 0)} />
              <button className="btn btn-danger" style={{ marginTop: 12 }} disabled={!isOwner || closeMutation.isPending} onClick={() => closeMutation.mutate()}>
                <Lock size={14} /> {closeMutation.isPending ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </div>
          </section>

          <section className="fc-card" style={{ overflow: 'hidden' }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Movimientos de hoy</h2>
            {movements.length === 0 ? (
              <div className="empty-state"><p>Sin movimientos todavía.</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="fc-table">
                  <thead><tr><th>Hora</th><th>Tipo</th><th>Concepto</th><th>Método</th><th style={{ textAlign: 'right' }}>Importe</th></tr></thead>
                  <tbody>
                    {movements.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td><span className={`badge ${Number(item.amount) >= 0 ? 'badge-green' : 'badge-red'}`}>{item.type}</span></td>
                        <td>{item.description}</td>
                        <td>{item.method}</td>
                        <td className="money-cell strong">{money(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <section className="fc-card" style={{ marginTop: 14, overflow: 'hidden' }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Últimas cajas</h2>
        {sessions.length === 0 ? <div className="empty-state"><p>No hay cajas cerradas o abiertas.</p></div> : (
          <table className="fc-table">
            <thead><tr><th>Apertura</th><th>Cierre</th><th>Estado</th><th style={{ textAlign: 'right' }}>Esperado</th><th style={{ textAlign: 'right' }}>Contado</th><th style={{ textAlign: 'right' }}>Dif.</th></tr></thead>
            <tbody>{sessions.slice(0, 20).map((session) => (
              <tr key={session.id}>
                <td>{new Date(session.openedAt).toLocaleString('es-AR')}</td>
                <td>{session.closedAt ? new Date(session.closedAt).toLocaleString('es-AR') : '-'}</td>
                <td><span className={`badge ${session.status === 'OPEN' ? 'badge-green' : 'badge-yellow'}`}>{session.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</span></td>
                <td className="money-cell">{money(session.expectedAmount)}</td>
                <td className="money-cell">{session.countedAmount == null ? '-' : money(session.countedAmount)}</td>
                <td className="money-cell strong">{session.difference == null ? '-' : money(session.difference)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  )
}

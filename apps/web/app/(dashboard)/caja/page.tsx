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

function parseMoney(value: unknown) {
  if (value === undefined || value === null || value === '') return 0
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

export default function CajaPage() {
  const qc = useQueryClient()
  const { user, hasPermission } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [openingAmount, setOpeningAmount] = useState('')
  const [move, setMove] = useState({ type: 'CASH_IN', amount: '', description: '', reference: '' })
  const [countedAmount, setCountedAmount] = useState('')
  const [closingNote, setClosingNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const { data: current, isLoading } = useQuery({ queryKey: ['cash-current'], queryFn: cashApi.current })
  const { data: sessionsRaw } = useQuery({ queryKey: ['cash-sessions'], queryFn: cashApi.sessions })
  const currentSession = current as CashSession | null
  const sessions: CashSession[] = Array.isArray(sessionsRaw) ? sessionsRaw : []
  const inspectedSession = currentSession ?? sessions[0] ?? null
  const movements = useMemo(() => inspectedSession?.movements ?? [], [inspectedSession?.movements])
  const totals = useMemo(() => ({
    income: movements.filter((item) => Number(item.amount) > 0).reduce((sum, item) => sum + Number(item.amount), 0),
    outcome: Math.abs(movements.filter((item) => Number(item.amount) < 0).reduce((sum, item) => sum + Number(item.amount), 0)),
  }), [movements])
  const dailyBreakdown = useMemo(() => {
    const byType = new Map<string, number>()
    const byMethod = new Map<string, number>()
    for (const movement of movements) {
      byType.set(movement.type, (byType.get(movement.type) ?? 0) + Number(movement.amount || 0))
      byMethod.set(movement.method, (byMethod.get(movement.method) ?? 0) + Number(movement.amount || 0))
    }
    return {
      byType: Array.from(byType, ([label, amount]) => ({ label, amount })).sort((a, b) => a.label.localeCompare(b.label)),
      byMethod: Array.from(byMethod, ([label, amount]) => ({ label, amount })).sort((a, b) => a.label.localeCompare(b.label)),
    }
  }, [movements])
  const closeDifference = currentSession && countedAmount
    ? parseMoney(countedAmount) - Number(currentSession.expectedAmount || 0)
    : 0
  const closeHasDifference = Math.abs(closeDifference) > 0.01
  const closeNeedsNote = closeHasDifference && !closingNote.trim()

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
    mutationFn: () => cashApi.close({ countedAmount, note: closingNote.trim() }),
    onSuccess: () => { refresh(); setCountedAmount(''); setClosingNote(''); setMessage('Caja cerrada.') },
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

      {message && <div className={`counter-alert ${message.startsWith('No se pudo') ? 'error' : 'success'}`}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div className="stat-card" style={currentSession ? {} : { borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)' }}>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6, color: currentSession ? '#22c55e' : '#fca5a5' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: currentSession ? '#22c55e' : '#ef4444' }} />
            {isLoading ? '...' : currentSession ? 'Abierta' : 'Cerrada'}
          </div>
          <div className="stat-label">Estado</div>
        </div>
        <div className="stat-card"><div className="stat-value">{money(inspectedSession?.expectedAmount)}</div><div className="stat-label">Saldo esperado</div></div>
        <div className="stat-card"><div className="stat-value">{money(totals.income)}</div><div className="stat-label">Entradas</div></div>
        <div className="stat-card"><div className="stat-value">{money(totals.outcome)}</div><div className="stat-label">Salidas</div></div>
      </div>

      {inspectedSession && (
        <section className="fc-card" style={{ marginBottom: 14 }}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Resumen diario</h2>
              <p className="page-subtitle" style={{ marginTop: 4 }}>
                {currentSession ? 'Caja abierta' : 'Última caja cerrada'} · {new Date(inspectedSession.openedAt).toLocaleString('es-AR')}
              </p>
            </div>
            <span className={`badge ${inspectedSession.status === 'OPEN' ? 'badge-green' : 'badge-yellow'}`}>{inspectedSession.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div className="stat-card"><div className="stat-value">{money(inspectedSession.openingAmount)}</div><div className="stat-label">Apertura</div></div>
            <div className="stat-card"><div className="stat-value">{money(inspectedSession.expectedAmount)}</div><div className="stat-label">Esperado</div></div>
            <div className="stat-card"><div className="stat-value">{inspectedSession.countedAmount == null ? '-' : money(inspectedSession.countedAmount)}</div><div className="stat-label">Contado</div></div>
            <div className="stat-card"><div className="stat-value">{inspectedSession.difference == null ? '-' : money(inspectedSession.difference)}</div><div className="stat-label">Diferencia</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
            <div>
              <h3 className="fc-label">Por tipo</h3>
              {dailyBreakdown.byType.length === 0 ? <p className="page-subtitle">Sin movimientos.</p> : dailyBreakdown.byType.map((item) => (
                <div className="detail-line" key={item.label}>
                  <div><strong>{item.label}</strong></div>
                  <b>{money(item.amount)}</b>
                </div>
              ))}
            </div>
            <div>
              <h3 className="fc-label">Por método</h3>
              {dailyBreakdown.byMethod.length === 0 ? <p className="page-subtitle">Sin movimientos.</p> : dailyBreakdown.byMethod.map((item) => (
                <div className="detail-line" key={item.label}>
                  <div><strong>{item.label}</strong></div>
                  <b>{money(item.amount)}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!currentSession ? (
        <section className="fc-card" style={{ maxWidth: 520 }}>
          <WalletCards size={26} style={{ color: '#a78bfa', marginBottom: 12 }} />
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Abrir caja</h2>
          <label className="fc-label" htmlFor="cash-opening-amount">Saldo inicial</label>
          <input id="cash-opening-amount" className="fc-input" inputMode="decimal" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="0,00" />
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!hasPermission('cash.open') || openMutation.isPending} onClick={() => openMutation.mutate()}>
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
            <label className="fc-label" htmlFor="cash-movement-amount">Importe</label>
            <input id="cash-movement-amount" className="fc-input" inputMode="decimal" value={move.amount} onChange={(event) => setMove((current) => ({ ...current, amount: event.target.value }))} placeholder="0,00" />
            <label className="fc-label" htmlFor="cash-movement-description" style={{ marginTop: 10 }}>Concepto</label>
            <input id="cash-movement-description" className="fc-input" value={move.description} onChange={(event) => setMove((current) => ({ ...current, description: event.target.value }))} placeholder={move.type === 'CASH_OUT' ? 'Pago, retiro, gasto...' : 'Ingreso manual'} />
            <label className="fc-label" htmlFor="cash-movement-reference" style={{ marginTop: 10 }}>Referencia</label>
            <input id="cash-movement-reference" className="fc-input" value={move.reference} onChange={(event) => setMove((current) => ({ ...current, reference: event.target.value }))} placeholder="Opcional" />
            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!hasPermission('cash.move') || !move.amount || moveMutation.isPending} onClick={() => moveMutation.mutate()}>
              Registrar
            </button>

            <div style={{ borderTop: '1px solid var(--fc-border)', marginTop: 18, paddingTop: 16 }}>
              <h2 style={{ fontSize: 16, marginBottom: 10 }}>Cerrar caja</h2>
              <label className="fc-label" htmlFor="cash-counted-amount">Dinero contado</label>
              <input id="cash-counted-amount" className="fc-input" inputMode="decimal" value={countedAmount} onChange={(event) => setCountedAmount(event.target.value)} placeholder={String(currentSession.expectedAmount || 0)} />
              {countedAmount && (
                <div className={`counter-alert ${closeHasDifference ? 'warning' : 'success'}`} style={{ marginTop: 10 }}>
                  Diferencia de arqueo: {money(closeDifference)}
                </div>
              )}
              {closeHasDifference && (
                <>
                  <label className="fc-label" htmlFor="cash-closing-note" style={{ marginTop: 10 }}>Observación obligatoria</label>
                  <textarea
                    id="cash-closing-note"
                    className="fc-input"
                    value={closingNote}
                    onChange={(event) => setClosingNote(event.target.value)}
                    placeholder="Ej: falta vuelto, pago mal registrado, retiro pendiente..."
                    rows={3}
                  />
                </>
              )}
              <button className="btn btn-danger" style={{ marginTop: 12 }} disabled={!hasPermission('cash.close') || !countedAmount || closeNeedsNote || closeMutation.isPending} onClick={() => closeMutation.mutate()}>
                <Lock size={14} /> {closeMutation.isPending ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </div>
          </section>

          <section className="fc-card" style={{ overflow: 'hidden' }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>{currentSession ? 'Movimientos de hoy' : 'Movimientos de la última caja'}</h2>
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

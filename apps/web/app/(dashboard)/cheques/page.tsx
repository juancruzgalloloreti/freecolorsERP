'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2, Landmark, Plus, Save, Send, X, XCircle } from 'lucide-react'
import { checksApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type CheckAction = 'deposit' | 'clear' | 'bounce' | 'endorse' | 'cancel'

type CheckRow = {
  id: string
  number: string
  bank: string
  accountOwner: string
  amount: string | number
  dueDate: string
  status: 'RECEIVED' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'ENDORSED' | 'CANCELLED'
  endorsedTo?: string | null
  rejectionReason?: string | null
}

type PagedChecks = {
  data?: CheckRow[]
  meta?: { total?: number; page?: number; limit?: number; pages?: number }
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
const statusLabels: Record<CheckRow['status'], string> = {
  RECEIVED: 'Recibido',
  DEPOSITED: 'Depositado',
  CLEARED: 'Acreditado',
  BOUNCED: 'Rechazado',
  ENDORSED: 'Endosado',
  CANCELLED: 'Cancelado',
}
const statusBadgeClass: Record<CheckRow['status'], string> = {
  RECEIVED:  'badge-yellow',
  DEPOSITED: 'badge-orange',
  CLEARED:   'badge-green',
  BOUNCED:   'badge-red',
  ENDORSED:  'badge-gray',
  CANCELLED: 'badge-gray',
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

export default function ChequesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('check.manage')
  const [status, setStatus] = useState('')
  const [checkPage, setCheckPage] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ check: CheckRow; fn: CheckAction } | null>(null)
  const [actionForm, setActionForm] = useState({ endorsedTo: '', reason: '' })
  const [form, setForm] = useState({
    number: '',
    bank: '',
    accountOwner: '',
    amount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    isEcheq: false,
    notes: '',
  })
  useEffect(() => {
    setCheckPage(1)
  }, [status])

  const { data: checksRaw, isLoading } = useQuery<PagedChecks | CheckRow[]>({
    queryKey: ['checks', status, checkPage],
    queryFn: () => checksApi.list({ status: status || undefined, page: checkPage, limit: 50 }),
  })
  const { data: summary } = useQuery({ queryKey: ['checks-summary'], queryFn: checksApi.summary })
  const checks = Array.isArray(checksRaw) ? checksRaw : checksRaw?.data || []
  const checksMeta = Array.isArray(checksRaw) ? undefined : checksRaw?.meta

  const createMutation = useMutation({
    mutationFn: () => checksApi.create({ ...form, amount: Number(String(form.amount).replace(',', '.')) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checks'] })
      qc.invalidateQueries({ queryKey: ['checks-summary'] })
      setCreating(false)
      setForm({
        number: '',
        bank: '',
        accountOwner: '',
        amount: '',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        isEcheq: false,
        notes: '',
      })
      setMessage('Cheque cargado en cartera.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo cargar el cheque')),
  })

  const action = useMutation({
    mutationFn: ({ id, fn, endorsedTo, reason }: { id: string; fn: CheckAction; endorsedTo?: string; reason?: string }) => {
      if (fn === 'deposit') return checksApi.deposit(id)
      if (fn === 'clear') return checksApi.clear(id)
      if (fn === 'bounce') return checksApi.bounce(id, { reason })
      if (fn === 'endorse') return checksApi.endorse(id, { endorsedTo })
      return checksApi.cancel(id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checks'] })
      qc.invalidateQueries({ queryKey: ['checks-summary'] })
      setPendingAction(null)
      setActionForm({ endorsedTo: '', reason: '' })
      setMessage('Cheque actualizado.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo actualizar el cheque')),
  })

  function openAction(check: CheckRow, fn: CheckAction) {
    setPendingAction({ check, fn })
    setActionForm({ endorsedTo: check.endorsedTo || '', reason: check.rejectionReason || '' })
    setMessage(null)
  }

  function closeAction() {
    if (action.isPending) return
    setPendingAction(null)
    setActionForm({ endorsedTo: '', reason: '' })
  }

  function submitAction() {
    if (!pendingAction) return
    action.mutate({
      id: pendingAction.check.id,
      fn: pendingAction.fn,
      endorsedTo: actionForm.endorsedTo.trim(),
      reason: actionForm.reason.trim(),
    })
  }

  const actionTitle: Record<CheckAction, string> = {
    deposit: 'Depositar cheque',
    clear: 'Acreditar cheque',
    bounce: 'Rechazar cheque',
    endorse: 'Endosar cheque',
    cancel: 'Cancelar cheque',
  }
  const actionConfirm: Record<CheckAction, string> = {
    deposit: 'Depositar',
    clear: 'Acreditar',
    bounce: 'Rechazar',
    endorse: 'Endosar',
    cancel: 'Cancelar cheque',
  }
  const actionDisabled = Boolean(
    action.isPending ||
    (pendingAction?.fn === 'endorse' && !actionForm.endorsedTo.trim()) ||
    (pendingAction?.fn === 'bounce' && !actionForm.reason.trim()),
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cheques</h1>
          <p className="page-subtitle">Seguimiento de cartera, depósitos, acreditaciones, rechazos y endosos</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="fc-input" style={{ maxWidth: 180 }} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {canManage && <button className="btn btn-primary" onClick={() => { setCreating(true); setMessage(null) }}><Plus size={14} /> Cargar cheque</button>}
        </div>
      </div>

      {message && <div className={`counter-alert ${message.includes('No se pudo') ? 'error' : 'success'}`}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div className="stat-card"><div className="stat-value">{summary?.total ?? 0}</div><div className="stat-label">Cheques</div></div>
        <div className="stat-card"><div className="stat-value">{ARS.format(Number(summary?.pendingAmount || 0))}</div><div className="stat-label">Pendiente</div></div>
        <div className="stat-card"><div className="stat-value">{summary?.bounced ?? 0}</div><div className="stat-label">Rechazados</div></div>
      </div>

      <section className="fc-card" style={{ overflow: 'hidden' }}>
        {isLoading ? <div className="empty-state"><span className="spinner" /></div> : checks.length === 0 ? <div className="empty-state"><Landmark size={32} /><p>No hay cheques para el filtro seleccionado.</p></div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead><tr><th>Número</th><th>Banco</th><th>Titular</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.id}>
                    <td className="mono-cell">{check.number}</td>
                    <td>{check.bank}</td>
                    <td>{check.accountOwner}</td>
                    <td>{new Date(check.dueDate).toLocaleDateString('es-AR')}</td>
                    <td className="tabular-nums" style={{ textAlign: 'right' }}>{ARS.format(Number(check.amount || 0))}</td>
                    <td>
                      <div style={{ display: 'grid', gap: 3 }}>
                        <span className={`badge ${statusBadgeClass[check.status]}`}>{statusLabels[check.status]}</span>
                        {check.endorsedTo && <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→ {check.endorsedTo}</small>}
                        {check.rejectionReason && <small style={{ color: '#f87171', fontSize: '11px' }}>{check.rejectionReason}</small>}
                      </div>
                    </td>
                    <td>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {check.status === 'RECEIVED' && <button className="btn btn-icon btn-secondary btn-sm" aria-label={`Depositar cheque ${check.number}`} title="Depositar" onClick={() => openAction(check, 'deposit')}><Landmark size={13} /></button>}
                          {check.status === 'DEPOSITED' && <button className="btn btn-icon btn-secondary btn-sm" aria-label={`Acreditar cheque ${check.number}`} title="Acreditar" onClick={() => openAction(check, 'clear')}><CheckCircle2 size={13} /></button>}
                          {check.status === 'RECEIVED' && <button className="btn btn-icon btn-secondary btn-sm" aria-label={`Endosar cheque ${check.number}`} title="Endosar" onClick={() => openAction(check, 'endorse')}><Send size={13} /></button>}
                          {!['CLEARED', 'CANCELLED'].includes(check.status) && <button className="btn btn-icon btn-danger btn-sm" aria-label={`Rechazar cheque ${check.number}`} title="Rechazar" onClick={() => openAction(check, 'bounce')}><Ban size={13} /></button>}
                          {!['CLEARED', 'BOUNCED', 'CANCELLED'].includes(check.status) && <button className="btn btn-icon btn-secondary btn-sm" aria-label={`Cancelar cheque ${check.number}`} title="Cancelar" onClick={() => openAction(check, 'cancel')}><XCircle size={13} /></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
	            </table>
	            {checksMeta && (
	              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 12, borderTop: '1px solid var(--fc-border)', alignItems: 'center' }}>
	                <button className="fc-button fc-button-secondary" type="button" disabled={checkPage <= 1} onClick={() => setCheckPage((page) => Math.max(1, page - 1))}>
	                  Anterior
	                </button>
	                <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
	                  Pág. {checkPage}{checksMeta.pages ? ` de ${checksMeta.pages}` : ''} · {Number(checksMeta.total || 0).toLocaleString('es-AR')} cheques
	                </span>
	                <button className="fc-button fc-button-secondary" type="button" disabled={!checksMeta.pages || checkPage >= checksMeta.pages} onClick={() => setCheckPage((page) => page + 1)}>
	                  Siguiente
	                </button>
	              </div>
	            )}
	          </div>
	        )}
      </section>

      {creating && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Cargar cheque</h3>
              <button className="btn btn-icon btn-secondary" disabled={createMutation.isPending} onClick={() => setCreating(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="fc-label">Número *</label>
                <input className="fc-input" value={form.number} onChange={(e) => setForm((current) => ({ ...current, number: e.target.value }))} />
              </div>
              <div>
                <label className="fc-label">Banco *</label>
                <input className="fc-input" value={form.bank} onChange={(e) => setForm((current) => ({ ...current, bank: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fc-label">Titular *</label>
                <input className="fc-input" value={form.accountOwner} onChange={(e) => setForm((current) => ({ ...current, accountOwner: e.target.value }))} />
              </div>
              <div>
                <label className="fc-label">Importe *</label>
                <input className="fc-input" inputMode="decimal" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} />
              </div>
              <div>
                <label className="fc-label">Vencimiento *</label>
                <input className="fc-input" type="date" value={form.dueDate} onChange={(e) => setForm((current) => ({ ...current, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="fc-label">Emisión</label>
                <input className="fc-input" type="date" value={form.issueDate} onChange={(e) => setForm((current) => ({ ...current, issueDate: e.target.value }))} />
              </div>
              <label style={{ minHeight: 38, display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'end', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isEcheq} onChange={(e) => setForm((current) => ({ ...current, isEcheq: e.target.checked }))} style={{ width: 15, height: 15, accentColor: 'var(--accent-purple)' }} />
                <span style={{ fontSize: 13 }}>E-cheq</span>
              </label>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fc-label">Notas</label>
                <input className="fc-input" value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--fc-border)', paddingTop: 14 }}>
                <button className="btn btn-secondary" disabled={createMutation.isPending} onClick={() => setCreating(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={createMutation.isPending || !form.number.trim() || !form.bank.trim() || !form.accountOwner.trim() || Number(String(form.amount).replace(',', '.')) <= 0} onClick={() => createMutation.mutate()}>
                  <Save size={14} /> {createMutation.isPending ? 'Guardando...' : 'Guardar cheque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="check-action-title">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 id="check-action-title" style={{ fontSize: 15, fontWeight: 600 }}>{actionTitle[pendingAction.fn]}</h3>
                <small className="muted">{pendingAction.check.bank} · {pendingAction.check.number} · {ARS.format(Number(pendingAction.check.amount || 0))}</small>
              </div>
              <button className="btn btn-icon btn-secondary" disabled={action.isPending} onClick={closeAction} aria-label="Cerrar acción de cheque"><X size={14} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gap: 12 }}>
              {pendingAction.fn === 'endorse' && (
                <label>
                  <span className="fc-label">Destinatario *</span>
                  <input className="fc-input" autoFocus value={actionForm.endorsedTo} onChange={(event) => setActionForm((current) => ({ ...current, endorsedTo: event.target.value }))} />
                </label>
              )}
              {pendingAction.fn === 'bounce' && (
                <label>
                  <span className="fc-label">Motivo *</span>
                  <textarea className="fc-input" autoFocus rows={3} value={actionForm.reason} onChange={(event) => setActionForm((current) => ({ ...current, reason: event.target.value }))} />
                </label>
              )}
              {pendingAction.fn === 'deposit' && <p className="page-subtitle">El cheque pasará a estado depositado y quedará listo para acreditarlo cuando impacte en banco.</p>}
              {pendingAction.fn === 'clear' && <p className="page-subtitle">El cheque se marcará como acreditado y saldrá del pendiente de cartera.</p>}
              {pendingAction.fn === 'cancel' && <p className="page-subtitle">Usá esta acción para anular cheques cargados por error antes de acreditarlos o rechazarlos.</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--fc-border)', paddingTop: 14 }}>
                <button className="btn btn-secondary" disabled={action.isPending} onClick={closeAction}>Cerrar</button>
                <button className={pendingAction.fn === 'bounce' || pendingAction.fn === 'cancel' ? 'btn btn-danger' : 'btn btn-primary'} disabled={actionDisabled} onClick={submitAction}>
                  {action.isPending ? 'Guardando...' : actionConfirm[pendingAction.fn]}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

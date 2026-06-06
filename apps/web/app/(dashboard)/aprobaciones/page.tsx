'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, X } from 'lucide-react'
import { approvalsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type Flow = { id: string; name: string; entityType: string; isActive: boolean; steps?: Array<{ id: string; order: number; role: string; requiredCount: number }> }
type Request = {
  id: string
  entityType: string
  entityId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  approvalFlow?: Flow
  requestedBy?: { firstName: string; lastName: string }
  decisions?: Array<{ id: string; decision: string; notes?: string; user?: { firstName: string; lastName: string } }>
}
type PagedRequests = {
  data?: Request[]
  meta?: { total?: number; page?: number; limit?: number; pages?: number }
}

const statusLabels: Record<Request['status'], string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

export default function AprobacionesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('approval.manage')
  const canDecide = hasPermission('approval.decide')
  const [message, setMessage] = useState<string | null>(null)
  const [flowForm, setFlowForm] = useState({ name: '', entityType: 'PurchaseOrder', role: 'ADMIN', requiredCount: '1' })
  const [requestForm, setRequestForm] = useState({ approvalFlowId: '', entityType: 'PurchaseOrder', entityId: '' })
  const [requestStatus, setRequestStatus] = useState<Request['status'] | ''>('PENDING')
  const [requestPage, setRequestPage] = useState(1)

  const { data: flows = [], isLoading: loadingFlows } = useQuery<Flow[]>({ queryKey: ['approval-flows'], queryFn: () => approvalsApi.listFlows() })
  useEffect(() => {
    setRequestPage(1)
  }, [requestStatus])
  const { data: requestsRaw, isLoading: loadingRequests } = useQuery<PagedRequests | Request[]>({
    queryKey: ['approval-requests', requestStatus, requestPage],
    queryFn: () => approvalsApi.listRequests({ status: requestStatus || undefined, page: requestPage, limit: 50 }),
  })
  const requests = Array.isArray(requestsRaw) ? requestsRaw : requestsRaw?.data || []
  const requestsMeta = Array.isArray(requestsRaw) ? undefined : requestsRaw?.meta

  const createFlow = useMutation({
    mutationFn: () => approvalsApi.createFlow({
      name: flowForm.name,
      entityType: flowForm.entityType,
      steps: [{ order: 1, role: flowForm.role, requiredCount: Number(flowForm.requiredCount || 1) }],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-flows'] })
      setFlowForm({ name: '', entityType: 'PurchaseOrder', role: 'ADMIN', requiredCount: '1' })
      setMessage('Flujo creado.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo crear el flujo')),
  })

  const createRequest = useMutation({
    mutationFn: () => approvalsApi.createRequest(requestForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-requests'] })
      setRequestForm((current) => ({ ...current, entityId: '' }))
      setMessage('Solicitud creada.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo crear la solicitud')),
  })

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVE' | 'REJECT' }) => approvalsApi.decide(id, { decision }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-requests'] })
      setMessage('Decisión registrada.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo registrar la decisión')),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Aprobaciones</h1>
          <p className="page-subtitle">Flujos, solicitudes y decisiones auditables</p>
        </div>
      </div>

      {message && <div className={`counter-alert ${message.includes('No se pudo') ? 'error' : 'success'}`}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 360px', gap: 14, alignItems: 'start' }}>
        <section className="fc-card">
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Solicitudes</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="fc-input" style={{ maxWidth: 220 }} value={requestStatus} onChange={(event) => setRequestStatus(event.target.value as Request['status'] | '')}>
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
            {requestsMeta && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{Number(requestsMeta.total || 0).toLocaleString('es-AR')} solicitudes</span>}
          </div>
          {loadingRequests ? <div className="empty-state"><span className="spinner" /></div> : requests.length === 0 ? <div className="empty-state"><p>Sin solicitudes.</p></div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table">
                <thead><tr><th>Flujo</th><th>Entidad</th><th>Estado</th><th>Solicitó</th><th></th></tr></thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.approvalFlow?.name || '-'}</td>
                      <td>{request.entityType}<small style={{ display: 'block', color: 'var(--text-muted)' }}>{request.entityId}</small></td>
                      <td>{statusLabels[request.status]}</td>
                      <td>{request.requestedBy ? `${request.requestedBy.firstName} ${request.requestedBy.lastName}` : '-'}</td>
                      <td>
                        {request.status === 'PENDING' && canDecide && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-icon btn-secondary btn-sm" title="Aprobar" onClick={() => decide.mutate({ id: request.id, decision: 'APPROVE' })}><Check size={13} /></button>
                            <button className="btn btn-icon btn-danger btn-sm" title="Rechazar" onClick={() => decide.mutate({ id: request.id, decision: 'REJECT' })}><X size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requestsMeta && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 12, borderTop: '1px solid var(--fc-border)', alignItems: 'center' }}>
                  <button className="fc-button fc-button-secondary" type="button" disabled={requestPage <= 1} onClick={() => setRequestPage((page) => Math.max(1, page - 1))}>
                    Anterior
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                    Pág. {requestPage}{requestsMeta.pages ? ` de ${requestsMeta.pages}` : ''}
                  </span>
                  <button className="fc-button fc-button-secondary" type="button" disabled={!requestsMeta.pages || requestPage >= requestsMeta.pages} onClick={() => setRequestPage((page) => page + 1)}>
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <aside style={{ display: 'grid', gap: 14 }}>
          {canManage && (
            <section className="fc-card">
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Nueva solicitud</h2>
              <label><span className="fc-label">Flujo</span><select className="fc-input" value={requestForm.approvalFlowId} onChange={(event) => setRequestForm((current) => ({ ...current, approvalFlowId: event.target.value }))}><option value="">Seleccionar</option>{flows.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}</select></label>
              <label><span className="fc-label">Entidad</span><input className="fc-input" value={requestForm.entityType} onChange={(event) => setRequestForm((current) => ({ ...current, entityType: event.target.value }))} /></label>
              <label><span className="fc-label">ID entidad</span><input className="fc-input" value={requestForm.entityId} onChange={(event) => setRequestForm((current) => ({ ...current, entityId: event.target.value }))} /></label>
              <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={!requestForm.approvalFlowId || !requestForm.entityId || createRequest.isPending} onClick={() => createRequest.mutate()}><Plus size={14} /> Crear solicitud</button>
            </section>
          )}

          <section className="fc-card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Flujos</h2>
            {loadingFlows ? <div className="empty-state"><span className="spinner" /></div> : flows.map((flow) => (
              <div key={flow.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--fc-border)' }}>
                <b>{flow.name}</b>
                <small style={{ display: 'block', color: 'var(--text-muted)' }}>{flow.entityType} · {flow.steps?.map((step) => `${step.requiredCount} ${step.role}`).join(', ')}</small>
              </div>
            ))}
          </section>

          {canManage && (
            <section className="fc-card">
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Nuevo flujo</h2>
              <label><span className="fc-label">Nombre</span><input className="fc-input" value={flowForm.name} onChange={(event) => setFlowForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label><span className="fc-label">Entidad</span><input className="fc-input" value={flowForm.entityType} onChange={(event) => setFlowForm((current) => ({ ...current, entityType: event.target.value }))} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                <label><span className="fc-label">Rol aprobador</span><select className="fc-input" value={flowForm.role} onChange={(event) => setFlowForm((current) => ({ ...current, role: event.target.value }))}><option>OWNER</option><option>ADMIN</option><option>EMPLOYEE</option></select></label>
                <label><span className="fc-label">Cant.</span><input className="fc-input" inputMode="numeric" value={flowForm.requiredCount} onChange={(event) => setFlowForm((current) => ({ ...current, requiredCount: event.target.value }))} /></label>
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 10 }} disabled={!flowForm.name || createFlow.isPending} onClick={() => createFlow.mutate()}><Plus size={14} /> Crear flujo</button>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

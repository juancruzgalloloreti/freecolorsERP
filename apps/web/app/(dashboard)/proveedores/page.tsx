'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersApi } from '@/lib/api'
import { Plus, Edit2, X, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const IVA_CONDITIONS = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Resp. Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_CATEGORIZADO', label: 'No categorizado' },
]

interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  cuit?: string
  ivaCondition: string
  isActive: boolean
  notes?: string
}

function SupplierModal({ supplier, onClose, onSave }: {
  supplier: Supplier | null
  onClose: () => void
  onSave: (d: Record<string, unknown>) => void
}) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    cuit: supplier?.cuit || '',
    ivaCondition: supplier?.ivaCondition || 'RESPONSABLE_INSCRIPTO',
    notes: supplier?.notes || '',
    isActive: supplier?.isActive ?? true,
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{supplier ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Razón social *</label>
              <input className="fc-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className="fc-label">CUIT</label>
              <input className="fc-input" value={form.cuit} onChange={e => set('cuit', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Email</label>
              <input className="fc-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="fc-label">Teléfono</label>
              <input className="fc-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="fc-label">Dirección</label>
            <input className="fc-input" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div>
            <label className="fc-label">Condición IVA</label>
            <select className="fc-input" value={form.ivaCondition} onChange={e => set('ivaCondition', e.target.value)}>
              {IVA_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="fc-label">Notas</label>
            <textarea className="fc-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="suppActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
              style={{ width: '15px', height: '15px', accentColor: 'var(--accent-purple)' }} />
            <label htmlFor="suppActive" style={{ fontSize: '13px', cursor: 'pointer' }}>Proveedor activo</label>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!form.name} onClick={() => onSave(form)}>
            {supplier ? 'Guardar' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProveedoresPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canManageSuppliers = user?.role === 'OWNER'
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Supplier | null | 'new'>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.list({ search: search || undefined }),
  })

  const createMutation = useMutation({ mutationFn: suppliersApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null) } })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => suppliersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id).then((r) => r.data),
    onSuccess: (result: { archived?: boolean }) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setMessage(result?.archived ? 'Proveedor archivado: tenía documentos asociados.' : 'Proveedor eliminado.')
      setDeletingSupplier(null)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const msg = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo archivar el proveedor'
      setMessage(Array.isArray(msg) ? msg.join(', ') : msg)
      setDeletingSupplier(null)
    },
  })

  const suppliers: Supplier[] = Array.isArray(data) ? data : (data as { data?: Supplier[] })?.data || []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">{suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''}</p>
        </div>
        {canManageSuppliers && (
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={15} /> Nuevo proveedor
          </button>
        )}
      </div>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(59,130,246,0.24)', borderRadius: 8, color: '#bfdbfe', background: 'rgba(59,130,246,0.08)', fontSize: 13 }}>
          {message}
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '360px' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="fc-input" placeholder="Buscar proveedor..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '34px' }} />
      </div>

      <div className="fc-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><span className="spinner" /></div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state"><p>No hay proveedores registrados</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead><tr>
                <th>Nombre</th><th>CUIT</th><th>Tel / Email</th><th>IVA</th><th>Estado</th>{canManageSuppliers && <th style={{ width: '92px' }}></th>}
              </tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '500' }}>{s.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{s.cuit || '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {s.phone && <div>{s.phone}</div>}
                      {s.email && <div>{s.email}</div>}
                      {!s.phone && !s.email && '—'}
                    </td>
                    <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{IVA_CONDITIONS.find(i => i.value === s.ivaCondition)?.label}</span></td>
                    <td><span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span></td>
                    {canManageSuppliers && (
                      <td>
                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setModal(s)} title="Editar">
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setDeletingSupplier(s)} title="Archivar">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <SupplierModal
          supplier={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={d => modal === 'new' ? createMutation.mutate(d) : updateMutation.mutate({ id: (modal as Supplier).id, data: d })}
        />
      )}
      {deletingSupplier && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !deleteMutation.isPending && setDeletingSupplier(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div style={{ padding: '26px 24px' }}>
              <Trash2 size={22} color="#f87171" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Archivar proveedor</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                {deletingSupplier.name} quedará inactivo si tiene documentos. Si no tiene movimientos, se eliminará.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button className="btn btn-secondary" disabled={deleteMutation.isPending} onClick={() => setDeletingSupplier(null)}>Cancelar</button>
                <button className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletingSupplier.id)}>
                  {deleteMutation.isPending ? 'Procesando...' : 'Archivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

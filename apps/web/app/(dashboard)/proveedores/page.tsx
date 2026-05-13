'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, Upload, Search, Edit2, Trash2, Building2 } from 'lucide-react'
import NuevoProveedorModal from '@/components/proveedores/NuevoProveedorModal'
import ImportCSVModal from '@/components/proveedores/ImportCSVModal'
import type { Proveedor } from '@/types/proveedores'
import { suppliersApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export type { Proveedor }

function apiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

export default function ProveedoresPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canManageSuppliers = user?.role === 'OWNER'
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Proveedor | null | 'new'>(null)
  const [showImport, setShowImport] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['suppliers', search], queryFn: () => suppliersApi.list({ search: search || undefined }) })

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setModal(null)
      setModalError(null)
      setMessage('Proveedor creado correctamente.')
    },
    onError: (error: unknown) => setModalError(apiErrorMessage(error, 'No se pudo crear el proveedor')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => suppliersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setModal(null)
      setModalError(null)
      setMessage('Proveedor actualizado correctamente.')
    },
    onError: (error: unknown) => setModalError(apiErrorMessage(error, 'No se pudo guardar el proveedor')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id).then((r) => r.data),
    onSuccess: (result: { archived?: boolean }) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setMessage(result?.archived ? 'Proveedor archivado: tenía historial asociado.' : 'Proveedor eliminado.')
      setDeletingId(null)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo eliminar el proveedor'
      setMessage(Array.isArray(message) ? message.join(', ') : message)
      setDeletingId(null)
    },
  })

  const exportMutation = useMutation({
    mutationFn: suppliersApi.export,
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `proveedores-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo exportar el CSV'
      setMessage(Array.isArray(message) ? message.join(', ') : message)
    },
  })

  const suppliers: Proveedor[] = Array.isArray(data) ? data : (data as { data?: Proveedor[] })?.data || []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">{suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''} registrado{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        {canManageSuppliers && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
              <Download size={14} /> {exportMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={14} /> Importar CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setModalError(null); setMessage(null); setModal('new') }}>
              <Plus size={14} /> Nuevo proveedor
            </button>
          </div>
        )}
      </div>

      {message && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: '#86efac', background: 'rgba(34,197,94,0.08)', fontSize: '13px' }}>
          {message}
        </div>
      )}

      <div className="search-wrap">
        <Search size={14} />
        <input className="fc-input" placeholder="Buscar proveedor…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="fc-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}><span className="spinner" /></div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <Building2 size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No hay proveedores registrados</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead>
                <tr>
                  <th>Razón Social</th>
                  <th>CUIT</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Localidad</th>
                  <th>Cond. IVA</th>
                  <th>Cond. Pago</th>
                  {canManageSuppliers && <th style={{ width: '90px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '500' }}>{p.razonSocial}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{p.cuit || ''}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.telefono || ''}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.email || ''}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{[p.ciudad, p.provincia].filter(Boolean).join(', ') || ''}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.condicionIva || ''}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.condicionPago || ''}</td>
                    {canManageSuppliers && (
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setModalError(null); setMessage(null); setModal(p) }} title="Editar"><Edit2 size={12} /></button>
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setDeletingId(p.id) }} title="Eliminar"><Trash2 size={12} /></button>
                        </div>
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
        <NuevoProveedorModal
          proveedor={modal === 'new' ? null : modal}
          error={modalError}
          onClose={() => { setModal(null); setModalError(null) }}
          onSave={d => modal === 'new' ? createMutation.mutate(d) : updateMutation.mutate({ id: (modal as Proveedor).id, data: d })}
        />
      )}

      {showImport && (
        <ImportCSVModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false)
            qc.invalidateQueries({ queryKey: ['suppliers'] })
          }}
        />
      )}

      {deletingId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '380px' }}>
            <div style={{ padding: '26px 24px' }}>
              <Trash2 size={22} color="#f87171" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Eliminar proveedor</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                ¿Estás seguro? Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button className="btn btn-secondary" disabled={deleteMutation.isPending} onClick={() => setDeletingId(null)}>Cancelar</button>
                <button className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletingId)}>
                  {deleteMutation.isPending ? 'Procesando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

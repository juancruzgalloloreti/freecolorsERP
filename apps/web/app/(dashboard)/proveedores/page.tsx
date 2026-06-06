'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, Upload, Search, Edit2, Trash2, Building2 } from 'lucide-react'
import NuevoProveedorModal from '@/components/proveedores/NuevoProveedorModal'
import ImportCSVModal from '@/components/proveedores/ImportCSVModal'
import type { Proveedor } from '@/types/proveedores'
import { suppliersApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { ConfirmDialog } from '@/components/erp/layout'
import { CONDICION_IVA_DISPLAY, formatFecha, formatPesos } from '@/lib/format'

const IVA_CONDITIONS = [
  'RESPONSABLE_INSCRIPTO',
  'MONOTRIBUTISTA',
  'CONSUMIDOR_FINAL',
  'EXENTO',
  'NO_CATEGORIZADO',
]

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
  const [ivaCondition, setIvaCondition] = useState('')
  const [pendingOrdersOnly, setPendingOrdersOnly] = useState(false)
  const [supplierPage, setSupplierPage] = useState(1)
  const [modal, setModal] = useState<Proveedor | null | 'new'>(null)
  const [showImport, setShowImport] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => { setSupplierPage(1) }, [search, ivaCondition, pendingOrdersOnly])

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, ivaCondition, pendingOrdersOnly, supplierPage],
    queryFn: () => suppliersApi.list({
      search: search || undefined,
      ivaCondition: ivaCondition || undefined,
      pendingOrdersOnly: pendingOrdersOnly || undefined,
      page: supplierPage,
      limit: 50,
    }),
  })

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

      {message && <div className={`counter-alert ${message.includes('No se pudo') ? 'error' : 'success'}`}>{message}</div>}

      <div className="search-wrap">
        <Search size={14} />
        <input className="fc-input" placeholder="Buscar proveedor…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'end' }}>
        <label>
          <span className="fc-label">Condición IVA</span>
          <select className="fc-input" value={ivaCondition} onChange={(event) => setIvaCondition(event.target.value)}>
            <option value="">Todas</option>
            {IVA_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>{CONDICION_IVA_DISPLAY[condition] || condition}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={pendingOrdersOnly} onChange={(event) => setPendingOrdersOnly(event.target.checked)} />
          <span style={{ fontSize: 13 }}>Solo con OC pendientes</span>
        </label>
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
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="fc-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Razón Social</th>
                  <th style={{ minWidth: 120 }}>CUIT</th>
                  <th>Teléfono</th>
                  <th>Cond. IVA</th>
                  <th style={{ textAlign: 'right' }}>Saldo CC</th>
                  <th>Última OC</th>
                  <th style={{ textAlign: 'right' }}>OC pendientes</th>
                  {canManageSuppliers && <th style={{ width: '90px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '500' }}>{p.razonSocial}</td>
                    <td className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>{p.cuit || '—'}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.telefono || '—'}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.condicionIva ? CONDICION_IVA_DISPLAY[p.condicionIva] || p.condicionIva : '—'}</td>
                    <td className="money-cell strong">{formatPesos(p.ccBalance)}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatFecha(p.lastOrderDate) || '—'}</td>
                    <td className="money-cell">{p.pendingOrders || 0}</td>
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
      {(data as { meta?: { pages?: number } })?.meta && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', alignItems: 'center' }}>
          <button className="fc-button fc-button-secondary" disabled={supplierPage <= 1} onClick={() => setSupplierPage((page) => Math.max(1, page - 1))}>Anterior</button>
          <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Pág. {supplierPage} de {(data as { meta?: { pages?: number } }).meta?.pages || 1}
          </span>
          <button className="fc-button fc-button-secondary" disabled={supplierPage >= ((data as { meta?: { pages?: number } }).meta?.pages || 1)} onClick={() => setSupplierPage((page) => page + 1)}>Siguiente</button>
        </div>
      )}

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

      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Eliminar proveedor"
        body="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger={true}
        pending={deleteMutation.isPending}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}

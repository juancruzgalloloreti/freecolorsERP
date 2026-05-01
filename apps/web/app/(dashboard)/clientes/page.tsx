'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi, priceListsApi } from '@/lib/api'
import { Plus, Edit2, X, Search, CreditCard, Users, Upload, Download, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const IVA_CONDITIONS = [
  { value: 'CONSUMIDOR_FINAL',      label: 'Consumidor Final' },
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Resp. Inscripto' },
  { value: 'MONOTRIBUTISTA',        label: 'Monotributista' },
  { value: 'EXENTO',                label: 'Exento' },
  { value: 'NO_CATEGORIZADO',       label: 'No categorizado' },
]

interface Customer {
  id: string; name: string; email?: string; phone?: string
  address?: string; city?: string; province?: string; cuit?: string
  ivaCondition: string; isActive: boolean
  creditLimit?: number; priceListId?: string; notes?: string
}

function apiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let quoted = false
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ','

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  const [headers = [], ...data] = rows
  return data.map((values) =>
    headers.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header.trim()] = values[index]?.trim() ?? ''
      return acc
    }, {})
  )
}

function decodeCsv(buffer: ArrayBuffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  return utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buffer) : utf8
}

function CustomerModal({ customer, priceLists, onClose, onSave, error, saving }: {
  customer: Customer | null
  priceLists: { id: string; name: string }[]
  onClose: () => void
  onSave: (d: Record<string, unknown>) => void
  error?: string | null
  saving?: boolean
}) {
  const [form, setForm] = useState({
    name: customer?.name || '', email: customer?.email || '',
    phone: customer?.phone || '', address: customer?.address || '',
    city: customer?.city || '', province: customer?.province || '',
    cuit: customer?.cuit || '', ivaCondition: customer?.ivaCondition || 'CONSUMIDOR_FINAL',
    creditLimit: customer?.creditLimit?.toString() || '',
    priceListId: customer?.priceListId || '', notes: customer?.notes || '',
    isActive: customer?.isActive ?? true,
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{customer ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '10px 12px', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', fontSize: '13px', color: '#fca5a5' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Razón social / Nombre *</label>
              <input className="fc-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="fc-label">CUIT</label>
              <input className="fc-input" value={form.cuit} onChange={e => set('cuit', e.target.value)} placeholder="20-12345678-9" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label className="fc-label">Email</label><input className="fc-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label className="fc-label">Teléfono</label><input className="fc-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+54 11 1234-5678" /></div>
          </div>
          <div><label className="fc-label">Dirección</label><input className="fc-input" value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label className="fc-label">Ciudad</label><input className="fc-input" value={form.city} onChange={e => set('city', e.target.value)} /></div>
            <div><label className="fc-label">Provincia</label><input className="fc-input" value={form.province} onChange={e => set('province', e.target.value)} placeholder="Buenos Aires" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Condición IVA</label>
              <select className="fc-input" value={form.ivaCondition} onChange={e => set('ivaCondition', e.target.value)}>
                {IVA_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="fc-label">Lista de precio</label>
              <select className="fc-input" value={form.priceListId} onChange={e => set('priceListId', e.target.value)}>
                <option value="">Por defecto</option>
                {priceLists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="fc-label">Límite cuenta corriente</label>
            <input className="fc-input" type="number" step="0.01" value={form.creditLimit} onChange={e => set('creditLimit', e.target.value)} placeholder="Sin límite si se deja vacío" />
          </div>
          <div><label className="fc-label">Notas</label><textarea className="fc-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} style={{ width: '15px', height: '15px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            <span style={{ fontSize: '13px' }}>Cliente activo</span>
          </label>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" disabled={saving} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!form.name.trim() || saving} onClick={() => {
            const payload = {
              ...form,
              name: form.name.trim(),
              priceListId: form.priceListId || null,
              creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
            }
            onSave(payload)
          }}>
            {saving ? 'Guardando...' : customer ? 'Guardar' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CCModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cc', customer.id],
    queryFn: () => customersApi.account(customer.id),
  })
  const entries = Array.isArray(data) ? data : (data as { entries?: unknown[] })?.entries || []
  const saldo = (entries as { amount: number }[]).reduce((a, e) => a + Number(e.amount), 0)

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '620px' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Cuenta corriente — {customer.name}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Saldo:{' '}
              <span style={{ color: saldo > 0 ? '#f87171' : '#4ade80', fontWeight: '700' }}>
                ${Math.abs(saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {saldo > 0 ? 'a cobrar' : 'a favor'}
              </span>
            </p>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><span className="spinner" /></div>
          ) : entries.length === 0 ? (
            <div className="empty-state"><p>Sin movimientos registrados</p></div>
          ) : (
            <table className="fc-table">
              <thead><tr><th>Fecha</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Importe</th></tr></thead>
              <tbody>
                {(entries as Record<string, unknown>[]).map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date((e.date as string) || (e.createdAt as string)).toLocaleDateString('es-AR')}
                    </td>
                    <td style={{ fontSize: '13px' }}>{e.description as string}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', fontFamily: 'var(--font-mono)', color: Number(e.amount) > 0 ? '#f87171' : '#4ade80' }}>
                      {Number(e.amount) > 0 ? '+' : ''}${Number(e.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canManageCustomers = user?.role === 'OWNER'
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Customer | null | 'new'>(null)
  const [ccModal, setCCModal] = useState<Customer | null>(null)
  const [importing, setImporting] = useState(false)
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['customers', search], queryFn: () => customersApi.list({ search: search || undefined }) })
  const { data: priceLists = [] } = useQuery({ queryKey: ['priceLists'], queryFn: priceListsApi.list })

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setModal(null)
      setModalError(null)
      setImportResult('Cliente creado correctamente.')
    },
    onError: (error: unknown) => setModalError(apiErrorMessage(error, 'No se pudo crear el cliente')),
  })
  const importMutation = useMutation({
    mutationFn: customersApi.importCustomers,
    onSuccess: (r: { created?: number; updated?: number; skipped?: number }) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setImportResult(`Importados: ${r.created || 0} nuevos, ${r.updated || 0} actualizados, ${r.skipped || 0} omitidos.`)
      setImportRows([])
      setImportFileName('')
      setImportError(null)
      setImporting(false)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo importar el CSV'
      setImportError(Array.isArray(message) ? message.join(', ') : message)
    },
  })
  const exportMutation = useMutation({
    mutationFn: customersApi.exportCustomers,
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo exportar el CSV'
      setImportResult(Array.isArray(message) ? message.join(', ') : message)
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => customersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setModal(null)
      setModalError(null)
      setImportResult('Cliente actualizado correctamente.')
    },
    onError: (error: unknown) => setModalError(apiErrorMessage(error, 'No se pudo guardar el cliente')),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id).then((r) => r.data),
    onSuccess: (result: { archived?: boolean }) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setImportResult(result?.archived ? 'Cliente archivado: tenía historial de documentos o cuenta corriente.' : 'Cliente eliminado.')
      setDeletingCustomer(null)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo archivar el cliente'
      setImportResult(Array.isArray(message) ? message.join(', ') : message)
      setDeletingCustomer(null)
    },
  })

  const customers: Customer[] = Array.isArray(data) ? data : (data as { data?: Customer[] })?.data || []
  const pls = Array.isArray(priceLists) ? priceLists : (priceLists as { data?: { id: string; name: string }[] })?.data || []

  function handleImport(file: File | null) {
    if (!file) return
    setImportError(null)
    setImportResult(null)
    setImportRows([])
    setImportFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rows = parseCsv(decodeCsv(reader.result as ArrayBuffer))
        setImportRows(rows)
        if (rows.length === 0) setImportError('No se encontraron filas para importar en el CSV.')
      } catch {
        setImportError('No se pudo leer el archivo CSV.')
      }
    }
    reader.onerror = () => setImportError('No se pudo abrir el archivo seleccionado.')
    reader.readAsArrayBuffer(file)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{customers.length} cliente{customers.length !== 1 ? 's' : ''} registrado{customers.length !== 1 ? 's' : ''}</p>
        </div>
        {canManageCustomers && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
              <Download size={14} /> {exportMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setImporting(true); setImportRows([]); setImportFileName(''); setImportError(null) }}>
              <Upload size={14} /> Importar CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setModalError(null); setImportResult(null); setModal('new') }}>
              <Plus size={14} /> Nuevo cliente
            </button>
          </div>
        )}
      </div>

      {importResult && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: '#86efac', background: 'rgba(34,197,94,0.08)', fontSize: '13px' }}>
          {importResult}
        </div>
      )}

      <div className="search-wrap">
        <Search size={14} />
        <input className="fc-input" placeholder="Buscar cliente…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="fc-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}><span className="spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <Users size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No hay clientes registrados</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead>
                <tr><th>Nombre</th><th>CUIT</th><th>Contacto</th><th>IVA</th><th>Estado</th><th style={{ width: canManageCustomers ? '124px' : '48px' }}></th></tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '500' }}>{c.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{c.cuit || '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div>{c.email}</div>}
                      {!c.phone && !c.email && '—'}
                    </td>
                    <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{IVA_CONDITIONS.find(i => i.value === c.ivaCondition)?.label || c.ivaCondition}</span></td>
                    <td><span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>{c.isActive ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setCCModal(c)} title="Cuenta corriente"><CreditCard size={12} /></button>
                        {canManageCustomers && <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setModalError(null); setImportResult(null); setModal(c) }} title="Editar"><Edit2 size={12} /></button>}
                        {canManageCustomers && <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setDeletingCustomer(c)} title="Archivar"><Trash2 size={12} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <CustomerModal
          customer={modal === 'new' ? null : modal}
          priceLists={pls as { id: string; name: string }[]}
          error={modalError}
          saving={createMutation.isPending || updateMutation.isPending}
          onClose={() => { setModal(null); setModalError(null) }}
          onSave={d => modal === 'new' ? createMutation.mutate(d) : updateMutation.mutate({ id: (modal as Customer).id, data: d })}
        />
      )}
      {ccModal && <CCModal customer={ccModal} onClose={() => setCCModal(null)} />}

      {deletingCustomer && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '380px' }}>
            <div style={{ padding: '26px 24px' }}>
              <Trash2 size={22} color="#f87171" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Archivar cliente</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                {deletingCustomer.name} quedará inactivo si tiene historial. Si no tiene movimientos, se eliminará.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button className="btn btn-secondary" disabled={deleteMutation.isPending} onClick={() => setDeletingCustomer(null)}>Cancelar</button>
                <button className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletingCustomer.id)}>
                  {deleteMutation.isPending ? 'Procesando...' : 'Archivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {importing && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Importar clientes</h3>
              <button className="btn btn-icon btn-secondary" disabled={importMutation.isPending} onClick={() => setImporting(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                El CSV puede venir del sistema viejo. Usa como mínimo Nombre, Razón social o Cliente; CUIT actualiza clientes existentes si coincide.
              </p>
              <input className="fc-input" type="file" accept=".csv,text/csv" disabled={importMutation.isPending} onChange={e => handleImport(e.target.files?.[0] || null)} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Columnas aceptadas: Nombre; CUIT; Telefono; Email; Direccion; Ciudad; Provincia; Condicion IVA; Lista de precio
              </div>
              {importFileName && (
                <div style={{ padding: '10px 12px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '8px', background: 'rgba(124,58,237,0.08)', fontSize: '13px', color: 'var(--fc-text)' }}>
                  {importRows.length > 0 ? `${importFileName}: ${importRows.length} filas listas para importar.` : `Leyendo ${importFileName}...`}
                </div>
              )}
              {importError && (
                <div style={{ padding: '10px 12px', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', fontSize: '13px', color: '#fca5a5' }}>
                  {importError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--fc-border)', paddingTop: '14px' }}>
                <button className="btn btn-secondary" disabled={importMutation.isPending} onClick={() => setImporting(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={importRows.length === 0 || importMutation.isPending} onClick={() => importMutation.mutate(importRows)}>
                  {importMutation.isPending ? 'Importando...' : 'Importar clientes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

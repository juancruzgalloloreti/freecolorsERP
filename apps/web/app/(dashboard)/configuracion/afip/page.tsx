'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { afipApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Key, RefreshCw, Save, Shield, Trash2, X } from 'lucide-react'

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

export default function AfipConfigPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ cuit: '', cert: '', privateKey: '', environment: 'TESTING' as 'TESTING' | 'PRODUCTION', expiresAt: '' })

  const { data: credential, isLoading } = useQuery({
    queryKey: ['afip-credential'],
    queryFn: afipApi.getCredential,
    retry: false,
  })

  const { data: connectionStatus, refetch: testConnection } = useQuery({
    queryKey: ['afip-connection'],
    queryFn: afipApi.testConnection,
    retry: false,
    enabled: !!credential,
  })

  const createMutation = useMutation({
    mutationFn: afipApi.createCredential,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['afip-credential'] })
      setEditing(false)
      setForm({ cuit: '', cert: '', privateKey: '', environment: 'TESTING', expiresAt: '' })
      setMessage('Credenciales AFIP guardadas exitosamente.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo guardar las credenciales')),
  })

  const updateMutation = useMutation({
    mutationFn: afipApi.updateCredential,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['afip-credential'] })
      setEditing(false)
      setMessage('Credenciales AFIP actualizadas exitosamente.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo actualizar las credenciales')),
  })

  const deleteMutation = useMutation({
    mutationFn: afipApi.deleteCredential,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['afip-credential'] })
      setDeleting(false)
      setMessage('Credenciales AFIP eliminadas.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo eliminar las credenciales')),
  })

  function saveCredential() {
    if (!form.cuit.trim() || !form.cert.trim() || !form.privateKey.trim() || !form.expiresAt) {
      setMessage('Completá todos los campos requeridos.')
      return
    }
    if (credential) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  function handleEdit() {
    if (credential) {
      setForm({
        cuit: credential.cuit,
        cert: '',
        privateKey: '',
        environment: credential.environment,
        expiresAt: new Date(credential.expiresAt).toISOString().slice(0, 10),
      })
    }
    setEditing(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración AFIP</h1>
          <p className="page-subtitle">Gestión de credenciales y conexión con AFIP/ARCA</p>
        </div>
        {isOwner && !credential && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <Key size={14} /> Agregar credenciales
          </button>
        )}
      </div>

      {message && (
        <div className={`counter-alert ${message.includes('exitosamente') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: connectionStatus?.connected ? '#22c55e' : '#f97316' }}>
            {connectionStatus?.connected ? 'Conectado' : 'Desconectado'}
          </div>
          <div className="stat-label">Estado AFIP</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{credential?.environment || '-'}</div>
          <div className="stat-label">Ambiente</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{credential?.cuit || '-'}</div>
          <div className="stat-label">CUIT</div>
        </div>
      </div>

      <div className="fc-card">
        {isLoading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : !credential ? (
          <div className="empty-state">
            <Key size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p>No hay credenciales AFIP configuradas.</p>
            {isOwner && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>
              <Key size={14} /> Agregar credenciales
            </button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'grid', placeItems: 'center' }}>
                  <Shield size={18} color="#22c55e" />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Credenciales configuradas</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                    {connectionStatus?.connected ? 'Conexión activa' : 'Conexión inactiva'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => testConnection()}>
                  <RefreshCw size={13} /> Probar conexión
                </button>
                {isOwner && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={handleEdit}>
                      <Save size={13} /> Editar
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleting(true)}>
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: '12px 0', borderTop: '1px solid var(--fc-border)' }}>
              <div>
                <span className="fc-label">CUIT</span>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{credential.cuit}</div>
              </div>
              <div>
                <span className="fc-label">Ambiente</span>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{credential.environment === 'PRODUCTION' ? 'Producción' : 'Testing/Homologación'}</div>
              </div>
              <div>
                <span className="fc-label">Vence</span>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {new Date(credential.expiresAt).toLocaleDateString('es-AR')}
                  {new Date(credential.expiresAt) < new Date() && <span style={{ color: '#ef4444', marginLeft: 6 }}> (Vencido)</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>{credential ? 'Editar credenciales' : 'Nuevas credenciales'} AFIP</h3>
              <button className="btn btn-icon btn-secondary" disabled={createMutation.isPending || updateMutation.isPending} onClick={() => setEditing(false)}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="fc-label">CUIT *</label>
                <input className="fc-input" value={form.cuit} onChange={(e) => setForm((current) => ({ ...current, cuit: e.target.value }))} placeholder="30-12345678-9" />
              </div>
              <div>
                <label className="fc-label">Certificado (.crt) *</label>
                <textarea className="fc-input" rows={4} value={form.cert} onChange={(e) => setForm((current) => ({ ...current, cert: e.target.value }))} placeholder="-----BEGIN CERTIFICATE-----..." />
              </div>
              <div>
                <label className="fc-label">Clave privada (.key) *</label>
                <textarea className="fc-input" rows={4} value={form.privateKey} onChange={(e) => setForm((current) => ({ ...current, privateKey: e.target.value }))} placeholder="-----BEGIN RSA PRIVATE KEY-----..." />
              </div>
              <div>
                <label className="fc-label">Ambiente *</label>
                <select className="fc-input" value={form.environment} onChange={(e) => setForm((current) => ({ ...current, environment: e.target.value as 'TESTING' | 'PRODUCTION' }))}>
                  <option value="TESTING">Testing / Homologación</option>
                  <option value="PRODUCTION">Producción</option>
                </select>
              </div>
              <div>
                <label className="fc-label">Vencimiento *</label>
                <input className="fc-input" type="date" value={form.expiresAt} onChange={(e) => setForm((current) => ({ ...current, expiresAt: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--fc-border)', paddingTop: 14 }}>
                <button className="btn btn-secondary" disabled={createMutation.isPending || updateMutation.isPending} onClick={() => setEditing(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={!form.cuit.trim() || !form.cert.trim() || !form.privateKey.trim() || !form.expiresAt || createMutation.isPending || updateMutation.isPending} onClick={saveCredential}>
                  <Save size={14} /> {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div style={{ padding: '28px 24px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                <Trash2 size={18} color="#f87171" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>¿Eliminar credenciales?</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Se eliminarán las credenciales AFIP configuradas. Los comprobantes ya emitidos no se verán afectados, pero no podrás emitir nuevos hasta volver a configurarlas.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
                <button className="btn btn-secondary" disabled={deleteMutation.isPending} onClick={() => setDeleting(false)}>Cancelar</button>
                <button className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

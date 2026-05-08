'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Proveedor } from '@/types/proveedores'

const CONDICIONES_IVA = [
  'Responsable Inscripto',
  'Monotributo',
  'Exento',
  'No Responsable',
  'Sujeto No Categorizado',
]

const CONDICIONES_PAGO = [
  'Contado',
  '7 días',
  '15 días',
  '30 días',
  '60 días',
  '90 días',
  'Cheque',
  'A convenir',
]

interface Props {
  proveedor?: Proveedor | null
  error?: string | null
  onClose: () => void
  onSave: (d: Record<string, unknown>) => void
}

const empty = {
  razonSocial: '',
  cuit: '',
  email: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  provincia: 'Buenos Aires',
  condicionIva: 'Responsable Inscripto',
  condicionPago: 'Contado',
  notas: '',
}

export default function NuevoProveedorModal({ proveedor, error, onClose, onSave }: Props) {
  const isEdit = !!proveedor
  const [form, setForm] = useState(empty)

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (proveedor) {
        setForm({
          razonSocial: proveedor.razonSocial ?? '',
          cuit: proveedor.cuit ?? '',
          email: proveedor.email ?? '',
          telefono: proveedor.telefono ?? '',
          direccion: proveedor.direccion ?? '',
          ciudad: proveedor.ciudad ?? '',
          provincia: proveedor.provincia ?? 'Buenos Aires',
          condicionIva: proveedor.condicionIva ?? 'Responsable Inscripto',
          condicionPago: proveedor.condicionPago ?? 'Contado',
          notas: proveedor.notas ?? '',
        })
      } else {
        setForm(empty)
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [proveedor])

  const set = (field: keyof typeof form, val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const handleSubmit = () => {
    if (!form.razonSocial.trim()) {
      return
    }
    const payload = {
      name: form.razonSocial.trim(),
      cuit: form.cuit.trim() || null,
      email: form.email.trim() || null,
      phone: form.telefono.trim() || null,
      address: [form.direccion, form.ciudad, form.provincia].map((part) => part.trim()).filter(Boolean).join(', ') || null,
      ivaCondition: form.condicionIva,
      notes: form.notas.trim() || null,
      isActive: true,
    }
    onSave(payload)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '580px' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
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
              <label className="fc-label">Razón Social / Nombre *</label>
              <input className="fc-input" value={form.razonSocial} onChange={e => set('razonSocial', e.target.value)} placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className="fc-label">CUIT</label>
              <input className="fc-input" value={form.cuit} onChange={e => set('cuit', e.target.value)} placeholder="20-12345678-9" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Email</label>
              <input className="fc-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="fc-label">Teléfono</label>
              <input className="fc-input" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+54 11 1234-5678" />
            </div>
          </div>

          <div>
            <label className="fc-label">Dirección</label>
            <input className="fc-input" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Ciudad</label>
              <input className="fc-input" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />
            </div>
            <div>
              <label className="fc-label">Provincia</label>
              <input className="fc-input" value={form.provincia} onChange={e => set('provincia', e.target.value)} placeholder="Buenos Aires" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Condición IVA</label>
              <select className="fc-input" value={form.condicionIva} onChange={e => set('condicionIva', e.target.value)}>
                {CONDICIONES_IVA.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="fc-label">Condición de Pago</label>
              <select className="fc-input" value={form.condicionPago} onChange={e => set('condicionPago', e.target.value)}>
                {CONDICIONES_PAGO.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="fc-label">Notas</label>
            <textarea className="fc-input" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!form.razonSocial.trim()} onClick={handleSubmit}>
            {isEdit ? 'Guardar' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Building2, FileText, CreditCard, Truck } from 'lucide-react'
import { suppliersApi } from '@/lib/api'
import { CONDICION_IVA_DISPLAY, formatCuit, formatFecha } from '@/lib/format'
import type { Proveedor } from '@/types/proveedores'

type Tab = 'datos' | 'cc' | 'entrega'

const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'datos', label: 'Datos', icon: FileText },
  { key: 'cc', label: 'Cuenta Corriente', icon: CreditCard },
  { key: 'entrega', label: 'Entrega', icon: Truck },
]

export default function ProveedorDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [tab, setTab] = useState<Tab>('datos')

  const { data: proveedor, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.get(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}>
        <span className="spinner" />
      </div>
    )
  }

  if (!proveedor) {
    return (
      <div className="empty-state">
        <Building2 size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <p>Proveedor no encontrado</p>
      </div>
    )
  }

  const p = proveedor as Proveedor

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{p.razonSocial}</h1>
          <p className="page-subtitle">
            {formatCuit(p.cuit)} &middot; {p.telefono || 'Sin teléfono'} &middot; {p.email || 'Sin email'}
            {p.direccion && <> &middot; {p.direccion}</>}
            {p.condicionIva && <> &middot; {CONDICION_IVA_DISPLAY[p.condicionIva] || p.condicionIva}</>}
          </p>
        </div>
      </div>

      <div className="fc-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`fc-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'datos' && (
        <div className="fc-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
            <Field label="Razón Social" value={p.razonSocial} />
            <Field label="CUIT" value={formatCuit(p.cuit)} />
            <Field label="Email" value={p.email || '—'} />
            <Field label="Teléfono" value={p.telefono || '—'} />
            <Field label="Dirección" value={p.direccion || '—'} />
            <Field label="Condición IVA" value={p.condicionIva ? CONDICION_IVA_DISPLAY[p.condicionIva] || p.condicionIva : '—'} />
            <Field label="Condición de Pago" value={p.condicionPago || '—'} />
            <Field label="Saldo CC" value={p.ccBalance != null ? `$${Number(p.ccBalance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'} />
            <Field label="Última OC" value={formatFecha(p.lastOrderDate) || '—'} />
            <Field label="OC Pendientes" value={p.pendingOrders != null ? String(p.pendingOrders) : '—'} />
            <Field label="Notas" value={p.notas || '—'} wrapperStyle={p.notas ? { gridColumn: '1 / -1' } : undefined} />
            <Field label="Creado" value={formatFecha(p.createdAt) || '—'} />
          </div>
        </div>
      )}

      {tab === 'cc' && (
        <div className="fc-card">
          <div className="empty-state">
            <CreditCard size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Módulo en desarrollo — los movimientos de CC de proveedores se implementarán en una fase posterior</p>
          </div>
        </div>
      )}

      {tab === 'entrega' && (
        <div className="fc-card">
          <div className="empty-state">
            <Truck size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Módulo en desarrollo — los días de entrega por proveedor se implementarán en una fase posterior</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, wrapperStyle }: { label: string; value: string; wrapperStyle?: React.CSSProperties }) {
  return (
    <div style={wrapperStyle}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

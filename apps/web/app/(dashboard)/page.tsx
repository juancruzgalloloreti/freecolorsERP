'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { DollarSign, TrendingUp, CreditCard, ShoppingCart, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const QUICK_LINKS = [
  { href: '/ventas', label: 'Abrir mostrador', desc: 'Vender, guardar borrador y emitir', color: '#7c3aed', dot: '#a78bfa', permissions: ['sale.view', 'sale.create'] },
  { href: '/compras', label: 'Cargar compra', desc: 'Ordenes y recepciones', color: '#3b82f6', dot: '#60a5fa', permissions: ['purchase.view', 'purchase.create'] },
  { href: '/productos', label: 'Productos', desc: 'Fichas, marcas y rubros', color: '#22c55e', dot: '#4ade80', permissions: ['product.create', 'product.edit', 'stock.view'] },
  { href: '/stock', label: 'Existencias', desc: 'Saldos y movimientos', color: '#f59e0b', dot: '#fbbf24', permissions: ['stock.view'] },
  { href: '/clientes', label: 'Clientes', desc: 'Datos y cuenta corriente', color: '#ef4444', dot: '#f87171', permissions: ['customer.create', 'customer.edit'] },
  { href: '/listas-de-precio', label: 'Precios', desc: 'Listas y actualizaciones', color: '#8b5cf6', dot: '#c4b5fd', permissions: ['price.update'] },
]

const STAT_CARDS = [
  { href: '/documentos', key: 'salesToday', label: 'Ventas hoy', icon: DollarSign, color: '#22c55e', permission: 'report.view', format: 'money' },
  { href: '/reportes', key: 'salesThisMonth', label: 'Ventas este mes', icon: TrendingUp, color: '#f59e0b', permission: 'report.view', format: 'money' },
  { href: '/cuenta-corriente', key: 'customerDebt', label: 'Deuda clientes', icon: CreditCard, color: '#ef4444', permission: 'customer.credit_limit', format: 'money' },
  { href: '/compras', key: 'pendingPurchases', label: 'Compras pendientes', icon: ShoppingCart, color: '#3b82f6', permission: 'purchase.view', format: 'number' },
  { href: '/documentos', key: 'unconfirmedDocs', label: 'Docs sin confirmar', icon: FileText, color: '#7c3aed', permission: 'document.create', format: 'number' },
]

export default function DashboardPage() {
  const { hasPermission, hasAnyPermission } = useAuth()
  const canReadSummary = hasPermission('report.view')
  const visibleStats = STAT_CARDS.filter((stat) => hasPermission(stat.permission))
  const visibleQuickLinks = QUICK_LINKS.filter((link) => hasAnyPermission(link.permissions))
  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => reportsApi.summary(),
    enabled: canReadSummary,
  })

  const stats = (data || {}) as Record<string, number>

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="page-title">Inicio</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today}</p>
        </div>
      </div>

      {/* Stats grid */}
      {canReadSummary && isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card" style={{ opacity: 0.3 }}>
              <div style={{ width: '70px', height: '28px', background: 'var(--fc-border)', borderRadius: '6px', marginBottom: '8px' }} />
              <div style={{ width: '100px', height: '12px', background: 'var(--fc-border)', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : visibleStats.length > 0 && canReadSummary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          {visibleStats.map(({ href, key, label, icon: Icon, color, format }) => (
            <Link key={key} href={href} style={{ textDecoration: 'none' }}>
              <StatCard
                value={formatStat(stats[key], format)}
                label={label}
                icon={<Icon size={18} />}
                color={color}
              />
            </Link>
          ))}
        </div>
      ) : null}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Trabajo frecuente
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--fc-border)' }} />
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {visibleQuickLinks.map(({ href, label, desc, color, dot }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div
              className="fc-card"
              style={{
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = color + '44'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2)`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--fc-border)'
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, boxShadow: `0 0 8px ${dot}` }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--fc-text)' }}>{label}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '13px' }}>{desc}</div>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function formatStat(value: number | undefined, format: string) {
  if (value == null) return '—'
  if (format === 'money') {
    return `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
  }
  return value
}

function StatCard({
  value, label, icon, color, warn = false,
}: {
  value: string | number
  label: string
  icon: React.ReactNode
  color: string
  warn?: boolean
}) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: color + '18',
          border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
      </div>
      <div className="stat-value" style={{ color: warn ? color : undefined }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { Package, FileText, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const QUICK_LINKS = [
  { href: '/documentos',  label: 'Nueva factura',        desc: 'Emitir factura o remito',         color: '#7c3aed', dot: '#a78bfa' },
  { href: '/productos',   label: 'Productos',             desc: 'ABM catálogo completo',            color: '#3b82f6', dot: '#60a5fa' },
  { href: '/stock',       label: 'Movimiento de stock',   desc: 'Registrar entradas y salidas',     color: '#22c55e', dot: '#4ade80' },
  { href: '/clientes',    label: 'Clientes',              desc: 'Gestión y cuenta corriente',       color: '#f59e0b', dot: '#fbbf24' },
  { href: '/reportes',    label: 'Reportes',              desc: 'Analytics y métricas del negocio', color: '#ef4444', dot: '#f87171' },
  { href: '/listas-de-precio', label: 'Listas de precio', desc: 'Precios por cliente o segmento', color: '#8b5cf6', dot: '#c4b5fd' },
]

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => reportsApi.summary(),
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
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today}</p>
        </div>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card" style={{ opacity: 0.3 }}>
              <div style={{ width: '70px', height: '28px', background: 'var(--fc-border)', borderRadius: '6px', marginBottom: '8px' }} />
              <div style={{ width: '100px', height: '12px', background: 'var(--fc-border)', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          <StatCard value={stats.totalProducts ?? '—'} label="Productos" icon={<Package size={18} />} color="#7c3aed" />
          <StatCard value={stats.totalCustomers ?? '—'} label="Clientes" icon={<Users size={18} />} color="#3b82f6" />
          <StatCard value={stats.documentsThisMonth ?? '—'} label="Docs este mes" icon={<FileText size={18} />} color="#22c55e" />
          <StatCard
            value={stats.salesThisMonth != null
              ? `$${Number(stats.salesThisMonth).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
              : '—'}
            label="Ventas este mes"
            icon={<TrendingUp size={18} />}
            color="#f59e0b"
          />
          {stats.lowStockCount > 0 && (
            <StatCard
              value={stats.lowStockCount}
              label="Stock bajo"
              icon={<AlertTriangle size={18} />}
              color="#ef4444"
              warn
            />
          )}
        </div>
      )}

      {/* Divider label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Accesos rápidos
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--fc-border)' }} />
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {QUICK_LINKS.map(({ href, label, desc, color, dot }) => (
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

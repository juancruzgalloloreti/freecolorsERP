'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  FileText,
  Home,
  Layers3,
  MoreHorizontal,
  Package,
  ReceiptText,
} from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="action-bar">{actions}</div>}
    </div>
  )
}

export function ActionBar({ children }: { children: React.ReactNode }) {
  return <div className="action-bar">{children}</div>
}

export function DataView({
  children,
  empty,
  loading,
}: {
  children: React.ReactNode
  empty?: React.ReactNode
  loading?: boolean
}) {
  if (loading) {
    return <div className="empty-state"><span className="spinner" /></div>
  }
  if (empty) return <>{empty}</>
  return <>{children}</>
}

export function EntitySheet({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="entity-sheet-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="entity-sheet">
        <header className="entity-sheet-header">
          <h2>{title}</h2>
          <button className="btn btn-icon btn-secondary" type="button" onClick={onClose}>×</button>
        </header>
        <div className="entity-sheet-body">{children}</div>
        {footer && <footer className="entity-sheet-footer">{footer}</footer>}
      </section>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirmar',
  danger,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="entity-sheet-overlay" onClick={(event) => event.target === event.currentTarget && !pending && onCancel()}>
      <div className="confirm-dialog">
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="action-bar">
          <button className="btn btn-secondary" type="button" disabled={pending} onClick={onCancel}>Cancelar</button>
          <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} type="button" disabled={pending} onClick={onConfirm}>
            {pending ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`fc-input money-input ${props.className ?? ''}`} inputMode="decimal" />
}

export function QuantityInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`fc-input quantity-input ${props.className ?? ''}`} inputMode="decimal" />
}

export function StickyTotals({ children }: { children: React.ReactNode }) {
  return <aside className="sticky-totals">{children}</aside>
}

export function RoleGate({
  role,
  allow,
  children,
}: {
  role?: string
  allow: string[]
  children: React.ReactNode
}) {
  if (!role || !allow.includes(role)) return null
  return <>{children}</>
}

const bottomNav = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/ventas', label: 'Mostrador', icon: ReceiptText },
  { href: '/stock', label: 'Stock', icon: Layers3 },
  { href: '/productos', label: 'Catálogo', icon: Package },
  { href: '/documentos', label: 'Más', icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="bottom-nav" aria-label="Navegación móvil">
      {bottomNav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link key={href} href={href} className={`bottom-nav-link ${active ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export const moreLinks = [
  { href: '/documentos', label: 'Documentos', icon: FileText },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
]

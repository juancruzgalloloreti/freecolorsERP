'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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
  preventOutsideClose?: boolean
}) {
  const sheetRef = useRef<HTMLElement>(null)
  useFocusTrap(open, sheetRef)
  useBodyScrollLock(open)
  if (!open) return null
  return (
    <div className="entity-sheet-overlay">
      <section className="entity-sheet" ref={sheetRef} role="dialog" aria-modal="true" tabIndex={-1}>
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
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, dialogRef)
  useBodyScrollLock(open)
  if (!open) return null
  return (
    <div className="entity-sheet-overlay">
      <div className="confirm-dialog" ref={dialogRef} role="alertdialog" aria-modal="true" tabIndex={-1}>
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
  return <DraftDecimalInput {...props} className={`fc-input money-input ${props.className ?? ''}`} />
}

export function QuantityInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <DraftDecimalInput {...props} className={`fc-input quantity-input ${props.className ?? ''}`} />
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

function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    if (!container) return
    const previous = document.activeElement as HTMLElement | null
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusFirst = () => {
      const first = container.querySelector<HTMLElement>('[autofocus]') ?? container.querySelector<HTMLElement>(focusableSelector)
      ;(first ?? container).focus()
    }
    window.requestAnimationFrame(() => {
      if (!container.contains(document.activeElement)) focusFirst()
    })
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      previous?.focus?.()
    }
  }, [containerRef, open])
}

function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'contain'
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [open])
}

function DraftDecimalInput({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [draft, setDraft] = useState(() => value == null ? '' : String(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current || value === '' || value == null) {
      setDraft(value == null ? '' : String(value))
    }
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    if (!/^\d*(?:[,.]\d*)?$/.test(next)) return
    setDraft(next)
    onChange?.(event)
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    focusedRef.current = false
    const normalized = value == null ? '' : String(value)
    setDraft(normalized)
    onBlur?.(event)
  }

  return (
    <input
      {...props}
      type="text"
      value={draft}
      disabled={disabled}
      className={className}
      inputMode="decimal"
      autoComplete="off"
      onFocus={(event) => {
        focusedRef.current = true
        props.onFocus?.(event)
      }}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}

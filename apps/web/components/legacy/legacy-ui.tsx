import Link from 'next/link'
import type { ReactNode } from 'react'

type LegacyWindowProps = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function LegacyWindow({ title, subtitle, children, footer }: LegacyWindowProps) {
  return (
    <section className="legacy-window">
      <header className="legacy-titlebar">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <Link className="legacy-top-link" href="/legacy/menu">Menu</Link>
      </header>
      <div className="legacy-window-body">{children}</div>
      {footer && <footer className="legacy-statusbar">{footer}</footer>}
    </section>
  )
}

export function LegacyToolbar({ children }: { children: ReactNode }) {
  return <div className="legacy-toolbar">{children}</div>
}

export function LegacyPanel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`legacy-panel ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
}

export function LegacyFieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="legacy-fieldset">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  )
}

export function LegacyGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 | 5 | 6 }) {
  return <div className={`legacy-form-grid legacy-form-grid-${columns}`}>{children}</div>
}

export function LegacyTotalsBox({ rows, total }: { rows: Array<{ label: string; value: ReactNode }>; total: ReactNode }) {
  return (
    <aside className="legacy-totals-box">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
      <div className="legacy-totals-grand">
        <span>Total</span>
        <strong>{total}</strong>
      </div>
    </aside>
  )
}

export function LegacyShortcutButton({
  shortcut,
  children,
  href,
  onClick,
  disabled,
}: {
  shortcut?: string
  children: ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const content = (
    <>
      {shortcut && <kbd>{shortcut}</kbd>}
      <span>{children}</span>
    </>
  )
  if (href && !disabled) {
    return <Link className="legacy-shortcut-button" href={href}>{content}</Link>
  }
  return (
    <button className="legacy-shortcut-button" type="button" onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}

export function LegacyOperationLauncher({
  title,
  description,
  href,
  shortcut,
}: {
  title: string
  description: string
  href: string
  shortcut?: string
}) {
  return (
    <Link className="legacy-operation-launcher" href={href}>
      <strong>{title}</strong>
      <span>{description}</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </Link>
  )
}

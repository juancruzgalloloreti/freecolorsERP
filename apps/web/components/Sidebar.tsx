'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Home, Package, Layers3, FileText, Users, Truck,
  CreditCard, Tag, BarChart3, LogOut, ReceiptText, ShoppingCart, WalletCards,
  Landmark, CheckSquare, Settings,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Operación',
    items: [
      { href: '/dashboard', label: 'Inicio', icon: Home, permissions: [] },
      { href: '/ventas', label: 'Mostrador', icon: ReceiptText, permissions: ['sale.view', 'sale.create'] },
      { href: '/compras', label: 'Compras', icon: ShoppingCart, permissions: ['purchase.view', 'purchase.create'] },
      { href: '/documentos', label: 'Comprobantes', icon: FileText, permissions: ['document.create'] },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { href: '/productos', label: 'Productos', icon: Package, permissions: ['product.create', 'product.edit', 'stock.view'] },
      { href: '/stock', label: 'Existencias', icon: Layers3, permissions: ['stock.view'] },
      { href: '/listas-de-precio', label: 'Precios', icon: Tag, permissions: ['product.edit', 'report.view'] },
    ],
  },
  {
    label: 'Terceros',
    items: [
      { href: '/clientes', label: 'Clientes', icon: Users, permissions: ['customer.create', 'customer.edit'] },
      { href: '/proveedores', label: 'Proveedores', icon: Truck, permissions: ['supplier.create', 'supplier.edit', 'purchase.view'] },
      { href: '/cuenta-corriente', label: 'Cuentas corrientes', icon: CreditCard, permissions: ['customer.credit_limit', 'supplier.edit'] },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/caja', label: 'Caja', icon: WalletCards, permissions: ['cash.open', 'cash.close', 'cash.move'] },
      { href: '/cheques', label: 'Cheques', icon: Landmark, permissions: ['check.view'] },
    ],
  },
  {
    label: 'Control',
    items: [
      { href: '/aprobaciones', label: 'Aprobaciones', icon: CheckSquare, permissions: ['approval.view', 'approval.decide'] },
      { href: '/reportes', label: 'Reportes', icon: BarChart3, permissions: ['report.view', 'audit.read'] },
      { href: '/configuracion/afip', label: 'Configuración', icon: Settings, permissions: [] },
    ],
  },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user, logout, hasAnyPermission } = useAuth()
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Usuario'

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <Image className="sidebar-logo-image" src="/freecolors-logo.png" alt="Freecolors Pinturerias" width={208} height={62} priority style={{ width: '100%', height: 'auto' }} />
          <div className="sidebar-logo-bar" />
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(({ permissions }) => permissions.length === 0 || hasAnyPermission(permissions))
            if (items.length === 0) return null

            return (
              <section key={group.label} className="sidebar-group">
                <div className="sidebar-group-label">{group.label}</div>
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={`sidebar-link ${active ? 'active' : ''}`}
                    >
                      <Icon size={15} className="sidebar-link-icon" strokeWidth={active ? 2.2 : 1.8} />
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </section>
            )
          })}
        </nav>
        {/* Footer / User */}
        <div className="sidebar-footer">
          <Link href="/perfil" onClick={onClose} className="sidebar-user" style={{ textDecoration: 'none' }}>
            <div className="sidebar-user-avatar">
              {userName[0]?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{user?.role ?? 'USER'}</div>
            </div>
          </Link>
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={13} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}






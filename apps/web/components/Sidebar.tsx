'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Package, Layers3, FileText, Users, Truck,
  CreditCard, Tag, BarChart3, LogOut, ReceiptText, ShoppingCart, WalletCards, ClipboardList,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',         label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/ventas',            label: 'Mostrador',       icon: ReceiptText },
  { href: '/pedidos',           label: 'Pedidos',         icon: ClipboardList },
  { href: '/compras',           label: 'Compras',         icon: ShoppingCart },
  { href: '/documentos',        label: 'Documentos',      icon: FileText },
  { href: '/productos',         label: 'Catálogo',        icon: Package },
  { href: '/stock',             label: 'Stock / Auditoría', icon: Layers3 },
  { href: '/clientes',          label: 'Clientes',        icon: Users },
  { href: '/proveedores',       label: 'Proveedores',     icon: Truck },
  { href: '/cuenta-corriente',  label: 'Cta. Corriente',  icon: CreditCard },
  { href: '/caja',              label: 'Caja',            icon: WalletCards },
  { href: '/listas-de-precio',  label: 'Listas de Precio',icon: Tag },
  { href: '/reportes',          label: 'Reportes',        icon: BarChart3 },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth() as { user: { firstName?: string; lastName?: string; email?: string; role?: string } | null; logout?: () => void }
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
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
            >
              <Icon size={15} className="sidebar-link-icon" strokeWidth={isActive(href) ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          ))}
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






'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { BottomNav } from '@/components/erp/layout'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Menu } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isCounterPage = pathname === '/ventas'

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--fc-bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" style={{ width: '28px', height: '28px' }} />
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          CARGANDO…
        </div>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fc-bg)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: 0,
      }} className="main-content">

        {/* Mobile header */}
        <div className="mobile-header">
          <button className="btn btn-icon btn-secondary" onClick={() => setSidebarOpen(true)}>
            <Menu size={17} />
          </button>
          <Image className="mobile-logo-image" src="/freecolors-logo.png" alt="Freecolors Pinturerias" width={168} height={50} priority style={{ width: 148, height: 'auto' }} />
          <button className="btn btn-icon btn-secondary mobile-logout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>

        <main className={isCounterPage ? 'counter-main' : undefined} style={{
          flex: 1,
          padding: '28px 32px',
          maxWidth: isCounterPage ? 'none' : '1440px',
          width: '100%',
          margin: '0 auto',
          animation: 'fadeInPage 0.25s ease',
        }}>
          {children}
        </main>
      </div>
      <BottomNav />

      <style>{`
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; }
          main { padding: 14px 12px 86px !important; }
        }
      `}</style>
    </div>
  )
}


'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import '../legacy.css'

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const uiMode = process.env.NEXT_PUBLIC_UI_MODE || 'modern'

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, router, user])

  if (loading) {
    return (
      <div className="legacy-shell">
        <div className="legacy-window">
          <div className="legacy-titlebar"><h1>Cargando FreeColors ERP</h1></div>
          <div className="legacy-window-body">Validando sesion...</div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="legacy-shell" data-ui-mode={uiMode}>
      {children}
    </div>
  )
}

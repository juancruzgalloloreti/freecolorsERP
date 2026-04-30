'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'
import { authApi } from '@/lib/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'READONLY'
  // BUG FIX: tenantId viene del objeto tenant de la respuesta, no del user
  tenantId: string
}

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

const cookieOptions = {
  expires: 1,
  path: '/',
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
}

const clearAuthCookies = () => {
  Cookies.remove('access_token', { path: '/' })
  Cookies.remove('refresh_token', { path: '/' })
  Cookies.remove('user', { path: '/' })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      const saved = Cookies.get('user')
      const token = Cookies.get('access_token')
      if (saved && token) {
        try { setUser(JSON.parse(saved)) } catch {}
      } else if (saved || token) {
        clearAuthCookies()
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)

    // BUG FIX: la API devuelve { user: {...}, tenant: {...}, accessToken, refreshToken }
    // El user no tiene tenantId, lo tomamos del objeto tenant
    const userToStore: User = {
      ...data.user,
      tenantId: data.tenant?.id ?? '',
    }

    if (!Cookies.get('access_token')) {
      Cookies.set('access_token', data.accessToken, cookieOptions)
      Cookies.set('refresh_token', data.refreshToken, { ...cookieOptions, expires: 30 })
      Cookies.set('user', JSON.stringify(userToStore), cookieOptions)
    }
    setUser(userToStore)
  }

  const logout = () => {
    authApi.logout().catch(() => {})
    clearAuthCookies()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

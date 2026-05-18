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
  tenantId: string
  permissions?: string[] // Array de códigos de permiso
}

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  isOwner: () => boolean
  isAdmin: () => boolean
}

const Ctx = createContext<AuthCtx | null>(null)

const cookieOptions = {
  expires: 1,
  path: '/',
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
}

const clearAuthCookies = () => {
  Cookies.remove('session_hint', { path: '/' })
  Cookies.remove('user', { path: '/' })
  // access_token y refresh_token son httpOnly — los limpia el route handler /api/auth/logout via Set-Cookie server-side
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      const saved = Cookies.get('user')
      const hasSession = Cookies.get('session_hint')
      if (saved && hasSession) {
        try { setUser(JSON.parse(saved)) } catch {}
      } else if (saved || hasSession) {
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

    // access_token es httpOnly — ya lo setea el route handler /api/auth/login
    // refresh_token es httpOnly — idem
    // No escribir access_token/refresh_token desde JS: quedarían accesibles a XSS

    try {
      const permissions = await authApi.getMyPermissions()
      userToStore.permissions = permissions.map((p: { code: string }) => p.code)
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch user permissions', e)
      }
      userToStore.permissions = []
    }

    Cookies.set('user', JSON.stringify(userToStore), cookieOptions)
    setUser(userToStore)
  }

  const logout = () => {
    authApi.logout().catch(() => {})
    clearAuthCookies()
    setUser(null)
    window.location.href = '/login'
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.role === 'OWNER') return true
    return user.permissions?.includes(permission) ?? false
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false
    if (user.role === 'OWNER') return true
    return permissions.some((p) => user.permissions?.includes(p) ?? false)
  }

  const isOwner = (): boolean => user?.role === 'OWNER'

  const isAdmin = (): boolean => user?.role === 'ADMIN' || user?.role === 'OWNER'

  return (
    <Ctx.Provider value={{ user, loading, login, logout, hasPermission, hasAnyPermission, isOwner, isAdmin }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

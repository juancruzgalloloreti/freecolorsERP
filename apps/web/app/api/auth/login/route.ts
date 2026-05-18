import { NextRequest, NextResponse } from 'next/server'

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001')

const secretCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

const hintCookieOptions = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const loginBody = {
    ...body,
    tenantSlug: body.tenantSlug || process.env.NEXT_PUBLIC_TENANT_SLUG || 'pintureria-demo',
  }

  if (!API_INTERNAL_URL) {
    return NextResponse.json({ message: 'Falta configurar la URL interna de la API' }, { status: 500 })
  }

  let response: Response
  try {
    response = await fetch(`${API_INTERNAL_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody),
    })
  } catch {
    return NextResponse.json({ message: 'No se pudo conectar con la API' }, { status: 502 })
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status })
  }

  const userToStore = {
    ...data.user,
    tenantId: data.tenant?.id ?? '',
  }

  const nextResponse = NextResponse.json(data)
  nextResponse.cookies.set('access_token', data.accessToken, {
    ...secretCookieOptions,
    maxAge: 60 * 60 * 24,
  })
  nextResponse.cookies.set('refresh_token', data.refreshToken, {
    ...secretCookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  })
  nextResponse.cookies.set('session_hint', '1', {
    ...hintCookieOptions,
    maxAge: 60 * 60 * 24,
  })
  nextResponse.cookies.set('user', JSON.stringify(userToStore), {
    ...hintCookieOptions,
    maxAge: 60 * 60 * 24,
  })

  return nextResponse
}

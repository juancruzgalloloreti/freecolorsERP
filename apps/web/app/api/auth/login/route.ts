import { NextRequest, NextResponse } from 'next/server'

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001'

const cookieOptions = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const response = await fetch(`${API_INTERNAL_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

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
    ...cookieOptions,
    maxAge: 60 * 60 * 24,
  })
  nextResponse.cookies.set('refresh_token', data.refreshToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  })
  nextResponse.cookies.set('user', JSON.stringify(userToStore), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24,
  })

  return nextResponse
}

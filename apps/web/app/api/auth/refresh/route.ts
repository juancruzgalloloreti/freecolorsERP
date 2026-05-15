import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001'

const httpOnlyOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

const cookieOptions = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value
  const body = await request.json().catch(() => ({}))
  const userId = body.userId

  if (!refreshToken || !userId) {
    return NextResponse.json({ message: 'Sesión expirada' }, { status: 401 })
  }

  const response = await fetch(`${API_INTERNAL_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, refreshToken }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const nextResponse = NextResponse.json(data, { status: response.status })
    nextResponse.cookies.delete('access_token')
    nextResponse.cookies.delete('refresh_token')
    nextResponse.cookies.delete('user')
    return nextResponse
  }

  const nextResponse = NextResponse.json(data)

  nextResponse.cookies.set('access_token', data.accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24,
  })

  nextResponse.cookies.set('refresh_token', data.refreshToken, {
    ...httpOnlyOptions,
    maxAge: 60 * 60 * 24 * 30,
  })

  return nextResponse
}

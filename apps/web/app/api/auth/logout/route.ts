import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001')

const secretCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 0,
}

const hintCookieOptions = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 0,
}

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (API_INTERNAL_URL && accessToken) {
    await fetch(`${API_INTERNAL_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined)
  }

  const nextResponse = NextResponse.json({ ok: true })
  nextResponse.cookies.set('access_token', '', secretCookieOptions)
  nextResponse.cookies.set('refresh_token', '', secretCookieOptions)
  nextResponse.cookies.set('session_hint', '', hintCookieOptions)
  nextResponse.cookies.set('user', '', hintCookieOptions)
  return nextResponse
}

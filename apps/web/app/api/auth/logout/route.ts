import { NextResponse } from 'next/server'

export async function POST() {
  const nextResponse = NextResponse.json({ ok: true })
  nextResponse.cookies.delete('access_token')
  nextResponse.cookies.delete('refresh_token')
  nextResponse.cookies.delete('user')
  return nextResponse
}
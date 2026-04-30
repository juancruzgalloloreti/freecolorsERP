import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/freecolors-logo') ||
    PUBLIC_FILE.test(pathname)

  const hasSession = Boolean(request.cookies.get('access_token')?.value)

  if (!hasSession && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && pathname === '/login') {
    const appUrl = request.nextUrl.clone()
    appUrl.pathname = '/ventas'
    appUrl.search = ''
    return NextResponse.redirect(appUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api).*)'],
}

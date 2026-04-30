import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/host') && pathname !== '/host/login') {
    const auth = request.cookies.get('host-auth')
    if (auth?.value !== 'true') {
      return NextResponse.redirect(new URL('/host/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/host/:path*',
}

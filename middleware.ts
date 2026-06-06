import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        if (
          path.startsWith('/api/track') ||
          path.startsWith('/api/webhooks') ||
          path.startsWith('/api/cron') ||
          path.startsWith('/api/auth')
        ) {
          return true
        }

        if (path === '/login') {
          return true
        }

        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leads/:path*',
    '/templates/:path*',
    '/email-logs/:path*',
    '/analytics/:path*',
    '/settings/:path*',
    '/api/((?!track|webhooks|cron|auth).*)',
  ],
}

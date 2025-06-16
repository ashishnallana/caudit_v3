import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    try {
        const res = NextResponse.next()
        const supabase = createMiddlewareClient({ req, res })

        // Refresh session if expired - required for Server Components
        const { data: { session } } = await supabase.auth.getSession()

        return res
    } catch (error) {
        // If there's an error, still return the response to prevent the app from breaking
        return NextResponse.next()
    }
}

// Specify which routes should be handled by the middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    ],
} 
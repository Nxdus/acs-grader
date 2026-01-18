import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './lib/auth';
import { headers } from 'next/headers';

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const { pathname } = request.nextUrl
    const ALLOW_PATHS = ["/sign-in", "/sign-up", "/api", "/_next", "/favicon.ico", "/images"]

    const isAllowed = ALLOW_PATHS.some(path =>
        pathname === path || pathname.startsWith(path + "/")
    )

    if (isAllowed) {
        return NextResponse.next()
    }

    if (session && (pathname === '/sign-in' || pathname === '/sign-up')) {
        return NextResponse.redirect(new URL('/', request.url))
    }


    if (!session) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
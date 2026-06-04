import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './lib/auth';

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const { pathname } = request.nextUrl
    const ALLOW_PATHS = ["/", "/sign-in", "/sign-up", "/api", "/_next", "/favicon.ico", "/images", "/models"]

    const isAllowed = ALLOW_PATHS.some(path =>
        pathname === path || pathname.startsWith(path + "/")
    )

    if (session && (pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up")) {
        return NextResponse.redirect(new URL("/problems", request.url))
    }

    if (isAllowed) {
        return NextResponse.next()
    }

    if (!session) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

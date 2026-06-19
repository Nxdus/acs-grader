import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './lib/auth';

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const { pathname } = request.nextUrl
    const role = session?.user?.role
    const isStaff = role === "STAFF" || role === "ADMIN"
    const isAdmin = role === "ADMIN"

    if (pathname.startsWith("/api/manage") || pathname.startsWith("/manage/problems") || pathname.startsWith("/manage/contests")) {
        if (!session) {
            return pathname.startsWith("/api/")
                ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
                : NextResponse.redirect(new URL("/", request.url))
        }
        if (!isStaff) {
            return pathname.startsWith("/api/")
                ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
                : NextResponse.redirect(new URL("/problems", request.url))
        }
    }

    if (pathname.startsWith("/api/users") || pathname.startsWith("/manage/users")) {
        if (!session) {
            return pathname.startsWith("/api/")
                ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
                : NextResponse.redirect(new URL("/", request.url))
        }
        if (!isAdmin) {
            return pathname.startsWith("/api/")
                ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
                : NextResponse.redirect(new URL("/problems", request.url))
        }
    }

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

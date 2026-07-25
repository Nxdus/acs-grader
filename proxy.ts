import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './lib/auth';
import { getLetsGoEnabled, setLetsGoEnabled } from './lib/lets-go-access';

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const { pathname } = request.nextUrl
    const role = session?.user?.role
    const isStaff = role === "STAFF" || role === "ADMIN"
    const isAdmin = role === "ADMIN"

    if (pathname === "/api/lets-go") {
        if (request.method === "GET") {
            return NextResponse.json({ enabled: getLetsGoEnabled() })
        }

        if (request.method === "PATCH") {
            if (!session) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            }
            if (!isAdmin) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 })
            }

            const body = await request.json().catch(() => null)
            if (typeof body?.enabled !== "boolean") {
                return NextResponse.json(
                    { error: "Enabled must be a boolean." },
                    { status: 400 },
                )
            }

            return NextResponse.json({
                enabled: setLetsGoEnabled(body.enabled),
            })
        }

        return NextResponse.json(
            { error: "Method not allowed" },
            { status: 405 },
        )
    }

    if (!getLetsGoEnabled()) {
        const DISABLED_ACCESS_PATHS = [
            "/",
            "/sign-in",
            "/sign-up",
            "/manage/users",
            "/api/auth",
            "/api/lets-go",
            "/api/users",
            "/_next",
            "/favicon.ico",
            "/images",
            "/models",
        ]
        const isDisabledAccessPath = DISABLED_ACCESS_PATHS.some(path =>
            pathname === path || pathname.startsWith(path + "/")
        )

        if (!isDisabledAccessPath) {
            return pathname.startsWith("/api/")
                ? NextResponse.json(
                    { error: "Let's Go access is currently disabled." },
                    { status: 403 },
                )
                : NextResponse.redirect(new URL("/", request.url))
        }
    }

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

    if (session && (pathname === "/sign-in" || pathname === "/sign-up")) {
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

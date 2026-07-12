import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "nm_session";

async function getSessionRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET!));
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Expose the pathname to server components (used for maintenance mode).
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);

  const needsAuth =
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard") || pathname.startsWith("/sell");

  if (needsAuth) {
    const role = await getSessionRole(req);
    if (!role) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && role !== "ADMIN" && role !== "MODERATOR") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Only administrators may create listings.
    if (pathname.startsWith("/sell") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|api/placeholder).*)"],
};

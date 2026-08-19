import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getSessionTokenFromCookieHeader,
  verifySessionTokenEdge,
} from "@/lib/auth-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/siteping") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionToken = getSessionTokenFromCookieHeader(
    request.headers.get("cookie"),
  );
  const authenticated = await verifySessionTokenEdge(
    sessionToken,
    process.env.SITEPING_SESSION_SECRET,
  );

  if (!authenticated) {
    if (pathname.startsWith("/api/internal")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/internal/:path*"],
};

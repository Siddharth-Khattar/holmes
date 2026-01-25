// ABOUTME: Edge middleware for route protection
// ABOUTME: Checks session cookie existence before allowing access to protected routes

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Protected app routes - redirect to landing if not authenticated
  if (pathname.startsWith("/cases")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname === "/login") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/cases", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cases/:path*", "/login"],
};

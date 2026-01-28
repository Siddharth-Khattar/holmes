// ABOUTME: Edge middleware for route protection
// ABOUTME: Checks session cookie existence before allowing access to protected routes

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");

  console.log("🔒 [MIDDLEWARE] Request received", {
    pathname,
    hasSessionCookie: !!sessionCookie,
    timestamp: new Date().toISOString(),
  });

  // Protected app routes - redirect to login if not authenticated
  if (pathname.startsWith("/cases")) {
    if (!sessionCookie) {
      console.log("🚫 [MIDDLEWARE] No session cookie for /cases, redirecting to /login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.log("✅ [MIDDLEWARE] Session cookie present for /cases, allowing access (will be validated by layout)");
  }

  // For login page, just let it through - don't redirect based on cookie presence
  // The app layout will handle invalid sessions properly
  if (pathname === "/login") {
    console.log("✅ [MIDDLEWARE] Allowing access to /login");
  }

  console.log("✅ [MIDDLEWARE] Request allowed to proceed to", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ["/cases/:path*", "/login"],
};

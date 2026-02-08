// ABOUTME: Edge middleware for route protection and mobile detection
// ABOUTME: Checks session cookie existence before allowing access to protected routes
// ABOUTME: Redirects mobile users to Sherlock's Diary (notebook) by default for case views

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Common mobile user agent patterns
const MOBILE_UA_PATTERNS = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Mobile/i,
];

function isMobileDevice(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return MOBILE_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent");

  // Get the session cookie - check both secure and non-secure names.
  // When useSecureCookies is true (production HTTPS), Better Auth prefixes
  // cookie names with "__Secure-". We check both to handle all environments.
  const sessionCookie =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token");

  console.log("🔒 [MIDDLEWARE] Request received", {
    pathname,
    hasSessionCookie: !!sessionCookie,
    isMobile: isMobileDevice(userAgent),
    timestamp: new Date().toISOString(),
  });

  // Protected app routes - redirect to login if not authenticated
  if (pathname.startsWith("/cases")) {
    if (!sessionCookie) {
      console.log(
        "🚫 [MIDDLEWARE] No session cookie for /cases, redirecting to /login",
      );
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Mobile device detection: Redirect to notebook view for case pages
    // Only redirect if:
    // 1. User is on a mobile device
    // 2. They're accessing a specific case URL (has case ID)
    // 3. They're NOT already on the notebook page
    // 4. They haven't explicitly chosen to view full site (cookie check)
    const caseIdMatch = pathname.match(/^\/cases\/([^\/]+)(?:\/([^\/]+))?/);
    if (caseIdMatch) {
      const caseId = caseIdMatch[1];
      const subPage = caseIdMatch[2];

      // Check if user has opted out of mobile view
      const preferFullSite = request.cookies.get("prefer-full-site")?.value === "true";

      // Redirect mobile users to notebook if they're at the case root or command-center
      // and they haven't opted out of mobile view
      if (
        isMobileDevice(userAgent) &&
        !preferFullSite &&
        (!subPage || subPage === "command-center")
      ) {
        console.log("📱 [MIDDLEWARE] Mobile device detected, redirecting to notebook");
        return NextResponse.redirect(
          new URL(`/cases/${caseId}/notebook`, request.url)
        );
      }
    }

    console.log(
      "✅ [MIDDLEWARE] Session cookie present for /cases, allowing access (will be validated by layout)",
    );
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


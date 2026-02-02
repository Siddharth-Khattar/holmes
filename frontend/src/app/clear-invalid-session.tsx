// ABOUTME: Client component that detects and clears stale session cookies.
// ABOUTME: Only rendered in app layout (protected routes) to avoid auth page interference.

"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * Clears invalid session cookies on protected routes.
 *
 * This handles the edge case where a session cookie exists but the database
 * session is gone (expired, revoked, DB reset). The server-side layout already
 * redirects to /login, but this component proactively clears the stale cookie
 * for a cleaner UX.
 *
 * NOTE: Only render this in the (app) layout, not root layout, to avoid
 * interfering with login/signup flows.
 */
export function ClearInvalidSession() {
  const { data: session, isPending, error } = useSession();

  useEffect(() => {
    // Wait for session check to complete
    if (isPending) return;

    // If session check errored, don't clear - could be a temporary network issue
    // The server-side layout will handle the redirect if truly invalid
    if (error) {
      console.log(
        "🧹 [CLEAR SESSION] Session check errored, not clearing:",
        error,
      );
      return;
    }

    // If no session but cookie exists, clear the stale cookie
    const hasCookie = document.cookie.includes("better-auth.session_token");

    if (!session && hasCookie) {
      console.log(
        "🧹 [CLEAR SESSION] Stale session cookie detected, clearing...",
      );

      // Clear all better-auth cookies
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.trim().split("=")[0];
        if (cookieName.startsWith("better-auth")) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          console.log(`🧹 [CLEAR SESSION] Cleared cookie: ${cookieName}`);
        }
      });

      console.log("✅ [CLEAR SESSION] Stale cookies cleared, reloading...");
      // Reload to trigger server-side redirect to login
      window.location.reload();
    }
  }, [session, isPending, error]);

  return null;
}

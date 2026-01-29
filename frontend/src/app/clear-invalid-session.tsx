"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * Component that clears invalid session cookies.
 * Runs on the client side to detect and clear stale/invalid sessions.
 */
export function ClearInvalidSession() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    // Wait for session check to complete
    if (isPending) return;

    // If no session but cookie exists, clear it
    const hasCookie = document.cookie.includes("better-auth.session_token");

    if (!session && hasCookie) {
      console.log(
        "🧹 [CLEAR SESSION] Invalid session cookie detected, clearing...",
      );

      // Clear all better-auth cookies
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.trim().split("=")[0];
        if (cookieName.startsWith("better-auth")) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          console.log(`🧹 [CLEAR SESSION] Cleared cookie: ${cookieName}`);
        }
      });

      console.log("✅ [CLEAR SESSION] Invalid cookies cleared, reloading...");
      // Reload to ensure clean state
      window.location.reload();
    }
  }, [session, isPending]);

  return null;
}

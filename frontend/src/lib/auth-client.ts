// ABOUTME: Better Auth client for React components with JWT support.
// ABOUTME: Provides hooks and functions for auth operations and token retrieval.

import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [jwtClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * Get the current JWT token for API calls.
 * Returns null if not authenticated.
 */
export async function getToken(): Promise<string | null> {
  try {
    // JWT client plugin adds token() method to authClient
    const result = await authClient.token();
    return result.data?.token ?? null;
  } catch {
    return null;
  }
}

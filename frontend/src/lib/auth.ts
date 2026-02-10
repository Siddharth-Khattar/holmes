// ABOUTME: Better Auth server configuration for Next.js with JWT plugin.
// ABOUTME: Handles email/password, Google OAuth, session management, and exposes JWKS endpoint.

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

// Determine base URL with fallback chain:
// 1. BETTER_AUTH_URL (runtime, set by CI/CD after deploy)
// 2. NEXT_PUBLIC_APP_URL (build-time, baked into the bundle)
// 3. localhost for local development
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const isProduction = baseURL.startsWith("https://");

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET!,

  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "credential"],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days (no timeout per CONTEXT.md)
    updateAge: 60 * 60 * 24, // Refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache to reduce DB hits
    },
  },

  // Production cookie and security settings
  advanced: {
    // Force secure cookies in production (Cloud Run is always HTTPS)
    useSecureCookies: isProduction,
  },

  // Trust only the configured baseURL and localhost for development.
  // Use Set to deduplicate in case baseURL is localhost.
  trustedOrigins: [...new Set(["http://localhost:3000", baseURL])],

  plugins: [
    jwt(), // Exposes /api/auth/jwks and /api/auth/token endpoints
    nextCookies(), // Must be last - enables cookie setting in server actions
  ],
});

export type Session = typeof auth.$Infer.Session;

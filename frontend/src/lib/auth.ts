// ABOUTME: Better Auth server configuration for Next.js with JWT plugin.
// ABOUTME: Handles email/password, Google OAuth, session management, and exposes JWKS endpoint.

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
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

  plugins: [
    jwt(), // Exposes /api/auth/jwks and /api/auth/token endpoints
    nextCookies(), // Must be last - enables cookie setting in server actions
  ],
});

export type Session = typeof auth.$Infer.Session;

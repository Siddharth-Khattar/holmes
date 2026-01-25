// ABOUTME: Better Auth API route handler
// ABOUTME: Catches all /api/auth/* requests including /api/auth/jwks

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);

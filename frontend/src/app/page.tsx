// ABOUTME: Home page component for Holmes application
// ABOUTME: Landing page with branding and auth placeholders

import type { HealthResponse } from "@holmes/types";

// Type import verification - this demonstrates the @holmes/types workspace link works
const _typeCheck: HealthResponse = {
  status: "healthy",
  timestamp: new Date().toISOString(),
};
void _typeCheck;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-8 px-4 text-center">
        {/* Logo/Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Holmes
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            AI-Powered Legal Intelligence
          </p>
        </div>

        {/* Description */}
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Transform complex legal cases into actionable insights with
          intelligent evidence analysis and knowledge synthesis.
        </p>

        {/* Auth placeholder - to be implemented in Phase 2 */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            disabled
          >
            Sign In
          </button>
          <button
            className="rounded-lg border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            disabled
          >
            Create Account
          </button>
        </div>

        {/* Phase indicator */}
        <p className="mt-8 text-sm text-zinc-400 dark:text-zinc-600">
          Authentication coming in Phase 2
        </p>
      </main>
    </div>
  );
}

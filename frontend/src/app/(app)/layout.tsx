// ABOUTME: App layout for authenticated users
// ABOUTME: Validates session server-side and renders sidebar navigation

export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/app/sidebar";
import { DetailSidebar } from "@/components/app/detail-sidebar";
import { AuthListener } from "@/components/app/auth-listener";
import { ClearInvalidSession } from "@/app/clear-invalid-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authenticated routes must never be statically rendered or cached.
  // This prevents stale auth state (e.g. after logout) from leaving the UI stuck.
  noStore();

  console.log("🏠 [APP LAYOUT] Checking session...");

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  console.log("🏠 [APP LAYOUT] Session check result", {
    hasSession: !!session,
    sessionUser: session?.user,
    timestamp: new Date().toISOString(),
  });

  // Double-check auth (middleware is first line, this is defense-in-depth)
  if (!session) {
    console.log(
      "🚫 [APP LAYOUT] No valid session found, redirecting to /login (not /)",
    );
    redirect("/login");
  }

  console.log("✅ [APP LAYOUT] Session valid, rendering app");

  // Normalize user object to match component prop types
  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  console.log("👤 [APP LAYOUT] User data", user);

  return (
    <div
      className="theme-scope flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      <Sidebar user={user} />
      <main
        className="relative flex-1 min-w-0 overflow-y-auto bg-canvas text-foreground"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            },
          }}
        />
        <AuthListener />
        <ClearInvalidSession />
        {children}
      </main>
      <DetailSidebar />
    </div>
  );
}

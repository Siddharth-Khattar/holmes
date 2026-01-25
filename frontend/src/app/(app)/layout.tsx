// ABOUTME: App layout for authenticated users
// ABOUTME: Validates session server-side and renders sidebar shell

export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/app/sidebar";
import { AuthListener } from "@/components/app/auth-listener";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authenticated routes must never be statically rendered or cached.
  // This prevents stale auth state (e.g. after logout) from leaving the UI stuck.
  noStore();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Double-check auth (middleware is first line, this is defense-in-depth)
  if (!session) {
    redirect("/");
  }

  // Normalize user object to match component prop types
  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return (
    <div className="flex min-h-screen bg-charcoal">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--color-jet)",
              color: "var(--color-smoke)",
              border: "1px solid rgba(248, 247, 244, 0.1)",
            },
          }}
        />
        <AuthListener />
        {children}
      </main>
    </div>
  );
}

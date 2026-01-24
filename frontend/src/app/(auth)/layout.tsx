// ABOUTME: Layout for authentication pages (login/signup)
// ABOUTME: Centered, minimal, no sidebar - separate from app shell

import { Toaster } from "sonner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-jet)",
            color: "var(--color-smoke)",
            border: "1px solid rgba(248, 247, 244, 0.1)",
          },
        }}
      />
      {children}
    </div>
  );
}

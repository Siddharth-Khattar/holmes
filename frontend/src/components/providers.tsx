// ABOUTME: Root providers wrapper for client-side context providers
// ABOUTME: Wraps next-themes ThemeProvider with production-grade configuration

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="holmes-theme"
    >
      {children}
    </NextThemesProvider>
  );
}

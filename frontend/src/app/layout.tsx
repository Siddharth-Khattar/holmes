// ABOUTME: Root layout component for Holmes application
// ABOUTME: Sets up global fonts, metadata, and base styling

import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Holmes | AI-Powered Legal Intelligence",
  description:
    "Deduce. Discover. Decide. Transform complex legal cases into actionable insights with intelligent evidence analysis and knowledge synthesis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body className="font-serif bg-charcoal text-smoke antialiased">
        {children}
      </body>
    </html>
  );
}

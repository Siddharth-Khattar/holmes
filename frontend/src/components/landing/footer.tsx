// ABOUTME: Minimal footer with logo, navigation links, legal links, and copyright.
// ABOUTME: Dark background, serves as the final element of the landing page.

"use client";

import { useCallback } from "react";

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
];

const LEGAL_LINKS = [
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms of Service" },
];

/**
 * Minimal footer component for the landing page.
 * Contains logo, navigation, legal links, and copyright.
 */
export function Footer() {
  // Smooth scroll handler for anchor links
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      if (href === "#") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const targetId = href.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  return (
    <footer className="border-t border-smoke/10 bg-jet/50">
      <div className="mx-auto w-full px-6 py-12 sm:px-10 lg:px-16">
        {/* Main footer content - Grid for true centering */}
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
          {/* Logo - Left aligned */}
          <a
            href="#"
            onClick={(e) => handleNavClick(e, "#")}
            className="justify-self-center font-serif text-xl font-medium tracking-tight text-taupe transition-colors hover:text-smoke md:justify-self-start"
          >
            Holmes
          </a>

          {/* Navigation Links - True center */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-base text-smoke/60 transition-colors hover:text-smoke"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Legal Links - Right aligned */}
          <div className="flex items-center justify-center gap-6 md:justify-end">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-base text-smoke/40 transition-colors hover:text-smoke/60"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-smoke/10 pt-6 text-center">
          <p className="text-base text-smoke/40">
            &copy; 2025 Holmes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

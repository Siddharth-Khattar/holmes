// ABOUTME: Minimal footer with logo, navigation links, legal links, and copyright.
// ABOUTME: Dark background, serves as the final element of the landing page.

"use client";

import { useCallback } from "react";

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
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
            className="justify-self-center font-serif text-xl font-medium tracking-tight text-accent transition-colors hover:text-smoke md:justify-self-start"
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

          {/* Hackathon attribution - Right aligned */}
          <div className="flex items-center justify-center gap-1.5 text-sm text-smoke/40 md:justify-end">
            <span>Built with</span>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            <span>for Gemini 3 Hackathon 2026</span>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-smoke/10 pt-6 text-center">
          <p className="text-base text-smoke/40">
            &copy; 2026 Holmes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

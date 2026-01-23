// ABOUTME: Fixed navigation bar with Liquid Glass styling for the landing page.
// ABOUTME: Features scroll-triggered opacity enhancement and responsive mobile layout.

"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/**
 * Fixed navigation bar with glass morphism effect.
 * Glass opacity increases after scrolling past the hero section.
 */
export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Transform glass opacity based on scroll position
  // Starts transparent, becomes glass-nav after ~100px scroll
  const backgroundOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const navLinks = [
    { href: "#platform", label: "Platform" },
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
  ];

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Glass background layer with dynamic opacity */}
      <motion.div
        className="glass-nav absolute inset-0 -z-10"
        style={{ opacity: backgroundOpacity }}
      />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a
          href="#"
          className="font-serif text-2xl font-bold tracking-tight text-taupe transition-colors hover:text-smoke"
        >
          Holmes
        </a>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-smoke/80 transition-colors hover:text-taupe"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke"
          >
            Login
          </button>
          <button
            type="button"
            className="rounded-lg bg-taupe px-4 py-2 text-sm font-medium text-charcoal transition-all hover:brightness-110"
          >
            Get Started
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <motion.div
          className="glass-nav border-t border-smoke/10 md:hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke"
              >
                Login
              </button>
              <button
                type="button"
                className="rounded-lg bg-taupe px-3 py-2 text-sm font-medium text-charcoal transition-all hover:brightness-110"
              >
                Get Started
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}

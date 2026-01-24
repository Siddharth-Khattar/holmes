// ABOUTME: Fixed navigation bar with Liquid Glass effect for the landing page.
// ABOUTME: Features layered glass (blur, overlay, specular) with scroll-triggered opacity.

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";

/**
 * Fixed navigation bar with Liquid Glass effect.
 *
 * Uses layered glass structure (filter → overlay → specular → content)
 * for Apple-inspired depth. Glass opacity increases on scroll.
 */
export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Transform glass opacity based on scroll position
  // Starts visible (0.7), becomes fully opaque after ~100px scroll
  const backgroundOpacity = useTransform(scrollY, [0, 100], [0.7, 1]);

  // Letter-by-letter animation for "Holmes" - H fades first, then o, l, m, e, s
  // Each letter slides left into the logo as it fades
  const letter0Opacity = useTransform(scrollY, [50, 170], [1, 0]); // H - first to fade
  const letter0X = useTransform(scrollY, [50, 170], [0, -24]);
  const letter1Opacity = useTransform(scrollY, [80, 200], [1, 0]); // o
  const letter1X = useTransform(scrollY, [80, 200], [0, -24]);
  const letter2Opacity = useTransform(scrollY, [110, 230], [1, 0]); // l
  const letter2X = useTransform(scrollY, [110, 230], [0, -24]);
  const letter3Opacity = useTransform(scrollY, [140, 260], [1, 0]); // m
  const letter3X = useTransform(scrollY, [140, 260], [0, -24]);
  const letter4Opacity = useTransform(scrollY, [170, 290], [1, 0]); // e
  const letter4X = useTransform(scrollY, [170, 290], [0, -24]);
  const letter5Opacity = useTransform(scrollY, [200, 320], [1, 0]); // s - last to fade
  const letter5X = useTransform(scrollY, [200, 320], [0, -24]);

  const letterTransforms = [
    { opacity: letter0Opacity, x: letter0X },
    { opacity: letter1Opacity, x: letter1X },
    { opacity: letter2Opacity, x: letter2X },
    { opacity: letter3Opacity, x: letter3X },
    { opacity: letter4Opacity, x: letter4X },
    { opacity: letter5Opacity, x: letter5X },
  ];

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Smooth scroll handler for anchor links
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      const targetId = href.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setMobileMenuOpen(false);
    },
    [],
  );

  const navLinks = [
    { href: "#platform", label: "Platform" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#features", label: "Features" },
  ];

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Liquid Glass background layers with dynamic opacity */}
      <motion.div
        className="liquid-glass-nav absolute inset-0 -z-10"
        style={{ opacity: backgroundOpacity }}
      >
        <div className="liquid-glass-filter" />
        <div className="liquid-glass-overlay" />
        <div className="liquid-glass-specular" />
      </motion.div>

      <div className="mx-auto grid h-18 w-full grid-cols-[auto_1fr_auto] items-center px-6 sm:px-10 lg:px-16 md:grid-cols-3">
        {/* Logo with icon and animated text */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center justify-self-start transition-colors hover:opacity-80"
        >
          <Image
            src="/logo.png"
            alt="Holmes logo"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
          />
          <span className="ml-2 flex whitespace-nowrap font-serif text-3xl font-medium tracking-tight text-accent">
            {"Holmes".split("").map((letter, index) => (
              <motion.span
                key={index}
                style={{
                  opacity: letterTransforms[index].opacity,
                  x: letterTransforms[index].x,
                  display: "inline-block",
                }}
              >
                {letter}
              </motion.span>
            ))}
          </span>
        </a>

        {/* Desktop Navigation Links - Sans-serif, centered */}
        <nav className="hidden items-center justify-center gap-10 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-base font-medium text-smoke/80 transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA Buttons */}
        <div className="hidden items-center justify-end gap-4 md:flex">
          <button
            type="button"
            className="cursor-pointer rounded-lg px-5 py-2.5 text-base font-medium text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke"
          >
            Login
          </button>
          <button
            type="button"
            className="liquid-glass-button px-5 py-2.5 text-base font-medium text-smoke"
          >
            Get Started
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="justify-self-end flex h-10 w-10 items-center justify-center rounded-lg text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke md:hidden"
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
          className="liquid-glass border-t border-smoke/10 md:hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="liquid-glass-filter" />
          <div className="liquid-glass-overlay" />
          <div className="liquid-glass-specular" />
          <div className="liquid-glass-content space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="block rounded-lg px-3 py-2 text-base font-medium text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                className="cursor-pointer rounded-lg px-3 py-2 text-base font-medium text-smoke/80 transition-colors hover:bg-glass-light hover:text-smoke"
              >
                Login
              </button>
              <button
                type="button"
                className="liquid-glass-button px-3 py-2 text-base font-medium text-smoke"
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

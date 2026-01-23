// ABOUTME: Minimal footer with logo, navigation links, legal links, and copyright.
// ABOUTME: Dark background, serves as the final element of the landing page.

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
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
  return (
    <footer className="border-t border-smoke/10 bg-jet/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Logo */}
          <a
            href="#"
            className="font-serif text-xl font-bold tracking-tight text-taupe transition-colors hover:text-smoke"
          >
            Holmes
          </a>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-smoke/60 transition-colors hover:text-smoke"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Legal Links */}
          <div className="flex items-center gap-6">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-smoke/40 transition-colors hover:text-smoke/60"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-smoke/10 pt-6 text-center">
          <p className="text-sm text-smoke/40">
            &copy; 2026 Holmes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

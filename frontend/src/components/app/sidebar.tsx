// ABOUTME: Collapsible sidebar navigation for authenticated app shell
// ABOUTME: Manual toggle control for expand/collapse with production-grade state management

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { UserMenu } from "./user-menu";
import { ThemedLogo } from "./themed-logo";
import { CaseNavSection } from "./case-nav-section";

interface SidebarProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

const navItems = [
  { href: "/cases", label: "Cases", icon: Briefcase },
  // Future items can be added here
];

export function Sidebar({ user }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "flex flex-col min-h-screen sticky top-0 self-start",
        "transition-[width] duration-200 ease-out",
        isExpanded ? "w-56" : "w-16",
      )}
      style={{
        backgroundColor: "var(--card)",
        borderRight: "1px solid var(--border)",
        zIndex: 1000,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-16 px-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link
          href="/cases"
          className="flex items-center gap-3 transition-colors"
          style={{ color: "var(--foreground)" }}
        >
          <ThemedLogo
            width={32}
            height={32}
            priority
            className="w-8 h-8 shrink-0"
          />
          {isExpanded && (
            <span className="font-serif text-lg font-medium tracking-tight whitespace-nowrap overflow-hidden">
              Holmes
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  data-active={isActive}
                  data-tooltip={!isExpanded ? item.label : undefined}
                  className={clsx(
                    "sidebar-nav-link flex items-center gap-3 px-3 py-2 rounded-lg",
                    "transition-colors duration-150",
                    !isExpanded && "tooltip-trigger",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {isExpanded && (
                    <span className="text-sm whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Case-specific navigation */}
        <CaseNavSection collapsed={!isExpanded} />
      </nav>

      {/* Toggle button */}
      <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          data-tooltip={!isExpanded ? "Expand sidebar" : undefined}
          className={clsx(
            "sidebar-toggle w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "transition-colors duration-150",
            isExpanded ? "justify-start" : "justify-center tooltip-trigger",
          )}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="text-sm whitespace-nowrap overflow-hidden">
                Collapse
              </span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5 shrink-0" />
          )}
        </button>
      </div>

      {/* User Menu at bottom */}
      <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
        <UserMenu user={user} collapsed={!isExpanded} />
      </div>

      <style jsx global>{`
        .sidebar-nav-link {
          background-color: transparent;
          color: var(--muted-foreground);
          font-weight: 400;
          position: relative;
        }

        .sidebar-nav-link[data-active="true"] {
          background-color: var(--muted);
          color: var(--foreground);
          font-weight: 600;
        }

        .sidebar-nav-link[data-active="false"]:hover {
          background-color: color-mix(in srgb, var(--muted) 50%, transparent);
          color: var(--foreground);
        }

        /* Tooltip styles */
        .tooltip-trigger[data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 12px;
          padding: 6px 12px;
          background-color: var(--popover);
          color: var(--popover-foreground);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms ease-out;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .tooltip-trigger[data-tooltip]:hover::after {
          opacity: 1;
          transition-delay: 0ms;
        }

        /* Tooltip arrow */
        .tooltip-trigger[data-tooltip]::before {
          content: "";
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 6px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 5px 6px 5px 0;
          border-color: transparent var(--border) transparent transparent;
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms ease-out;
          z-index: 9999;
        }

        .tooltip-trigger[data-tooltip]:hover::before {
          opacity: 1;
          transition-delay: 0ms;
        }

        .sidebar-toggle {
          background-color: transparent;
          color: var(--muted-foreground);
          position: relative;
        }

        .sidebar-toggle:hover {
          background-color: color-mix(in srgb, var(--muted) 50%, transparent);
        }
      `}</style>
    </aside>
  );
}

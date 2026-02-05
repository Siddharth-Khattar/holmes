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
                  className={clsx(
                    "sidebar-nav-link flex items-center gap-3 px-3 py-2 rounded-lg",
                    "transition-colors duration-150",
                  )}
                  title={!isExpanded ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
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
          className={clsx(
            "sidebar-toggle w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "transition-colors duration-150",
            isExpanded ? "justify-start" : "justify-center",
          )}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
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

        .sidebar-toggle {
          background-color: transparent;
          color: var(--muted-foreground);
        }

        .sidebar-toggle:hover {
          background-color: color-mix(in srgb, var(--muted) 50%, transparent);
        }
      `}</style>
    </aside>
  );
}

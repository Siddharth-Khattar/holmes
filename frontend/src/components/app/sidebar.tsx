// ABOUTME: Collapsible sidebar navigation for authenticated app shell
// ABOUTME: Minimized by default (~64px), expands on hover (~240px) like Linear/Notion

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
            // Only mark as active if on exact path or direct children (not nested like /cases/[id])
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg",
                    "transition-colors duration-150",
                  )}
                  style={{
                    backgroundColor: isActive ? "var(--muted)" : "transparent",
                    color: isActive
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "var(--muted)";
                      e.currentTarget.style.opacity = "0.5";
                      e.currentTarget.style.color = "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }
                  }}
                  title={!isExpanded ? item.label : undefined}
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
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "transition-colors duration-150",
            isExpanded ? "justify-start" : "justify-center",
          )}
          style={{
            color: "var(--muted-foreground)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--muted)";
            e.currentTarget.style.opacity = "0.5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.opacity = "1";
          }}
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
    </aside>
  );
}

// ABOUTME: Collapsible sidebar navigation for authenticated app shell
// ABOUTME: Minimized by default (~64px), expands on hover (~240px) like Linear/Notion

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase } from "lucide-react";
import { clsx } from "clsx";
import { UserMenu } from "./user-menu";
import { ThemedLogo } from "./themed-logo";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={clsx(
        "flex flex-col min-h-screen sticky top-0 self-start",
        "transition-[width] duration-200 ease-out",
        isExpanded ? "w-60" : "w-16",
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
            <span className="font-serif text-lg font-medium tracking-tight">
              Holmes
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                  }}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {isExpanded && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Menu at bottom */}
      <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
        <UserMenu user={user} collapsed={!isExpanded} />
      </div>
    </aside>
  );
}

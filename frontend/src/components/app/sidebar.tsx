// ABOUTME: Collapsible sidebar navigation for authenticated app shell
// ABOUTME: Minimized by default (~64px), expands on hover (~240px) like Linear/Notion

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Search } from "lucide-react";
import { clsx } from "clsx";
import { UserMenu } from "./user-menu";

interface SidebarProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
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
        "flex flex-col h-screen bg-jet",
        "border-r border-smoke/10",
        "transition-[width] duration-200 ease-out",
        isExpanded ? "w-60" : "w-16",
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-smoke/10">
        <Link
          href="/cases"
          className={clsx(
            "flex items-center gap-3",
            "text-smoke hover:text-accent transition-colors",
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-smoke/10 flex items-center justify-center flex-shrink-0">
            <Search className="w-4 h-4" />
          </div>
          {isExpanded && (
            <span className="text-lg font-semibold tracking-tight">Holmes</span>
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
                    isActive
                      ? "bg-smoke/10 text-smoke"
                      : "text-stone hover:text-smoke hover:bg-smoke/5",
                  )}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Menu at bottom */}
      <div className="p-2 border-t border-smoke/10">
        <UserMenu user={user} collapsed={!isExpanded} />
      </div>
    </aside>
  );
}

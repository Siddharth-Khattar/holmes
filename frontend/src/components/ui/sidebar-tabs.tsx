// ABOUTME: Vertical tab navigation component optimized for sidebar display
// ABOUTME: Handles collapsed/expanded states with icon-only and icon+text layouts

"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

export interface SidebarTab {
  title: string;
  icon: LucideIcon;
  href: string; // relative path like "/command-center"
}

export interface SidebarTabsProps {
  tabs: SidebarTab[];
  activeTab: string; // current pathname segment
  basePath: string; // e.g., "/cases/123"
  collapsed: boolean;
}

export function SidebarTabs({
  tabs,
  activeTab,
  basePath,
  collapsed,
}: SidebarTabsProps) {
  const router = useRouter();

  const handleTabClick = (href: string) => {
    router.push(`${basePath}${href}`);
  };

  return (
    <div className="space-y-3 mt-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.href;

        return (
          <button
            key={tab.href}
            onClick={() => handleTabClick(tab.href)}
            className={clsx(
              "sidebar-tab w-full flex items-center gap-3 px-3 py-2 rounded-lg",
              "transition-colors duration-150",
              collapsed ? "justify-center" : "justify-start",
              isActive ? "sidebar-tab-active" : "sidebar-tab-inactive",
            )}
            title={collapsed ? tab.title : undefined}
            aria-label={tab.title}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="text-sm whitespace-nowrap overflow-hidden">
                {tab.title}
              </span>
            )}
          </button>
        );
      })}
      <style jsx>{`
        .sidebar-tab-active {
          background-color: var(--muted);
          color: var(--foreground);
          font-weight: 600;
        }

        .sidebar-tab-inactive {
          background-color: transparent;
          color: var(--muted-foreground);
          font-weight: 400;
        }

        .sidebar-tab-inactive:hover {
          background-color: var(--muted);
          opacity: 0.5;
          color: var(--foreground);
        }
      `}</style>
    </div>
  );
}

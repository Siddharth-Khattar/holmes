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
    <div className="space-y-1 mt-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.href;

        return (
          <button
            key={tab.href}
            onClick={() => handleTabClick(tab.href)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
              "transition-all duration-150",
              collapsed ? "justify-center" : "justify-start",
            )}
            style={{
              backgroundColor: isActive ? "var(--muted)" : "transparent",
              color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
              fontWeight: isActive ? 600 : 400,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "var(--muted)";
                e.currentTarget.style.opacity = "0.5";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.opacity = "1";
              }
            }}
            title={collapsed ? tab.title : undefined}
            aria-label={tab.title}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm">{tab.title}</span>}
          </button>
        );
      })}
    </div>
  );
}

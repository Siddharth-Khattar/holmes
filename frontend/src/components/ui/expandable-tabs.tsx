"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  href: string;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
  href?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  activeTab?: string;
  onTabChange?: (href: string) => void;
}

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  activeTab,
  onTabChange,
}: ExpandableTabsProps) {
  // Debug: log activeTab to verify what's being passed
  React.useEffect(() => {
    console.log("ExpandableTabs - activeTab:", activeTab);
    console.log(
      "ExpandableTabs - tabs:",
      tabs.map((t) => (t.type !== "separator" ? t.href : "separator")),
    );
  }, [activeTab, tabs]);

  const handleSelect = (href: string) => {
    onTabChange?.(href);
  };

  const Separator = () => (
    <div className="mx-1 h-[24px] w-[1.2px] bg-border" aria-hidden="true" />
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border bg-background/80 backdrop-blur-xl p-1 shadow-lg",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isActive = activeTab === tab.href;

        // Debug each tab
        console.log(
          `Tab: ${tab.title}, href: ${tab.href}, activeTab: ${activeTab}, isActive: ${isActive}`,
        );

        return (
          <motion.button
            key={tab.title}
            onClick={() => handleSelect(tab.href)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300",
              isActive
                ? cn(
                    "bg-gradient-to-br from-white/25 to-white/10 dark:from-white/15 dark:to-white/5",
                    "shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.4),0_2px_4px_0_rgba(0,0,0,0.15)] dark:shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(0,0,0,0.4)]",
                    "backdrop-blur-sm border border-white/30 dark:border-white/15",
                    "text-foreground font-semibold",
                  )
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon size={20} />
            <span>{tab.title}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

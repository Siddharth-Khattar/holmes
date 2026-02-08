// ABOUTME: Toggle component for switching between mobile and full site views.
// ABOUTME: Sets a cookie to persist user preference for viewing the full desktop site.

"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { clsx } from "clsx";

interface ViewToggleProps {
    className?: string;
    onToggle?: (preferFullSite: boolean) => void;
}

export function ViewToggle({ className, onToggle }: ViewToggleProps) {
    const [preferFullSite, setPreferFullSite] = useState(() => {
        if (typeof document !== "undefined") {
            return document.cookie.includes("prefer-full-site=true");
        }
        return false;
    });

    const handleToggle = () => {
        const newValue = !preferFullSite;
        setPreferFullSite(newValue);

        // Set cookie for 30 days
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);

        if (newValue) {
            document.cookie = `prefer-full-site=true; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
        } else {
            document.cookie = `prefer-full-site=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }

        onToggle?.(newValue);

        // Reload to apply the preference
        if (newValue) {
            // Redirect to command center (full site default)
            const currentPath = window.location.pathname;
            const caseMatch = currentPath.match(/^\/cases\/([^\/]+)/);
            if (caseMatch) {
                window.location.href = `/cases/${caseMatch[1]}/command-center`;
            }
        }
    };

    return (
        <button
            onClick={handleToggle}
            className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                "hover:bg-muted",
                className
            )}
            style={{ color: "var(--muted-foreground)" }}
        >
            <motion.div
                initial={false}
                animate={{ rotate: preferFullSite ? 0 : 180 }}
                transition={{ duration: 0.2 }}
            >
                {preferFullSite ? (
                    <Monitor className="w-4 h-4" />
                ) : (
                    <Smartphone className="w-4 h-4" />
                )}
            </motion.div>
            <span>{preferFullSite ? "Mobile View" : "Full Site"}</span>
        </button>
    );
}

// ABOUTME: User profile dropdown with avatar, name, and logout option
// ABOUTME: Uses useLogout hook for multi-tab sync and toast feedback

"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useLogout } from "@/hooks/use-logout";

interface UserMenuProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  collapsed?: boolean;
}

export function UserMenu({ user, collapsed = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout } = useLogout();
  const { resolvedTheme, setTheme } = useTheme();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const displayName = user.name || user.email.split("@")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full rounded-lg p-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--foreground)",
            }}
          >
            {initials}
          </div>
        )}

        {/* Name - only visible when expanded */}
        {!collapsed && (
          <span
            className="text-sm truncate"
            style={{ color: "var(--foreground)" }}
          >
            {displayName}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-48 rounded-lg shadow-lg py-1 z-50"
          style={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
          }}
          role="menu"
        >
          {/* Theme toggle */}
          <button
            onClick={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors duration-150"
            style={{ color: "var(--foreground)" }}
            role="menuitem"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          {/* Divider */}
          <div
            className="my-1"
            style={{ borderTop: "1px solid var(--border)" }}
          />

          {/* Logout */}
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors duration-150"
            style={{ color: "var(--foreground)" }}
            role="menuitem"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

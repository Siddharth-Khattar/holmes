// ABOUTME: Minimal topbar navigation replacing the sidebar
// ABOUTME: Logo on left links to /cases, user menu on right with theme toggle and logout

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useLogout } from "@/hooks/use-logout";
import { ThemedLogo } from "./themed-logo";

interface TopbarProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

export function Topbar({ user }: TopbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout } = useLogout();
  const { resolvedTheme, setTheme } = useTheme();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  // Close menu on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isMenuOpen]);

  const displayName = user.name || user.email.split("@")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-40 h-14 flex items-center justify-between px-6"
      style={{
        backgroundColor: "var(--background)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo - links to cases */}
      <Link
        href="/cases"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <ThemedLogo width={28} height={28} priority className="w-7 h-7" />
        <span
          className="font-serif text-xl font-medium tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Holmes
        </span>
      </Link>

      {/* User Menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="group flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-colors duration-150 hover:bg-white/8"
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
        >
          {/* Avatar */}
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: "var(--muted)",
                color: "var(--foreground)",
              }}
            >
              {initials}
            </div>
          )}
          <span
            className="text-sm group-hover:hidden"
            style={{ color: "var(--foreground)" }}
          >
            {displayName}
          </span>
          <span
            className="text-sm hidden group-hover:inline"
            style={{ color: "var(--foreground)" }}
          >
            {user.email}
          </span>
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform duration-150"
            style={{
              color: "var(--muted-foreground)",
              transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* Dropdown */}
        {isMenuOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-36 rounded-lg py-1 shadow-lg"
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
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors duration-150 hover:bg-white/8"
              style={{ color: "var(--foreground)" }}
              role="menuitem"
            >
              {resolvedTheme === "dark" ? (
                <Sun
                  className="w-4 h-4"
                  style={{ color: "var(--muted-foreground)" }}
                />
              ) : (
                <Moon
                  className="w-4 h-4"
                  style={{ color: "var(--muted-foreground)" }}
                />
              )}
              <span>
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors duration-150 hover:bg-white/8"
              style={{ color: "var(--foreground)" }}
              role="menuitem"
            >
              <LogOut
                className="w-4 h-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

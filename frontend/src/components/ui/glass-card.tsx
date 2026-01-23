// ABOUTME: GlassCard component with Liquid Glass styling and hover effects.
// ABOUTME: Uses Motion for smooth hover interactions and backdrop blur for glass effect.

"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";
import { scaleOnHover } from "@/lib/animations";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Enable hover scale effect. Defaults to true. */
  hover?: boolean;
}

/**
 * A card component with Liquid Glass styling.
 * Uses backdrop blur and subtle shadows for depth.
 *
 * @example
 * ```tsx
 * <GlassCard>
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </GlassCard>
 * ```
 */
export function GlassCard({
  children,
  className = "",
  hover = true,
}: GlassCardProps) {
  return (
    <motion.div
      className={`glass-panel rounded-2xl p-6 ${className}`}
      whileHover={hover ? scaleOnHover : undefined}
    >
      {children}
    </motion.div>
  );
}

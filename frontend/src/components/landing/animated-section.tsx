// ABOUTME: Scroll-triggered animation wrapper for landing page sections.
// ABOUTME: Wraps content to add reveal animation when section enters viewport.

"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";
import { fadeInUp } from "@/lib/animations";

type ElementType = "section" | "div" | "article";

interface AnimatedSectionProps {
  /** Content to wrap with scroll-triggered animation */
  children: ReactNode;
  /** Additional CSS classes to apply to the wrapper element */
  className?: string;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** HTML element to render as (default: section) */
  as?: ElementType;
}

/**
 * AnimatedSection wraps content with a scroll-triggered fade-in-up animation.
 *
 * Uses Motion's whileInView to trigger animation when the element
 * enters the viewport. Animation only plays once per page load.
 *
 * @example
 * ```tsx
 * <AnimatedSection delay={0.2}>
 *   <h2>Section Title</h2>
 *   <p>Section content...</p>
 * </AnimatedSection>
 * ```
 */
export function AnimatedSection({
  children,
  className,
  delay = 0,
  as = "section",
}: AnimatedSectionProps) {
  const MotionComponent = motion[as];

  // Create custom variants with delay if specified
  const variants =
    delay > 0
      ? {
          hidden: fadeInUp.hidden,
          visible: {
            ...fadeInUp.visible,
            transition: {
              ...((fadeInUp.visible as Record<string, unknown>)
                .transition as Record<string, unknown>),
              delay,
            },
          },
        }
      : fadeInUp;

  return (
    <MotionComponent
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={className}
    >
      {children}
    </MotionComponent>
  );
}

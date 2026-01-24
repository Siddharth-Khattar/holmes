// ABOUTME: Elegant section divider matching the design system aesthetic.
// ABOUTME: Creates visual separation between landing page sections.

interface SectionDividerProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * A subtle horizontal gradient line divider.
 * Fades from transparent at edges to accent color in the center.
 */
export function SectionDivider({ className = "" }: SectionDividerProps) {
  return (
    <div
      className={`h-px bg-linear-to-r from-transparent via-accent/30 to-transparent ${className}`}
    />
  );
}

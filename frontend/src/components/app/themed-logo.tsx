// ABOUTME: Theme-aware logo component that adapts to light/dark mode
// ABOUTME: Uses CSS classes for light mode filter, supports optional dark logo variant

import Image from "next/image";
import { clsx } from "clsx";

interface ThemedLogoProps {
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Priority loading for LCP optimization */
  priority?: boolean;
}

export function ThemedLogo({
  width = 32,
  height = 32,
  className = "",
  alt = "Holmes",
  priority = false,
}: ThemedLogoProps) {
  // If you have a dark logo variant, you can use next/image with different sources
  // and swap based on theme using CSS (display: none/block with .light selector)

  return (
    <Image
      src="/logo-2x.png"
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      className={clsx(
        "logo-themed transition-[filter] duration-200",
        className,
      )}
    />
  );
}

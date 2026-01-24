// ABOUTME: Static ethereal shadow background effect with noise overlay.
// ABOUTME: Creates organic shadow shapes for visual depth without animation.

import { type CSSProperties } from "react";

interface NoiseConfig {
  opacity: number;
  scale: number;
}

type SizingMode = "fill" | "stretch";

interface EtherealShadowProps {
  /** Background color of the shadow effect */
  color?: string;
  /** Noise overlay configuration */
  noise?: NoiseConfig;
  /** How the shadow mask is sized */
  sizing?: SizingMode;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EtherealShadow creates a static background with organic shadow shapes.
 * Purely decorative, zero animation overhead.
 */
export function EtherealShadow({
  sizing = "fill",
  color = "rgba(128, 128, 128, 1)",
  noise,
  style,
  className,
}: EtherealShadowProps) {
  return (
    <div
      className={className}
      style={{
        overflow: "hidden",
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {/* Shadow layer with organic mask */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: color,
          maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
          maskSize: sizing === "stretch" ? "100% 100%" : "cover",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
          WebkitMaskSize: sizing === "stretch" ? "100% 100%" : "cover",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
      />

      {/* Noise/grain overlay */}
      {noise && noise.opacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
            backgroundSize: noise.scale * 200,
            backgroundRepeat: "repeat",
            opacity: noise.opacity / 2,
          }}
        />
      )}
    </div>
  );
}

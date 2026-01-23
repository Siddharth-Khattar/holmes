// ABOUTME: Hero section for the Holmes landing page with parallax scroll effects.
// ABOUTME: Displays brand taglines, Sherlock quote, video placeholder, and primary CTA.

"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/**
 * Hero section with parallax scroll effect and brand messaging.
 *
 * Uses Motion's useScroll and useTransform for multi-layer parallax:
 * - Background moves slowest
 * - Text content moves at medium speed
 * - Content fades out as user scrolls
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  // Track scroll progress relative to section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax transforms - different speeds for depth effect
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Parallax Background Gradient */}
      <motion.div className="absolute inset-0 -z-10" style={{ y: backgroundY }}>
        <div className="h-[130%] w-full bg-gradient-to-b from-charcoal via-charcoal to-jet" />
      </motion.div>

      {/* Content Layer with Medium Parallax */}
      <motion.div
        className="relative z-10 mx-auto max-w-5xl px-4 pt-20 text-center sm:px-6 lg:px-8"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        {/* Primary Tagline */}
        <motion.h1
          className="font-serif text-5xl font-bold tracking-tight text-smoke sm:text-6xl md:text-7xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          Deduce. Discover. Decide.
        </motion.h1>

        {/* Secondary Tagline - Sherlock Quote */}
        <motion.blockquote
          className="mx-auto mt-8 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
        >
          <p className="text-lg italic text-smoke/70 sm:text-xl">
            &ldquo;When you have eliminated the impossible, whatever remains,
            however improbable, must be the truth.&rdquo;
          </p>
          <footer className="mt-3 text-sm font-medium text-taupe">
            — Sherlock Holmes
          </footer>
        </motion.blockquote>

        {/* Video Placeholder */}
        <motion.div
          className="mx-auto mt-12 max-w-3xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
        >
          <div className="glass-panel relative aspect-video overflow-hidden rounded-xl border border-smoke/10">
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-jet">
              <button
                type="button"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-taupe/90 text-charcoal transition-all hover:scale-110 hover:bg-taupe sm:h-20 sm:w-20"
                aria-label="Play demo video"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-8 w-8 translate-x-0.5 sm:h-10 sm:w-10"
                >
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              </button>
            </div>
            {/* Gradient overlay for depth */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/50 to-transparent" />
          </div>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.9 }}
        >
          <button
            type="button"
            className="rounded-lg bg-taupe px-8 py-4 text-lg font-medium text-charcoal transition-all hover:brightness-110 hover:shadow-glow-taupe"
          >
            Start Your Investigation
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <motion.div
            className="mx-auto flex h-10 w-6 items-start justify-center rounded-full border-2 border-smoke/30 p-1.5"
            animate={{ y: [0, 8, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="h-2 w-1 rounded-full bg-smoke/50" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

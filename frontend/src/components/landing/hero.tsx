// ABOUTME: Hero section for the Holmes landing page with parallax scroll effects.
// ABOUTME: Displays brand taglines, Sherlock quote, video placeholder, and primary CTA.

"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/**
 * Hero section with parallax scroll effect and brand messaging.
 *
 * Layout: Text content at top, video below with smooth scale-up on scroll.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // Track video element for scale animation - completes when video is centered
  const { scrollYProgress: videoProgress } = useScroll({
    target: videoRef,
    offset: ["start end", "center center"],
  });

  // Video scale - starts normal, enlarges to 1.4x when centered in viewport
  const videoScale = useTransform(videoProgress, [0, 1], [1, 1.4]);

  return (
    <section ref={sectionRef} className="relative">
      {/* Text content */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-52 pb-32 text-center sm:px-6 sm:pt-64 sm:pb-40 lg:px-8">
        {/* Primary Tagline */}
        <motion.h1
          className="font-serif text-6xl font-medium tracking-tight text-smoke sm:text-7xl md:text-8xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          Deduce. Discover. Decide.
        </motion.h1>

        {/* Secondary Tagline - Sherlock Quote */}
        <motion.blockquote
          className="mx-auto mt-8 max-w-2xl font-sans"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
        >
          <p className="text-xl italic text-smoke/70 sm:text-2xl leading-relaxed">
            &ldquo;When you have eliminated the impossible, whatever remains,
            however improbable, must be the truth.&rdquo;
          </p>
          <footer className="mt-4 text-base font-medium text-accent">
            — Sherlock Holmes
          </footer>
        </motion.blockquote>

        {/* Primary CTA */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.7 }}
        >
          <button
            type="button"
            className="liquid-glass-button px-8 py-4 text-lg font-medium text-smoke"
          >
            Start Your Investigation
          </button>
        </motion.div>
      </div>

      {/* Video section - normal scroll with scale animation */}
      <div className="relative z-20 flex justify-center px-4 pb-40 sm:px-6 sm:pb-52 lg:px-8">
        <motion.div
          ref={videoRef}
          className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-smoke/10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.9 }}
          style={{ scale: videoScale }}
        >
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-jet">
            <button
              type="button"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/90 text-charcoal transition-all hover:scale-110 hover:bg-accent sm:h-20 sm:w-20"
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
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-charcoal/50 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}

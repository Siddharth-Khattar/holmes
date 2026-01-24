// ABOUTME: Final call-to-action section with primary tagline and conversion button.
// ABOUTME: Serves as the last content section before the footer.

"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { GlassCard } from "@/components/ui";
import { AnimatedSection } from "./animated-section";

/**
 * CTASection serves as the final conversion point on the landing page.
 *
 * Reinforces the brand tagline and provides a prominent call-to-action
 * button. Visually distinct from other sections with liquid glass styling.
 */
export function CTASection() {
  return (
    <section className="relative py-24 sm:py-32">
      {/* Top border gradient for visual separation */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/30 to-transparent" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Liquid glass container */}
        <AnimatedSection as="div">
          <GlassCard
            hover={false}
            contentClassName="px-6 py-16 text-center sm:px-12 sm:py-20"
          >
            {/* Primary Tagline */}
            <motion.h2
              className="font-serif text-4xl font-medium tracking-tight text-smoke sm:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Deduce. Discover. Decide.
            </motion.h2>

            {/* Subtext */}
            <motion.p
              className="mx-auto mt-6 max-w-xl text-lg text-smoke/70"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Ready to transform your investigation workflow?
            </motion.p>

            {/* CTA Button */}
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                href="/login"
                className="liquid-glass-button inline-block px-8 py-4 text-lg font-medium text-smoke transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Start Your Investigation
              </Link>
            </motion.div>
          </GlassCard>
        </AnimatedSection>
      </div>
    </section>
  );
}

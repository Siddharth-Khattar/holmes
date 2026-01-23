// ABOUTME: Final call-to-action section with primary tagline and conversion button.
// ABOUTME: Serves as the last content section before the footer.

"use client";

import { motion } from "motion/react";
import { AnimatedSection } from "./animated-section";

/**
 * CTASection serves as the final conversion point on the landing page.
 *
 * Reinforces the brand tagline and provides a prominent call-to-action
 * button. Visually distinct from other sections with glass panel styling.
 */
export function CTASection() {
  return (
    <section className="relative py-24 sm:py-32">
      {/* Top border gradient for visual separation */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-taupe/30 to-transparent" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Glass panel container */}
        <AnimatedSection
          as="div"
          className="glass-panel rounded-2xl border border-smoke/10 px-6 py-16 text-center sm:px-12 sm:py-20"
        >
          {/* Primary Tagline */}
          <motion.h2
            className="font-serif text-4xl font-bold tracking-tight text-smoke sm:text-5xl"
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
            <motion.button
              type="button"
              className="rounded-lg bg-taupe px-8 py-4 text-lg font-medium text-charcoal transition-colors hover:brightness-110"
              whileHover={{
                scale: 1.03,
                boxShadow: "0 0 24px 4px rgba(193, 179, 159, 0.35)",
              }}
              whileTap={{ scale: 0.98 }}
            >
              Start Your Investigation
            </motion.button>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

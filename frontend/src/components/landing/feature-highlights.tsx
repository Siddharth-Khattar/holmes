// ABOUTME: Feature Highlights section showcasing Holmes' key capabilities.
// ABOUTME: Displays four detailed feature cards with staggered reveal animation.

"use client";

import { motion } from "motion/react";
import { GlassCard } from "@/components/ui";
import { staggerContainer, fadeInUp } from "@/lib/animations";

interface Feature {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: "Agent Decision Graph",
    subtitle: "Full AI Transparency",
    description:
      "Watch Holmes think. Every agent's reasoning process visualized in real-time. See which documents were analyzed, what patterns were found, and how conclusions were reached.",
    icon: (
      <svg
        className="h-8 w-8 text-taupe"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    title: "Knowledge Graph",
    subtitle: "See the Connections",
    description:
      "Entities and relationships mapped visually. Toggle between five layers: Evidence, Legal, Strategy, Temporal, and Hypothesis. Find connections invisible to linear document review.",
    icon: (
      <svg
        className="h-8 w-8 text-taupe"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
    ),
  },
  {
    title: "Cross-Modal Linking",
    subtitle: "Automatic Connections",
    description:
      "A timestamp in a video matches a date in a contract. A voice appears across multiple recordings. Holmes surfaces these connections automatically.",
    icon: (
      <svg
        className="h-8 w-8 text-taupe"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
        />
      </svg>
    ),
  },
  {
    title: "Contradiction Detection",
    subtitle: "Proactive Inconsistency Surfacing",
    description:
      "When evidence conflicts, Holmes flags it. When evidence is missing, Holmes identifies the gap. No more surprises in the courtroom.",
    icon: (
      <svg
        className="h-8 w-8 text-taupe"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
  },
];

/**
 * FeatureHighlights displays detailed cards for Holmes' key capabilities.
 *
 * Features four capability cards with title, subtitle, and description.
 * Uses staggered reveal animation on scroll for visual interest.
 */
export function FeatureHighlights() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="mx-auto max-w-3xl text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="font-serif text-3xl font-bold tracking-tight text-smoke sm:text-4xl font-editorial">
            Built for Real Investigations
          </h2>
          <p className="mt-4 text-lg text-smoke/70">
            Every feature designed to surface truth faster and with complete
            transparency.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          className="mt-16 grid gap-6 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {FEATURES.map((feature) => (
            <motion.div key={feature.title} variants={fadeInUp}>
              <GlassCard className="h-full p-8">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-smoke">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-taupe">
                  {feature.subtitle}
                </p>
                <p className="mt-4 text-smoke/70">{feature.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

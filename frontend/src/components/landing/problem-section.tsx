// ABOUTME: Problem section for the Holmes landing page addressing user pain points.
// ABOUTME: Displays four investigation challenges with staggered scroll reveal animations.

"use client";

import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/animations";

interface ProblemItem {
  title: string;
  description: string;
}

const PROBLEM_ITEMS: ProblemItem[] = [
  {
    title: "Evidence Overload",
    description:
      "Thousands of documents, videos, and audio files. Critical details buried in noise.",
  },
  {
    title: "AI Black Box",
    description:
      "AI tools give answers but hide their reasoning. How can you trust what you can't verify?",
  },
  {
    title: "Fragmented Workflows",
    description:
      "Evidence in one tool, analysis in another, notes scattered everywhere.",
  },
  {
    title: "Cross-Modal Blindness",
    description:
      "A video timestamp that matches a document date. A voice that appears in multiple calls. Connections invisible to siloed tools.",
  },
];

/**
 * ProblemSection presents the four core pain points that Holmes addresses.
 *
 * Uses staggered animations for the problem cards with a subtle,
 * text-focused design per the landing page specification.
 */
export function ProblemSection() {
  return (
    <section className="relative bg-jet py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="mx-auto max-w-3xl text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="font-serif text-3xl font-bold tracking-tight text-smoke sm:text-4xl">
            The Investigation Challenge
          </h2>
          <p className="mt-4 text-lg text-smoke/70">
            Modern investigations generate overwhelming amounts of data across
            multiple formats. Traditional tools fall short.
          </p>
        </motion.div>

        {/* Problem Grid */}
        <motion.div
          className="mt-16 grid gap-8 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {PROBLEM_ITEMS.map((item) => (
            <motion.div
              key={item.title}
              className="rounded-xl border border-smoke/10 bg-charcoal/30 p-6"
              variants={fadeInUp}
            >
              <h3 className="text-xl font-semibold text-smoke">{item.title}</h3>
              <p className="mt-3 text-smoke/70">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

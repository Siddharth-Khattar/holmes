// ABOUTME: Solution section presenting Holmes as the answer to investigation challenges.
// ABOUTME: Displays four solution pillars using GlassCard components with staggered reveal.

"use client";

import { motion } from "motion/react";
import { GlassCard } from "@/components/ui";
import { staggerContainer, fadeInUp } from "@/lib/animations";

interface SolutionPillar {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const SOLUTION_PILLARS: SolutionPillar[] = [
  {
    title: "Unified Case Workspace",
    description:
      "Every document, video, and audio file in one intelligent workspace. No more tab juggling.",
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
          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        />
      </svg>
    ),
  },
  {
    title: "Transparent AI Reasoning",
    description:
      "See exactly how Holmes reaches its conclusions. Every step visible, every decision traceable.",
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
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    title: "Source-Linked Citations",
    description:
      "Every insight links directly to its source. Click any finding to see the evidence.",
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
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
        />
      </svg>
    ),
  },
  {
    title: "Knowledge Graph Visualization",
    description:
      "Entities, relationships, and patterns visualized. See the connections others miss.",
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
          d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
        />
      </svg>
    ),
  },
];

/**
 * SolutionSection introduces Holmes as the answer to the investigation challenges
 * presented in the Problem section.
 *
 * Features four solution pillars displayed in glass cards with staggered reveal.
 */
export function SolutionSection() {
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
            Holmes: Your AI Investigation Partner
          </h2>
          <p className="mt-4 text-lg text-smoke/70">
            A unified platform where AI reasoning is transparent, evidence is
            connected, and insights are always traceable to their source.
          </p>
        </motion.div>

        {/* Solution Cards Grid */}
        <motion.div
          className="mt-16 grid gap-6 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {SOLUTION_PILLARS.map((pillar) => (
            <motion.div key={pillar.title} variants={fadeInUp}>
              <GlassCard className="h-full">
                <div className="mb-4">{pillar.icon}</div>
                <h3 className="text-xl font-semibold text-smoke">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-smoke/70">{pillar.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

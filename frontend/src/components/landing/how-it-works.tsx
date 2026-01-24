// ABOUTME: How It Works section displaying Holmes' investigation pipeline.
// ABOUTME: Features animated workflow diagram with sequential node activation on scroll.

"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

interface WorkflowStep {
  number: number;
  title: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    number: 1,
    title: "Upload",
    description: "Drop your evidence files",
  },
  {
    number: 2,
    title: "Triage",
    description: "AI categorizes by domain",
  },
  {
    number: 3,
    title: "Analysis",
    description: "Domain experts extract insights",
  },
  {
    number: 4,
    title: "Synthesis",
    description: "Cross-reference and connect",
  },
  {
    number: 5,
    title: "Knowledge Graph",
    description: "Visualize relationships",
  },
];

/**
 * HowItWorks displays an animated workflow diagram showing Holmes' pipeline.
 *
 * Features sequential node reveals with animated connection lines.
 * Nodes appear with spring animation, connections draw after each node appears.
 */
export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section
      id="how-it-works"
      className="relative py-24 sm:py-32"
      ref={containerRef}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="font-serif text-3xl font-medium tracking-tight text-smoke sm:text-4xl ">
            How It Works
          </h2>
          <p className="mt-4 text-xl text-smoke/70">
            From raw evidence to connected insights in five steps.
          </p>
        </motion.div>

        {/* Workflow Diagram */}
        <div className="mt-16">
          {/* Desktop: Horizontal layout */}
          <div className="hidden md:block">
            <div className="relative flex items-start justify-between">
              {WORKFLOW_STEPS.map((step, index) => (
                <div
                  key={step.number}
                  className="relative flex flex-col items-center"
                  style={{ flex: 1 }}
                >
                  {/* Connection Line (not for last item) */}
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <motion.div
                      className="absolute left-1/2 top-8 h-0.5 w-full origin-left bg-linear-to-r from-taupe to-stone"
                      initial={{ scaleX: 0 }}
                      animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.3 + 0.2,
                        ease: "easeOut",
                      }}
                    />
                  )}

                  {/* Node */}
                  <motion.div
                    className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-smoke/10 bg-glass-light backdrop-blur-md"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={
                      isInView
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.5 }
                    }
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: index * 0.3,
                    }}
                  >
                    <span className="text-xl font-medium text-taupe">
                      {step.number}
                    </span>
                  </motion.div>

                  {/* Label */}
                  <motion.div
                    className="mt-4 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={
                      isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
                    }
                    transition={{
                      duration: 0.4,
                      delay: index * 0.3 + 0.15,
                      ease: "easeOut",
                    }}
                  >
                    <h3 className="font-medium text-smoke">{step.title}</h3>
                    <p className="mt-1 text-base text-smoke/60">
                      {step.description}
                    </p>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Vertical layout */}
          <div className="md:hidden">
            <div className="relative flex flex-col items-center">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step.number} className="relative flex items-start">
                  {/* Vertical Connection Line (not for last item) */}
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <motion.div
                      className="absolute left-8 top-16 h-16 w-0.5 origin-top bg-linear-to-b from-taupe to-stone"
                      initial={{ scaleY: 0 }}
                      animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.3 + 0.2,
                        ease: "easeOut",
                      }}
                    />
                  )}

                  {/* Node and Label Row */}
                  <div className="flex items-center gap-6 pb-8">
                    {/* Node */}
                    <motion.div
                      className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-smoke/10 bg-glass-light backdrop-blur-md"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={
                        isInView
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0, scale: 0.5 }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: index * 0.3,
                      }}
                    >
                      <span className="text-xl font-medium text-taupe">
                        {step.number}
                      </span>
                    </motion.div>

                    {/* Label */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={
                        isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }
                      }
                      transition={{
                        duration: 0.4,
                        delay: index * 0.3 + 0.15,
                        ease: "easeOut",
                      }}
                    >
                      <h3 className="font-medium text-smoke">{step.title}</h3>
                      <p className="mt-1 text-base text-smoke/60">
                        {step.description}
                      </p>
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ABOUTME: Trust section displaying key differentiators and security signals.
// ABOUTME: Emphasizes that Holmes is purpose-built, not just another RAG or prompt wrapper.

import { AnimatedSection } from "./animated-section";

interface Differentiator {
  title: string;
  description: string;
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    title: "Not RAG",
    description:
      "Holmes doesn't just retrieve and generate. It reasons across evidence, building understanding from the ground up.",
  },
  {
    title: "Not a Prompt Wrapper",
    description:
      "Purpose-built for legal investigation. Domain agents, entity taxonomy, and case-specific knowledge graphs.",
  },
  {
    title: "Native Multimodal",
    description:
      "PDFs, videos, audio, images—processed natively by Gemini 3. No separate transcription pipelines.",
  },
];

/**
 * TrustSection showcases key differentiators that set Holmes apart.
 * Text-focused, minimal iconography, confident copy.
 */
export function TrustSection() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <AnimatedSection className="text-center">
          <h2 className="font-serif text-3xl font-medium tracking-tight text-smoke sm:text-4xl lg:text-5xl">
            Built Different
          </h2>
        </AnimatedSection>

        {/* Differentiators Grid */}
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {DIFFERENTIATORS.map((item, index) => (
            <AnimatedSection
              key={item.title}
              as="div"
              delay={index * 0.15}
              className="text-center"
            >
              <h3 className="text-lg font-medium text-accent">{item.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-smoke/70">
                {item.description}
              </p>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

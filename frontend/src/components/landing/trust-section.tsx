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

        {/* Security Signals */}
        <AnimatedSection delay={0.5} as="div" className="mt-14">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-smoke/50">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              Enterprise Ready
            </span>
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              Encrypted
            </span>
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
              SOC 2 Compliant
            </span>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

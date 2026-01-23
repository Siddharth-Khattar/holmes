// ABOUTME: Home page component for Holmes application
// ABOUTME: Complete landing page with all 9 sections - Navigation, Hero, Problem, Solution, Workflow, Features, Trust, CTA, Footer

import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureHighlights } from "@/components/landing/feature-highlights";
import { TrustSection } from "@/components/landing/trust-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-charcoal">
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
        <FeatureHighlights />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

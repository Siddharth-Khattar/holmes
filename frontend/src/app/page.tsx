// ABOUTME: Home page component for Holmes application
// ABOUTME: Landing page with navigation, hero, problem, solution, workflow, and feature sections

import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureHighlights } from "@/components/landing/feature-highlights";

export default function Home() {
  return (
    <div className="min-h-screen bg-charcoal">
      <Navigation />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
        <FeatureHighlights />
      </main>
    </div>
  );
}

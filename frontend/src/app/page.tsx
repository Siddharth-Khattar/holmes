// ABOUTME: Home page component for Holmes application
// ABOUTME: Landing page with navigation, hero, problem, solution, and workflow sections

import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function Home() {
  return (
    <div className="min-h-screen bg-charcoal">
      <Navigation />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
      </main>
    </div>
  );
}

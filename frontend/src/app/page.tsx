// ABOUTME: Home page component for Holmes application
// ABOUTME: Landing page with navigation, hero, and problem sections

import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-charcoal">
      <Navigation />
      <main>
        <Hero />
        <ProblemSection />
      </main>
    </div>
  );
}

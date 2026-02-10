// ABOUTME: Home page component for Holmes application
// ABOUTME: Complete landing page with all 9 sections - Navigation, Hero, Problem, Solution, Workflow, Features, Trust, CTA, Footer

"use client";

import { useEffect } from "react";
import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureHighlights } from "@/components/landing/feature-highlights";
import { TrustSection } from "@/components/landing/trust-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { EtherealShadow } from "@/components/landing/ethereal-shadow";
import { SectionDivider } from "@/components/landing/section-divider";

export default function Home() {
  useEffect(() => {
    console.log("🏡 [LANDING PAGE] Component mounted", {
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
    });
  }, []);

  console.log("🏡 [LANDING PAGE] Rendering");
  return (
    <>
      {/* Fixed background - doesn't scroll */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <EtherealShadow
          color="rgba(60, 58, 54, 0.85)"
          noise={{ opacity: 0.6, scale: 1.2 }}
          sizing="fill"
        />
      </div>

      {/* All content scrolls above the background */}
      <div className="relative z-10">
        <Navigation />
        <main className="relative min-h-screen">
          <Hero />
          <SectionDivider />
          <ProblemSection />
          <SectionDivider />
          <SolutionSection />
          <SectionDivider />
          <HowItWorks />
          <SectionDivider />
          <FeatureHighlights />
          <SectionDivider />
          <TrustSection />
          <SectionDivider />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
}

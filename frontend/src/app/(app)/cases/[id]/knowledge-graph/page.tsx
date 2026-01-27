"use client";

import { Network } from "lucide-react";

export default function KnowledgeGraphPage() {
  return (
    <div
      className="rounded-xl p-12 text-center"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <Network className="w-8 h-8 text-(--muted-foreground)" />
      </div>
      <h3 className="text-lg font-medium text-(--foreground) mb-2">
        Knowledge Graph
      </h3>
      <p className="text-(--muted-foreground) text-sm max-w-md mx-auto">
        Coming soon - Visualize connections and relationships within your case data.
      </p>
    </div>
  );
}

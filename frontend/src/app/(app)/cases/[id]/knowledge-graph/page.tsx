"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { KnowledgeGraph } from "@/components/app/knowledge-graph";
import { useCaseGraph } from "@/hooks/use-case-graph";

export default function KnowledgeGraphPage() {
  const params = useParams();
  const { data, loading, error } = useCaseGraph(params.id as string);

  if (loading) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <Loader2 className="w-8 h-8 text-(--muted-foreground) animate-spin mx-auto mb-4" />
        <p className="text-(--muted-foreground) text-sm">Loading knowledge graph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <p className="text-red-500 text-sm">Error loading graph: {error.message}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Count entity nodes vs evidence nodes
  const entityNodes = data.nodes.filter(n => n.type === 'entity');
  const evidenceNodes = data.nodes.filter(n => n.type === 'evidence');

  return (
    <div className="h-[calc(100vh-280px)]">
      <KnowledgeGraph
        nodes={data.nodes}
        connections={data.connections}
        entityCount={entityNodes.length}
        evidenceCount={evidenceNodes.length}
        relationshipCount={data.relationships.length}
      />
    </div>
  );
}

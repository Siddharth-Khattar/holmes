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
        <Loader2
          className="w-8 h-8 animate-spin mx-auto mb-4"
          style={{ color: "var(--muted-foreground)" }}
        />
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Loading knowledge graph...
        </p>
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
        <p className="text-red-500 text-sm">
          Error loading graph: {error.message}
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Count entity nodes vs evidence nodes
  const entityNodes = data.nodes.filter((n) => n.type === "entity");
  const evidenceNodes = data.nodes.filter((n) => n.type === "evidence");

  const handleAddRelationship = async (sourceId: string, targetId: string) => {
    // TODO: Implement API call when backend is ready
    console.log("TODO: Create relationship via API:", sourceId, "->", targetId);

    // Example of what the API call would look like:
    /*
    try {
      const newRelationship = await api.post(
        `/api/cases/${params.id}/relationships`,
        {
          sourceEntityId: sourceId,
          targetEntityId: targetId,
          type: 'custom',
          label: 'Connected to',
          strength: 0.5,
        }
      );
      
      // Optionally refetch graph data or update local state
      // refetch();
      
      toast.success('Relationship created successfully');
    } catch (error) {
      toast.error('Failed to create relationship');
    }
    */
  };

  return (
    <div className="h-[calc(100vh-200px)]">
      <KnowledgeGraph
        nodes={data.nodes}
        connections={data.connections}
        entityCount={entityNodes.length}
        evidenceCount={evidenceNodes.length}
        relationshipCount={data.relationships.length}
        onAddRelationship={handleAddRelationship}
      />
    </div>
  );
}

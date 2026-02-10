// ABOUTME: Custom hook that transforms agent states into a laid-out ReactFlow graph.
// ABOUTME: Memoizes the graph computation, only recomputing when states or selection change.

import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";

import { buildAgentFlowGraph } from "@/lib/command-center-graph";
import type { AgentState } from "@/types/command-center";

interface UseAgentFlowGraphOptions {
  agentStates: Map<string, AgentState>;
  selectedAgent: string | null;
}

interface UseAgentFlowGraphReturn {
  nodes: Node[];
  edges: Edge[];
  isProcessing: boolean;
}

/**
 * Derives the ReactFlow graph (nodes + edges + layout) from agent states.
 *
 * Separation of concerns: this hook owns the data transformation layer
 * between raw agent state and the ReactFlow visual representation.
 * The component that uses this hook only deals with rendering.
 */
export function useAgentFlowGraph({
  agentStates,
  selectedAgent,
}: UseAgentFlowGraphOptions): UseAgentFlowGraphReturn {
  const { nodes, edges } = useMemo(
    () => buildAgentFlowGraph({ agentStates, selectedAgent }),
    [agentStates, selectedAgent],
  );

  const isProcessing = useMemo(
    () =>
      Array.from(agentStates.values()).some((s) => s.status === "processing"),
    [agentStates],
  );

  return { nodes, edges, isProcessing };
}

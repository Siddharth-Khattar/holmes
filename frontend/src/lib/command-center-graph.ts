// ABOUTME: Pure functions for building the Command Center ReactFlow graph from agent state.
// ABOUTME: Handles node visibility, edge construction, file group routing, and active-path detection.

import type { Node, Edge } from "@xyflow/react";

import { DEFAULT_CONNECTIONS } from "@/lib/command-center-config";
import { getLayoutedElements } from "@/lib/command-center-layout";
import type {
  AgentState,
  AgentType,
  AgentResult,
} from "@/types/command-center";

// -----------------------------------------------------------------------
// Shared predicate: is an agent on the "chosen" (active/completed) path?
// Single source of truth — used for node highlighting AND edge styling.
// -----------------------------------------------------------------------

export function isAgentActive(state: AgentState | undefined): boolean {
  if (!state) return false;
  return (
    state.status === "processing" ||
    state.status === "complete" ||
    (state.status === "idle" && state.lastResult !== undefined)
  );
}

// -----------------------------------------------------------------------
// File group data extracted from orchestrator output
// -----------------------------------------------------------------------

interface FileGroupData {
  groupId: string;
  groupName: string;
  fileCount: number;
  sharedContext: string;
  targetAgents: string[];
}

/**
 * Extract file groups from orchestrator's lastResult metadata.
 * Backend OrchestratorOutput provides file_groups with group_id, file_ids,
 * target_agents, shared_context fields.
 */
function extractFileGroups(result: AgentResult): FileGroupData[] {
  const rawGroups =
    (result.metadata?.file_groups as
      | Array<{
          group_id: string;
          file_ids: string[];
          target_agents: string[];
          shared_context: string;
        }>
      | undefined) ?? [];

  return rawGroups.map((g) => ({
    groupId: g.group_id,
    groupName: g.shared_context.slice(0, 40) || g.group_id,
    fileCount: g.file_ids.length,
    sharedContext: g.shared_context,
    targetAgents: g.target_agents,
  }));
}

// -----------------------------------------------------------------------
// File routing extraction: maps target agent -> file names
// -----------------------------------------------------------------------

interface FileRouting {
  file: string;
  target: string;
}

function extractFileRoutingMap(
  agentStates: Map<AgentType, AgentState>,
): Map<string, string[]> {
  const routingMap = new Map<string, string[]>();

  const orchState = agentStates.get("orchestrator");
  const fileRouting =
    (orchState?.lastResult?.metadata?.file_routing as
      | FileRouting[]
      | undefined) ?? [];

  for (const entry of fileRouting) {
    const existing = routingMap.get(entry.target) ?? [];
    existing.push(entry.file);
    routingMap.set(entry.target, existing);
  }

  return routingMap;
}

// -----------------------------------------------------------------------
// Node visibility: topology-driven, not hardcoded per agent name
//
// A node is visible if:
//   1. It has been activated (non-idle, or has results/history), OR
//   2. ALL of its parents (from DEFAULT_CONNECTIONS) are active/complete
//
// This handles any pipeline topology — adding new agent types or dynamic
// subagents only requires adding entries to DEFAULT_CONNECTIONS.
// -----------------------------------------------------------------------

function determineNodeVisibility(
  type: AgentType,
  states: Map<AgentType, AgentState>,
): boolean {
  const state = states.get(type);

  // If this agent has ever been active, always show it
  if (state && state.status !== "idle") return true;
  if (state?.lastResult !== undefined) return true;
  if (state && state.processingHistory.length > 0) return true;

  // Find all parents of this node from the connection topology
  const parentTypes = DEFAULT_CONNECTIONS.filter(
    (conn) => conn.target === type,
  ).map((conn) => conn.source);

  // Root nodes (no parents) are always visible
  if (parentTypes.length === 0) return true;

  // Visible if ALL parents have completed (are active)
  return parentTypes.every((parentType) => {
    const parentState = states.get(parentType);
    return isAgentActive(parentState);
  });
}

// -----------------------------------------------------------------------
// Edge construction with chosen-path styling and optional file routing data
// -----------------------------------------------------------------------

function buildEdge(
  sourceId: string,
  targetId: string,
  isChosen: boolean,
  isProcessing: boolean,
  files?: string[],
): Edge {
  const hasFiles = files !== undefined && files.length > 0;

  return {
    id: `edge-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: hasFiles ? "fileRouting" : "smoothstep",
    animated: isProcessing,
    style: isProcessing
      ? { stroke: "hsl(0 0% 55%)", strokeWidth: 2 }
      : isChosen
        ? { stroke: "hsl(0 0% 60%)", strokeWidth: 2 }
        : { stroke: "hsl(0 0% 50% / 0.3)", strokeWidth: 1 },
    ...(hasFiles ? { data: { files } } : {}),
  };
}

// -----------------------------------------------------------------------
// Public API: build the full ReactFlow graph from agent states
// -----------------------------------------------------------------------

interface BuildGraphOptions {
  agentStates: Map<AgentType, AgentState>;
  selectedAgent: AgentType | null;
  onNodeClick: (agentType: AgentType) => void;
}

/**
 * Transform agent states into a laid-out ReactFlow graph.
 *
 * Responsibilities:
 * - Determine which agent nodes are visible (progressive tree build)
 * - Create file group intermediate nodes from orchestrator output
 * - Build edges with chosen-path styling and file group routing
 * - Apply hierarchical layout via the topology-driven layout engine
 *
 * Pure function: same inputs always produce the same output.
 */
export function buildAgentFlowGraph({
  agentStates,
  selectedAgent,
  onNodeClick,
}: BuildGraphOptions): { nodes: Node[]; edges: Edge[] } {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  // Extract file routing map for edge file lists
  const fileRoutingMap = extractFileRoutingMap(agentStates);

  // --- AGENT NODES ---
  agentStates.forEach((state, type) => {
    if (!determineNodeVisibility(type, agentStates)) return;

    rfNodes.push({
      id: type,
      type: "decision",
      position: { x: 0, y: 0 }, // layout engine computes final position
      data: {
        agentType: type,
        agentState: state,
        isChosen: isAgentActive(state),
        isSelected: selectedAgent === type,
        onNodeClick,
      },
    });
  });

  // --- FILE GROUP NODES ---
  const orchState = agentStates.get("orchestrator");
  if (orchState?.lastResult) {
    const fileGroups = extractFileGroups(orchState.lastResult);

    fileGroups.forEach((group) => {
      const isActive = group.targetAgents.some((agentId) =>
        isAgentActive(agentStates.get(agentId as AgentType)),
      );

      rfNodes.push({
        id: `file-group-${group.groupId}`,
        type: "fileGroup",
        position: { x: 0, y: 0 }, // layout engine computes final position
        data: {
          groupId: group.groupId,
          groupName: group.groupName,
          fileCount: group.fileCount,
          sharedContext: group.sharedContext,
          targetAgents: group.targetAgents,
          isActive,
          onNodeClick: () => onNodeClick(null as unknown as AgentType),
        },
      });
    });
  }

  // --- EDGES ---
  const fileGroupNodes = rfNodes.filter((n) => n.type === "fileGroup");

  DEFAULT_CONNECTIONS.forEach((conn) => {
    const sourceVisible = rfNodes.some((n) => n.id === conn.source);
    const targetVisible = rfNodes.some((n) => n.id === conn.target);
    if (!sourceVisible || !targetVisible) return;

    const sourceActive = isAgentActive(agentStates.get(conn.source));
    const targetActive = isAgentActive(agentStates.get(conn.target));
    const isChosen = sourceActive && targetActive;
    const isProcessing = agentStates.get(conn.target)?.status === "processing";

    // Resolve files for this connection (triage->orchestrator has no individual names)
    const edgeFiles: string[] | undefined =
      conn.source === "orchestrator"
        ? (fileRoutingMap.get(conn.target) ?? undefined)
        : undefined;

    // Route through file group nodes when present (orchestrator -> domain agent)
    if (conn.source === "orchestrator" && fileGroupNodes.length > 0) {
      const matchingGroups = fileGroupNodes.filter((fgNode) => {
        const fgData = fgNode.data as { targetAgents: string[] };
        return fgData.targetAgents.includes(conn.target);
      });

      if (matchingGroups.length > 0) {
        matchingGroups.forEach((fgNode) => {
          // Edge: orchestrator -> file group (deduplicate)
          if (
            !rfEdges.some(
              (e) => e.source === conn.source && e.target === fgNode.id,
            )
          ) {
            rfEdges.push(
              buildEdge(conn.source, fgNode.id, sourceActive, false),
            );
          }

          // Edge: file group -> target agent (with files)
          const targetFiles = fileRoutingMap.get(conn.target);
          rfEdges.push(
            buildEdge(
              fgNode.id,
              conn.target,
              isChosen,
              isProcessing ?? false,
              targetFiles,
            ),
          );
        });
        return; // Skip the direct edge
      }
    }

    // Direct edge (no file group interception)
    rfEdges.push(
      buildEdge(
        conn.source,
        conn.target,
        isChosen,
        isProcessing ?? false,
        edgeFiles,
      ),
    );
  });

  // Apply hierarchical layout
  return getLayoutedElements(rfNodes, rfEdges);
}

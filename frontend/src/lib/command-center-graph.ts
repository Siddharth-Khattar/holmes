// ABOUTME: Pure functions for building the Command Center ReactFlow graph from agent state.
// ABOUTME: Handles instance-based node creation, base-type edge resolution, file group routing, and active-path detection.

import type { Node, Edge } from "@xyflow/react";

import { DEFAULT_CONNECTIONS } from "@/lib/command-center-config";
import { getLayoutedElements } from "@/lib/command-center-layout";
import type { AgentState, AgentResult } from "@/types/command-center";

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

/**
 * Extract file routing data from orchestrator state.
 * Finds the orchestrator by iterating states where state.type === "orchestrator".
 */
function extractFileRoutingMap(
  agentStates: Map<string, AgentState>,
): Map<string, string[]> {
  const routingMap = new Map<string, string[]>();

  // Find orchestrator instance (there should be exactly one)
  let orchState: AgentState | undefined;
  for (const state of agentStates.values()) {
    if (state.type === "orchestrator") {
      orchState = state;
      break;
    }
  }

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
//   2. ALL of its parent TYPES (from DEFAULT_CONNECTIONS) have at least
//      one active instance in the state map
//
// This handles any pipeline topology — adding new agent types or dynamic
// subagents only requires adding entries to DEFAULT_CONNECTIONS.
// -----------------------------------------------------------------------

function determineNodeVisibility(
  _instanceId: string,
  state: AgentState,
  allStates: Map<string, AgentState>,
): boolean {
  // If this agent has ever been active, always show it
  if (state.status !== "idle") return true;
  if (state.lastResult !== undefined) return true;
  if (state.processingHistory.length > 0) return true;

  // Find all parent types of this node's base type from the connection topology
  const parentTypes = DEFAULT_CONNECTIONS.filter(
    (conn) => conn.target === state.type,
  ).map((conn) => conn.source);

  // Root nodes (no parents) are always visible
  if (parentTypes.length === 0) return true;

  // Visible if ALL parent types have at least one active instance
  return parentTypes.every((parentType) => {
    for (const s of allStates.values()) {
      if (s.type === parentType && isAgentActive(s)) return true;
    }
    return false;
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
  agentStates: Map<string, AgentState>;
  selectedAgent: string | null;
}

/**
 * Transform agent states into a laid-out ReactFlow graph.
 *
 * Responsibilities:
 * - One node per visible agent instance (instance ID = node ID)
 * - Create file group intermediate nodes from orchestrator output
 * - Resolve edges from base-type topology to instance-level connections
 * - Apply hierarchical layout via the topology-driven layout engine
 *
 * Pure function: same inputs always produce the same output.
 */
export function buildAgentFlowGraph({
  agentStates,
  selectedAgent,
}: BuildGraphOptions): { nodes: Node[]; edges: Edge[] } {
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  // Extract file routing map for edge file lists
  const fileRoutingMap = extractFileRoutingMap(agentStates);

  // --- AGENT NODES (one per visible instance) ---
  const visibleInstanceIds = new Set<string>();

  agentStates.forEach((state, instanceId) => {
    if (!determineNodeVisibility(instanceId, state, agentStates)) return;

    visibleInstanceIds.add(instanceId);

    rfNodes.push({
      id: instanceId,
      type: "decision",
      position: { x: 0, y: 0 }, // layout engine computes final position
      data: {
        agentType: state.type, // base type for colors/config
        agentState: state,
        isChosen: isAgentActive(state),
        isSelected: selectedAgent === instanceId,
      },
    });
  });

  // --- FILE GROUP NODES ---
  // Find orchestrator by type
  let orchState: AgentState | undefined;
  for (const state of agentStates.values()) {
    if (state.type === "orchestrator") {
      orchState = state;
      break;
    }
  }

  if (orchState?.lastResult) {
    const fileGroups = extractFileGroups(orchState.lastResult);

    fileGroups.forEach((group) => {
      const isActive = group.targetAgents.some((agentId) => {
        // Check if any visible instance has this base type
        for (const s of agentStates.values()) {
          if ((s.type === agentId || s.id === agentId) && isAgentActive(s)) {
            return true;
          }
        }
        return false;
      });

      rfNodes.push({
        id: `file-group-${group.groupId}`,
        type: "fileGroup",
        position: { x: 0, y: 0 }, // layout engine computes final position
        data: {
          groupName: group.groupName,
          fileCount: group.fileCount,
          sharedContext: group.sharedContext,
          targetAgents: group.targetAgents,
          isActive,
        },
      });
    });
  }

  // --- EDGES (base-type topology → instance-level connections) ---
  const fileGroupNodes = rfNodes.filter((n) => n.type === "fileGroup");

  // Build lookup: baseType → visible instance IDs
  const baseTypeToInstances = new Map<string, string[]>();
  for (const instanceId of visibleInstanceIds) {
    const state = agentStates.get(instanceId);
    if (!state) continue;
    const instances = baseTypeToInstances.get(state.type) ?? [];
    instances.push(instanceId);
    baseTypeToInstances.set(state.type, instances);
  }

  DEFAULT_CONNECTIONS.forEach((conn) => {
    const sourceInstances = baseTypeToInstances.get(conn.source) ?? [];
    const targetInstances = baseTypeToInstances.get(conn.target) ?? [];

    // Skip if either side has no visible instances
    if (sourceInstances.length === 0 || targetInstances.length === 0) return;

    // Route through file group nodes when present (orchestrator -> domain agent)
    if (conn.source === "orchestrator" && fileGroupNodes.length > 0) {
      for (const sourceId of sourceInstances) {
        for (const targetId of targetInstances) {
          const targetState = agentStates.get(targetId);
          const matchingGroups = fileGroupNodes.filter((fgNode) => {
            const fgData = fgNode.data as { targetAgents: string[] };
            return (
              fgData.targetAgents.includes(conn.target) ||
              (targetState && fgData.targetAgents.includes(targetState.type))
            );
          });

          if (matchingGroups.length > 0) {
            matchingGroups.forEach((fgNode) => {
              // Edge: orchestrator -> file group (deduplicate)
              if (
                !rfEdges.some(
                  (e) => e.source === sourceId && e.target === fgNode.id,
                )
              ) {
                rfEdges.push(
                  buildEdge(
                    sourceId,
                    fgNode.id,
                    isAgentActive(agentStates.get(sourceId)),
                    false,
                  ),
                );
              }

              // Edge: file group -> target instance (with files)
              const targetFiles = fileRoutingMap.get(conn.target);
              const sourceActive = isAgentActive(agentStates.get(sourceId));
              const targetActive = isAgentActive(agentStates.get(targetId));
              const isProcessing =
                agentStates.get(targetId)?.status === "processing";
              rfEdges.push(
                buildEdge(
                  fgNode.id,
                  targetId,
                  sourceActive && targetActive,
                  isProcessing ?? false,
                  targetFiles,
                ),
              );
            });
          } else {
            // Direct edge (no file group interception)
            const sourceActive = isAgentActive(agentStates.get(sourceId));
            const targetActive = isAgentActive(agentStates.get(targetId));
            const isProcessing =
              agentStates.get(targetId)?.status === "processing";
            const edgeFiles = fileRoutingMap.get(conn.target) ?? undefined;
            rfEdges.push(
              buildEdge(
                sourceId,
                targetId,
                sourceActive && targetActive,
                isProcessing ?? false,
                edgeFiles,
              ),
            );
          }
        }
      }
      return; // Skip the generic cross-product below
    }

    // Generic cross-product for non-orchestrator source edges
    for (const sourceId of sourceInstances) {
      for (const targetId of targetInstances) {
        const sourceActive = isAgentActive(agentStates.get(sourceId));
        const targetActive = isAgentActive(agentStates.get(targetId));
        const isChosen = sourceActive && targetActive;
        const isProcessing = agentStates.get(targetId)?.status === "processing";

        rfEdges.push(
          buildEdge(sourceId, targetId, isChosen, isProcessing ?? false),
        );
      }
    }
  });

  // Apply hierarchical layout
  return getLayoutedElements(rfNodes, rfEdges);
}

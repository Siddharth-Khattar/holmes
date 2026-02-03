// ABOUTME: Main Command Center container with ReactFlowProvider wrapping, progressive
// ABOUTME: tree build from SSE events, file group intermediate nodes, and sidebar integration.

"use client";

import { useState, useCallback, useMemo } from "react";
import { ReactFlowProvider, type Node, type Edge } from "@xyflow/react";
import { Activity, AlertCircle } from "lucide-react";
import { AgentFlowCanvas, getLayoutedElements } from "./AgentFlowCanvas";
import { NodeDetailsSidebar } from "./NodeDetailsSidebar";
import { useCommandCenterSSE } from "@/hooks/useCommandCenterSSE";
import {
  AGENT_CONFIGS,
  DEFAULT_CONNECTIONS,
} from "@/lib/command-center-config";
import type {
  AgentState,
  AgentType,
  AgentResult,
  CommandCenterSSEEvent,
  ProcessingSummary,
  AgentStartedEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  ProcessingCompleteEvent,
} from "@/types/command-center";

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------
interface CommandCenterProps {
  caseId: string;
  className?: string;
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

// -----------------------------------------------------------------------
// Helpers (outside component to avoid re-creation)
// -----------------------------------------------------------------------

/**
 * Extract file groups from orchestrator's lastResult.
 * Backend OrchestratorOutput has file_groups with group_id, file_ids,
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

/**
 * Progressive tree build: determines whether a given agent node should be
 * visible based on the current pipeline state. Triage is always visible;
 * orchestrator appears after triage completes; domain agents and KG appear
 * after orchestrator completes.
 */
function determineNodeVisibility(
  type: AgentType,
  states: Map<AgentType, AgentState>,
): boolean {
  // Triage is always visible (root node)
  if (type === "triage") return true;

  const state = states.get(type);
  if (!state) return false;

  // If this agent has ever been active, show it
  if (state.status !== "idle") return true;
  if (state.lastResult !== undefined) return true;
  if (state.processingHistory.length > 0) return true;

  // Orchestrator: visible once triage completes
  if (type === "orchestrator") {
    const triageState = states.get("triage");
    return (
      triageState?.status === "complete" ||
      triageState?.lastResult !== undefined ||
      (triageState?.status === "idle" &&
        triageState?.processingHistory.length > 0)
    );
  }

  // Domain agents + KG: visible once orchestrator completes
  const orchState = states.get("orchestrator");
  if (
    orchState?.status === "complete" ||
    orchState?.lastResult !== undefined ||
    (orchState?.status === "idle" && orchState?.processingHistory.length > 0)
  ) {
    return true;
  }

  return false;
}

/**
 * Build a single ReactFlow edge with chosen/processing styling.
 */
function buildEdge(
  sourceId: string,
  targetId: string,
  isChosen: boolean,
  isProcessing: boolean,
): Edge {
  return {
    id: `edge-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: "smoothstep",
    animated: isChosen || isProcessing,
    style:
      isChosen || isProcessing
        ? {
            stroke: "hsl(var(--cc-accent))",
            strokeWidth: 3,
            filter: "drop-shadow(0 0 6px hsl(var(--cc-accent) / 0.6))",
          }
        : {
            stroke: "hsl(0 0% 50% / 0.3)",
            strokeWidth: 1,
          },
  };
}

// -----------------------------------------------------------------------
// Inner component (uses useReactFlow via canvas child)
// -----------------------------------------------------------------------
function CommandCenterInner({ caseId, className }: CommandCenterProps) {
  const [agentStates, setAgentStates] = useState<Map<AgentType, AgentState>>(
    new Map(),
  );
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [lastProcessingSummary, setLastProcessingSummary] =
    useState<ProcessingSummary | null>(null);

  // Initialize agent states
  useState(() => {
    const initialStates = new Map<AgentType, AgentState>();
    Object.keys(AGENT_CONFIGS).forEach((type) => {
      const agentType = type as AgentType;
      initialStates.set(agentType, {
        id: agentType,
        type: agentType,
        status: "idle",
        processingHistory: [],
      });
    });
    setAgentStates(initialStates);
    return true;
  });

  // ------- SSE event handlers (preserved from original) -------

  const handleAgentStarted = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as AgentStartedEvent;
    setAgentStates((prev) => {
      const newStates = new Map(prev);
      const agentState = newStates.get(e.agentType);
      if (agentState) {
        newStates.set(e.agentType, {
          ...agentState,
          status: "processing",
          currentTask: {
            taskId: e.taskId,
            fileId: e.fileId,
            fileName: e.fileName,
            startedAt: new Date(),
            status: "processing",
          },
        });
      }
      return newStates;
    });
  }, []);

  const handleAgentComplete = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as AgentCompleteEvent;
    setAgentStates((prev) => {
      const newStates = new Map(prev);
      const agentState = newStates.get(e.agentType);
      if (agentState && agentState.currentTask) {
        const completedTask = {
          ...agentState.currentTask,
          completedAt: new Date(),
          status: "complete" as const,
        };

        // Add to history (keep last 5)
        const history = [completedTask, ...agentState.processingHistory].slice(
          0,
          5,
        );

        newStates.set(e.agentType, {
          ...agentState,
          status: "idle",
          currentTask: undefined,
          lastResult: e.result,
          processingHistory: history,
        });
      }
      return newStates;
    });
  }, []);

  const handleAgentError = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as AgentErrorEvent;
    setAgentStates((prev) => {
      const newStates = new Map(prev);
      const agentState = newStates.get(e.agentType);
      if (agentState && agentState.currentTask) {
        const errorTask = {
          ...agentState.currentTask,
          completedAt: new Date(),
          status: "error" as const,
          error: e.error,
        };

        const history = [errorTask, ...agentState.processingHistory].slice(
          0,
          5,
        );

        newStates.set(e.agentType, {
          ...agentState,
          status: "error",
          currentTask: undefined,
          processingHistory: history,
        });
      }
      return newStates;
    });
  }, []);

  const handleProcessingComplete = useCallback(
    (event: CommandCenterSSEEvent) => {
      const e = event as ProcessingCompleteEvent;
      setLastProcessingSummary({
        filesProcessed: e.filesProcessed,
        entitiesCreated: e.entitiesCreated,
        relationshipsCreated: e.relationshipsCreated,
        completedAt: new Date(),
      });
    },
    [],
  );

  // Setup SSE connection
  const { isConnected, isReconnecting } = useCommandCenterSSE(caseId, {
    enabled: true,
    onAgentStarted: handleAgentStarted,
    onAgentComplete: handleAgentComplete,
    onAgentError: handleAgentError,
    onProcessingComplete: handleProcessingComplete,
  });

  // ------- Data transformation: agentStates -> ReactFlow nodes/edges -------

  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    // Build agent nodes with progressive visibility
    agentStates.forEach((state, type) => {
      const isChosen =
        state.status === "processing" ||
        state.status === "complete" ||
        (state.status === "idle" && state.lastResult !== undefined);

      const shouldShow = determineNodeVisibility(type, agentStates);
      if (!shouldShow) return;

      rfNodes.push({
        id: type,
        type: "decision",
        position: { x: 0, y: 0 }, // dagre will compute
        data: {
          agentType: type,
          agentState: state,
          isChosen,
          isSelected: selectedAgent === type,
          onNodeClick: (agentType: AgentType) => setSelectedAgent(agentType),
        },
      });
    });

    // --- FILE GROUP NODES ---
    const orchState = agentStates.get("orchestrator");
    if (orchState?.lastResult) {
      const fileGroups = extractFileGroups(orchState.lastResult);

      fileGroups.forEach((group) => {
        const isActive = group.targetAgents.some((agentId) => {
          const agentState = agentStates.get(agentId as AgentType);
          return (
            agentState?.status === "processing" ||
            agentState?.status === "complete"
          );
        });

        rfNodes.push({
          id: `file-group-${group.groupId}`,
          type: "fileGroup",
          position: { x: 0, y: 0 }, // dagre will compute
          data: {
            groupId: group.groupId,
            groupName: group.groupName,
            fileCount: group.fileCount,
            sharedContext: group.sharedContext,
            targetAgents: group.targetAgents,
            isActive,
            onNodeClick: () => setSelectedAgent(null),
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

      const sourceState = agentStates.get(conn.source);
      const targetState = agentStates.get(conn.target);

      // Determine if edge is on the chosen/active path
      const sourceIsActive =
        sourceState?.status === "processing" ||
        sourceState?.status === "complete" ||
        (sourceState?.status === "idle" &&
          sourceState?.lastResult !== undefined);
      const targetIsActive =
        targetState?.status === "processing" ||
        targetState?.status === "complete" ||
        (targetState?.status === "idle" &&
          targetState?.lastResult !== undefined);
      const isChosen = sourceIsActive && targetIsActive;
      const isProcessing = targetState?.status === "processing";

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
                buildEdge(conn.source, fgNode.id, sourceIsActive, false),
              );
            }
            // Edge: file group -> target agent
            rfEdges.push(
              buildEdge(
                fgNode.id,
                conn.target,
                isChosen,
                isProcessing ?? false,
              ),
            );
          });
          return; // Skip the direct edge
        }
      }

      // Direct edge (no file group interception)
      rfEdges.push(
        buildEdge(conn.source, conn.target, isChosen, isProcessing ?? false),
      );
    });

    // Apply dagre layout
    return getLayoutedElements(rfNodes, rfEdges);
  }, [agentStates, selectedAgent]);

  // Check if any agent is processing
  const isProcessing = useMemo(() => {
    return Array.from(agentStates.values()).some(
      (state) => state.status === "processing",
    );
  }, [agentStates]);

  return (
    <div
      className={`command-center-scope flex flex-col w-full h-full bg-background dark:bg-charcoal rounded-lg overflow-hidden border-2 border-warm-gray/30 dark:border-stone/30 ${className || ""}`}
    >
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-stone/15">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-smoke mb-1">
              Command Center
            </h2>
            <p className="text-sm text-stone">
              Real-time agent processing visualization
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-3">
            {isReconnecting ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-amber-500">Reconnecting...</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-500">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone/10 border border-stone/20">
                <AlertCircle className="w-3 h-3 text-stone" />
                <span className="text-xs text-stone">Demo Mode</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - canvas full width, sidebar overlays */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <AgentFlowCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={(nodeId) => {
            // Only open sidebar for agent nodes, not file group nodes
            if (!nodeId.startsWith("file-group-")) {
              setSelectedAgent(nodeId as AgentType);
            }
          }}
          selectedNodeId={selectedAgent}
        />
        <NodeDetailsSidebar
          isOpen={selectedAgent !== null}
          agentType={selectedAgent}
          agentState={
            selectedAgent ? (agentStates.get(selectedAgent) ?? null) : null
          }
          onClose={() => setSelectedAgent(null)}
        />
      </div>

      {/* Footer */}
      <div className="flex-none px-6 py-3 border-t border-stone/15">
        <div className="flex items-center justify-between text-xs">
          {isProcessing ? (
            <div className="flex items-center gap-2 text-stone">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Processing in progress...</span>
            </div>
          ) : lastProcessingSummary ? (
            <div className="text-stone">
              Last Processing Complete • {lastProcessingSummary.filesProcessed}{" "}
              files • {lastProcessingSummary.entitiesCreated} entities •{" "}
              {lastProcessingSummary.relationshipsCreated} relationships
            </div>
          ) : (
            <div className="text-stone">Idle</div>
          )}

          <div className="text-stone/60">{new Date().toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Public export wraps inner content in ReactFlowProvider
// -----------------------------------------------------------------------
export function CommandCenter({ caseId, className }: CommandCenterProps) {
  return (
    <ReactFlowProvider>
      <CommandCenterInner caseId={caseId} className={className} />
    </ReactFlowProvider>
  );
}

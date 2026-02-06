// ABOUTME: Custom hook managing agent state lifecycle for the Command Center.
// ABOUTME: Handles SSE event processing, state transitions, and demo mode fallback.

import { useState, useCallback, useEffect, useRef } from "react";

import { useCommandCenterSSE } from "@/hooks/useCommandCenterSSE";
import { AGENT_CONFIGS } from "@/lib/command-center-config";
import { extractBaseAgentType } from "@/lib/command-center-validation";
import { createDemoAgentStates } from "@/lib/mock-command-center-data";
import type {
  AgentState,
  AgentStatus,
  AgentType,
  CommandCenterSSEEvent,
  ProcessingSummary,
  AgentStartedEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  ProcessingCompleteEvent,
  ThinkingUpdateEvent,
  StateSnapshotEvent,
  ConfirmationRequiredEvent,
  ConfirmationResolvedEvent,
  ToolCalledEvent,
} from "@/types/command-center";

/** Delay before activating demo mode when no SSE connection is established */
const DEMO_MODE_DELAY_MS = 3000;

/**
 * Maps backend execution status strings to frontend AgentStatus values.
 * Backend sends lowercased enum values: pending, running, completed, failed.
 */
function mapSnapshotStatus(backendStatus: string): AgentStatus {
  switch (backendStatus) {
    case "running":
      return "processing";
    case "completed":
      return "complete";
    case "failed":
      return "error";
    case "pending":
    default:
      return "idle";
  }
}

function createInitialStates(): Map<AgentType, AgentState> {
  const states = new Map<AgentType, AgentState>();
  for (const type of Object.keys(AGENT_CONFIGS)) {
    const agentType = type as AgentType;
    states.set(agentType, {
      id: agentType,
      type: agentType,
      status: "idle",
      processingHistory: [],
    });
  }
  return states;
}

export interface UseAgentStatesReturn {
  agentStates: Map<AgentType, AgentState>;
  lastProcessingSummary: ProcessingSummary | null;
  pendingConfirmations: ConfirmationRequiredEvent[];
  isConnected: boolean;
  isReconnecting: boolean;
}

/**
 * Manages the full agent state lifecycle:
 * - Initializes idle state for all configured agent types
 * - Processes SSE events (started, complete, error, processing-complete)
 * - Handles thinking-update events by appending traces to agent state
 * - Handles state-snapshot events for reconnection state restoration
 * - Tracks pending HITL confirmation requests
 * - Falls back to demo mode with mock data when backend is unavailable
 *
 * TODO: Remove demo mode fallback when backend SSE is fully integrated
 */
export function useAgentStates(caseId: string): UseAgentStatesReturn {
  const [agentStates, setAgentStates] =
    useState<Map<AgentType, AgentState>>(createInitialStates);
  const [lastProcessingSummary, setLastProcessingSummary] =
    useState<ProcessingSummary | null>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    ConfirmationRequiredEvent[]
  >([]);

  // Tracks active compound agent IDs per base type (e.g. "financial" → {"financial_grp_0", "financial_grp_1"}).
  // Prevents premature status transitions when multiple compound agents share a base type.
  const activeCompoundAgentsRef = useRef(new Map<AgentType, Set<string>>());

  // ------- SSE event handlers -------

  const handleAgentStarted = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as AgentStartedEvent;
    const baseType = extractBaseAgentType(e.agentType);
    if (!baseType) return;

    // Track compound agent ID
    const tracking = activeCompoundAgentsRef.current;
    if (!tracking.has(baseType)) tracking.set(baseType, new Set());
    tracking.get(baseType)!.add(e.agentType);

    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(baseType);
      if (state) {
        next.set(baseType, {
          ...state,
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
      return next;
    });
  }, []);

  const handleAgentComplete = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as AgentCompleteEvent;
    const baseType = extractBaseAgentType(e.agentType);
    if (!baseType) return;

    // Remove compound ID from tracking
    const tracking = activeCompoundAgentsRef.current;
    tracking.get(baseType)?.delete(e.agentType);
    const hasRemainingActive = (tracking.get(baseType)?.size ?? 0) > 0;

    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(baseType);
      if (state?.currentTask) {
        const completedTask = {
          ...state.currentTask,
          completedAt: new Date(),
          status: "complete" as const,
        };
        next.set(baseType, {
          ...state,
          // Only transition to idle if no remaining active compound agents for this base type
          status: hasRemainingActive ? "processing" : "idle",
          currentTask: hasRemainingActive ? state.currentTask : undefined,
          lastResult: e.result,
          processingHistory: [completedTask, ...state.processingHistory].slice(
            0,
            5,
          ),
        });
      }
      return next;
    });
  }, []);

  const handleAgentError = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as AgentErrorEvent;
    const baseType = extractBaseAgentType(e.agentType);
    if (!baseType) return;

    // Remove compound ID from tracking
    const tracking = activeCompoundAgentsRef.current;
    tracking.get(baseType)?.delete(e.agentType);
    const hasRemainingActive = (tracking.get(baseType)?.size ?? 0) > 0;

    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(baseType);
      if (state?.currentTask) {
        const errorTask = {
          ...state.currentTask,
          completedAt: new Date(),
          status: "error" as const,
          error: e.error,
        };
        next.set(baseType, {
          ...state,
          // Only transition to error if no remaining active compound agents
          status: hasRemainingActive ? "processing" : "error",
          currentTask: hasRemainingActive ? state.currentTask : undefined,
          processingHistory: [errorTask, ...state.processingHistory].slice(
            0,
            5,
          ),
        });
      }
      return next;
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
        totalDurationMs: e.totalDurationMs,
        totalInputTokens: e.totalInputTokens,
        totalOutputTokens: e.totalOutputTokens,
      });
    },
    [],
  );

  const handleThinkingUpdate = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as ThinkingUpdateEvent;
    const baseType = extractBaseAgentType(e.agentType);
    if (!baseType) return;

    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(baseType);
      if (state) {
        // Validate existing traces is actually a string before concatenation
        const rawTraces = state.lastResult?.metadata?.thinkingTraces;
        const existingTraces = typeof rawTraces === "string" ? rawTraces : "";
        let updatedTraces = existingTraces
          ? existingTraces + "\n" + e.thought
          : e.thought;
        // Limit trace length to prevent unbounded memory growth (100KB max)
        const MAX_TRACES_LENGTH = 100_000;
        if (updatedTraces.length > MAX_TRACES_LENGTH) {
          updatedTraces = updatedTraces.slice(-MAX_TRACES_LENGTH);
        }
        next.set(baseType, {
          ...state,
          lastResult: {
            ...(state.lastResult || {
              taskId: "",
              agentType: baseType,
              outputs: [],
            }),
            metadata: {
              ...(state.lastResult?.metadata || {}),
              thinkingTraces: updatedTraces,
            },
          },
        });
      }
      return next;
    });
  }, []);

  const handleStateSnapshot = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as StateSnapshotEvent;
    setAgentStates((prev) => {
      const next = new Map(prev);
      for (const [agentName, agentData] of Object.entries(e.agents)) {
        // Validate agentData structure before using it
        if (
          typeof agentData !== "object" ||
          agentData === null ||
          typeof agentData.status !== "string"
        ) {
          console.warn(`Invalid agentData for ${agentName}, skipping`);
          continue;
        }

        // Resolve compound agent IDs to their base type
        const baseType = extractBaseAgentType(agentName);
        if (!baseType) {
          console.warn(
            `Unrecognized agent key in snapshot: ${agentName}, skipping`,
          );
          continue;
        }

        const existingState = next.get(baseType);
        if (existingState) {
          const frontendStatus = mapSnapshotStatus(agentData.status);
          // Safely extract metadata with type checks
          const meta = agentData.metadata;
          const validatedMetadata =
            meta && typeof meta === "object"
              ? {
                  inputTokens:
                    typeof meta.inputTokens === "number"
                      ? meta.inputTokens
                      : undefined,
                  outputTokens:
                    typeof meta.outputTokens === "number"
                      ? meta.outputTokens
                      : undefined,
                  durationMs:
                    typeof meta.durationMs === "number"
                      ? meta.durationMs
                      : undefined,
                  startedAt:
                    typeof meta.startedAt === "string"
                      ? meta.startedAt
                      : undefined,
                  completedAt:
                    typeof meta.completedAt === "string"
                      ? meta.completedAt
                      : undefined,
                  model:
                    typeof meta.model === "string" ? meta.model : undefined,
                  thinkingTraces:
                    typeof meta.thinkingTraces === "string"
                      ? meta.thinkingTraces
                      : undefined,
                }
              : undefined;

          next.set(baseType, {
            ...existingState,
            status: frontendStatus,
            lastResult: agentData.lastResult || {
              taskId: "",
              agentType: baseType,
              outputs: [],
              metadata: validatedMetadata,
            },
          });
        }
      }
      return next;
    });
  }, []);

  const handleConfirmationRequired = useCallback(
    (event: CommandCenterSSEEvent) => {
      const e = event as ConfirmationRequiredEvent;
      setPendingConfirmations((prev) => [...prev, e]);
    },
    [],
  );

  const handleConfirmationResolved = useCallback(
    (event: CommandCenterSSEEvent) => {
      const e = event as ConfirmationResolvedEvent;
      setPendingConfirmations((prev) =>
        prev.filter((c) => c.taskId !== e.taskId),
      );
    },
    [],
  );

  const handleToolCalled = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as ToolCalledEvent;
    const baseType = extractBaseAgentType(e.agentType);
    if (!baseType) return;

    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(baseType);
      if (state) {
        // Add tool to the list of tools called for this agent
        const existingTools = state.lastResult?.toolsCalled || [];
        // Avoid duplicates and limit to 20 most recent tools
        const MAX_TOOLS_TRACKED = 20;
        const updatedTools = existingTools.includes(e.toolName)
          ? existingTools
          : [...existingTools, e.toolName].slice(-MAX_TOOLS_TRACKED);

        next.set(baseType, {
          ...state,
          lastResult: {
            ...(state.lastResult || {
              taskId: "",
              agentType: baseType,
              outputs: [],
            }),
            toolsCalled: updatedTools,
          },
        });
      }
      return next;
    });
  }, []);

  // ------- SSE connection -------

  const { isConnected, isReconnecting } = useCommandCenterSSE(caseId, {
    enabled: true,
    onAgentStarted: handleAgentStarted,
    onAgentComplete: handleAgentComplete,
    onAgentError: handleAgentError,
    onProcessingComplete: handleProcessingComplete,
    onThinkingUpdate: handleThinkingUpdate,
    onStateSnapshot: handleStateSnapshot,
    onConfirmationRequired: handleConfirmationRequired,
    onConfirmationResolved: handleConfirmationResolved,
    onToolCalled: handleToolCalled,
  });

  // ------- Demo mode fallback -------
  // TODO: Remove when backend SSE is fully integrated

  const demoApplied = useRef(false);

  useEffect(() => {
    if (demoApplied.current) return;
    const timer = setTimeout(() => {
      if (!isConnected && !demoApplied.current) {
        demoApplied.current = true;
        setAgentStates(createDemoAgentStates());
      }
    }, DEMO_MODE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      demoApplied.current = false;
    }
  }, [isConnected]);

  return {
    agentStates,
    lastProcessingSummary,
    pendingConfirmations,
    isConnected,
    isReconnecting,
  };
}

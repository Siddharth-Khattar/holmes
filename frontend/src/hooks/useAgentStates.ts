// ABOUTME: Custom hook managing agent state lifecycle for the Command Center.
// ABOUTME: Handles SSE event processing, state transitions, and demo mode fallback.

import { useState, useCallback, useEffect, useRef } from "react";

import { useCommandCenterSSE } from "@/hooks/useCommandCenterSSE";
import { AGENT_CONFIGS } from "@/lib/command-center-config";
import { createDemoAgentStates } from "@/lib/mock-command-center-data";
import type {
  AgentState,
  AgentType,
  CommandCenterSSEEvent,
  ProcessingSummary,
  AgentStartedEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  ProcessingCompleteEvent,
} from "@/types/command-center";

/** Delay before activating demo mode when no SSE connection is established */
const DEMO_MODE_DELAY_MS = 3000;

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
  isConnected: boolean;
  isReconnecting: boolean;
}

/**
 * Manages the full agent state lifecycle:
 * - Initializes idle state for all configured agent types
 * - Processes SSE events (started, complete, error, processing-complete)
 * - Falls back to demo mode with mock data when backend is unavailable
 *
 * TODO: Remove demo mode fallback when backend SSE is fully integrated
 */
export function useAgentStates(caseId: string): UseAgentStatesReturn {
  const [agentStates, setAgentStates] =
    useState<Map<AgentType, AgentState>>(createInitialStates);
  const [lastProcessingSummary, setLastProcessingSummary] =
    useState<ProcessingSummary | null>(null);

  // ------- SSE event handlers -------

  const handleAgentStarted = useCallback((event: CommandCenterSSEEvent) => {
    const e = event as AgentStartedEvent;
    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(e.agentType);
      if (state) {
        next.set(e.agentType, {
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
    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(e.agentType);
      if (state?.currentTask) {
        const completedTask = {
          ...state.currentTask,
          completedAt: new Date(),
          status: "complete" as const,
        };
        next.set(e.agentType, {
          ...state,
          status: "idle",
          currentTask: undefined,
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
    setAgentStates((prev) => {
      const next = new Map(prev);
      const state = next.get(e.agentType);
      if (state?.currentTask) {
        const errorTask = {
          ...state.currentTask,
          completedAt: new Date(),
          status: "error" as const,
          error: e.error,
        };
        next.set(e.agentType, {
          ...state,
          status: "error",
          currentTask: undefined,
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
      });
    },
    [],
  );

  // ------- SSE connection -------

  const { isConnected, isReconnecting } = useCommandCenterSSE(caseId, {
    enabled: true,
    onAgentStarted: handleAgentStarted,
    onAgentComplete: handleAgentComplete,
    onAgentError: handleAgentError,
    onProcessingComplete: handleProcessingComplete,
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

  return { agentStates, lastProcessingSummary, isConnected, isReconnecting };
}

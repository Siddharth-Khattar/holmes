"use client";

import { useState, useCallback, useMemo } from "react";
import { Activity, AlertCircle } from "lucide-react";
import { AgentFlowCanvas } from "./AgentFlowCanvas";
import { AgentDetailsPanel } from "./AgentDetailsPanel";
import { useCommandCenterSSE } from "@/hooks/useCommandCenterSSE";
import {
  AGENT_CONFIGS,
  DEFAULT_CONNECTIONS,
} from "@/lib/command-center-config";
import type {
  AgentState,
  AgentType,
  AgentConnection,
  CommandCenterSSEEvent,
  ProcessingSummary,
  AgentStartedEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  ProcessingCompleteEvent,
} from "@/types/command-center";

interface CommandCenterProps {
  caseId: string;
  className?: string;
}

export function CommandCenter({ caseId, className }: CommandCenterProps) {
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

  // Handle agent started event
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

  // Handle agent complete event
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

  // Handle agent error event
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

  // Handle processing complete event
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

  // Calculate connections with animation state
  const connections = useMemo<AgentConnection[]>(() => {
    return DEFAULT_CONNECTIONS.map((conn) => {
      const sourceState = agentStates.get(conn.source);
      const targetState = agentStates.get(conn.target);

      // Animate when source has completed and target is processing
      const animated =
        sourceState?.status === "idle" &&
        sourceState?.lastResult !== undefined &&
        targetState?.status === "processing";

      return {
        id: `${conn.source}-${conn.target}`,
        source: conn.source,
        target: conn.target,
        animated,
        metadata: {
          routingDecisions: sourceState?.lastResult?.routingDecisions,
        },
      };
    });
  }, [agentStates]);

  // Check if any agent is processing
  const isProcessing = useMemo(() => {
    return Array.from(agentStates.values()).some(
      (state) => state.status === "processing",
    );
  }, [agentStates]);

  return (
    <div
      className={`flex flex-col w-full h-full bg-charcoal rounded-lg overflow-hidden border border-stone/10 ${className || ""}`}
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

      {/* Main Content */}
      <div className="flex-1 flex gap-0 overflow-hidden min-h-0">
        {/* Agent Flow Canvas */}
        <div
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            width: selectedAgent ? "60%" : "100%",
          }}
        >
          <AgentFlowCanvas
            agentStates={agentStates}
            connections={connections}
            onAgentClick={setSelectedAgent}
            selectedAgent={selectedAgent}
          />
        </div>

        {/* Agent Details Panel */}
        <div
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            width: selectedAgent ? "40%" : "0%",
            opacity: selectedAgent ? 1 : 0,
          }}
        >
          {selectedAgent && (
            <AgentDetailsPanel
              agentState={agentStates.get(selectedAgent)}
              onClose={() => setSelectedAgent(null)}
            />
          )}
        </div>
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

"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { CommandCenter } from "@/components/CommandCenter";
import { ConfirmationModal } from "@/components/CommandCenter/ConfirmationModal";
import { BatchConfirmationModal } from "@/components/CommandCenter/BatchConfirmationModal";
import { useAgentStates } from "@/hooks/useAgentStates";
import { useDetailSidebarDispatch } from "@/hooks";
import type { AgentType } from "@/types/command-center";

export default function CommandCenterPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);

  const {
    agentStates,
    lastProcessingSummary,
    pendingConfirmations,
    pendingBatchConfirmations,
    removePendingConfirmation,
    removePendingBatchConfirmation,
    isConnected,
    isReconnecting,
  } = useAgentStates(caseId);

  const { setContent, clearContent, setCollapsed } = useDetailSidebarDispatch();

  // User-initiated agent selection: also ensures sidebar is expanded.
  // This is separate from the sync effect (which handles passive SSE updates
  // without forcing the sidebar open if the user collapsed it).
  const handleSelectAgent = useCallback(
    (agent: AgentType | null) => {
      setSelectedAgent(agent);
      if (agent) {
        setCollapsed(false);
      }
    },
    [setCollapsed],
  );

  // Sync selectedAgent + agentStates into the app-wide detail sidebar
  useEffect(() => {
    if (selectedAgent) {
      setContent({
        type: "command-center-agent",
        props: {
          agentType: selectedAgent,
          agentState: agentStates.get(selectedAgent) ?? null,
          allAgentStates: agentStates,
        },
      });
    } else {
      clearContent();
    }
  }, [selectedAgent, agentStates, setContent, clearContent]);

  // Clear sidebar content on unmount (navigate away from Command Center)
  useEffect(() => {
    return () => {
      clearContent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimistic removal for immediate UI feedback before SSE round-trip.
  // The SSE resolved events in useAgentStates serve as backup.
  const handleConfirmationResolved = useCallback(
    (requestId: string) => {
      removePendingConfirmation(requestId);
    },
    [removePendingConfirmation],
  );

  const handleBatchConfirmationResolved = useCallback(
    (batchId: string) => {
      removePendingBatchConfirmation(batchId);
    },
    [removePendingBatchConfirmation],
  );

  return (
    <div
      className="command-center-scope w-full"
      style={{ height: "calc(100vh - 200px)" }}
    >
      <CommandCenter
        agentStates={agentStates}
        lastProcessingSummary={lastProcessingSummary}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        selectedAgent={selectedAgent}
        onSelectAgent={handleSelectAgent}
        className="h-full w-full"
      />

      {/* HITL Confirmation Modals - batch takes priority over single */}
      {pendingBatchConfirmations.length > 0 ? (
        <BatchConfirmationModal
          batch={pendingBatchConfirmations[0]}
          caseId={caseId}
          onResolved={handleBatchConfirmationResolved}
        />
      ) : pendingConfirmations.length > 0 ? (
        <ConfirmationModal
          confirmation={pendingConfirmations[0]}
          caseId={caseId}
          onResolved={handleConfirmationResolved}
        />
      ) : null}
    </div>
  );
}

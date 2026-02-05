"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { CommandCenter } from "@/components/CommandCenter";
import { ConfirmationModal } from "@/components/CommandCenter/ConfirmationModal";
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

  // Fallback handler for removing a resolved confirmation from local state.
  // The SSE confirmation-resolved event in useAgentStates also handles this,
  // but this provides immediate UI feedback before the SSE round-trip.
  const handleConfirmationResolved = useCallback((requestId: string) => {
    // useAgentStates manages the pendingConfirmations array via SSE events.
    // This callback exists for the ConfirmationModal to signal completion.
    // The SSE confirmation-resolved handler will handle the actual state update.
    void requestId;
  }, []);

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

      {/* HITL Confirmation Modal - show first pending confirmation */}
      {pendingConfirmations.length > 0 && (
        <ConfirmationModal
          confirmation={pendingConfirmations[0]}
          caseId={caseId}
          onResolved={handleConfirmationResolved}
        />
      )}
    </div>
  );
}

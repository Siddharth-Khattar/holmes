"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CommandCenter } from "@/components/CommandCenter";
import { NodeDetailsSidebar } from "@/components/CommandCenter/NodeDetailsSidebar";
import { ConfirmationModal } from "@/components/CommandCenter/ConfirmationModal";
import { useAgentStates } from "@/hooks/useAgentStates";
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
      className="command-center-scope flex flex-row w-full"
      style={{ height: "calc(100vh - 200px)" }}
    >
      <div className="flex-1 min-w-0">
        <CommandCenter
          agentStates={agentStates}
          lastProcessingSummary={lastProcessingSummary}
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
          className="h-full w-full"
        />
      </div>
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "30%" }}
            exit={{ width: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex-none overflow-hidden"
            style={{
              background: "var(--color-jet)",
              borderLeft: "1px solid hsl(0 0% 50% / 0.15)",
            }}
          >
            <NodeDetailsSidebar
              agentType={selectedAgent}
              agentState={agentStates.get(selectedAgent) ?? null}
              onClose={() => setSelectedAgent(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

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

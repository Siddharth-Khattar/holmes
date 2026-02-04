"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CommandCenter } from "@/components/CommandCenter";
import { NodeDetailsSidebar } from "@/components/CommandCenter/NodeDetailsSidebar";
import { useAgentStates } from "@/hooks/useAgentStates";
import type { AgentType } from "@/types/command-center";

export default function CommandCenterPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);

  const { agentStates, lastProcessingSummary, isConnected, isReconnecting } =
    useAgentStates(caseId);

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
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { CommandCenter } from "@/components/CommandCenter";
import { NodeDetailsSidebar } from "@/components/CommandCenter/NodeDetailsSidebar";
import { useAgentStates } from "@/hooks/useAgentStates";
import { simulateProcessingFlow } from "@/lib/mock-command-center-data";
import { extractBaseAgentType } from "@/lib/command-center-validation";

export default function CommandCenterDemoPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationKey, setSimulationKey] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { agentStates, lastProcessingSummary, isConnected, isReconnecting } =
    useAgentStates(caseId);

  const startSimulation = () => {
    setIsSimulating(true);
    simulateProcessingFlow((event) => {
      // Events will be handled by the SSE hook in production
      console.log("Mock event:", event);
    }, 1500).then(() => {
      setIsSimulating(false);
    });
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimulationKey((prev) => prev + 1);
  };

  const selectedState = selectedAgent
    ? agentStates.get(selectedAgent)
    : undefined;
  const selectedBaseType = selectedAgent
    ? (selectedState?.type ?? extractBaseAgentType(selectedAgent))
    : null;

  return (
    <div
      className="w-full flex flex-col"
      style={{ height: "calc(100vh - 280px)" }}
    >
      {/* Demo Controls */}
      <div className="flex-none p-4 bg-jet border-b border-stone/15 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-smoke mb-1">
              Command Center Demo
            </h3>
            <p className="text-xs text-stone">
              This is a demo page with mock data. In production, events come
              from the backend SSE stream.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSimulating ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span className="text-sm">Simulating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span className="text-sm">Start Simulation</span>
                </>
              )}
            </button>
            <button
              onClick={resetSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone/10 hover:bg-stone/20 text-stone disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Command Center + sidebar */}
      <div className="command-center-scope flex-1 min-h-0 flex flex-row overflow-hidden">
        <div className="flex-1 min-w-0">
          <CommandCenter
            key={simulationKey}
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
          {selectedAgent && selectedBaseType && (
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
                agentType={selectedBaseType}
                agentState={selectedState ?? null}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { CommandCenter } from "@/components/CommandCenter";
import { Play, Pause, RotateCcw } from "lucide-react";
import { simulateProcessingFlow } from "@/lib/mock-command-center-data";

export default function CommandCenterDemoPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationKey, setSimulationKey] = useState(0);

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

      {/* Command Center */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CommandCenter
          key={simulationKey}
          caseId={caseId}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

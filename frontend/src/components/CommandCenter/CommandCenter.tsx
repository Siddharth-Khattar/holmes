// ABOUTME: Main Command Center container — thin composition shell.
// ABOUTME: Accepts externally-managed state; renders canvas with header/footer chrome.

"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { Activity, AlertCircle } from "lucide-react";
import { AgentFlowCanvas } from "./AgentFlowCanvas";
import { useAgentFlowGraph } from "@/hooks/useAgentFlowGraph";
import type { AgentState, ProcessingSummary } from "@/types/command-center";

// -----------------------------------------------------------------------
// Props — state is owned by the parent page, not this component
// -----------------------------------------------------------------------
export interface CommandCenterProps {
  agentStates: Map<string, AgentState>;
  lastProcessingSummary: ProcessingSummary | null;
  isConnected: boolean;
  isReconnecting: boolean;
  selectedAgent: string | null;
  onSelectAgent: (agent: string | null) => void;
  className?: string;
}

// -----------------------------------------------------------------------
// Connection status badge (extracted to avoid ternary nesting in JSX)
// -----------------------------------------------------------------------
function ConnectionBadge({
  isConnected,
  isReconnecting,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
}) {
  if (isReconnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs text-amber-500">Reconnecting...</span>
      </div>
    );
  }
  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-green-500">Connected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone/10 border border-stone/20">
      <AlertCircle className="w-3 h-3 text-stone" />
      <span className="text-xs text-stone">Demo Mode</span>
    </div>
  );
}

// -----------------------------------------------------------------------
// Inner component (must be inside ReactFlowProvider)
// -----------------------------------------------------------------------
function CommandCenterInner({
  agentStates,
  lastProcessingSummary,
  isConnected,
  isReconnecting,
  selectedAgent,
  onSelectAgent,
  className,
}: CommandCenterProps) {
  // Graph derivation: agent states → laid-out ReactFlow nodes/edges
  const { nodes, edges, isProcessing } = useAgentFlowGraph({
    agentStates,
    selectedAgent,
  });

  return (
    <div
      className={`command-center-scope flex flex-col w-full h-full bg-background dark:bg-charcoal rounded-lg overflow-hidden border-2 border-warm-gray/30 dark:border-stone/30 ${className || ""}`}
    >
      {/* Header */}
      <div className="flex-none px-6 py-3 border-b border-stone/15">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-smoke mb-0.5">
              Command Center
            </h2>
            <p className="text-xs text-stone">
              Real-time agent processing visualization
            </p>
          </div>
          <ConnectionBadge
            isConnected={isConnected}
            isReconnecting={isReconnecting}
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden min-h-0">
        <AgentFlowCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={(nodeId) => {
            if (!nodeId.startsWith("file-group-")) {
              onSelectAgent(nodeId);
            }
          }}
          selectedNodeId={selectedAgent}
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
          {lastProcessingSummary && !isProcessing && (
            <div className="text-stone/60">
              {lastProcessingSummary.completedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Public export wraps inner content in ReactFlowProvider
// -----------------------------------------------------------------------
export function CommandCenter(props: CommandCenterProps) {
  return (
    <ReactFlowProvider>
      <CommandCenterInner {...props} />
    </ReactFlowProvider>
  );
}

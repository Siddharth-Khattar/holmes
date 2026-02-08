// ABOUTME: Main Command Center container — thin composition shell.
// ABOUTME: Accepts externally-managed state; renders canvas with header/footer chrome.

"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { Activity, AlertCircle } from "lucide-react";
import { AgentFlowCanvas } from "./AgentFlowCanvas";
import { CanvasShell } from "@/components/ui/canvas-shell";
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

  const footerContent = (
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
  );

  return (
    <CanvasShell
      title="Command Center"
      subtitle="Real-time agent processing visualization"
      headerRight={
        <ConnectionBadge
          isConnected={isConnected}
          isReconnecting={isReconnecting}
        />
      }
      footer={footerContent}
      className={`command-center-scope ${className || ""}`}
    >
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
    </CanvasShell>
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

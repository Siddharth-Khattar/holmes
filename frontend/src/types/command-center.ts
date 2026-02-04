// Command Center Types - Agent Processing Visualization

export type AgentType =
  | "triage"
  | "orchestrator"
  | "financial"
  | "legal"
  | "strategy"
  | "evidence"
  | "knowledge-graph";

export type AgentStatus = "idle" | "processing" | "complete" | "error";

export interface AgentTask {
  taskId: string;
  fileId: string;
  fileName: string;
  startedAt: Date;
  completedAt?: Date;
  status: "processing" | "complete" | "error";
  error?: string;
}

export interface AgentOutput {
  type: string;
  data: unknown;
  confidence?: number;
}

export interface RoutingDecision {
  fileId: string;
  targetAgent: AgentType;
  reason: string;
  domainScore: number; // Confidence score 0-100 (percentage)
}

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  outputs: AgentOutput[];
  routingDecisions?: RoutingDecision[];
  toolsCalled?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  id: string;
  type: AgentType;
  status: AgentStatus;
  currentTask?: AgentTask;
  lastResult?: AgentResult;
  processingHistory: AgentTask[];
}

export interface AgentConnection {
  id: string;
  source: AgentType;
  target: AgentType;
  animated: boolean;
  metadata?: {
    routingDecisions?: RoutingDecision[];
    fileGroupings?: unknown[];
  };
}

// SSE Event Types
export interface AgentStartedEvent {
  type: "agent-started";
  agentType: AgentType;
  taskId: string;
  fileId: string;
  fileName: string;
}

export interface AgentCompleteEvent {
  type: "agent-complete";
  agentType: AgentType;
  taskId: string;
  result: AgentResult;
}

export interface AgentErrorEvent {
  type: "agent-error";
  agentType: AgentType;
  taskId: string;
  error: string;
}

export interface ProcessingCompleteEvent {
  type: "processing-complete";
  caseId: string;
  filesProcessed: number;
  entitiesCreated: number;
  relationshipsCreated: number;
  totalDurationMs?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
}

export interface ThinkingUpdateEvent {
  type: "thinking-update";
  agentType: AgentType;
  thought: string;
  timestamp?: string; // Optional: present in ADK callback events, may be absent in direct emissions
  tokenDelta?: {
    inputTokens: number;
    outputTokens: number;
    thoughtsTokens: number;
  };
}

export interface StateSnapshotEvent {
  type: "state-snapshot";
  agents: Record<
    string,
    {
      status: string;
      metadata?: {
        inputTokens?: number;
        outputTokens?: number;
        durationMs?: number;
        startedAt?: string;
        completedAt?: string;
        model?: string;
        thinkingTraces?: string;
      };
      lastResult?: AgentResult;
    }
  >;
}

export interface ConfirmationRequiredEvent {
  type: "confirmation-required";
  taskId: string;
  agentType: AgentType;
  actionDescription: string;
  affectedItems?: string[]; // Optional: may not be sent by backend
  context?: Record<string, unknown>; // Optional: backend sends when available
}

export interface ConfirmationResolvedEvent {
  type: "confirmation-resolved";
  taskId: string;
  agentType: AgentType;
  approved: boolean;
  reason?: string;
}

export interface ToolCalledEvent {
  type: "tool-called";
  agentType: AgentType;
  toolName: string;
  timestamp: string;
}

export type CommandCenterSSEEvent =
  | AgentStartedEvent
  | AgentCompleteEvent
  | AgentErrorEvent
  | ProcessingCompleteEvent
  | ThinkingUpdateEvent
  | StateSnapshotEvent
  | ConfirmationRequiredEvent
  | ConfirmationResolvedEvent
  | ToolCalledEvent;

// Agent Configuration
export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  color: string;
  position: { x: number; y: number };
  model?: string;
}

export interface ProcessingSummary {
  filesProcessed: number;
  entitiesCreated: number;
  relationshipsCreated: number;
  completedAt: Date;
  totalDurationMs?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
}

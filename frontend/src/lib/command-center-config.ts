// ABOUTME: Command Center configuration - agent metadata, connection topology,
// ABOUTME: teal accent tint mappings, and dagre layout constants.

import type { AgentConfig, AgentType } from "@/types/command-center";

// Agent configurations with placeholder color/position (dagre computes positions,
// CSS variables provide colors). Placeholders satisfy the AgentConfig type contract.
export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  triage: {
    type: "triage",
    name: "Triage Agent",
    description: "Analyzes files and makes routing decisions",
    color: "",
    position: { x: 0, y: 0 },
    model: "Gemini 3 Pro",
  },
  orchestrator: {
    type: "orchestrator",
    name: "Orchestrator",
    description: "Coordinates parallel processing across domain agents",
    color: "",
    position: { x: 0, y: 0 },
    model: "Gemini 3 Pro",
  },
  financial: {
    type: "financial",
    name: "Financial Agent",
    description: "Processes financial documents and transactions",
    color: "",
    position: { x: 0, y: 0 },
    model: "Gemini 3 Pro",
  },
  legal: {
    type: "legal",
    name: "Legal Agent",
    description: "Extracts legal entities and relationships",
    color: "",
    position: { x: 0, y: 0 },
    model: "Gemini 3 Pro",
  },
  strategy: {
    type: "strategy",
    name: "Strategy Agent",
    description: "Identifies patterns and strategic insights",
    color: "",
    position: { x: 0, y: 0 },
    model: "Gemini 3 Pro",
  },
  "knowledge-graph": {
    type: "knowledge-graph",
    name: "Knowledge Graph Agent",
    description: "Builds unified knowledge graph from all agents",
    color: "",
    position: { x: 0, y: 0 },
    model: "Gemini 3 Pro",
  },
};

// Default connections between agents
export const DEFAULT_CONNECTIONS: Array<{
  source: AgentType;
  target: AgentType;
}> = [
  { source: "triage", target: "orchestrator" },
  { source: "orchestrator", target: "financial" },
  { source: "orchestrator", target: "legal" },
  { source: "orchestrator", target: "strategy" },
  { source: "financial", target: "knowledge-graph" },
  { source: "legal", target: "knowledge-graph" },
  { source: "strategy", target: "knowledge-graph" },
];

// Maps each agent type to its scoped CSS variable for background hue tinting
// on chosen/active nodes. Consumed by DecisionNode for per-agent visual identity.
export const AGENT_TYPE_TINTS: Record<AgentType, string> = {
  triage: "var(--cc-triage-tint)",
  orchestrator: "var(--cc-orchestrator-tint)",
  financial: "var(--cc-financial-tint)",
  legal: "var(--cc-legal-tint)",
  strategy: "var(--cc-strategy-tint)",
  "knowledge-graph": "var(--cc-kg-tint)",
};

// Node dimensions for dagre layout computation. DecisionNode enforces the same
// fixed dimensions via Tailwind classes (w-[300px] h-[100px]).
export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 100;

// Status colors - retained for backward compatibility with AgentNode.tsx (SVG).
// Will be removed when AgentNode.tsx is replaced by DecisionNode in Plan 03.
export const STATUS_COLORS = {
  idle: "#9ca3af",
  processing: "#8B7355",
  complete: "#9D8B73",
  error: "#ef4444",
};

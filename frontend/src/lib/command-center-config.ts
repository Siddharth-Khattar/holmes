// Command Center Configuration

import type { AgentConfig, AgentType } from "@/types/command-center";

// Agent colors matching the warm brown palette
export const AGENT_COLORS: Record<AgentType, string> = {
  triage: "#8B7355", // Warm brown
  orchestrator: "#6B5A47", // Deep warm brown
  financial: "#9D8B73", // Light warm brown
  legal: "#B89968", // Golden brown
  strategy: "#A68A6A", // Tan brown
  "knowledge-graph": "#7A6B5D", // Medium warm brown
};

// Agent configurations with positions for hierarchical layout
export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  triage: {
    type: "triage",
    name: "Triage Agent",
    description: "Analyzes files and makes routing decisions",
    color: AGENT_COLORS.triage,
    position: { x: 0, y: 0 }, // Will be calculated dynamically
    model: "Gemini 3 Pro",
  },
  orchestrator: {
    type: "orchestrator",
    name: "Orchestrator",
    description: "Coordinates parallel processing across domain agents",
    color: AGENT_COLORS.orchestrator,
    position: { x: 0, y: 150 },
    model: "Gemini 3 Pro",
  },
  financial: {
    type: "financial",
    name: "Financial Agent",
    description: "Processes financial documents and transactions",
    color: AGENT_COLORS.financial,
    position: { x: -300, y: 300 },
    model: "Gemini 3 Pro",
  },
  legal: {
    type: "legal",
    name: "Legal Agent",
    description: "Extracts legal entities and relationships",
    color: AGENT_COLORS.legal,
    position: { x: 0, y: 300 },
    model: "Gemini 3 Pro",
  },
  strategy: {
    type: "strategy",
    name: "Strategy Agent",
    description: "Identifies patterns and strategic insights",
    color: AGENT_COLORS.strategy,
    position: { x: 300, y: 300 },
    model: "Gemini 3 Pro",
  },
  "knowledge-graph": {
    type: "knowledge-graph",
    name: "Knowledge Graph Agent",
    description: "Builds unified knowledge graph from all agents",
    color: AGENT_COLORS["knowledge-graph"],
    position: { x: 0, y: 450 },
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

// Status colors
export const STATUS_COLORS = {
  idle: "#9ca3af", // Gray
  processing: "#8B7355", // Warm brown (matches primary)
  complete: "#9D8B73", // Light warm brown
  error: "#ef4444", // Red
};

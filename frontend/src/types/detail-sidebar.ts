// ABOUTME: Type definitions for the app-wide right detail sidebar.
// ABOUTME: Uses discriminated union pattern for content descriptors.

import type { AgentType, AgentState } from "./command-center";
import type { Evidence } from "./knowledge-graph";

// ---------------------------------------------------------------------------
// Content Descriptors (discriminated union)
// ---------------------------------------------------------------------------

/** Command Center agent node detail view */
export interface CommandCenterAgentContent {
  type: "command-center-agent";
  props: {
    agentType: AgentType;
    agentState: AgentState | null;
    allAgentStates: Map<AgentType, AgentState>;
  };
}

/** Knowledge Graph evidence detail view */
export interface KnowledgeGraphEvidenceContent {
  type: "knowledge-graph-evidence";
  props: {
    evidence: Evidence;
  };
}

/** Union of all possible sidebar content descriptors */
export type SidebarContentDescriptor =
  | CommandCenterAgentContent
  | KnowledgeGraphEvidenceContent;

// ---------------------------------------------------------------------------
// Sidebar State
// ---------------------------------------------------------------------------

export interface DetailSidebarState {
  content: SidebarContentDescriptor | null;
  isCollapsed: boolean;
  widthPercent: number;
}

export interface DetailSidebarDispatch {
  setContent: (content: SidebarContentDescriptor) => void;
  clearContent: () => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  setWidthPercent: (percent: number) => void;
}

// ---------------------------------------------------------------------------
// Width Constants
// ---------------------------------------------------------------------------

export const SIDEBAR_WIDTH_MIN = 20;
export const SIDEBAR_WIDTH_MAX = 50;
export const SIDEBAR_WIDTH_DEFAULT = 40;

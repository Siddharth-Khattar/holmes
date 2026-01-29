export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatbotContext {
  caseId?: string;
  caseName?: string;
  caseDescription?: string;
  caseStatus?: string;
  currentPage?: "command-center" | "knowledge-graph" | "upload" | "timeline";
}

export interface ChatbotState {
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  messages: ChatMessage[];
}

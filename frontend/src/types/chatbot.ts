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

// Backend API types
export interface ChatApiRequest {
  message: string;
  context?: ChatbotContext;
  history: ChatMessage[];
}

export interface ChatApiResponse {
  message: string;
  metadata?: {
    model?: string;
    tokens?: number;
    timestamp?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

export interface ChatApiError {
  error: string;
  code?: string;
  details?: string;
}

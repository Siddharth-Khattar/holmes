import { useState, useCallback } from "react";
import type { ChatMessage, ChatbotContext } from "@/types/chatbot";

interface UseChatbotOptions {
  context?: ChatbotContext;
  onError?: (error: Error) => void;
  apiEndpoint?: string; // Allow custom API endpoint
}

interface ChatApiRequest {
  message: string;
  context?: ChatbotContext;
  history: ChatMessage[];
}

interface ChatApiResponse {
  message: string;
  metadata?: {
    model?: string;
    tokens?: number;
    timestamp?: string;
  };
}

export function useChatbot({
  context,
  onError,
  apiEndpoint = "/api/chat",
}: UseChatbotOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        // Try to call the backend API
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
            context,
            history: messages,
          } as ChatApiRequest),
        });

        if (response.ok) {
          // Backend is available - use real response
          const data: ChatApiResponse = await response.json();

          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.message,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          // Backend returned an error - fall back to mock
          throw new Error(`API returned ${response.status}`);
        }
      } catch (error) {
        // Backend not available or error occurred - use mock response
        console.log("Using mock response (backend not available):", error);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: generateContextualResponse(content, context),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Only call onError if it's not a network/404 error (backend not ready)
        const isNetworkError = error instanceof TypeError;
        const is404Error =
          error instanceof Error && error.message.includes("404");

        if (onError && !isNetworkError && !is404Error) {
          onError(error as Error);
        }
      } finally {
        setIsTyping(false);
      }
    },
    [context, onError, apiEndpoint, messages],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isTyping,
    sendMessage,
    clearMessages,
  };
}

// Helper function to generate contextual responses
function generateContextualResponse(
  userMessage: string,
  context?: ChatbotContext,
): string {
  const lowerMessage = userMessage.toLowerCase();

  // Context-aware responses
  if (context?.caseName) {
    if (lowerMessage.includes("status") || lowerMessage.includes("progress")) {
      return `The case "${context.caseName}" is currently in ${context.caseStatus || "unknown"} status. ${context.caseDescription ? `This case is about: ${context.caseDescription}` : ""}`;
    }

    if (lowerMessage.includes("timeline")) {
      return `You can view the timeline of events for "${context.caseName}" by navigating to the Timeline tab. This will show you a chronological view of all case activities.`;
    }

    if (lowerMessage.includes("knowledge") || lowerMessage.includes("graph")) {
      return `The Knowledge Graph for "${context.caseName}" visualizes the relationships between entities in your case. You can explore it in the Knowledge Graph tab.`;
    }

    if (lowerMessage.includes("upload") || lowerMessage.includes("evidence")) {
      return `To add evidence to "${context.caseName}", go to the Upload tab where you can upload documents, images, and other files related to your case.`;
    }

    if (
      lowerMessage.includes("help") ||
      lowerMessage.includes("what can you do")
    ) {
      return `I can help you with "${context.caseName}" by:
- Answering questions about case status and progress
- Guiding you through different features (Timeline, Knowledge Graph, Upload)
- Providing insights about your case data
- Helping you navigate the application

What would you like to know?`;
    }
  }

  // General responses
  return `I understand you're asking about "${userMessage}". ${context?.caseName ? `In the context of case "${context.caseName}", ` : ""}I'm here to help you analyze and understand your case data. Could you provide more details about what you'd like to know?`;
}

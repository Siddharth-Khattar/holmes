import { useState, useCallback } from "react";
import type { ChatMessage, ChatbotContext } from "@/types/chatbot";

interface UseChatbotOptions {
  context?: ChatbotContext;
  onError?: (error: Error) => void;
}

export function useChatbot({ context, onError }: UseChatbotOptions = {}) {
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
        // TODO: Replace with actual API call to your backend
        // const response = await fetch('/api/chat', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     message: content,
        //     context,
        //     history: messages,
        //   }),
        // });
        // const data = await response.json();

        // Simulate AI response for now
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: generateContextualResponse(content, context),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        onError?.(error as Error);
        
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [context, onError]
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
  context?: ChatbotContext
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

    if (lowerMessage.includes("help") || lowerMessage.includes("what can you do")) {
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

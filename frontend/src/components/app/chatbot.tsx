"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import { useChatbot } from "@/hooks/useChatbot";

interface ChatbotProps {
  caseId?: string;
  caseContext?: {
    name: string;
    description?: string;
    status: string;
  };
}

export function Chatbot({ caseId, caseContext }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const { messages, isTyping, sendMessage } = useChatbot({
    context: {
      caseId,
      caseName: caseContext?.name,
      caseDescription: caseContext?.description,
      caseStatus: caseContext?.status,
    },
  });
  
  // Window dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Window resizing state
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      setSize({
        width: Math.max(320, resizeStart.width + deltaX),
        height: Math.max(400, resizeStart.height + deltaY),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (chatWindowRef.current) {
      const rect = chatWindowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
    setIsResizing(true);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const message = inputValue;
    setInputValue("");
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className={clsx(
              "fixed bottom-6 right-6 z-50",
              "w-14 h-14 rounded-full",
              "flex items-center justify-center",
              "shadow-lg hover:shadow-xl transition-shadow",
              "bg-[var(--light-accent)] dark:bg-[var(--accent)]",
              "text-[var(--light-bg)] dark:text-[var(--charcoal)]"
            )}
            aria-label="Open chat"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            initial={{ scale: 0, opacity: 0, x: "100%", y: "100%" }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              x: position.x || "calc(100vw - 100% - 24px)", 
              y: position.y || "calc(100vh - 100% - 24px)" 
            }}
            exit={{ scale: 0, opacity: 0, x: "100%", y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              width: isMinimized ? 320 : size.width,
              height: isMinimized ? 60 : size.height,
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "fixed",
              zIndex: 1000,
            }}
            className={clsx(
              "rounded-xl overflow-hidden",
              "shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]",
              "bg-[var(--light-bg-subtle)] dark:bg-[var(--jet)]",
              "border border-[var(--light-border)] dark:border-[var(--smoke)]/10",
              "flex flex-col"
            )}
          >
            {/* Header - Draggable */}
            <div
              onMouseDown={handleDragStart}
              className={clsx(
                "flex items-center justify-between px-4 py-3",
                "bg-[var(--light-bg)] dark:bg-[var(--charcoal)]",
                "border-b border-[var(--light-border)] dark:border-[var(--smoke)]/10",
                "cursor-move select-none"
              )}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[var(--light-accent)] dark:text-[var(--accent)]" />
                <h3 className="font-medium text-[var(--light-text)] dark:text-[var(--smoke)]">
                  Case Assistant
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 rounded hover:bg-[var(--light-border)] dark:hover:bg-[var(--smoke)]/10 transition-colors"
                  aria-label={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-[var(--light-text-muted)] dark:text-[var(--stone)]" />
                  ) : (
                    <Minimize2 className="w-4 h-4 text-[var(--light-text-muted)] dark:text-[var(--stone)]" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-[var(--light-border)] dark:hover:bg-[var(--smoke)]/10 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4 text-[var(--light-text-muted)] dark:text-[var(--stone)]" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-[var(--light-text-muted)] dark:text-[var(--stone)] opacity-50" />
                      <p className="text-[var(--light-text-muted)] dark:text-[var(--stone)] text-sm">
                        {caseContext
                          ? `Ask me anything about "${caseContext.name}"`
                          : "Start a conversation to get help with your case"}
                      </p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={clsx(
                          "max-w-[80%] rounded-lg px-4 py-2",
                          message.role === "user"
                            ? "bg-[var(--light-accent)] dark:bg-[var(--accent)] text-[var(--light-bg)] dark:text-[var(--charcoal)]"
                            : "bg-[var(--light-bg)] dark:bg-[var(--charcoal)] text-[var(--light-text)] dark:text-[var(--smoke)] border border-[var(--light-border)] dark:border-[var(--smoke)]/10"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <span className="text-xs opacity-60 mt-1 block">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-[var(--light-bg)] dark:bg-[var(--charcoal)] rounded-lg px-4 py-3 border border-[var(--light-border)] dark:border-[var(--smoke)]/10">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-[var(--light-text-muted)] dark:bg-[var(--stone)] animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-[var(--light-text-muted)] dark:bg-[var(--stone)] animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-[var(--light-text-muted)] dark:bg-[var(--stone)] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-[var(--light-border)] dark:border-[var(--smoke)]/10 bg-[var(--light-bg)] dark:bg-[var(--charcoal)]">
                  <div className="flex gap-2">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      rows={1}
                      className={clsx(
                        "flex-1 px-3 py-2 rounded-lg resize-none",
                        "bg-[var(--light-bg-subtle)] dark:bg-[var(--jet)]",
                        "border border-[var(--light-border)] dark:border-[var(--smoke)]/10",
                        "text-[var(--light-text)] dark:text-[var(--smoke)]",
                        "placeholder:text-[var(--light-text-muted)] dark:placeholder:text-[var(--stone)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--light-accent)] dark:focus:ring-[var(--accent)]",
                        "text-sm"
                      )}
                      style={{ maxHeight: "120px" }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      className={clsx(
                        "px-4 py-2 rounded-lg",
                        "bg-[var(--light-accent)] dark:bg-[var(--accent)]",
                        "text-[var(--light-bg)] dark:text-[var(--charcoal)]",
                        "hover:bg-[var(--light-accent-hover)] dark:hover:bg-[var(--accent-muted)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors",
                        "flex items-center justify-center"
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resize Handle */}
                <div
                  onMouseDown={handleResizeStart}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                  style={{
                    background: "linear-gradient(135deg, transparent 50%, var(--light-text-muted) 50%)",
                  }}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

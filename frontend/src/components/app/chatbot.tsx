"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import Image from "next/image";
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
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Window resizing state
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 400;
  const MAX_WIDTH = 880;
  const MAX_HEIGHT = 1320;
  const [size, setSize] = useState({ width: MAX_WIDTH, height: MAX_HEIGHT });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

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
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep window within viewport bounds
      const maxX = window.innerWidth - 100; // Keep at least 100px visible
      const maxY = window.innerHeight - 60; // Keep header visible

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
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

      // Calculate new dimensions with constraints
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, resizeStart.width + deltaX),
      );
      const newHeight = Math.max(
        MIN_HEIGHT,
        Math.min(MAX_HEIGHT, resizeStart.height + deltaY),
      );

      setSize({
        width: newWidth,
        height: newHeight,
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
  }, [isResizing, resizeStart, MIN_WIDTH, MIN_HEIGHT, MAX_WIDTH, MAX_HEIGHT]);

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
              "bg-[#2a2825] dark:bg-[#f5f4ef]",
            )}
            aria-label="Open chat"
          >
            <MessageCircle className="w-6 h-6 text-[#faf9f7] dark:text-[#1a1816]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              width: isMinimized ? 320 : size.width,
              height: isMinimized ? 60 : size.height,
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "fixed",
              zIndex: 1000,
              right: position ? undefined : "24px",
              bottom: position ? undefined : "24px",
              left: position ? `${position.x}px` : undefined,
              top: position ? `${position.y}px` : undefined,
            }}
            className={clsx(
              "rounded-xl overflow-hidden",
              "shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]",
              // Liquid glass effect with backdrop blur - 10% more transparent
              "bg-white/60 dark:bg-[#1a1816]/70",
              "backdrop-blur-xl backdrop-saturate-150",
              "border border-white/20 dark:border-white/10",
              "flex flex-col",
            )}
          >
            {/* Header - Draggable */}
            <div
              onMouseDown={handleDragStart}
              className={clsx(
                "flex items-center justify-between px-4 py-3",
                // Enhanced glass header with stronger contrast - 10% more transparent
                "bg-white/30 dark:bg-[#2a2825]/50",
                "backdrop-blur-md",
                "border-b border-white/30 dark:border-white/10",
                "cursor-move select-none",
              )}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#2a2825] dark:text-[#f5f4ef] drop-shadow-sm" />
                <h3 className="font-semibold text-[#1a1816] dark:text-[#faf9f7] drop-shadow-sm">
                  Case Assistant
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all hover:scale-105"
                  aria-label={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-[#2a2825] dark:text-[#f5f4ef]" />
                  ) : (
                    <Minimize2 className="w-4 h-4 text-[#2a2825] dark:text-[#f5f4ef]" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all hover:scale-105"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4 text-[#2a2825] dark:text-[#f5f4ef]" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
                  {messages.length === 0 && (
                    <div className="text-center py-8 px-4">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-[#2a2825] dark:text-[#f5f4ef] opacity-40 drop-shadow" />
                      <p className="text-[#2a2825] dark:text-[#faf9f7] text-sm font-medium drop-shadow-sm break-words">
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
                        "flex gap-2",
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start",
                      )}
                    >
                      {/* Holmes Logo for Assistant Messages */}
                      {message.role === "assistant" && (
                        <div className="shrink-0 mt-1">
                          <Image
                            src="/logo-1x.png"
                            alt="Holmes"
                            width={24}
                            height={24}
                            className="opacity-70"
                          />
                        </div>
                      )}

                      <div
                        className={clsx(
                          "rounded-lg px-4 py-2.5 shadow-sm",
                          "max-w-[85%] min-w-[120px]",
                          message.role === "user"
                            ? "bg-[#2a2825] dark:bg-[#f5f4ef] text-[#faf9f7] dark:text-[#050505]"
                            : "bg-white/50 dark:bg-[#2a2825]/60 backdrop-blur-md text-[#1a1816] dark:text-[#faf9f7] border border-white/40 dark:border-white/10",
                        )}
                        style={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          wordBreak: "break-word",
                        }}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">
                          {message.content}
                        </p>
                        <span
                          className={clsx(
                            "text-xs mt-1.5 block font-medium",
                            message.role === "user"
                              ? "opacity-70"
                              : "opacity-60",
                          )}
                        >
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/50 dark:bg-[#2a2825]/60 backdrop-blur-md rounded-lg px-4 py-3 border border-white/40 dark:border-white/10 shadow-sm">
                        <div className="flex items-center gap-2">
                          {/* Holmes Logo */}
                          <Image
                            src="/logo-1x.png"
                            alt="Holmes"
                            width={20}
                            height={20}
                            className="opacity-80 shrink-0 drop-shadow-sm"
                          />

                          {/* Thinking Text */}
                          <span className="text-sm text-[#1a1816] dark:text-[#faf9f7] font-medium">
                            Thinking
                          </span>

                          {/* Animated Dots */}
                          <div className="flex items-center gap-0.5">
                            <motion.span
                              className="inline-block w-1.5 h-1.5 rounded-full bg-[#2a2825] dark:bg-[#f5f4ef]"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.4, 1, 0.4],
                              }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0,
                              }}
                            />
                            <motion.span
                              className="inline-block w-1.5 h-1.5 rounded-full bg-[#2a2825] dark:bg-[#f5f4ef]"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.4, 1, 0.4],
                              }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2,
                              }}
                            />
                            <motion.span
                              className="inline-block w-1.5 h-1.5 rounded-full bg-[#2a2825] dark:bg-[#f5f4ef]"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.4, 1, 0.4],
                              }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.4,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/30 dark:border-white/10 bg-white/30 dark:bg-[#2a2825]/50 backdrop-blur-md shrink-0">
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      rows={1}
                      className={clsx(
                        "flex-1 min-w-0 px-3 py-2.5 rounded-lg resize-none",
                        "bg-white/50 dark:bg-[#1a1816]/50",
                        "backdrop-blur-sm",
                        "border border-white/40 dark:border-white/10",
                        "text-[#1a1816] dark:text-[#faf9f7]",
                        "placeholder:text-[#2a2825]/60 dark:placeholder:text-[#f5f4ef]/60",
                        "focus:outline-none focus:ring-2 focus:ring-[#2a2825]/30 dark:focus:ring-[#f5f4ef]/30",
                        "focus:border-[#2a2825]/40 dark:focus:border-[#f5f4ef]/40",
                        "text-sm font-medium",
                        "shadow-sm",
                        "transition-all",
                        "overflow-y-auto",
                      )}
                      style={{
                        maxHeight: "120px",
                        minHeight: "40px",
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      className={clsx(
                        "px-4 py-2.5 rounded-lg shrink-0",
                        "bg-[#2a2825] dark:bg-[#f5f4ef]",
                        "text-[#faf9f7] dark:text-[#050505]",
                        "hover:bg-[#3d3a36] dark:hover:bg-[#d4d3ce]",
                        "hover:scale-105 active:scale-95",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                        "transition-all duration-200",
                        "flex items-center justify-center",
                        "shadow-md hover:shadow-lg",
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resize Handle */}
                <div
                  onMouseDown={handleResizeStart}
                  className={clsx(
                    "absolute bottom-0 right-0 w-6 h-6 cursor-se-resize",
                    "opacity-30 hover:opacity-60 transition-opacity",
                    "flex items-end justify-end p-1",
                  )}
                  title="Drag to resize"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    className="text-[#2a2825] dark:text-[#f5f4ef]"
                  >
                    <path
                      d="M11 11L11 7M11 11L7 11M11 11L6 6M11 3L11 1L9 1M3 11L1 11L1 9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

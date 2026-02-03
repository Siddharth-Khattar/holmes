// ABOUTME: Custom ReactFlow node for the Command Center decision tree. Renders
// ABOUTME: agent nodes with motion animations, portal tooltip, and state-based styling.

"use client";

import { memo, useRef, useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { createPortal } from "react-dom";
import { motion, type Easing } from "motion/react";
import { Loader2, AlertTriangle } from "lucide-react";

import { AGENT_CONFIGS, AGENT_TYPE_TINTS } from "@/lib/command-center-config";
import type { AgentType, AgentState } from "@/types/command-center";

// -----------------------------------------------------------------------
// Data contract for DecisionNode. Passed via ReactFlow node `data` field.
// -----------------------------------------------------------------------
export interface DecisionNodeData {
  agentType: AgentType;
  agentState: AgentState;
  isChosen: boolean;
  isSelected: boolean;
  onNodeClick: (agentType: AgentType) => void;
  [key: string]: unknown; // ReactFlow requires index signature on node data
}

// -----------------------------------------------------------------------
// Typed easing constants to satisfy motion's Easing type
// -----------------------------------------------------------------------
const EASE_OUT: Easing = [0.0, 0.0, 0.2, 1.0];
const EASE_IN_OUT: Easing = [0.42, 0.0, 0.58, 1.0];

// -----------------------------------------------------------------------
// Status dot color helper
// -----------------------------------------------------------------------
function statusDotClass(
  status: AgentState["status"],
  isActive: boolean,
): string {
  switch (status) {
    case "idle":
      return "bg-gray-500";
    case "processing":
      return isActive ? "bg-[hsl(180_60%_45%)]" : "bg-gray-400";
    case "complete":
      return "bg-[hsl(180_60%_45%)]";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

// -----------------------------------------------------------------------
// Badge text derived from agent state
// -----------------------------------------------------------------------
function getBadgeText(agentState: AgentState): string | null {
  if (agentState.status === "processing" && agentState.currentTask) {
    return agentState.currentTask.fileName.length > 18
      ? agentState.currentTask.fileName.substring(0, 18) + "..."
      : agentState.currentTask.fileName;
  }
  if (agentState.lastResult) {
    const outputCount = agentState.lastResult.outputs.length;
    if (outputCount > 0) return `${outputCount} outputs`;
  }
  if (agentState.processingHistory.length > 0) {
    return `${agentState.processingHistory.length} processed`;
  }
  return null;
}

// -----------------------------------------------------------------------
// DecisionNode Component
// -----------------------------------------------------------------------
function DecisionNodeInner({ data }: NodeProps) {
  const { agentType, agentState, isChosen, isSelected, onNodeClick } =
    data as unknown as DecisionNodeData;

  const nodeRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const config = AGENT_CONFIGS[agentType];
  const tint = AGENT_TYPE_TINTS[agentType];
  const isProcessing = agentState.status === "processing";
  const isComplete = agentState.status === "complete";
  const isError = agentState.status === "error";
  const isActive = isChosen || isComplete || isProcessing;

  // Warning badge for orchestrator
  const warnings =
    agentType === "orchestrator"
      ? (agentState.lastResult?.metadata?.warnings as string[] | undefined)
      : undefined;
  const warningCount = warnings?.length ?? 0;

  const badgeText = getBadgeText(agentState);

  // ------- Tooltip handlers -------
  const handleMouseEnter = useCallback(() => {
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 50,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipPos(null);
  }, []);

  const handleClick = useCallback(() => {
    onNodeClick(agentType);
  }, [onNodeClick, agentType]);

  // ------- Computed styles -------
  const chosenBackground = `linear-gradient(135deg, hsl(${tint} / 0.5) 0%, hsl(var(--cc-accent) / 0.15) 100%)`;
  const unchosenBackground = "hsl(0 0% 14% / 0.7)";

  const chosenBorder = "2px solid hsl(var(--cc-accent))";
  const unchosenBorder = "1px solid hsl(0 0% 50% / 0.3)";
  const errorBorder = "2px solid #ef4444";

  const chosenShadow = "0 0 20px hsl(var(--cc-accent) / 0.3)";

  // ------- Handle styles -------
  const handleStyle = isActive
    ? {
        background: "hsl(var(--cc-accent))",
        width: 8,
        height: 8,
        border: "none",
      }
    : {
        background: "hsl(0 0% 50% / 0.4)",
        width: 6,
        height: 6,
        border: "none",
      };

  // Determine whether the floating wrapper should animate
  const shouldFloat = isActive && !isProcessing;

  return (
    <>
      {/* ReactFlow handles for edge connections */}
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      {/* Outer container: fixed dimensions for dagre, no width/height animation */}
      <div
        ref={nodeRef}
        className="w-[300px] h-[100px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floating wrapper: separate motion.div for the y-bounce so it does
            not conflict with the entrance animation on the inner div. */}
        <motion.div
          className="w-full h-full"
          animate={shouldFloat ? { y: [0, -2, 0] } : { y: 0 }}
          transition={
            shouldFloat
              ? { duration: 2, ease: EASE_IN_OUT, repeat: Infinity }
              : { duration: 0 }
          }
        >
          {/* Inner motion.div: entrance, hover, tap animations */}
          <motion.div
            className="relative w-full h-full rounded-lg overflow-hidden cursor-pointer"
            style={{
              background: isActive ? chosenBackground : unchosenBackground,
              border: isError
                ? errorBorder
                : isActive
                  ? chosenBorder
                  : unchosenBorder,
              boxShadow: isActive && !isError ? chosenShadow : "none",
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            whileHover={{ scale: 1.05, y: -8 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
          >
            {/* Pulsing border overlay (processing state) */}
            {isProcessing && (
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  border: "2px solid hsl(var(--cc-accent))",
                }}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            {/* Selected ring */}
            {isSelected && (
              <div
                className="absolute inset-[-4px] rounded-lg pointer-events-none"
                style={{
                  boxShadow: "0 0 0 4px hsl(220 50% 35%)",
                }}
              />
            )}

            {/* Node content */}
            <div className="flex flex-col items-center justify-center h-full px-4 py-2 gap-1">
              {/* Agent name with optional text glow */}
              <div className="flex items-center gap-2">
                {/* Status dot */}
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotClass(agentState.status, isActive)}`}
                  style={
                    isProcessing
                      ? { animation: "pulse 1.5s ease-in-out infinite" }
                      : undefined
                  }
                />

                <motion.span
                  className="text-lg font-bold truncate max-w-[220px]"
                  style={{
                    color: isActive
                      ? "hsl(var(--cc-accent))"
                      : "hsl(0 0% 50% / 0.6)",
                  }}
                  animate={
                    isActive
                      ? {
                          textShadow: [
                            "0 0 5px hsl(180 60% 45% / 0.6)",
                            "0 0 10px hsl(180 60% 45% / 0.8)",
                            "0 0 5px hsl(180 60% 45% / 0.6)",
                          ],
                        }
                      : { textShadow: "none" }
                  }
                  transition={
                    isActive
                      ? { duration: 2, repeat: Infinity, ease: EASE_IN_OUT }
                      : { duration: 0 }
                  }
                >
                  {config.name}
                </motion.span>

                {/* Spinner when processing */}
                {isProcessing && (
                  <Loader2
                    className="w-4 h-4 animate-spin shrink-0"
                    style={{ color: "hsl(var(--cc-accent))" }}
                  />
                )}
              </div>

              {/* Badge row: file count / output count / warning badge */}
              <div className="flex items-center gap-2">
                {badgeText && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full truncate max-w-[180px]"
                    style={{
                      background: isActive
                        ? "hsl(var(--cc-accent) / 0.15)"
                        : "hsl(0 0% 50% / 0.1)",
                      color: isActive
                        ? "hsl(var(--cc-accent-glow))"
                        : "hsl(0 0% 50% / 0.5)",
                    }}
                  >
                    {badgeText}
                  </span>
                )}

                {/* Warning badge for orchestrator */}
                {warningCount > 0 && (
                  <span
                    className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "hsl(45 100% 50% / 0.15)",
                      color: "hsl(45 100% 60%)",
                    }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {warningCount}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Portal tooltip */}
      {tooltipPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 1000,
            }}
          >
            <div
              className="text-sm rounded-lg shadow-2xl px-3 py-1.5"
              style={{
                background: "hsl(0 0% 9% / 0.95)",
                backdropFilter: "blur(8px)",
                color: "hsl(0 0% 80%)",
                border: "1px solid hsl(0 0% 18% / 0.5)",
              }}
            >
              Click for more details
              {/* CSS triangle arrow pointing down */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: -6,
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid hsl(0 0% 18% / 0.5)",
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export const DecisionNode = memo(DecisionNodeInner);

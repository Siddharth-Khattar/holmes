// ABOUTME: Custom ReactFlow node for the Command Center decision tree. Renders
// ABOUTME: agent nodes with motion animations, portal tooltip, and state-based styling.

"use client";

import { memo, useRef, useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { createPortal } from "react-dom";
import { motion, type Easing } from "motion/react";
import { Loader2, AlertTriangle } from "lucide-react";

import { AGENT_CONFIGS, getAgentColors } from "@/lib/command-center-config";
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

// -----------------------------------------------------------------------
// Status dot style helper — parameterized by per-agent accent color
// -----------------------------------------------------------------------
function statusDotStyle(
  status: AgentState["status"],
  isActive: boolean,
  accent: string,
): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  };

  switch (status) {
    case "idle":
      return { ...base, background: "#6b7280" }; // gray-500
    case "processing":
      return { ...base, background: isActive ? `hsl(${accent})` : "#9ca3af" };
    case "complete":
      return { ...base, background: `hsl(${accent})` };
    case "error":
      return { ...base, background: "#ef4444" }; // red-500
    default:
      return { ...base, background: "#6b7280" };
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
  const { tint, accent } = getAgentColors(agentType);
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
  const chosenBackground = `linear-gradient(135deg, hsl(${tint} / 0.75) 0%, hsl(${tint} / 0.35) 100%)`;
  const unchosenBackground = "hsl(0 0% 14% / 0.7)";

  const baseShadow = isError
    ? "0 0 14px rgba(239,68,68,0.3)"
    : isActive
      ? `0 0 18px hsl(${accent} / 0.25), 0 0 6px hsl(${accent} / 0.15)`
      : "none";

  const selectedShadow = isSelected
    ? `0 0 0 2px hsl(${accent} / 0.5)`
    : undefined;

  // Combine base + selected shadows
  const boxShadow =
    [baseShadow, selectedShadow].filter(Boolean).join(", ") || "none";

  // ------- Handle styles -------
  const handleStyle = isActive
    ? {
        background: `hsl(${accent})`,
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

  return (
    <>
      {/* ReactFlow handles for edge connections */}
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      {/* Outer container: fixed dimensions for layout engine */}
      <div
        ref={nodeRef}
        className="w-75 h-25"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Inner motion.div: entrance, hover, tap animations */}
        <motion.div
          className="relative w-full h-full rounded-lg overflow-hidden cursor-pointer"
          style={{
            background: isActive ? chosenBackground : unchosenBackground,
            border: "none",
            boxShadow,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          whileHover={{
            scale: 1.04,
            boxShadow: `0 0 30px hsl(${accent} / 0.5), 0 0 12px hsl(${accent} / 0.3)${selectedShadow ? `, ${selectedShadow}` : ""}`,
          }}
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
        >
          {/* Processing pulse glow overlay */}
          {isProcessing && (
            <motion.div
              className="absolute inset-0 rounded-lg pointer-events-none"
              animate={{
                boxShadow: [
                  `0 0 10px hsl(${accent} / 0.15), inset 0 0 8px hsl(${accent} / 0.06)`,
                  `0 0 20px hsl(${accent} / 0.3), inset 0 0 12px hsl(${accent} / 0.1)`,
                  `0 0 10px hsl(${accent} / 0.15), inset 0 0 8px hsl(${accent} / 0.06)`,
                ],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Node content */}
          <div className="flex flex-col items-center justify-center h-full px-4 py-2 gap-1">
            {/* Agent name with optional text glow */}
            <div className="flex items-center gap-2">
              {/* Status dot */}
              <span
                style={{
                  ...statusDotStyle(agentState.status, isActive, accent),
                  ...(isProcessing
                    ? { animation: "pulse 1.5s ease-in-out infinite" }
                    : {}),
                }}
              />

              <span
                className="text-lg font-bold truncate max-w-55"
                style={{
                  color: isActive ? `hsl(${accent})` : "hsl(0 0% 50% / 0.6)",
                }}
              >
                {config.name}
              </span>

              {/* Spinner when processing */}
              {isProcessing && (
                <Loader2
                  className="w-4 h-4 animate-spin shrink-0"
                  style={{ color: `hsl(${accent})` }}
                />
              )}
            </div>

            {/* Badge row: file count / output count / warning badge */}
            <div className="flex items-center gap-2">
              {badgeText && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full truncate max-w-45"
                  style={{
                    background: isActive
                      ? `hsl(${accent} / 0.15)`
                      : "hsl(0 0% 50% / 0.1)",
                    color: isActive ? `hsl(${accent})` : "hsl(0 0% 50% / 0.5)",
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

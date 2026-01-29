"use client";

import { STATUS_COLORS } from "@/lib/command-center-config";
import type { AgentState, AgentConfig } from "@/types/command-center";

interface AgentNodeProps {
  agentState: AgentState;
  config: AgentConfig;
  position: { x: number; y: number };
  isSelected: boolean;
  isHovered: boolean;
  isDragging?: boolean;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function AgentNode({
  agentState,
  config,
  position,
  isSelected,
  isHovered,
  isDragging = false,
  onClick,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: AgentNodeProps) {
  const statusColor = STATUS_COLORS[agentState.status];
  
  // Rectangular dimensions
  const nodeWidth = isSelected ? 200 : isHovered ? 190 : 180;
  const nodeHeight = isSelected ? 140 : isHovered ? 130 : 120;
  const strokeWidth = isSelected ? 4 : isHovered ? 3 : 2;

  return (
    <g
      className="agent-node"
      transform={`translate(${position.x}, ${position.y})`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* Node background - Rectangle */}
      <rect
        x={-nodeWidth / 2}
        y={-nodeHeight / 2}
        width={nodeWidth}
        height={nodeHeight}
        rx={12}
        fill={config.color}
        stroke={isSelected ? "var(--color-accent)" : config.color}
        strokeWidth={strokeWidth}
        opacity={0.9}
        style={{
          transition: "all 0.3s ease",
        }}
      />

      {/* Status indicator */}
      <circle
        cx={-nodeWidth / 2 + 16}
        cy={-nodeHeight / 2 + 16}
        r={6}
        fill={statusColor}
        style={{
          transition: "fill 0.3s ease",
        }}
      >
        {agentState.status === "processing" && (
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Agent name */}
      <text
        y={-nodeHeight / 2 + 45}
        textAnchor="middle"
        fill="var(--color-smoke)"
        fontSize="14"
        fontWeight="600"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {config.name}
      </text>

      {/* Status text */}
      <text
        y={-nodeHeight / 2 + 65}
        textAnchor="middle"
        fill="var(--color-stone)"
        fontSize="11"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {agentState.status === "idle" && "Idle"}
        {agentState.status === "processing" && "Processing"}
        {agentState.status === "complete" && "Complete"}
        {agentState.status === "error" && "Error"}
      </text>

      {/* Current task or result info */}
      {agentState.status === "processing" && agentState.currentTask && (
        <>
          <text
            y={-nodeHeight / 2 + 85}
            textAnchor="middle"
            fill="var(--color-smoke)"
            fontSize="10"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            Processing:
          </text>
          <text
            y={-nodeHeight / 2 + 100}
            textAnchor="middle"
            fill="var(--color-stone)"
            fontSize="9"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {agentState.currentTask.fileName.length > 20
              ? agentState.currentTask.fileName.substring(0, 20) + "..."
              : agentState.currentTask.fileName}
          </text>
        </>
      )}

      {agentState.status === "idle" && agentState.lastResult && (
        <>
          <text
            y={-nodeHeight / 2 + 85}
            textAnchor="middle"
            fill="var(--color-smoke)"
            fontSize="10"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            Last completed:
          </text>
          <text
            y={-nodeHeight / 2 + 100}
            textAnchor="middle"
            fill="var(--color-stone)"
            fontSize="9"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {agentState.lastResult.outputs.length} outputs
          </text>
        </>
      )}

      {agentState.status === "error" && (
        <text
          y={-nodeHeight / 2 + 85}
          textAnchor="middle"
          fill="#ef4444"
          fontSize="10"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          Processing failed
        </text>
      )}

      {/* Hover/Select indicator */}
      {(isHovered || isSelected) && (
        <text
          y={nodeHeight / 2 + 20}
          textAnchor="middle"
          fill="var(--color-accent)"
          fontSize="10"
          fontWeight="500"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          Click for details
        </text>
      )}
    </g>
  );
}

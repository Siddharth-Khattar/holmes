"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { select } from "d3-selection";
import {
  zoom as d3Zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
} from "d3-zoom";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { AgentNode } from "./AgentNode";
import { AGENT_CONFIGS } from "@/lib/command-center-config";
import type {
  AgentState,
  AgentType,
  AgentConnection,
} from "@/types/command-center";

interface Transform {
  x: number;
  y: number;
  k: number;
}

interface AgentFlowCanvasProps {
  agentStates: Map<AgentType, AgentState>;
  connections: AgentConnection[];
  onAgentClick: (agentType: AgentType) => void;
  selectedAgent: AgentType | null;
}

export function AgentFlowCanvas({
  agentStates,
  connections,
  onAgentClick,
  selectedAgent,
}: AgentFlowCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const zoomBehaviorRef = useRef<ZoomBehavior<
    SVGSVGElement,
    Record<string, unknown>
  > | null>(null);

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredAgent, setHoveredAgent] = useState<AgentType | null>(null);
  const [nodePositions, setNodePositions] = useState<
    Map<AgentType, { x: number; y: number }>
  >(() => {
    // Initialize node positions from config
    const initialPositions = new Map<AgentType, { x: number; y: number }>();
    Object.entries(AGENT_CONFIGS).forEach(([type, config]) => {
      initialPositions.set(type as AgentType, { ...config.position });
    });
    return initialPositions;
  });
  const [draggingAgent, setDraggingAgent] = useState<AgentType | null>(null);

  // Initialize dimensions
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }

    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Setup zoom and pan behavior
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0)
      return;

    const svg = select<SVGSVGElement, Record<string, unknown>>(svgRef.current);

    const zoomBehavior = d3Zoom<SVGSVGElement, Record<string, unknown>>()
      .scaleExtent([0.1, 4])
      .filter((event: MouseEvent | WheelEvent | TouchEvent) => {
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" || event.type === "touchstart") {
          const target = event.target as Element;
          return !target.closest(".agent-node");
        }
        return true;
      })
      .on(
        "zoom",
        (event: D3ZoomEvent<SVGSVGElement, Record<string, unknown>>) => {
          transformRef.current = {
            x: event.transform.x,
            y: event.transform.y,
            k: event.transform.k,
          };
          setTransform(transformRef.current);
        },
      );

    // Center the view initially
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    svg.call(
      zoomBehavior.transform,
      zoomIdentity.translate(centerX, centerY).scale(1),
    );

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    return () => {
      svg.on(".zoom", null);
    };
  }, [dimensions.width, dimensions.height]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = select<SVGSVGElement, Record<string, unknown>>(svgRef.current);
    svg.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = select<SVGSVGElement, Record<string, unknown>>(svgRef.current);
    svg.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = select<SVGSVGElement, Record<string, unknown>>(svgRef.current);
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    svg
      .transition()
      .duration(500)
      .call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(centerX, centerY).scale(1),
      );
  }, [dimensions.width, dimensions.height]);

  const handleFitView = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    // Calculate bounding box of all agents using current positions
    const positions = Array.from(nodePositions.values());
    if (positions.length === 0) return;

    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y));

    const width = maxX - minX + 200; // Add padding
    const height = maxY - minY + 200;

    const scale = Math.min(
      dimensions.width / width,
      dimensions.height / height,
      1,
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const translateX = dimensions.width / 2 - centerX * scale;
    const translateY = dimensions.height / 2 - centerY * scale;

    const svg = select<SVGSVGElement, Record<string, unknown>>(svgRef.current);
    svg
      .transition()
      .duration(500)
      .call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(translateX, translateY).scale(scale),
      );
  }, [dimensions.width, dimensions.height, nodePositions]);

  // Handle node drag
  const handleNodeMouseDown = useCallback(
    (agentType: AgentType, e: React.MouseEvent) => {
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      let hasMoved = false;

      setDraggingAgent(agentType);
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const currentPos = nodePositions.get(agentType);
      if (!currentPos) return;

      const handleMouseMove = (e: MouseEvent) => {
        if (!draggingAgent && !hasMoved) {
          const dx = Math.abs(e.clientX - startX);
          const dy = Math.abs(e.clientY - startY);
          if (dx > 5 || dy > 5) {
            hasMoved = true;
          }
        }

        const x =
          (e.clientX - rect.left - transformRef.current.x) /
          transformRef.current.k;
        const y =
          (e.clientY - rect.top - transformRef.current.y) /
          transformRef.current.k;

        setNodePositions((prev) => {
          const newPositions = new Map(prev);
          newPositions.set(agentType, { x, y });
          return newPositions;
        });
      };

      const handleMouseUp = () => {
        setDraggingAgent(null);

        // If didn't move much, treat as click
        if (!hasMoved) {
          onAgentClick(agentType);
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [draggingAgent, nodePositions, onAgentClick],
  );

  // Calculate orthogonal path between two points
  const calculateOrthogonalPath = (
    source: { x: number; y: number },
    target: { x: number; y: number },
  ): string => {
    const dx = target.x - source.x;
    // Determine if we should route horizontally or vertically first
    // Use horizontal-first routing for better visual flow
    const midX = source.x + dx / 2;

    // Create path with right angles
    return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
  };

  // Render connection line
  const renderConnection = (conn: AgentConnection) => {
    const sourcePos = nodePositions.get(conn.source);
    const targetPos = nodePositions.get(conn.target);

    if (!sourcePos || !targetPos) return null;

    const path = calculateOrthogonalPath(sourcePos, targetPos);

    return (
      <g key={conn.id}>
        {/* Connection path */}
        <path
          d={path}
          stroke={conn.animated ? "#8B7355" : "var(--color-stone)"}
          strokeWidth={conn.animated ? 3 : 2}
          fill="none"
          opacity={conn.animated ? 0.8 : 0.3}
          strokeDasharray={conn.animated ? "8,4" : "none"}
          style={{
            transition: "all 0.3s ease",
          }}
        >
          {conn.animated && (
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="24"
              dur="1s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* Arrow head marker */}
        <defs>
          <marker
            id={`arrow-${conn.id}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill={conn.animated ? "#8B7355" : "var(--color-stone)"}
              opacity={conn.animated ? 0.8 : 0.3}
            />
          </marker>
        </defs>

        {/* Invisible path for arrow marker */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth={2}
          fill="none"
          markerEnd={`url(#arrow-${conn.id})`}
        />
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-background dark:bg-charcoal"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(107, 101, 96, 0.25) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Dark mode pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(138, 138, 130, 0.25) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <svg ref={svgRef} className="w-full h-full" style={{ cursor: "grab" }}>
        {/* Infinite grid pattern */}
        <defs>
          <pattern
            id="grid-pattern"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="1"
              fill="var(--color-stone)"
              opacity="0.15"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />

        {/* Transform group */}
        <g
          transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
        >
          {/* Connections layer */}
          <g className="connections-layer">
            {connections.map((conn) => renderConnection(conn))}
          </g>

          {/* Agents layer */}
          <g className="agents-layer">
            {Array.from(agentStates.entries()).map(([type, state]) => {
              const config = AGENT_CONFIGS[type];
              const position = nodePositions.get(type);
              if (!config || !position) return null;

              return (
                <AgentNode
                  key={type}
                  agentState={state}
                  config={config}
                  position={position}
                  isSelected={selectedAgent === type}
                  isHovered={hoveredAgent === type}
                  isDragging={draggingAgent === type}
                  onClick={() => onAgentClick(type)}
                  onMouseDown={(e) => handleNodeMouseDown(type, e)}
                  onMouseEnter={() => setHoveredAgent(type)}
                  onMouseLeave={() => setHoveredAgent(null)}
                />
              );
            })}
          </g>
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-lg bg-white/90 dark:bg-jet/90 hover:bg-white dark:hover:bg-jet text-foreground flex items-center justify-center transition-colors border border-warm-gray/20 dark:border-stone/20"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-lg bg-white/90 dark:bg-jet/90 hover:bg-white dark:hover:bg-jet text-foreground flex items-center justify-center transition-colors border border-warm-gray/20 dark:border-stone/20"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="w-10 h-10 rounded-lg bg-white/90 dark:bg-jet/90 hover:bg-white dark:hover:bg-jet text-foreground flex items-center justify-center transition-colors border border-warm-gray/20 dark:border-stone/20"
          title="Reset Zoom"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={handleFitView}
          className="w-10 h-10 rounded-lg bg-white/90 dark:bg-jet/90 hover:bg-white dark:hover:bg-jet text-foreground flex items-center justify-center transition-colors border border-warm-gray/20 dark:border-stone/20"
          title="Fit View"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

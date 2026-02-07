// ABOUTME: ReactFlow canvas for the Command Center decision tree.
// ABOUTME: Renders agent nodes with hierarchical layout, smoothstep edges, and auto-fit viewport.

"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  ConnectionLineType,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CanvasZoomControls } from "@/components/ui/canvas-zoom-controls";
import { DecisionNode } from "./DecisionNode";
import { FileGroupNode } from "./FileGroupNode";
import { FileRoutingEdge } from "./FileRoutingEdge";

// nodeTypes / edgeTypes must be defined OUTSIDE the component to avoid infinite re-renders
const nodeTypes = {
  decision: DecisionNode,
  fileGroup: FileGroupNode,
} as const;

const edgeTypes = {
  fileRouting: FileRoutingEdge,
} as const;

interface AgentFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
}

export function AgentFlowCanvas({
  nodes,
  edges,
  onNodeClick,
}: AgentFlowCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-fit viewport when nodes change (progressive tree build adds nodes)
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({
          duration: 1500,
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, reactFlowInstance]);

  // Auto-fit viewport when the canvas container resizes (sidebar toggle/drag).
  // Skip the first callback — ResizeObserver fires immediately on observe(),
  // which would duplicate the initial fitView from the useEffect above.
  const hasObservedOnce = useRef(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container || nodes.length === 0) return;

    hasObservedOnce.current = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (!hasObservedOnce.current) {
        hasObservedOnce.current = true;
        return;
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        reactFlowInstance.fitView({
          duration: 300,
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1,
        });
      }, 150);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [reactFlowInstance, nodes.length]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 300 });
  }, [reactFlowInstance]);

  const handleResetZoom = useCallback(() => {
    reactFlowInstance.zoomTo(1, { duration: 500 });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({
      duration: 500,
      padding: 0.2,
      minZoom: 0.1,
      maxZoom: 1,
    });
  }, [reactFlowInstance]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ background: "var(--color-jet)" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        minZoom={0.1}
        maxZoom={2}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={2} color="rgba(138, 138, 130, 0.15)" />
      </ReactFlow>

      <CanvasZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitView={handleFitView}
      />
    </div>
  );
}

// ABOUTME: ReactFlow + dagre canvas for the Command Center decision tree.
// ABOUTME: Renders agent nodes with hierarchical layout, smoothstep edges, and auto-fit viewport.

"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  ConnectionLineType,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { DecisionNode } from "./DecisionNode";
import { FileGroupNode } from "./FileGroupNode";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  FILE_GROUP_NODE_WIDTH,
  FILE_GROUP_NODE_HEIGHT,
} from "@/lib/command-center-config";

// -----------------------------------------------------------------------
// nodeTypes must be defined OUTSIDE the component to avoid infinite re-renders
// -----------------------------------------------------------------------
const nodeTypes = {
  decision: DecisionNode,
  fileGroup: FileGroupNode,
} as const;

// -----------------------------------------------------------------------
// Props interface - receives pre-computed nodes/edges from CommandCenter
// -----------------------------------------------------------------------
interface AgentFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
}

// -----------------------------------------------------------------------
// Dagre layout helper
// -----------------------------------------------------------------------
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  // Create a fresh graph instance each call to avoid stale state
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: "TB",
    ranksep: 120,
    nodesep: 150,
  });

  nodes.forEach((node) => {
    const isFileGroup = node.type === "fileGroup";
    const width = isFileGroup ? FILE_GROUP_NODE_WIDTH : NODE_WIDTH;
    const height = isFileGroup ? FILE_GROUP_NODE_HEIGHT : NODE_HEIGHT;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const isFileGroup = node.type === "fileGroup";
    const width = isFileGroup ? FILE_GROUP_NODE_WIDTH : NODE_WIDTH;
    const height = isFileGroup ? FILE_GROUP_NODE_HEIGHT : NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: dagreNode.x - width / 2,
        y: dagreNode.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// -----------------------------------------------------------------------
// AgentFlowCanvas Component
// -----------------------------------------------------------------------
export function AgentFlowCanvas({
  nodes,
  edges,
  onNodeClick,
}: AgentFlowCanvasProps) {
  const reactFlowInstance = useReactFlow();

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

  return (
    <div className="w-full h-full" style={{ background: "var(--color-jet)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
    </div>
  );
}

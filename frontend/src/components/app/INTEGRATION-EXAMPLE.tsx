/**
 * INTEGRATION EXAMPLE: Knowledge Graph with All Hooks
 *
 * This file demonstrates how to integrate all the knowledge graph hooks
 * for a complete, production-ready implementation with:
 * - Backend data sensitivity
 * - Live data adaptability
 * - Performance optimization
 * - User interaction handling
 *
 * NOTE: This is an example/reference file, not meant to be used directly.
 * Adapt the patterns shown here to your actual KnowledgeGraph component.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Search, Pause, Play } from "lucide-react";
import type { Simulation } from "d3-force";

// Import all knowledge graph hooks
import {
  useCluster,
  useDebounce,
  useForceSimulation,
  usePanelState,
  useZoom,
} from "@/hooks";

// Import types
import type {
  GraphNode,
  GraphConnection,
  Transform,
  Entity,
  Evidence,
} from "@/types/knowledge-graph";

interface KnowledgeGraphExampleProps {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

export function KnowledgeGraphExample({
  nodes,
  connections,
}: KnowledgeGraphExampleProps) {
  // ============================================================================
  // REFS
  // ============================================================================
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation<GraphNode, GraphConnection> | null>(
    null,
  );

  // ============================================================================
  // STATE
  // ============================================================================
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  // ============================================================================
  // HOOKS: Debounced Search
  // ============================================================================
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filter nodes based on debounced search
  const filteredNodes = nodes.filter((node) => {
    if (!debouncedSearchQuery) return true;

    const searchLower = debouncedSearchQuery.toLowerCase();
    if (node.type === "entity") {
      const entityData = node.data as Entity;
      return entityData.name.toLowerCase().includes(searchLower);
    } else if (node.type === "evidence") {
      const evidenceData = node.data as Evidence;
      return evidenceData.title.toLowerCase().includes(searchLower);
    }
    return false;
  });

  // ============================================================================
  // HOOKS: Cluster Selection
  // ============================================================================
  const {
    clusterState,
    selectNode,
    clearSelection,
    getNodeOpacity,
    getConnectionOpacity,
    getNodeScale,
    connectionStats,
  } = useCluster(filteredNodes, connections);

  // ============================================================================
  // HOOKS: Force Simulation
  // ============================================================================
  const getSimulation = useForceSimulation({
    nodes: filteredNodes,
    connections,
    width: dimensions.width,
    height: dimensions.height,
    onTick: () => {
      // Trigger re-render on each simulation tick
      // Force update handled by simulation
    },
    onSimulationCreated: (simulation) => {
      simulationRef.current = simulation;
    },
    // Custom configuration
    linkDistance: 120,
    linkStrength: 0.5,
    chargeStrength: -300,
    chargeDistanceMax: 400,
    collisionPadding: 5,
  });

  // ============================================================================
  // HOOKS: Zoom Controller
  // ============================================================================
  const zoomController = useZoom({
    svgElement,
    onTransformChange: (newTransform) => {
      setTransform({
        x: newTransform.x,
        y: newTransform.y,
        k: newTransform.k,
      });
    },
    containerWidth: dimensions.width,
    containerHeight: dimensions.height,
    minScale: 0.1,
    maxScale: 5,
  });

  // Set SVG element after mount
  useEffect(() => {
    if (svgRef.current) {
      setSvgElement(svgRef.current);
    }
  }, []);

  // ============================================================================
  // HOOKS: Panel State (with localStorage persistence)
  // ============================================================================
  const nodeInfoPanel = usePanelState("node-info-panel", false);
  const statsPanel = usePanelState("stats-panel", true);

  // ============================================================================
  // EFFECTS: Container Dimensions
  // ============================================================================
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // ============================================================================
  // HANDLERS: Simulation Control
  // ============================================================================
  const toggleSimulation = useCallback(() => {
    const simulation = getSimulation();
    if (!simulation) return;

    if (isSimulationRunning) {
      simulation.alpha(0);
      simulation.stop();
      setIsSimulationRunning(false);
    } else {
      simulation.alpha(0.1).restart();
      setIsSimulationRunning(true);
    }
  }, [isSimulationRunning, getSimulation]);

  // ============================================================================
  // HANDLERS: Node Interaction
  // ============================================================================
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      nodeInfoPanel.setCollapsed(false); // Open panel when node selected
    },
    [selectNode, nodeInfoPanel],
  );

  // ============================================================================
  // RENDER: Node
  // ============================================================================
  const renderNode = (node: GraphNode) => {
    const opacity = getNodeOpacity(node.id);
    const scale = getNodeScale(node.id);
    const isSelected = clusterState.selectedNodeId === node.id;

    // Get position from D3 simulation
    const x = (node as GraphNode & { x?: number }).x || 0;
    const y = (node as GraphNode & { y?: number }).y || 0;

    return (
      <g
        key={node.id}
        className="node-group"
        transform={`translate(${x}, ${y}) scale(${scale})`}
        opacity={opacity}
        onClick={() => handleNodeClick(node.id)}
        style={{ cursor: "pointer" }}
      >
        <circle
          r={30}
          fill={isSelected ? "#3B82F6" : "#6B7280"}
          stroke={isSelected ? "#FFF" : "#000"}
          strokeWidth={isSelected ? 3 : 1}
        />
        <text
          y={45}
          textAnchor="middle"
          fill="var(--foreground)"
          fontSize="12"
          style={{ pointerEvents: "none" }}
        >
          {node.type === "entity"
            ? (node.data as Entity).name
            : (node.data as Evidence).title}
        </text>
      </g>
    );
  };

  // Helper function to get node ID from source/target
  const getNodeId = (nodeOrId: string | GraphNode): string => {
    return typeof nodeOrId === "string" ? nodeOrId : nodeOrId.id;
  };

  // ============================================================================
  // RENDER: Connection
  // ============================================================================
  const renderConnection = (conn: GraphConnection, index: number) => {
    const opacity = getConnectionOpacity(index);

    const sourceId = getNodeId(conn.source);
    const targetId = getNodeId(conn.target);

    const sourceNode = filteredNodes.find((n) => n.id === sourceId);
    const targetNode = filteredNodes.find((n) => n.id === targetId);

    if (!sourceNode || !targetNode) return null;

    const x1 = (sourceNode as GraphNode & { x?: number }).x || 0;
    const y1 = (sourceNode as GraphNode & { y?: number }).y || 0;
    const x2 = (targetNode as GraphNode & { x?: number }).x || 0;
    const y2 = (targetNode as GraphNode & { y?: number }).y || 0;

    return (
      <line
        key={conn.id}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#D97706"
        strokeWidth={2}
        opacity={opacity}
        strokeDasharray="5,5"
      />
    );
  };

  // ============================================================================
  // RENDER: Component
  // ============================================================================
  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Header with Search */}
      <div className="flex-none p-4 border-b flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border"
          />
        </div>

        {/* Stats Display */}
        <div className="text-sm text-gray-600">
          {filteredNodes.length} nodes • {connections.length} connections
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ backgroundColor: "#F9FAFB" }}
        >
          {/* Transform group */}
          <g
            transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
          >
            {/* Connections layer */}
            <g className="edges-layer">
              {connections.map((conn, index) => renderConnection(conn, index))}
            </g>

            {/* Nodes layer */}
            <g className="nodes-layer">
              {filteredNodes.map((node) => renderNode(node))}
            </g>
          </g>
        </svg>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => zoomController?.zoomIn()}
            className="w-10 h-10 rounded-lg bg-white shadow-lg hover:bg-gray-50 flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => zoomController?.zoomOut()}
            className="w-10 h-10 rounded-lg bg-white shadow-lg hover:bg-gray-50 flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => zoomController?.resetZoom()}
            className="w-10 h-10 rounded-lg bg-white shadow-lg hover:bg-gray-50 flex items-center justify-center"
            title="Reset Zoom"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <div className="h-px bg-gray-300 my-1" />

          <button
            onClick={toggleSimulation}
            className="w-10 h-10 rounded-lg bg-white shadow-lg hover:bg-gray-50 flex items-center justify-center"
            title={
              isSimulationRunning ? "Pause Simulation" : "Resume Simulation"
            }
          >
            {isSimulationRunning ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Stats Panel (Collapsible) */}
        {!statsPanel.isCollapsed && (
          <div className="absolute top-4 left-4 p-4 rounded-lg bg-white shadow-lg max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Connection Stats</h3>
              <button
                onClick={statsPanel.toggleCollapse}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <div>Min: {connectionStats.min}</div>
              <div>Max: {connectionStats.max}</div>
              <div>Average: {connectionStats.average.toFixed(1)}</div>
              <div>Median: {connectionStats.p50}</div>
            </div>
          </div>
        )}

        {/* Node Info Panel (Collapsible) */}
        {!nodeInfoPanel.isCollapsed && clusterState.selectedNodeId && (
          <div className="absolute top-4 right-4 p-4 rounded-lg bg-white shadow-lg max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Node Info</h3>
              <button
                onClick={() => {
                  clearSelection();
                  nodeInfoPanel.setCollapsed(true);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="text-sm">
              <p>Selected: {clusterState.selectedNodeId}</p>
              <p>Cluster size: {clusterState.clusterNodeIds.size}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

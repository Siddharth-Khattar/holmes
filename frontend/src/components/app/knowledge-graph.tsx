"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Filter, FileText, Image, Video, Music, File } from "lucide-react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationLinkDatum,
} from "d3-force";
import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from "d3-zoom";
import { select } from "d3-selection";
import "d3-transition";
import { clsx } from "clsx";

import type {
  GraphNode,
  GraphConnection,
  Transform,
  Position,
  Entity,
  Evidence,
  EntityType,
  EvidenceType,
} from "@/types/knowledge-graph";

interface ForceNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  connection: GraphConnection;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  connections: GraphConnection[];
  entityCount: number;
  evidenceCount: number;
  relationshipCount: number;
}

const ENTITY_COLORS: Record<EntityType, string> = {
  person: '#3B82F6',
  organization: '#8B5CF6',
  location: '#10B981',
  event: '#F59E0B',
  document: '#6366F1',
  evidence: '#EC4899',
};

const EVIDENCE_COLORS: Record<EvidenceType, string> = {
  text: '#F59E0B',
  image: '#EC4899',
  video: '#8B5CF6',
  audio: '#10B981',
  document: '#6366F1',
};

const EVIDENCE_ICONS: Record<EvidenceType, any> = {
  text: FileText,
  image: Image,
  video: Video,
  audio: Music,
  document: File,
};

export function KnowledgeGraph({ 
  nodes, 
  connections, 
  entityCount,
  evidenceCount,
  relationshipCount 
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null);
  const forceNodesRef = useRef<ForceNode[]>([]);
  const forceLinksRef = useRef<ForceLink[]>([]);
  const nodePositionsRef = useRef<Map<string, Position>>(new Map());
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const draggingNodeRef = useRef<string | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [tempConnection, setTempConnection] = useState<{ from: Position; to: Position } | null>(null);

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

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize force simulation (only once)
  useEffect(() => {
    if (!simulationRef.current && dimensions.width > 0 && dimensions.height > 0) {
      simulationRef.current = forceSimulation<ForceNode>([])
        .force(
          "link",
          forceLink<ForceNode, ForceLink>([])
            .id((d) => d.id)
            .distance(120)
            .strength(0.7)
        )
        .force("charge", forceManyBody<ForceNode>().strength(-400).distanceMax(500))
        .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.05))
        .force("collide", forceCollide<ForceNode>().radius(50).strength(0.8).iterations(3))
        .alphaDecay(0.02)
        .velocityDecay(0.3)
        .on("tick", () => {
          // Update positions in ref
          forceNodesRef.current.forEach((node) => {
            if (node.x !== undefined && node.y !== undefined) {
              nodePositionsRef.current.set(node.id, { x: node.x, y: node.y });
            }
          });

          // Trigger re-render
          requestAnimationFrame(() => {
            setRenderTrigger((prev) => prev + 1);
          });
        });
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [dimensions.width, dimensions.height]);

  // Update simulation when data changes
  useEffect(() => {
    if (!simulationRef.current) return;

    // Convert nodes to force nodes with better initial positioning
    const forceNodes: ForceNode[] = nodes.map((node, index) => {
      const existing = forceNodesRef.current.find((n) => n.id === node.id);
      
      if (existing && existing.x !== undefined && existing.y !== undefined) {
        return {
          ...node,
          x: existing.x,
          y: existing.y,
          vx: existing.vx,
          vy: existing.vy,
          fx: existing.fx,
          fy: existing.fy,
        };
      }

      // Better initial positioning in a circle to prevent drift
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = Math.min(dimensions.width, dimensions.height) * 0.3;
      return {
        ...node,
        x: dimensions.width / 2 + radius * Math.cos(angle),
        y: dimensions.height / 2 + radius * Math.sin(angle),
      };
    });

    // Convert connections to force links
    const forceLinks: ForceLink[] = connections.map((conn) => ({
      source: conn.source,
      target: conn.target,
      connection: conn,
    }));

    forceNodesRef.current = forceNodes;
    forceLinksRef.current = forceLinks;

    // Update simulation
    const sim = simulationRef.current;
    sim.nodes(forceNodes);

    const linkForce = sim.force("link");
    if (linkForce) {
      (linkForce as any).links(forceLinks);
    }

    // Update center force to current dimensions
    const centerForce = sim.force("center");
    if (centerForce) {
      (centerForce as any).x(dimensions.width / 2).y(dimensions.height / 2);
    }

    // Reheat simulation
    sim.alpha(0.5).restart();
  }, [nodes, connections, dimensions.width, dimensions.height]);

  // Setup zoom and pan behavior
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const svg = select(svgRef.current);
    
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((event: any) => {
        // Allow zoom on wheel
        if (event.type === 'wheel') return true;
        // Allow pan on background drag (not on nodes)
        if (event.type === 'mousedown' || event.type === 'touchstart') {
          const target = event.target as Element;
          return !target.closest('.node-group');
        }
        return true;
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        transformRef.current = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        };
        setTransform(transformRef.current);
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    return () => {
      svg.on(".zoom", null);
    };
  }, [dimensions.width, dimensions.height]);

  // Node drag behavior with click detection
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    draggingNodeRef.current = nodeId;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingNodeRef.current) return;

      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 5 || dy > 5) {
        hasMoved = true;
      }

      const x = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.k;
      const y = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.k;

      const forceNode = forceNodesRef.current.find((n) => n.id === nodeId);
      if (forceNode) {
        forceNode.fx = x;
        forceNode.fy = y;
        simulationRef.current?.alpha(0.3).restart();
      }
    };

    const handleMouseUp = () => {
      if (draggingNodeRef.current) {
        const forceNode = forceNodesRef.current.find((n) => n.id === draggingNodeRef.current);
        if (forceNode) {
          // Release fixed position
          forceNode.fx = null;
          forceNode.fy = null;
        }

        // If didn't move much, treat as click
        if (!hasMoved) {
          setSelectedNode(nodeId);
        }

        draggingNodeRef.current = null;
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // Handle connection creation
  const handleStartConnection = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnectingFrom(nodeId);
    
    const node = forceNodesRef.current.find(n => n.id === nodeId);
    if (node && node.x !== undefined && node.y !== undefined) {
      setTempConnection({
        from: { x: node.x, y: node.y },
        to: { x: node.x, y: node.y }
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (connectingFrom && tempConnection && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.k;
      const y = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.k;
      
      setTempConnection({
        ...tempConnection,
        to: { x, y }
      });
    }
  }, [connectingFrom, tempConnection]);

  const handleCompleteConnection = useCallback((targetNodeId: string) => {
    if (connectingFrom && connectingFrom !== targetNodeId) {
      // TODO: Call API to create relationship
      console.log('Create relationship:', connectingFrom, '->', targetNodeId);
      // For now, just show alert
      alert(`Create relationship from ${connectingFrom} to ${targetNodeId}`);
    }
    setConnectingFrom(null);
    setTempConnection(null);
  }, [connectingFrom]);

  // Zoom controls
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = select(svgRef.current);
    (svg as any).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = select(svgRef.current);
    (svg as any).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = select(svgRef.current);
    (svg as any)
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, zoomIdentity);
  };

  // Render node
  const renderNode = (node: GraphNode) => {
    const position = nodePositionsRef.current.get(node.id) || node.position;
    const isHovered = hoveredNode === node.id;
    const isSelected = selectedNode === node.id;
    const isConnecting = connectingFrom === node.id;

    // Handle entity nodes
    if (node.type === 'entity') {
      const entity = node.data as Entity;
      const color = ENTITY_COLORS[entity.type] || "#6B7280";

      return (
        <g
          key={node.id}
          className="node-group"
          transform={`translate(${position.x}, ${position.y})`}
          onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={(e) => {
            if (connectingFrom && connectingFrom !== node.id) {
              e.stopPropagation();
              handleCompleteConnection(node.id);
            }
          }}
          style={{ cursor: connectingFrom ? "crosshair" : "grab" }}
        >
          {/* Node circle */}
          <circle
            r={isSelected ? 35 : isHovered ? 32 : 30}
            fill={color}
            stroke={isConnecting ? "#10B981" : isSelected ? "#FFF" : isHovered ? "#FFF" : color}
            strokeWidth={isConnecting ? 4 : isSelected ? 4 : isHovered ? 3 : 2}
            opacity={0.9}
          />
          
          {/* Node label */}
          <text
            y={50}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize="12"
            fontWeight={isSelected ? "600" : "400"}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {entity.name}
          </text>

          {/* Type badge */}
          <text
            y={0}
            textAnchor="middle"
            fill="#FFF"
            fontSize="10"
            fontWeight="600"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {entity.type.charAt(0).toUpperCase()}
          </text>

          {/* Connection button */}
          {(isHovered || isSelected) && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                if (connectingFrom === node.id) {
                  setConnectingFrom(null);
                  setTempConnection(null);
                } else {
                  handleStartConnection(node.id, e);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={35}
                cy={0}
                r={12}
                fill={isConnecting ? "#10B981" : "#3B82F6"}
                stroke="#FFF"
                strokeWidth={2}
              />
              <text
                x={35}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFF"
                fontSize="14"
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                +
              </text>
            </g>
          )}
        </g>
      );
    }

    // Handle evidence nodes
    if (node.type === 'evidence') {
      const evidence = node.data as Evidence;
      const color = EVIDENCE_COLORS[evidence.type] || "#6B7280";
      const IconComponent = EVIDENCE_ICONS[evidence.type] || File;

      return (
        <g
          key={node.id}
          className="node-group"
          transform={`translate(${position.x}, ${position.y})`}
          onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={(e) => {
            if (connectingFrom && connectingFrom !== node.id) {
              e.stopPropagation();
              handleCompleteConnection(node.id);
            }
          }}
          style={{ cursor: connectingFrom ? "crosshair" : "grab" }}
        >
          {/* Evidence node - square shape */}
          <rect
            x={isSelected ? -35 : isHovered ? -32 : -30}
            y={isSelected ? -35 : isHovered ? -32 : -30}
            width={isSelected ? 70 : isHovered ? 64 : 60}
            height={isSelected ? 70 : isHovered ? 64 : 60}
            rx={8}
            fill={color}
            stroke={isConnecting ? "#10B981" : isSelected ? "#FFF" : isHovered ? "#FFF" : color}
            strokeWidth={isConnecting ? 4 : isSelected ? 4 : isHovered ? 3 : 2}
            opacity={0.9}
          />
          
          {/* Evidence icon */}
          <foreignObject
            x={-12}
            y={-12}
            width={24}
            height={24}
            style={{ pointerEvents: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
              <IconComponent size={20} color="#FFF" />
            </div>
          </foreignObject>

          {/* Evidence label */}
          <text
            y={50}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize="11"
            fontWeight={isSelected ? "600" : "400"}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {evidence.title.length > 20 ? evidence.title.substring(0, 20) + '...' : evidence.title}
          </text>

          {/* Connection button */}
          {(isHovered || isSelected) && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                if (connectingFrom === node.id) {
                  setConnectingFrom(null);
                  setTempConnection(null);
                } else {
                  handleStartConnection(node.id, e);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={35}
                cy={0}
                r={12}
                fill={isConnecting ? "#10B981" : "#3B82F6"}
                stroke="#FFF"
                strokeWidth={2}
              />
              <text
                x={35}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFF"
                fontSize="14"
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                +
              </text>
            </g>
          )}
        </g>
      );
    }

    return null;
  };

  // Render connection
  const renderConnection = (conn: GraphConnection) => {
    const sourcePos = nodePositionsRef.current.get(conn.source);
    const targetPos = nodePositionsRef.current.get(conn.target);

    if (!sourcePos || !targetPos) return null;

    const midX = (sourcePos.x + targetPos.x) / 2;
    const midY = (sourcePos.y + targetPos.y) / 2;

    return (
      <g key={conn.id}>
        {/* Connection line */}
        <line
          x1={sourcePos.x}
          y1={sourcePos.y}
          x2={targetPos.x}
          y2={targetPos.y}
          stroke="#D97706"
          strokeWidth={2}
          opacity={0.6}
          strokeDasharray="5,5"
        />

        {/* Connection label */}
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          fill="var(--foreground)"
          fontSize="10"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {conn.relationship.label}
        </text>
      </g>
    );
  };

  return (
    <div 
      className="relative w-full h-full rounded-lg shadow-2xl flex flex-col overflow-hidden"
      style={{ backgroundColor: "#2C2416", minHeight: "600px" }}
    >
      {/* Header */}
      <div
        className="flex-none px-6 py-4 border-b"
        style={{ borderColor: "rgba(139, 92, 46, 0.3)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-medium text-amber-100 mb-2">Knowledge Graph</h2>
            <div className="flex items-center gap-6 text-xs text-amber-200/60">
              <span>{entityCount} entities</span>
              <span>•</span>
              <span>{evidenceCount} evidence items</span>
              <span>•</span>
              <span>{relationshipCount} relationships</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {connectingFrom && (
              <div className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">
                Click another node to connect
              </div>
            )}
            <button
              className="p-2 rounded-lg hover:bg-amber-900/20 transition-colors"
              title="Filters"
            >
              <Filter className="w-5 h-5 text-amber-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden"
        onMouseMove={handleMouseMove}
        onClick={() => {
          if (connectingFrom) {
            setConnectingFrom(null);
            setTempConnection(null);
          }
        }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ backgroundColor: "#2C2416", cursor: connectingFrom ? "crosshair" : "grab" }}
        >
          {/* Dotted background pattern */}
          <defs>
            <pattern
              id="dotted-background"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="#8B7355" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotted-background)" />

          {/* Transform group */}
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {/* Connections layer */}
            <g className="edges-layer">
              {connections.map((conn) => renderConnection(conn))}
              
              {/* Temporary connection line */}
              {tempConnection && (
                <line
                  x1={tempConnection.from.x}
                  y1={tempConnection.from.y}
                  x2={tempConnection.to.x}
                  y2={tempConnection.to.y}
                  stroke="#10B981"
                  strokeWidth={2}
                  opacity={0.6}
                  strokeDasharray="5,5"
                />
              )}
            </g>

            {/* Nodes layer */}
            <g className="nodes-layer">
              {nodes.map((node) => renderNode(node))}
            </g>
          </g>
        </svg>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-lg bg-amber-900/80 hover:bg-amber-900 text-amber-100 flex items-center justify-center transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-lg bg-amber-900/80 hover:bg-amber-900 text-amber-100 flex items-center justify-center transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="w-10 h-10 rounded-lg bg-amber-900/80 hover:bg-amber-900 text-amber-100 flex items-center justify-center transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Legend - Top Left */}
        <div
          className="absolute top-4 left-4 p-4 rounded-lg shadow-lg"
          style={{ backgroundColor: "rgba(44, 36, 22, 0.95)", maxWidth: "280px" }}
        >
          <h3 className="text-amber-100 font-medium text-sm mb-3">Node Legend</h3>
          
          {/* Entity Types */}
          <div className="mb-3">
            <p className="text-amber-200/60 text-xs mb-2">Entities (Circles)</p>
            <div className="space-y-1.5">
              {Object.entries(ENTITY_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <svg width="20" height="20">
                    <circle cx="10" cy="10" r="8" fill={color} opacity="0.9" />
                  </svg>
                  <span className="text-amber-100 text-xs capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Types */}
          <div>
            <p className="text-amber-200/60 text-xs mb-2">Evidence (Squares)</p>
            <div className="space-y-1.5">
              {Object.entries(EVIDENCE_COLORS).map(([type, color]) => {
                const IconComponent = EVIDENCE_ICONS[type as EvidenceType] || File;
                return (
                  <div key={type} className="flex items-center gap-2">
                    <svg width="20" height="20">
                      <rect x="2" y="2" width="16" height="16" rx="2" fill={color} opacity="0.9" />
                    </svg>
                    <span className="text-amber-100 text-xs capitalize">{type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Node info panel - only show when node is selected */}
        {selectedNode && (
          <div
            className="absolute top-4 right-4 p-4 rounded-lg shadow-lg max-w-xs"
            style={{ backgroundColor: "rgba(44, 36, 22, 0.95)" }}
          >
            <div className="text-amber-100">
              {(() => {
                const node = nodes.find((n) => n.id === selectedNode);
                if (!node) return null;

                if (node.type === 'entity') {
                  const entity = node.data as Entity;
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="16" height="16">
                          <circle cx="8" cy="8" r="6" fill={ENTITY_COLORS[entity.type]} opacity="0.9" />
                        </svg>
                        <span className="text-xs text-amber-200/60 capitalize">{entity.type}</span>
                      </div>
                      <h3 className="font-medium text-lg mb-2">{entity.name}</h3>
                      {entity.description && (
                        <p className="text-sm text-amber-200/60 mb-3">
                          {entity.description}
                        </p>
                      )}
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-xs text-amber-300 hover:text-amber-100"
                      >
                        Close
                      </button>
                    </>
                  );
                }

                if (node.type === 'evidence') {
                  const evidence = node.data as Evidence;
                  const IconComponent = EVIDENCE_ICONS[evidence.type] || File;
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="16" height="16">
                          <rect x="2" y="2" width="12" height="12" rx="2" fill={EVIDENCE_COLORS[evidence.type]} opacity="0.9" />
                        </svg>
                        <span className="text-xs text-amber-200/60 capitalize">{evidence.type}</span>
                      </div>
                      <h3 className="font-medium text-lg mb-2">{evidence.title}</h3>
                      {evidence.content && (
                        <p className="text-sm text-amber-200/60 mb-2">
                          {evidence.content}
                        </p>
                      )}
                      {evidence.url && (
                        <p className="text-xs text-amber-200/40 mb-2">
                          {evidence.url}
                        </p>
                      )}
                      {evidence.metadata && (
                        <div className="text-xs text-amber-200/60 mb-3">
                          {Object.entries(evidence.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="capitalize">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-xs text-amber-300 hover:text-amber-100"
                      >
                        Close
                      </button>
                    </>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

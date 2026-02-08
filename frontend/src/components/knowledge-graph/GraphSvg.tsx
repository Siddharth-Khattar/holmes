// ABOUTME: Core D3 force-directed graph SVG canvas for knowledge graph visualization.
// ABOUTME: Uses stored D3 selection refs for tick updates -- all dynamic rendering is via D3, not React JSX.

"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { select } from "d3-selection";
import { clsx } from "clsx";
import { Pause, Play } from "lucide-react";

import { CanvasZoomControls } from "@/components/ui/canvas-zoom-controls";
import { useGraphSimulation } from "@/hooks/useGraphSimulation";
import { useGraphSelection } from "@/hooks/useGraphSelection";
import { SVG_CONFIG } from "@/lib/knowledge-graph-config";
import type {
  EntityResponse,
  RelationshipResponse,
  ForceNode,
  ForceLink,
} from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphSvgProps {
  entities: EntityResponse[];
  relationships: RelationshipResponse[];
  onEntitySelect: (entityId: string | null) => void;
  selectedEntityId: string | null;
  searchMatchIds?: Set<string>;
  className?: string;
}

/** Shape of the node tooltip state. */
interface NodeTooltip {
  x: number;
  y: number;
  node: ForceNode;
}

/** Shape of the edge tooltip state. */
interface EdgeTooltip {
  x: number;
  y: number;
  link: ForceLink;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate text to maxLen characters with ellipsis. */
function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
}

/** Get display label for an entity type (capitalize + replace underscores). */
function formatEntityType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GraphSvg({
  entities,
  relationships,
  onEntitySelect,
  selectedEntityId,
  searchMatchIds,
  className,
}: GraphSvgProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Container dimensions (updates on resize)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // -- D3 force simulation --
  const {
    forceLinks,
    nodeGroupRef,
    linkGroupRef,
    labelGroupRef,
    edgeLabelGroupRef,
    currentZoomScale,
    isSimulationRunning,
    toggleSimulation,
    resetZoom,
    zoomRef,
  } = useGraphSimulation({
    entities,
    relationships,
    width: dimensions.width,
    height: dimensions.height,
    svgRef,
  });

  // -- Selection + search highlighting --
  const { selectedEntityId: internalSelectedId, selectEntity } =
    useGraphSelection({
      nodeGroupRef,
      linkGroupRef,
      labelGroupRef,
      edgeLabelGroupRef,
      forceLinks,
      searchMatchIds,
    });

  // -- Progressive edge label disclosure (zoom threshold) --
  useEffect(() => {
    const edgeLabels = edgeLabelGroupRef.current;
    if (!edgeLabels) return;

    // If a node is selected, selection effect handles visibility
    if (internalSelectedId) return;

    const showLabels = currentZoomScale >= SVG_CONFIG.edgeLabelZoomThreshold;
    edgeLabels.attr("opacity", showLabels ? 1 : 0);
  }, [currentZoomScale, internalSelectedId, edgeLabelGroupRef]);

  // Keep a ref to the latest zoom scale so D3 closures can access it
  const zoomScaleRef = useRef(currentZoomScale);
  zoomScaleRef.current = currentZoomScale;

  // -- Tooltips (managed via React state since they're overlays, not in SVG) --
  const [nodeTooltip, setNodeTooltip] = useState<NodeTooltip | null>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<EdgeTooltip | null>(null);

  // -- Wire up click and hover handlers AFTER D3 creates elements --
  useEffect(() => {
    const nodes = nodeGroupRef.current;
    const links = linkGroupRef.current;
    const edgeLabels = edgeLabelGroupRef.current;
    if (!nodes || !links) return;

    // Node click: select entity + notify parent
    nodes.on("click", (_event: PointerEvent, d: ForceNode) => {
      selectEntity(d.id);
      // If clicking the already-selected entity, deselect (parent gets null)
      onEntitySelect(d.id === selectedEntityId ? null : d.id);
    });

    // Node hover: show tooltip
    nodes.on("mouseenter", (event: MouseEvent, d: ForceNode) => {
      setNodeTooltip({
        x: event.clientX,
        y: event.clientY,
        node: d,
      });
    });

    nodes.on("mousemove", (event: MouseEvent, d: ForceNode) => {
      setNodeTooltip({
        x: event.clientX,
        y: event.clientY,
        node: d,
      });
    });

    nodes.on("mouseleave", () => {
      setNodeTooltip(null);
    });

    // Edge hover: show tooltip + show edge label on hover
    links.on("mouseenter", (event: MouseEvent, d: ForceLink) => {
      setEdgeTooltip({
        x: event.clientX,
        y: event.clientY,
        link: d,
      });
      // Show this edge's label on hover regardless of zoom
      if (edgeLabels) {
        edgeLabels.filter((ld: ForceLink) => ld.id === d.id).attr("opacity", 1);
      }
    });

    links.on("mousemove", (event: MouseEvent, d: ForceLink) => {
      setEdgeTooltip({
        x: event.clientX,
        y: event.clientY,
        link: d,
      });
    });

    links.on("mouseleave", (_event: MouseEvent, d: ForceLink) => {
      setEdgeTooltip(null);
      // Restore edge label visibility based on current zoom threshold
      if (edgeLabels) {
        const showByZoom =
          zoomScaleRef.current >= SVG_CONFIG.edgeLabelZoomThreshold;
        edgeLabels
          .filter((ld: ForceLink) => ld.id === d.id)
          .attr("opacity", showByZoom ? 1 : 0);
      }
    });

    // Increase link hit area for easier hovering
    links.attr("stroke-linecap", "round").style("pointer-events", "stroke");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, relationships, dimensions.width, dimensions.height]);

  // -- Background click: deselect --
  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      // Only deselect if clicking on the SVG background itself (not a node/link)
      const target = event.target as Element;
      if (
        target.tagName === "svg" ||
        target.classList.contains("kg-bg-rect") ||
        target.classList.contains("kg-main-group")
      ) {
        selectEntity(null);
        onEntitySelect(null);
      }
    },
    [selectEntity, onEntitySelect],
  );

  // -- Zoom in/out via CanvasZoomControls --
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = select<SVGSVGElement, unknown>(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  }, [zoomRef]);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = select<SVGSVGElement, unknown>(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  }, [zoomRef]);

  // -- Render --

  const simulationToggle: ReactNode = (
    <button
      onClick={toggleSimulation}
      className={clsx(
        "w-10 h-10 rounded-lg text-foreground flex items-center justify-center transition-colors border border-warm-gray/20 dark:border-stone/20",
        isSimulationRunning
          ? "bg-white/90 dark:bg-jet/90 hover:bg-white dark:hover:bg-jet"
          : "bg-accent/20 hover:bg-accent/30",
      )}
      title={isSimulationRunning ? "Freeze Graph" : "Unfreeze Graph"}
    >
      {isSimulationRunning ? (
        <Pause className="w-5 h-5" />
      ) : (
        <Play className="w-5 h-5" />
      )}
    </button>
  );

  return (
    <div
      ref={containerRef}
      className={clsx("relative w-full h-full overflow-hidden", className)}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: "var(--color-charcoal, #1a1a1a)" }}
        onClick={handleBackgroundClick}
      >
        {/* Static defs: dot background pattern */}
        <defs>
          <pattern
            id="kg-dot-pattern"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="10" cy="10" r="1.2" fill="rgba(138,138,130,0.15)" />
          </pattern>
        </defs>
        <rect
          className="kg-bg-rect"
          width="100%"
          height="100%"
          fill="url(#kg-dot-pattern)"
        />
        {/* D3 renders all dynamic content (nodes, edges, labels) into the SVG via refs */}
      </svg>

      {/* Bottom instruction bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-jet/80 border border-stone/15 text-stone text-xs pointer-events-none select-none">
        Click nodes to explore relationships &middot; Scroll to zoom &middot;
        Drag to pan
      </div>

      {/* Zoom / simulation controls */}
      <CanvasZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={resetZoom}
        extraControls={simulationToggle}
      />

      {/* Node tooltip */}
      {nodeTooltip && <NodeTooltipOverlay tooltip={nodeTooltip} />}

      {/* Edge tooltip */}
      {edgeTooltip && <EdgeTooltipOverlay tooltip={edgeTooltip} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip overlays (positioned via fixed coordinates from mouse events)
// ---------------------------------------------------------------------------

function NodeTooltipOverlay({ tooltip }: { tooltip: NodeTooltip }) {
  const { x, y, node } = tooltip;
  const { entity } = node;

  return (
    <div
      className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg bg-jet/95 border border-stone/20 text-smoke text-xs shadow-lg max-w-70"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: node.color }}
        />
        <span className="font-medium text-sm text-foreground">
          {entity.name}
        </span>
      </div>
      <div className="text-stone mb-1">
        {formatEntityType(entity.entity_type)} &middot; {entity.degree}{" "}
        connection{entity.degree !== 1 ? "s" : ""}
      </div>
      {entity.description_brief && (
        <div className="text-stone/80 leading-relaxed">
          {truncate(entity.description_brief, 150)}
        </div>
      )}
    </div>
  );
}

function EdgeTooltipOverlay({ tooltip }: { tooltip: EdgeTooltip }) {
  const { x, y, link } = tooltip;
  const primary = link.relationships[0];
  if (!primary) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg bg-jet/95 border border-stone/20 text-smoke text-xs shadow-lg max-w-[320px]"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="font-medium text-sm text-foreground mb-1">
        {primary.label}
        {link.count > 1 && (
          <span className="text-stone ml-1">(+{link.count - 1} more)</span>
        )}
      </div>
      <div className="text-stone mb-1">
        Type: {primary.relationship_type}
        {primary.confidence != null && (
          <span> &middot; Confidence: {primary.confidence}%</span>
        )}
        {primary.corroboration_count != null &&
          primary.corroboration_count > 0 && (
            <span> &middot; Corroborated: {primary.corroboration_count}x</span>
          )}
      </div>
      {primary.temporal_context && (
        <div className="text-stone/80 mb-1">
          {truncate(primary.temporal_context, 120)}
        </div>
      )}
      {primary.evidence_excerpt && (
        <div className="text-stone/60 italic leading-relaxed">
          &ldquo;{truncate(primary.evidence_excerpt, 200)}&rdquo;
        </div>
      )}
      {link.count > 1 && (
        <div className="mt-1.5 pt-1.5 border-t border-stone/15">
          <div className="text-stone/70 mb-0.5">All relationships:</div>
          {link.relationships.map((rel) => (
            <div key={rel.id} className="text-stone/80 truncate">
              &bull; {rel.label} ({rel.relationship_type})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

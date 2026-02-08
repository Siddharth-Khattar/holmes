// ABOUTME: D3 force simulation lifecycle management for the Knowledge Graph.
// ABOUTME: Creates, configures (5 forces), starts, and stops the simulation using D3 selection refs for tick updates (zero React re-renders).

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  type Simulation,
} from "d3-force";
import {
  zoom as d3Zoom,
  zoomIdentity,
  type ZoomBehavior,
  type D3ZoomEvent,
} from "d3-zoom";
import { select, type Selection } from "d3-selection";
import { drag as d3Drag } from "d3-drag";
import { scaleLinear, scalePow } from "d3-scale";
import "d3-transition";

import type {
  EntityResponse,
  RelationshipResponse,
  ForceNode,
  ForceLink,
} from "@/types/knowledge-graph";
import {
  FORCE_CONFIG,
  NODE_SIZE,
  EDGE_STYLE,
  SVG_CONFIG,
  getEntityColor,
  getEntityShape,
  getEntityIconPaths,
} from "@/lib/knowledge-graph-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseGraphSimulationProps {
  entities: EntityResponse[];
  relationships: RelationshipResponse[];
  width: number;
  height: number;
  svgRef: RefObject<SVGSVGElement | null>;
}

interface UseGraphSimulationReturn {
  forceNodes: ForceNode[];
  forceLinks: ForceLink[];
  simulationRef: RefObject<Simulation<ForceNode, ForceLink> | null>;
  nodeGroupRef: RefObject<Selection<
    SVGGElement,
    ForceNode,
    SVGGElement,
    unknown
  > | null>;
  linkGroupRef: RefObject<Selection<
    SVGLineElement,
    ForceLink,
    SVGGElement,
    unknown
  > | null>;
  labelGroupRef: RefObject<Selection<
    SVGTextElement,
    ForceNode,
    SVGGElement,
    unknown
  > | null>;
  edgeLabelGroupRef: RefObject<Selection<
    SVGGElement,
    ForceLink,
    SVGGElement,
    unknown
  > | null>;
  zoomRef: RefObject<ZoomBehavior<SVGSVGElement, unknown> | null>;
  currentZoomScale: number;
  isSimulationRunning: boolean;
  toggleSimulation: () => void;
  resetZoom: () => void;
}

// ---------------------------------------------------------------------------
// Constants for rect sizing
// ---------------------------------------------------------------------------

/** Ratio of rect half-width to equivalent circle radius for visual area balance. */
const RECT_SIDE_RATIO = 1.6;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGraphSimulation({
  entities,
  relationships,
  width,
  height,
  svgRef,
}: UseGraphSimulationProps): UseGraphSimulationReturn {
  // D3 selection refs (stable across renders)
  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null);
  const nodeGroupRef = useRef<Selection<
    SVGGElement,
    ForceNode,
    SVGGElement,
    unknown
  > | null>(null);
  const linkGroupRef = useRef<Selection<
    SVGLineElement,
    ForceLink,
    SVGGElement,
    unknown
  > | null>(null);
  const labelGroupRef = useRef<Selection<
    SVGTextElement,
    ForceNode,
    SVGGElement,
    unknown
  > | null>(null);
  const edgeLabelGroupRef = useRef<Selection<
    SVGGElement,
    ForceLink,
    SVGGElement,
    unknown
  > | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const mainGroupRef = useRef<Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [currentZoomScale, setCurrentZoomScale] = useState(1);
  const manuallyStoppedRef = useRef(false);

  // -------------------------------------------------------------------------
  // Data transformation: EntityResponse[] -> ForceNode[], RelationshipResponse[] -> ForceLink[]
  // -------------------------------------------------------------------------

  const forceNodes = useMemo<ForceNode[]>(() => {
    if (entities.length === 0) return [];

    const maxDegree = Math.max(...entities.map((e) => e.degree), 1);
    const radiusScale = scaleLinear()
      .domain([0, maxDegree])
      .range([NODE_SIZE.minRadius, NODE_SIZE.maxRadius])
      .clamp(true);

    return entities.map((entity) => ({
      id: entity.id,
      entity,
      radius: radiusScale(entity.degree),
      color: getEntityColor(entity.entity_type),
    }));
  }, [entities]);

  const forceLinks = useMemo<ForceLink[]>(() => {
    if (relationships.length === 0) return [];

    // Build deduplicated edge map
    const edgeMap = new Map<
      string,
      { relationships: RelationshipResponse[]; count: number }
    >();

    for (const rel of relationships) {
      // Canonical key: sort entity IDs alphabetically
      const ids = [rel.source_entity_id, rel.target_entity_id].sort();
      const edgeKey = `${ids[0]}|||${ids[1]}`;

      const existing = edgeMap.get(edgeKey);
      if (existing) {
        existing.relationships.push(rel);
        existing.count += 1;
      } else {
        edgeMap.set(edgeKey, { relationships: [rel], count: 1 });
      }
    }

    const links: ForceLink[] = [];
    for (const [key, data] of edgeMap) {
      const [sourceId, targetId] = key.split("|||");
      links.push({
        id: key,
        source: sourceId,
        target: targetId,
        relationships: data.relationships,
        count: data.count,
      });
    }
    return links;
  }, [relationships]);

  // -------------------------------------------------------------------------
  // Simulation + SVG rendering setup
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!svgRef.current || width <= 0 || height <= 0) return;
    if (forceNodes.length === 0) {
      // Clear SVG if no data
      select(svgRef.current).selectAll("g.kg-main-group").remove();
      return;
    }

    // -- Clear previous content --
    const svgSel = select(svgRef.current);
    svgSel.selectAll("g.kg-main-group").remove();

    // -- Zoom behavior --
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent(SVG_CONFIG.zoomExtent)
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (mainGroupRef.current) {
          mainGroupRef.current.attr("transform", event.transform.toString());
        }
        setCurrentZoomScale(event.transform.k);
      });
    svgSel.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // -- Main transform group --
    const mainGroup = svgSel
      .append("g")
      .attr("class", "kg-main-group") as Selection<
      SVGGElement,
      unknown,
      null,
      undefined
    >;
    mainGroupRef.current = mainGroup;

    // -- Defs: drop shadow filter --
    const defs = svgSel.select<SVGDefsElement>("defs");
    // Clean up any stale glow filter from prior versions
    defs.select("#kg-node-glow").remove();
    if (defs.select("#kg-node-shadow").empty()) {
      const filter = defs
        .append("filter")
        .attr("id", "kg-node-shadow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
      filter
        .append("feDropShadow")
        .attr("dx", 2)
        .attr("dy", 2)
        .attr("stdDeviation", 4)
        .attr("flood-color", "rgba(0,0,0,0.3)");
    }

    // -- Stroke width scale for edge strength (0-100 -> minWidth to maxWidth) --
    const strengthScale = scalePow()
      .exponent(0.5)
      .domain([0, 100])
      .range([EDGE_STYLE.minWidth, EDGE_STYLE.maxWidth])
      .clamp(true);

    // -- Link group --
    const linkGroup = mainGroup.append("g").attr("class", "kg-links");
    const linkElements = linkGroup
      .selectAll<SVGLineElement, ForceLink>("line")
      .data(forceLinks, (d: ForceLink) => d.id)
      .join("line")
      .attr("stroke", EDGE_STYLE.defaultColor)
      .attr("stroke-width", (d) => {
        const primaryStrength = d.relationships[0]?.strength ?? 50;
        return strengthScale(primaryStrength);
      })
      .attr("stroke-opacity", EDGE_STYLE.defaultOpacity);
    linkGroupRef.current = linkElements as unknown as Selection<
      SVGLineElement,
      ForceLink,
      SVGGElement,
      unknown
    >;

    // -- Edge label group (each label is a <g> with <rect> bg + <text>) --
    const edgeLabelGroup = mainGroup
      .append("g")
      .attr("class", "kg-edge-labels");
    const edgeLabelElements = edgeLabelGroup
      .selectAll<SVGGElement, ForceLink>("g.kg-edge-label")
      .data(forceLinks, (d: ForceLink) => d.id)
      .join("g")
      .attr("class", "kg-edge-label")
      .style("pointer-events", "none")
      .style("user-select", "none")
      // Start hidden -- progressive disclosure logic controls visibility
      .attr("opacity", 0);

    // Background pill behind edge label text
    edgeLabelElements
      .append("rect")
      .attr("fill", "rgba(5,5,5,0.7)")
      .attr("rx", 3)
      .attr("ry", 3);

    // Edge label text
    edgeLabelElements
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#8A8A82")
      .attr("font-size", SVG_CONFIG.edgeLabelFontSize)
      .text((d) => {
        const primaryLabel = d.relationships[0]?.label ?? "";
        if (d.count > 1) {
          return `${primaryLabel} +${d.count - 1}`;
        }
        return primaryLabel;
      });

    // Size the background rects to fit the text
    edgeLabelElements.each(function () {
      const g = select(this);
      const textEl = g.select<SVGTextElement>("text").node();
      if (textEl) {
        const bbox = textEl.getBBox();
        g.select("rect")
          .attr("x", bbox.x - 4)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 8)
          .attr("height", bbox.height + 4);
      }
    });

    edgeLabelGroupRef.current = edgeLabelElements as Selection<
      SVGGElement,
      ForceLink,
      SVGGElement,
      unknown
    >;

    // -- Node group (each node is a <g> containing shape + icon) --
    const nodeGroup = mainGroup.append("g").attr("class", "kg-nodes");
    const nodeElements = nodeGroup
      .selectAll<SVGGElement, ForceNode>("g.kg-node")
      .data(forceNodes, (d: ForceNode) => d.id)
      .join("g")
      .attr("class", "kg-node")
      .style("cursor", "pointer");

    // Render shapes based on entity type
    nodeElements.each(function (d) {
      const g = select(this);
      const shape = getEntityShape(d.entity.entity_type);

      if (shape === "rect") {
        const halfW = d.radius * RECT_SIDE_RATIO * 0.5;
        const halfH = d.radius * 0.9;
        g.append("rect")
          .attr("x", -halfW)
          .attr("y", -halfH)
          .attr("width", halfW * 2)
          .attr("height", halfH * 2)
          .attr("rx", 6)
          .attr("ry", 6)
          .attr("fill", d.color)
          .attr("stroke", d.color)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6)
          .attr("filter", "url(#kg-node-shadow)");
      } else {
        g.append("circle")
          .attr("r", d.radius)
          .attr("fill", d.color)
          .attr("stroke", d.color)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6)
          .attr("filter", "url(#kg-node-shadow)");
      }

      // Embed Lucide icon inside the node
      const iconPaths = getEntityIconPaths(d.entity.entity_type);
      const iconSize = d.radius * 0.5; // icon occupies ~50% of radius
      const iconScale = iconSize / 12; // Lucide viewBox is 24x24, so 12 = half
      const iconGroup = g
        .append("g")
        .attr(
          "transform",
          `translate(${-12 * iconScale},${-12 * iconScale}) scale(${iconScale})`,
        )
        .attr("fill", "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");

      for (const pathD of iconPaths) {
        iconGroup.append("path").attr("d", pathD);
      }
    });

    nodeGroupRef.current = nodeElements as Selection<
      SVGGElement,
      ForceNode,
      SVGGElement,
      unknown
    >;

    // -- Label group --
    const labelGroup = mainGroup.append("g").attr("class", "kg-labels");
    const labelElements = labelGroup
      .selectAll<SVGTextElement, ForceNode>("text")
      .data(forceNodes, (d: ForceNode) => d.id)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("fill", "#D4D3CE")
      .attr("font-size", SVG_CONFIG.labelFontSize)
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text((d) => {
        const name = d.entity.name;
        return name.length > 20 ? name.slice(0, 18) + "..." : name;
      });
    labelGroupRef.current = labelElements as unknown as Selection<
      SVGTextElement,
      ForceNode,
      SVGGElement,
      unknown
    >;

    // -- Drag behavior --
    const dragBehavior = d3Drag<SVGGElement, ForceNode>()
      .on("start", (event, d) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0);
        }
        d.fx = null;
        d.fy = null;
      });
    nodeElements.call(dragBehavior);

    // -- Force simulation --
    const maxConnections = Math.max(
      ...forceNodes.map((n) => n.entity.degree),
      1,
    );
    const maxRadius = Math.min(width, height) * 0.35;
    const minRadius = FORCE_CONFIG.radial.minRadius;

    const simulation = forceSimulation<ForceNode>(forceNodes)
      .force(
        "link",
        forceLink<ForceNode, ForceLink>(forceLinks)
          .id((d) => d.id)
          .distance(FORCE_CONFIG.link.distance)
          .strength(FORCE_CONFIG.link.strength),
      )
      .force(
        "charge",
        forceManyBody<ForceNode>().strength(FORCE_CONFIG.charge.strength),
      )
      .force(
        "center",
        forceCenter(width / 2, height / 2).strength(
          FORCE_CONFIG.center.strength,
        ),
      )
      .force(
        "collide",
        forceCollide<ForceNode>().radius(
          (d) => d.radius + FORCE_CONFIG.collision.padding,
        ),
      )
      .force(
        "radial",
        forceRadial<ForceNode>(
          (d) => {
            // High degree = small radius (center), low degree = large radius (periphery)
            return (
              maxRadius -
              (d.entity.degree / maxConnections) * (maxRadius - minRadius)
            );
          },
          width / 2,
          height / 2,
        ).strength((d) => {
          return (
            FORCE_CONFIG.radial.strengthBase +
            (d.entity.degree / maxConnections) *
              FORCE_CONFIG.radial.strengthScale
          );
        }),
      )
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    // -- Tick handler: update DOM via D3 refs, NOT React state --
    simulation.on("tick", () => {
      linkGroupRef.current
        ?.attr("x1", (d) => ((d.source as ForceNode).x ?? 0).toString())
        .attr("y1", (d) => ((d.source as ForceNode).y ?? 0).toString())
        .attr("x2", (d) => ((d.target as ForceNode).x ?? 0).toString())
        .attr("y2", (d) => ((d.target as ForceNode).y ?? 0).toString());

      edgeLabelGroupRef.current?.attr("transform", (d) => {
        const sx = (d.source as ForceNode).x ?? 0;
        const sy = (d.source as ForceNode).y ?? 0;
        const tx = (d.target as ForceNode).x ?? 0;
        const ty = (d.target as ForceNode).y ?? 0;
        return `translate(${(sx + tx) / 2},${(sy + ty) / 2})`;
      });

      nodeGroupRef.current?.attr(
        "transform",
        (d) => `translate(${d.x ?? 0},${d.y ?? 0})`,
      );

      labelGroupRef.current
        ?.attr("x", (d) => d.x ?? 0)
        .attr("y", (d) => (d.y ?? 0) + d.radius + SVG_CONFIG.labelOffset);
    });

    simulation.on("end", () => {
      if (!manuallyStoppedRef.current) {
        setIsSimulationRunning(false);
      }
    });

    // Restart simulation
    manuallyStoppedRef.current = false;
    setIsSimulationRunning(true);

    // -- Cleanup --
    return () => {
      simulation.stop();
      simulationRef.current = null;
      svgSel.on(".zoom", null);
      svgSel.selectAll("g.kg-main-group").remove();
      defs.select("#kg-node-shadow").remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, relationships, width, height]);

  // -------------------------------------------------------------------------
  // Controls
  // -------------------------------------------------------------------------

  const toggleSimulation = useCallback(() => {
    if (!simulationRef.current) return;

    if (isSimulationRunning) {
      simulationRef.current.alpha(0).stop();
      manuallyStoppedRef.current = true;
      setIsSimulationRunning(false);
    } else {
      manuallyStoppedRef.current = false;
      simulationRef.current.alpha(0.3).restart();
      setIsSimulationRunning(true);
    }
  }, [isSimulationRunning]);

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svgSel = select<SVGSVGElement, unknown>(svgRef.current);
    svgSel
      .transition()
      .duration(500)
      .call(zoomRef.current.transform, zoomIdentity);
  }, [svgRef]);

  return {
    forceNodes,
    forceLinks,
    simulationRef,
    nodeGroupRef,
    linkGroupRef,
    labelGroupRef,
    edgeLabelGroupRef,
    zoomRef,
    currentZoomScale,
    isSimulationRunning,
    toggleSimulation,
    resetZoom,
  };
}

// ABOUTME: Selection state, DOM highlighting, and search match highlighting for the Knowledge Graph.
// ABOUTME: Operates on D3 selection refs without re-running the force simulation.

import { useState, useMemo, useEffect, useCallback } from "react";
import type { RefObject } from "react";
import { select, type Selection } from "d3-selection";
import type { ForceNode, ForceLink } from "@/types/knowledge-graph";
import { EDGE_STYLE } from "@/lib/knowledge-graph-config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Coral accent ring for search matches (distinct from white selection border). */
const SEARCH_HIGHLIGHT_STROKE = "#E87461";
const SEARCH_HIGHLIGHT_STROKE_WIDTH = 3;

const SELECTION_STROKE = "#ffffff";
const SELECTION_STROKE_WIDTH = 3;

const DIMMED_NODE_OPACITY = 0.2;
const DIMMED_EDGE_OPACITY = 0.15;
const DIMMED_LABEL_OPACITY = 0.2;

const SEARCH_DIM_NODE_OPACITY = 0.3;
const SEARCH_DIM_EDGE_OPACITY = 0.2;
const SEARCH_DIM_LABEL_OPACITY = 0.3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseGraphSelectionProps {
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
    SVGTextElement,
    ForceLink,
    SVGGElement,
    unknown
  > | null>;
  forceLinks: ForceLink[];
  searchMatchIds?: Set<string>;
}

interface UseGraphSelectionReturn {
  selectedEntityId: string | null;
  connectedEntityIds: Set<string>;
  selectEntity: (entityId: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a ForceLink connects to a given entity ID (after D3 resolves source/target to objects). */
function linkConnectsTo(link: ForceLink, entityId: string): boolean {
  const sourceId =
    typeof link.source === "string"
      ? link.source
      : (link.source as ForceNode).id;
  const targetId =
    typeof link.target === "string"
      ? link.target
      : (link.target as ForceNode).id;
  return sourceId === entityId || targetId === entityId;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGraphSelection({
  nodeGroupRef,
  linkGroupRef,
  labelGroupRef,
  edgeLabelGroupRef,
  forceLinks,
  searchMatchIds,
}: UseGraphSelectionProps): UseGraphSelectionReturn {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Derive connected entity IDs for the selected entity
  const connectedEntityIds = useMemo<Set<string>>(() => {
    if (!selectedEntityId) return new Set();

    const connected = new Set<string>();
    connected.add(selectedEntityId);

    for (const link of forceLinks) {
      const sourceId =
        typeof link.source === "string"
          ? link.source
          : (link.source as ForceNode).id;
      const targetId =
        typeof link.target === "string"
          ? link.target
          : (link.target as ForceNode).id;

      if (sourceId === selectedEntityId) {
        connected.add(targetId);
      } else if (targetId === selectedEntityId) {
        connected.add(sourceId);
      }
    }
    return connected;
  }, [selectedEntityId, forceLinks]);

  // Toggle selection: clicking same node deselects
  const selectEntity = useCallback(
    (entityId: string | null) => {
      if (entityId === selectedEntityId) {
        setSelectedEntityId(null);
      } else {
        setSelectedEntityId(entityId);
      }
    },
    [selectedEntityId],
  );

  // ---------------------------------------------------------------------------
  // Selection highlighting useEffect (depends ONLY on selectedEntityId)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const nodes = nodeGroupRef.current;
    const links = linkGroupRef.current;
    const labels = labelGroupRef.current;
    const edgeLabels = edgeLabelGroupRef.current;
    if (!nodes || !links || !labels) return;

    if (!selectedEntityId) {
      // Restore all to defaults
      nodes
        .select("circle")
        .attr("stroke", (d: ForceNode) => d.color)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.6);
      nodes.attr("opacity", 1);

      links
        .attr("stroke", EDGE_STYLE.defaultColor)
        .attr("stroke-opacity", EDGE_STYLE.defaultOpacity);

      labels.attr("opacity", 1);

      edgeLabels?.attr("opacity", 1);
      return;
    }

    // Highlight selected node + connected subgraph
    nodes.each((d, i, elements) => {
      const g = select(elements[i]);
      const isSelected = d.id === selectedEntityId;
      const isConnected = connectedEntityIds.has(d.id);

      if (isSelected) {
        g.select("circle")
          .attr("stroke", SELECTION_STROKE)
          .attr("stroke-width", SELECTION_STROKE_WIDTH)
          .attr("stroke-opacity", 1);
        g.attr("opacity", 1);
      } else if (isConnected) {
        g.select("circle")
          .attr("stroke", d.color)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6);
        g.attr("opacity", 1);
      } else {
        g.select("circle")
          .attr("stroke", d.color)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6);
        g.attr("opacity", DIMMED_NODE_OPACITY);
      }
    });

    links.each((d, i, elements) => {
      const line = select(elements[i]);
      const connected = linkConnectsTo(d, selectedEntityId);
      if (connected) {
        line
          .attr("stroke", EDGE_STYLE.selectedColor)
          .attr("stroke-opacity", EDGE_STYLE.selectedOpacity);
      } else {
        line
          .attr("stroke", EDGE_STYLE.defaultColor)
          .attr("stroke-opacity", DIMMED_EDGE_OPACITY);
      }
    });

    labels.attr("opacity", (d: ForceNode) => {
      if (!selectedEntityId) return 1;
      return connectedEntityIds.has(d.id) ? 1 : DIMMED_LABEL_OPACITY;
    });

    edgeLabels?.attr("opacity", (d: ForceLink) => {
      if (!selectedEntityId) return 1;
      return linkConnectsTo(d, selectedEntityId) ? 1 : DIMMED_LABEL_OPACITY;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntityId]);

  // ---------------------------------------------------------------------------
  // Search match highlighting useEffect (depends ONLY on searchMatchIds)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const nodes = nodeGroupRef.current;
    const links = linkGroupRef.current;
    const labels = labelGroupRef.current;
    if (!nodes || !links || !labels) return;

    // If selection is active, selection effect takes priority — skip search overlay
    if (selectedEntityId) return;

    if (!searchMatchIds || searchMatchIds.size === 0) {
      // Remove search highlight styling — restore defaults
      nodes
        .select("circle")
        .attr("stroke", (d: ForceNode) => d.color)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.6);
      nodes.attr("opacity", 1);

      links
        .attr("stroke", EDGE_STYLE.defaultColor)
        .attr("stroke-opacity", EDGE_STYLE.defaultOpacity);

      labels.attr("opacity", 1);
      return;
    }

    // Apply search highlight: matching nodes get accent glow ring, non-matching dim
    nodes.each((d, i, elements) => {
      const g = select(elements[i]);

      if (searchMatchIds.has(d.id)) {
        g.select("circle")
          .attr("stroke", SEARCH_HIGHLIGHT_STROKE)
          .attr("stroke-width", SEARCH_HIGHLIGHT_STROKE_WIDTH)
          .attr("stroke-opacity", 1);
        g.attr("opacity", 1);
      } else {
        g.select("circle")
          .attr("stroke", d.color)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6);
        g.attr("opacity", SEARCH_DIM_NODE_OPACITY);
      }
    });

    // Dim non-matching edges
    links.each((d, i, elements) => {
      const line = select(elements[i]);
      const sourceId =
        typeof d.source === "string" ? d.source : (d.source as ForceNode).id;
      const targetId =
        typeof d.target === "string" ? d.target : (d.target as ForceNode).id;
      const eitherMatches =
        searchMatchIds.has(sourceId) || searchMatchIds.has(targetId);

      if (eitherMatches) {
        line
          .attr("stroke", EDGE_STYLE.defaultColor)
          .attr("stroke-opacity", EDGE_STYLE.defaultOpacity);
      } else {
        line
          .attr("stroke", EDGE_STYLE.defaultColor)
          .attr("stroke-opacity", SEARCH_DIM_EDGE_OPACITY);
      }
    });

    labels.attr("opacity", (d: ForceNode) => {
      return searchMatchIds.has(d.id) ? 1 : SEARCH_DIM_LABEL_OPACITY;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMatchIds]);

  return {
    selectedEntityId,
    connectedEntityIds,
    selectEntity,
  };
}

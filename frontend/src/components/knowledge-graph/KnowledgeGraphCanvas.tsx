// ABOUTME: Main orchestrator for the 3-panel KG layout. Composes GraphSvg,
// ABOUTME: FilterPanel, EntityTimeline, and SourceViewerModal with shared state flows.

"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { clsx } from "clsx";

import { GraphSvg } from "./GraphSvg";
import { FilterPanel } from "./FilterPanel";
import { EntityTimeline } from "./EntityTimeline";
import { SourceViewerModal } from "@/components/source-viewer/SourceViewerModal";
import type { SourceViewerContent } from "@/components/source-viewer/SourceViewerModal";
import { useGraphFilters } from "@/hooks/useGraphFilters";
import type {
  EntityResponse,
  RelationshipResponse,
} from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KnowledgeGraphCanvasProps {
  entities: EntityResponse[];
  relationships: RelationshipResponse[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KnowledgeGraphCanvas({
  entities,
  relationships,
}: KnowledgeGraphCanvasProps) {
  // -- Filter state (from useGraphFilters hook) --
  const {
    filters,
    toggleDomain,
    toggleEntityType,
    setSearchQuery,
    setKeywordFilter,
    filteredEntities,
    filteredRelationships,
    searchMatchIds,
    entityTypeCounts,
    domainCounts,
  } = useGraphFilters({ entities, relationships });

  // -- Panel visibility --
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // -- Source viewer --
  const [sourceViewerContent, setSourceViewerContent] =
    useState<SourceViewerContent | null>(null);

  // -- Fullscreen --
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // -- Derived state: resolve selected entity and its relationships --
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    return entities.find((e) => e.id === selectedEntityId) ?? null;
  }, [selectedEntityId, entities]);

  const selectedEntityRelationships = useMemo(() => {
    if (!selectedEntityId) return [];
    return relationships.filter(
      (r) =>
        r.source_entity_id === selectedEntityId ||
        r.target_entity_id === selectedEntityId,
    );
  }, [selectedEntityId, relationships]);

  // -- Event handlers --
  const handleEntitySelect = useCallback(
    (entityId: string | null) => {
      // Close source viewer when selecting a different entity or deselecting
      if (entityId !== selectedEntityId) {
        setSourceViewerContent(null);
      }
      setSelectedEntityId(entityId);
    },
    [selectedEntityId],
  );

  const handleDeselectEntity = useCallback(() => {
    setSelectedEntityId(null);
    setSourceViewerContent(null);
  }, []);

  const handleViewSource = useCallback((content: SourceViewerContent) => {
    setSourceViewerContent(content);
    // Right sidebar stays open -- no state change to selectedEntityId
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      document.exitFullscreen?.().catch(() => {
        // Ignore errors (e.g., not in fullscreen)
      });
      setIsFullscreen(false);
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {
        // Ignore errors (e.g., not supported)
      });
      setIsFullscreen(true);
    }
  }, [isFullscreen]);

  const handleToggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen((prev) => !prev);
  }, []);

  // -- Suppress unused handleViewSource lint warning --
  // Source viewer wiring is in place but EntityTimelineEntry currently shows
  // "Source not yet available" (graceful degradation). handleViewSource will
  // be wired when source navigation is available.
  void handleViewSource;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative flex w-full h-full overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 bg-charcoal",
      )}
    >
      {/* Left: Filter Panel (collapsible) */}
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onToggle={handleToggleFilterPanel}
        filters={filters}
        onToggleDomain={toggleDomain}
        onToggleEntityType={toggleEntityType}
        onSearchChange={setSearchQuery}
        onKeywordChange={setKeywordFilter}
        entityTypeCounts={entityTypeCounts}
        domainCounts={domainCounts}
        totalEntities={entities.length}
        totalRelationships={relationships.length}
      />

      {/* Center: Graph area (flexes to fill remaining space) */}
      <div className="relative flex-1 min-w-0">
        {/* GraphSvg fills the center area */}
        <GraphSvg
          entities={filteredEntities}
          relationships={filteredRelationships}
          onEntitySelect={handleEntitySelect}
          selectedEntityId={selectedEntityId}
          searchMatchIds={searchMatchIds}
        />

        {/* Source viewer modal overlays graph area only (NOT the right sidebar) */}
        {sourceViewerContent && (
          <div className="absolute inset-0 z-30">
            <SourceViewerModal
              content={sourceViewerContent}
              onClose={() => setSourceViewerContent(null)}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Fullscreen toggle button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 left-4 z-20 p-2 rounded-lg bg-jet/80 border border-stone/15 text-stone hover:text-smoke transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Right: Entity Timeline sidebar (appears when entity selected) */}
      {selectedEntity && (
        <div className="flex-none w-[380px] bg-jet border-l border-stone/15 overflow-hidden">
          <EntityTimeline
            entity={selectedEntity}
            relationships={selectedEntityRelationships}
            allEntities={entities}
            onClose={handleDeselectEntity}
          />
        </div>
      )}
    </div>
  );
}

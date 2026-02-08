// ABOUTME: Main orchestrator for the KG layout. Composes CanvasShell, GraphSvg,
// ABOUTME: FilterPanel, and SourceViewerModal; entity detail renders in the app-wide DetailSidebar.

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Maximize2, Minimize2, Network, Hash } from "lucide-react";
import { clsx } from "clsx";

import { CanvasShell } from "@/components/ui/canvas-shell";
import { GraphSvg } from "./GraphSvg";
import { FilterPanel } from "./FilterPanel";
import { SourceViewerModal } from "@/components/source-viewer/SourceViewerModal";
import type { SourceViewerContent } from "@/components/source-viewer/SourceViewerModal";
import { useGraphFilters } from "@/hooks/useGraphFilters";
import { useDetailSidebarDispatch } from "@/hooks";
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

  // -- Detail sidebar dispatch --
  const { setContent, clearContent } = useDetailSidebarDispatch();

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

  // -- Event handlers (declared before effects that reference them) --
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

  // -- Push entity content to app-wide DetailSidebar --
  useEffect(() => {
    if (selectedEntity) {
      setContent({
        type: "knowledge-graph-entity",
        props: {
          entityId: selectedEntity.id,
          entity: selectedEntity,
          relationships: selectedEntityRelationships,
          allEntities: entities,
          onEntitySelect: handleEntitySelect,
        },
      });
    } else {
      clearContent();
    }
  }, [
    selectedEntity,
    selectedEntityRelationships,
    entities,
    setContent,
    clearContent,
    handleEntitySelect,
  ]);

  // -- Clear sidebar on unmount --
  useEffect(() => {
    return () => {
      clearContent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewSource = useCallback((content: SourceViewerContent) => {
    setSourceViewerContent(content);
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

  // Source viewer wiring is in place but EntityTimelineEntry currently shows
  // "Source not yet available" (graceful degradation). handleViewSource will
  // be wired when source navigation is available.
  void handleViewSource;

  // -- Header stats badges --
  const headerRight = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Network size={13} className="text-stone/60" />
        <span className="text-xs text-stone">
          {entities.length} entit{entities.length === 1 ? "y" : "ies"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Hash size={13} className="text-stone/60" />
        <span className="text-xs text-stone">
          {relationships.length} relationship
          {relationships.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full h-full",
        isFullscreen && "fixed inset-0 z-50 bg-charcoal",
      )}
    >
      <CanvasShell title="Knowledge Graph" headerRight={headerRight}>
        {/* Graph content area (relative for floating overlays) */}
        <div className="relative w-full h-full">
          {/* GraphSvg fills the content area */}
          <GraphSvg
            entities={filteredEntities}
            relationships={filteredRelationships}
            onEntitySelect={handleEntitySelect}
            selectedEntityId={selectedEntityId}
            searchMatchIds={searchMatchIds}
          />

          {/* Floating filter panel (absolute inside content) */}
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

          {/* Source viewer modal overlays graph area */}
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
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-jet/80 border border-stone/15 text-stone hover:text-smoke transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </CanvasShell>
    </div>
  );
}

// ABOUTME: Left collapsible filter panel for the knowledge graph visualization.
// ABOUTME: Contains graph stats, entity search, keyword filter, domain toggles, and entity type toggles.

"use client";

import { useState, useCallback } from "react";
import {
  Filter,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Network,
  Hash,
} from "lucide-react";
import { clsx } from "clsx";

import {
  getEntityColor,
  ENTITY_TYPE_COLORS,
} from "@/lib/knowledge-graph-config";
import type { GraphFilters } from "@/types/knowledge-graph";

// ---------------------------------------------------------------------------
// Domain display config (known domain names)
// ---------------------------------------------------------------------------

const DOMAIN_DISPLAY: Record<string, { label: string; color: string }> = {
  financial: { label: "Financial", color: "#45B5AA" },
  legal: { label: "Legal", color: "#5B8DEF" },
  evidence: { label: "Evidence", color: "#E87461" },
  strategy: { label: "Strategy", color: "#D4A843" },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: GraphFilters;
  onToggleDomain: (domain: string) => void;
  onToggleEntityType: (type: string) => void;
  onSearchChange: (query: string) => void;
  onKeywordChange: (keywords: string) => void;
  entityTypeCounts: Map<string, number>;
  domainCounts: Map<string, number>;
  totalEntities: number;
  totalRelationships: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Title-case an entity type string (replace underscores, capitalize). */
function formatEntityType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Sorted entity type keys for consistent display order. */
const ENTITY_TYPE_ORDER = Object.keys(ENTITY_TYPE_COLORS);

// ---------------------------------------------------------------------------
// FilterPanel component
// ---------------------------------------------------------------------------

export function FilterPanel({
  isOpen,
  onToggle,
  filters,
  onToggleDomain,
  onToggleEntityType,
  onSearchChange,
  onKeywordChange,
  entityTypeCounts,
  domainCounts,
  totalEntities,
  totalRelationships,
}: FilterPanelProps) {
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);
  const [localKeyword, setLocalKeyword] = useState(filters.keywordFilter);

  // Search input: immediate local state + debounced callback
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      onSearchChange(value);
    },
    [onSearchChange],
  );

  // Keyword input: immediate local state + callback
  const handleKeywordChange = useCallback(
    (value: string) => {
      setLocalKeyword(value);
      onKeywordChange(value);
    },
    [onKeywordChange],
  );

  // Domain select all / deselect all
  const allDomainsActive = Array.from(domainCounts.keys()).every((d) =>
    filters.activeDomains.has(d),
  );

  const handleDomainSelectAll = useCallback(() => {
    const allDomains = Array.from(domainCounts.keys());
    for (const d of allDomains) {
      if (!filters.activeDomains.has(d)) onToggleDomain(d);
    }
  }, [domainCounts, filters.activeDomains, onToggleDomain]);

  const handleDomainDeselectAll = useCallback(() => {
    const allDomains = Array.from(domainCounts.keys());
    for (const d of allDomains) {
      if (filters.activeDomains.has(d)) onToggleDomain(d);
    }
  }, [domainCounts, filters.activeDomains, onToggleDomain]);

  // Entity type select all / deselect all
  const allEntityTypesActive = Array.from(entityTypeCounts.keys()).every((t) =>
    filters.activeEntityTypes.has(t),
  );

  const handleEntityTypeSelectAll = useCallback(() => {
    const allTypes = Array.from(entityTypeCounts.keys());
    for (const t of allTypes) {
      if (!filters.activeEntityTypes.has(t)) onToggleEntityType(t);
    }
  }, [entityTypeCounts, filters.activeEntityTypes, onToggleEntityType]);

  const handleEntityTypeDeselectAll = useCallback(() => {
    const allTypes = Array.from(entityTypeCounts.keys());
    for (const t of allTypes) {
      if (filters.activeEntityTypes.has(t)) onToggleEntityType(t);
    }
  }, [entityTypeCounts, filters.activeEntityTypes, onToggleEntityType]);

  // Sorted domain list
  const sortedDomains = Array.from(domainCounts.keys()).sort();

  // Sorted entity types: known types first in order, then unknown ones
  const sortedEntityTypes = Array.from(entityTypeCounts.keys()).sort((a, b) => {
    const idxA = ENTITY_TYPE_ORDER.indexOf(a);
    const idxB = ENTITY_TYPE_ORDER.indexOf(b);
    const valA = idxA === -1 ? ENTITY_TYPE_ORDER.length : idxA;
    const valB = idxB === -1 ? ENTITY_TYPE_ORDER.length : idxB;
    return valA - valB;
  });

  // Collapsed strip
  if (!isOpen) {
    return (
      <div className="flex-none flex flex-col items-center py-4 px-1 bg-jet border-r border-stone/15 w-10">
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-charcoal/60 transition-colors text-stone hover:text-smoke"
          title="Open filter panel"
        >
          <Filter size={16} />
        </button>
        <button
          onClick={onToggle}
          className="mt-2 p-1 rounded hover:bg-charcoal/60 transition-colors text-stone/50 hover:text-stone"
          title="Expand filters"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  // Expanded panel
  return (
    <div
      className="flex-none flex flex-col bg-jet border-r border-stone/15 overflow-hidden"
      style={{
        width: 320,
        transition: "width 250ms ease-out",
      }}
    >
      {/* Panel header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-stone/15">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-stone" />
          <span className="text-xs font-medium text-smoke uppercase tracking-wide">
            Filters
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-charcoal/60 transition-colors text-stone hover:text-smoke"
          title="Collapse filter panel"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {/* Graph stats */}
        <div className="px-4 py-3 border-b border-stone/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Network size={13} className="text-stone/60" />
              <span className="text-xs text-stone">
                {totalEntities}{" "}
                <span className="text-stone/60">
                  entit{totalEntities === 1 ? "y" : "ies"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Hash size={13} className="text-stone/60" />
              <span className="text-xs text-stone">
                {totalRelationships}{" "}
                <span className="text-stone/60">
                  relationship{totalRelationships === 1 ? "" : "s"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Entity search (highlights, does not filter) */}
        <div className="px-4 py-3 border-b border-stone/10">
          <label className="text-[10px] text-stone/60 uppercase tracking-wider mb-1.5 block">
            Search (highlight)
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone/50"
            />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search entities..."
              className="w-full pl-8 pr-8 py-1.5 bg-charcoal/50 border border-stone/10 rounded-md text-xs text-smoke placeholder:text-stone/40 focus:outline-none focus:border-stone/30 transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone/50 hover:text-stone transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Keyword filter (actually filters the graph) */}
        <div className="px-4 py-3 border-b border-stone/10">
          <label className="text-[10px] text-stone/60 uppercase tracking-wider mb-1.5 block">
            Keyword filter
          </label>
          <div className="relative">
            <Filter
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone/50"
            />
            <input
              type="text"
              value={localKeyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Filter by keywords (comma-separated)"
              className="w-full pl-8 pr-8 py-1.5 bg-charcoal/50 border border-stone/10 rounded-md text-xs text-smoke placeholder:text-stone/40 focus:outline-none focus:border-stone/30 transition-colors"
            />
            {localKeyword && (
              <button
                onClick={() => handleKeywordChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone/50 hover:text-stone transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Domain layer toggles */}
        <div className="px-4 py-3 border-b border-stone/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-stone/60 uppercase tracking-wider">
              Domains
            </span>
            <button
              onClick={
                allDomainsActive
                  ? handleDomainDeselectAll
                  : handleDomainSelectAll
              }
              className="text-[10px] text-stone/50 hover:text-smoke transition-colors"
            >
              {allDomainsActive ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sortedDomains.map((domain) => {
              const isActive = filters.activeDomains.has(domain);
              const display = DOMAIN_DISPLAY[domain];
              const color = display?.color ?? "#8A8A82";
              const label = display?.label ?? formatEntityType(domain);
              const count = domainCounts.get(domain) ?? 0;

              return (
                <button
                  key={domain}
                  onClick={() => onToggleDomain(domain)}
                  className={clsx(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all",
                    isActive
                      ? "text-smoke"
                      : "text-stone/40 bg-transparent hover:text-stone/60",
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${color}15`,
                          border: `1px solid ${color}30`,
                        }
                      : {
                          backgroundColor: "transparent",
                          border: "1px solid rgba(138,138,130,0.1)",
                        }
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? color : "#8A8A8240" }}
                  />
                  <span>{label}</span>
                  <span className="text-stone/50 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Entity type toggles */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-stone/60 uppercase tracking-wider">
              Entity Types
            </span>
            <button
              onClick={
                allEntityTypesActive
                  ? handleEntityTypeDeselectAll
                  : handleEntityTypeSelectAll
              }
              className="text-[10px] text-stone/50 hover:text-smoke transition-colors"
            >
              {allEntityTypesActive ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="space-y-0.5">
            {sortedEntityTypes.map((type) => {
              const isActive = filters.activeEntityTypes.has(type);
              const color = getEntityColor(type);
              const count = entityTypeCounts.get(type) ?? 0;

              return (
                <button
                  key={type}
                  onClick={() => onToggleEntityType(type)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all",
                    isActive
                      ? "text-smoke"
                      : "text-stone/40 hover:text-stone/60",
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${color}10`,
                        }
                      : {}
                  }
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive ? color : "#8A8A8240",
                    }}
                  />
                  <span className="flex-1 text-left">
                    {formatEntityType(type)}
                  </span>
                  <span className="text-stone/50 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

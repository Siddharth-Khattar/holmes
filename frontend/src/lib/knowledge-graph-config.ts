// ABOUTME: Centralized configuration for the Knowledge Graph visualization.
// ABOUTME: Entity color palette, force simulation parameters, node/edge styling, SVG constants.

// ---------------------------------------------------------------------------
// Entity type color palette (9 known types + fallback)
// ---------------------------------------------------------------------------

/** Muted warm palette inspired by Command Center tints. Keyed by lowercase entity_type. */
export const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: "#5B8DEF",
  organization: "#8B7BEF",
  location: "#4DAF7C",
  event: "#E87461",
  asset: "#D4A843",
  financial_entity: "#45B5AA",
  communication: "#C27ADB",
  document: "#E09D5C",
  other: "#8A8A82",
};

/** Returns the hex color for a given entity type, falling back to the "other" color. */
export function getEntityColor(entityType: string): string {
  return (
    ENTITY_TYPE_COLORS[entityType.toLowerCase()] ?? ENTITY_TYPE_COLORS.other
  );
}

// ---------------------------------------------------------------------------
// Force simulation parameters
// ---------------------------------------------------------------------------

export const FORCE_CONFIG = {
  charge: { strength: -400 },
  link: { distance: 100, strength: 0.3 },
  center: { strength: 0.05 },
  collision: { padding: 8 },
  radial: { minRadius: 50, strengthBase: 0.05, strengthScale: 0.1 },
} as const;

// ---------------------------------------------------------------------------
// Node sizing
// ---------------------------------------------------------------------------

export const NODE_SIZE = {
  minRadius: 10,
  maxRadius: 60,
} as const;

// ---------------------------------------------------------------------------
// Edge styling
// ---------------------------------------------------------------------------

export const EDGE_STYLE = {
  defaultColor: "#4b5563",
  selectedColor: "#ffffff",
  minWidth: 1,
  maxWidth: 6,
  defaultOpacity: 0.6,
  dimmedOpacity: 0.15,
  selectedOpacity: 1,
} as const;

// ---------------------------------------------------------------------------
// SVG constants
// ---------------------------------------------------------------------------

export const SVG_CONFIG = {
  zoomExtent: [0.05, 8] as [number, number],
  labelFontSize: 11,
  labelOffset: 8,
} as const;

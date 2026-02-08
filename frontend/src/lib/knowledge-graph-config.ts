// ABOUTME: Centralized configuration for the Knowledge Graph visualization.
// ABOUTME: Entity color palette, force simulation parameters, node/edge styling, SVG constants.

// ---------------------------------------------------------------------------
// Entity type color palette (9 known types + fallback)
// ---------------------------------------------------------------------------

/** Muted warm palette with high inter-type contrast. Keyed by lowercase entity_type. */
export const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: "#5B8DEF", // Blue
  organization: "#9B6BCD", // Purple (more distinct from person)
  location: "#4DAF7C", // Green
  event: "#E05C4A", // Red (more distinct from document)
  asset: "#45B5AA", // Teal (swapped with financial_entity)
  financial_entity: "#F0C75E", // Gold/Yellow (swapped with asset)
  communication: "#D46BA3", // Pink (distinct from organization purple)
  document: "#E09D5C", // Orange
  other: "#8A8A82", // Gray
};

/** Returns the hex color for a given entity type, falling back to the "other" color. */
export function getEntityColor(entityType: string): string {
  return (
    ENTITY_TYPE_COLORS[entityType.toLowerCase()] ?? ENTITY_TYPE_COLORS.other
  );
}

// ---------------------------------------------------------------------------
// Entity type shape mapping
// ---------------------------------------------------------------------------

/** Entity types that render as rounded rectangles (physical/digital objects). */
export const RECT_ENTITY_TYPES = new Set(["document", "asset"]);

/**
 * Returns "circle" or "rect" depending on entity type.
 * Circles: person, organization, location, event, financial_entity, communication, other.
 * Rounded rectangles: document, asset.
 */
export function getEntityShape(entityType: string): "circle" | "rect" {
  return RECT_ENTITY_TYPES.has(entityType.toLowerCase()) ? "rect" : "circle";
}

// ---------------------------------------------------------------------------
// Lucide icon SVG paths for embedding inside D3-rendered nodes.
// Paths extracted from Lucide icon set (24x24 viewBox, stroke-based).
// ---------------------------------------------------------------------------

/**
 * Maps entity type to Lucide icon SVG path data for D3 embedding.
 * Each entry provides the `d` attribute(s) for <path> elements.
 * All paths use a 24x24 coordinate space (stroke, not fill).
 */
export const ENTITY_ICON_PATHS: Record<string, string[]> = {
  // User icon
  person: [
    "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",
    "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  ],
  // Building2 icon
  organization: [
    "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",
    "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",
    "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",
    "M10 6h4",
    "M10 10h4",
    "M10 14h4",
    "M10 18h4",
  ],
  // MapPin icon
  location: [
    "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z",
    "M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  ],
  // Calendar icon
  event: [
    "M16 2v4",
    "M8 2v4",
    "M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  ],
  // Package icon
  asset: [
    "M16.5 9.4 7.55 4.24",
    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    "M3.27 6.96 12 12.01l8.73-5.05",
    "M12 22.08V12",
  ],
  // DollarSign icon
  financial_entity: [
    "M12 2v20",
    "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  ],
  // MessageSquare icon
  communication: [
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  ],
  // FileText icon
  document: [
    "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z",
    "M14 2v6h6",
    "M16 13H8",
    "M16 17H8",
    "M10 9H8",
  ],
  // Circle icon (simple)
  other: ["M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0"],
};

/**
 * Returns the SVG path data array for an entity type icon.
 * Falls back to "other" (circle) if type is not mapped.
 */
export function getEntityIconPaths(entityType: string): string[] {
  return ENTITY_ICON_PATHS[entityType.toLowerCase()] ?? ENTITY_ICON_PATHS.other;
}

// ---------------------------------------------------------------------------
// Force simulation parameters
// ---------------------------------------------------------------------------

export const FORCE_CONFIG = {
  charge: { strength: -600 },
  link: { distance: 200, strength: 0.2 },
  center: { strength: 0.05 },
  collision: { padding: 8 },
  radial: { minRadius: 50, strengthBase: 0.05, strengthScale: 0.1 },
} as const;

// ---------------------------------------------------------------------------
// Node sizing (discrete tiers by connection degree)
// ---------------------------------------------------------------------------

export interface NodeSizeTier {
  readonly maxDegree: number;
  readonly radius: number;
  readonly label: string;
}

/** Discrete node size tiers: isolated=small, moderate=medium, hubs=large. */
export const NODE_SIZE_TIERS: readonly NodeSizeTier[] = [
  { maxDegree: 1, radius: 18, label: "small" },
  { maxDegree: 3, radius: 26, label: "medium" },
  { maxDegree: Infinity, radius: 36, label: "large" },
] as const;

/** Look up the node radius for a given connection degree using discrete tiers. */
export function getNodeRadius(degree: number): number {
  for (const tier of NODE_SIZE_TIERS) {
    if (degree <= tier.maxDegree) return tier.radius;
  }
  return NODE_SIZE_TIERS[NODE_SIZE_TIERS.length - 1].radius;
}

/** @deprecated Kept for reference — replaced by NODE_SIZE_TIERS. */
export const NODE_SIZE = {
  minRadius: 16,
  maxRadius: 40,
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
  labelFontSize: 12,
  edgeLabelFontSize: 10,
  labelOffset: 8,
  /** Zoom scale above which edge labels become visible. */
  edgeLabelZoomThreshold: 1.5,
} as const;

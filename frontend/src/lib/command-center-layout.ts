// ABOUTME: Topology-driven hierarchical layout engine for the Command Center.
// ABOUTME: Computes ranks from edge topology via longest-path, handles any dynamic graph structure.

import type { Node, Edge } from "@xyflow/react";

import {
  NODE_WIDTH,
  NODE_HEIGHT,
  FILE_GROUP_NODE_WIDTH,
  FILE_GROUP_NODE_HEIGHT,
} from "@/lib/command-center-config";

/** Vertical gap between ranks */
const RANK_GAP = 120;

/** Horizontal gap between sibling nodes in the same rank */
const NODE_GAP = 150;

// -----------------------------------------------------------------------
// Node dimensions
// -----------------------------------------------------------------------

function getNodeDimensions(node: Node): { width: number; height: number } {
  if (node.type === "fileGroup") {
    return { width: FILE_GROUP_NODE_WIDTH, height: FILE_GROUP_NODE_HEIGHT };
  }
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

// -----------------------------------------------------------------------
// Rank assignment via longest-path (Sugiyama layer assignment)
//
// For each node, its rank = length of the longest path from any root to it.
// This ensures parents always sit above children, and that the vertical
// depth of a node reflects its true position in the pipeline regardless
// of how many intermediate layers exist.
//
// Algorithm:
//   1. Build adjacency list and in-degree map from edges
//   2. Seed all root nodes (in-degree 0) at rank 0
//   3. BFS forward: for each child, rank = max(rank, parentRank + 1)
//   4. Process children only once all their parents have been visited
// -----------------------------------------------------------------------

function assignRanks(nodeIds: Set<string>, edges: Edge[]): Map<string, number> {
  // Build adjacency list (parent → children) and reverse (child → parents)
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();

  for (const id of nodeIds) {
    children.set(id, []);
    parents.set(id, []);
  }

  for (const edge of edges) {
    // Only consider edges between nodes in our set
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    children.get(edge.source)!.push(edge.target);
    parents.get(edge.target)!.push(edge.source);
  }

  // Compute in-degree (number of parents within the visible graph)
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, parents.get(id)!.length);
  }

  // Longest-path BFS: process nodes in topological order
  const rank = new Map<string, number>();
  const queue: string[] = [];

  // Seed roots (in-degree 0) at rank 0
  for (const id of nodeIds) {
    if (inDegree.get(id) === 0) {
      rank.set(id, 0);
      queue.push(id);
    }
  }

  // Track how many parents of each node have been processed
  const processedParents = new Map<string, number>();
  for (const id of nodeIds) {
    processedParents.set(id, 0);
  }

  let head = 0;
  while (head < queue.length) {
    const nodeId = queue[head++];
    const nodeRank = rank.get(nodeId)!;

    for (const childId of children.get(nodeId)!) {
      // Update child rank to be at least parentRank + 1 (longest path)
      const currentChildRank = rank.get(childId) ?? 0;
      rank.set(childId, Math.max(currentChildRank, nodeRank + 1));

      // Track parent processing count for this child
      const processed = processedParents.get(childId)! + 1;
      processedParents.set(childId, processed);

      // Only enqueue the child once ALL its parents have been processed,
      // so its rank reflects the longest incoming path
      if (processed === inDegree.get(childId)) {
        queue.push(childId);
      }
    }
  }

  // Handle any disconnected nodes (no edges) — give them rank 0
  for (const id of nodeIds) {
    if (!rank.has(id)) {
      rank.set(id, 0);
    }
  }

  return rank;
}

// -----------------------------------------------------------------------
// Crossing reduction: order nodes within each rank to minimize edge crossings.
//
// Uses the barycenter heuristic: for each node in a rank, compute the
// average x-position of its connected nodes in the adjacent rank, then
// sort by that average. This is the standard single-pass approach used
// by Sugiyama-style layout algorithms.
// -----------------------------------------------------------------------

function reduceRankCrossings(
  rankGroups: Map<number, Node[]>,
  edges: Edge[],
  sortedRanks: number[],
): void {
  if (sortedRanks.length < 2) return;

  // Build quick lookup: nodeId -> set of connected nodeIds
  const neighbors = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!neighbors.has(edge.source)) neighbors.set(edge.source, new Set());
    if (!neighbors.has(edge.target)) neighbors.set(edge.target, new Set());
    neighbors.get(edge.source)!.add(edge.target);
    neighbors.get(edge.target)!.add(edge.source);
  }

  // Forward pass: order each rank based on positions of nodes in the previous rank
  for (let i = 1; i < sortedRanks.length; i++) {
    const prevRank = sortedRanks[i - 1];
    const currRank = sortedRanks[i];
    const prevNodes = rankGroups.get(prevRank)!;
    const currNodes = rankGroups.get(currRank)!;

    // Map previous rank nodes to their index (proxy for x-position)
    const prevIndex = new Map<string, number>();
    prevNodes.forEach((n, idx) => prevIndex.set(n.id, idx));

    // For each node in current rank, compute average index of its neighbors in prev rank
    const barycenters = new Map<string, number>();
    for (const node of currNodes) {
      const nodeNeighbors = neighbors.get(node.id);
      if (!nodeNeighbors) {
        barycenters.set(node.id, Infinity);
        continue;
      }

      let sum = 0;
      let count = 0;
      for (const neighborId of nodeNeighbors) {
        const idx = prevIndex.get(neighborId);
        if (idx !== undefined) {
          sum += idx;
          count++;
        }
      }

      barycenters.set(node.id, count > 0 ? sum / count : Infinity);
    }

    // Sort current rank by barycenter (stable sort preserves insertion order for ties)
    currNodes.sort((a, b) => barycenters.get(a.id)! - barycenters.get(b.id)!);
  }

  // Backward pass: refine ordering based on positions of nodes in the next rank
  for (let i = sortedRanks.length - 2; i >= 0; i--) {
    const nextRank = sortedRanks[i + 1];
    const currRank = sortedRanks[i];
    const nextNodes = rankGroups.get(nextRank)!;
    const currNodes = rankGroups.get(currRank)!;

    const nextIndex = new Map<string, number>();
    nextNodes.forEach((n, idx) => nextIndex.set(n.id, idx));

    const barycenters = new Map<string, number>();
    for (const node of currNodes) {
      const nodeNeighbors = neighbors.get(node.id);
      if (!nodeNeighbors) {
        barycenters.set(node.id, Infinity);
        continue;
      }

      let sum = 0;
      let count = 0;
      for (const neighborId of nodeNeighbors) {
        const idx = nextIndex.get(neighborId);
        if (idx !== undefined) {
          sum += idx;
          count++;
        }
      }

      barycenters.set(node.id, count > 0 ? sum / count : Infinity);
    }

    currNodes.sort((a, b) => barycenters.get(a.id)! - barycenters.get(b.id)!);
  }
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/**
 * Compute hierarchical top-to-bottom positions for ReactFlow nodes.
 *
 * Uses the Sugiyama method (simplified):
 *   1. Rank assignment via longest-path from roots
 *   2. Crossing reduction via barycenter heuristic (forward + backward pass)
 *   3. Horizontal centering per rank
 *   4. Vertical stacking with consistent gaps
 *
 * Handles any DAG topology — static agent types, dynamic subagents,
 * file group intermediaries, or future node types. Layout is derived
 * entirely from edge connections, not from hardcoded node identifiers.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // 1. Assign ranks from edge topology
  const nodeIds = new Set(nodes.map((n) => n.id));
  const rankMap = assignRanks(nodeIds, edges);

  // 2. Group nodes by rank
  const rankGroups = new Map<number, Node[]>();
  for (const node of nodes) {
    const rank = rankMap.get(node.id) ?? 0;
    const group = rankGroups.get(rank) ?? [];
    group.push(node);
    rankGroups.set(rank, group);
  }

  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);

  // 3. Reduce edge crossings via barycenter heuristic
  reduceRankCrossings(rankGroups, edges, sortedRanks);

  // 4. Compute Y offset for each rank (cumulative height + gaps)
  const rankYOffsets = new Map<number, number>();
  let cumulativeY = 0;

  for (const rank of sortedRanks) {
    rankYOffsets.set(rank, cumulativeY);

    const nodesInRank = rankGroups.get(rank)!;
    const maxHeight = Math.max(
      ...nodesInRank.map((n) => getNodeDimensions(n).height),
    );
    cumulativeY += maxHeight + RANK_GAP;
  }

  // 5. Build position lookup: for each node, compute its (x, y)
  const positionMap = new Map<string, { x: number; y: number }>();

  for (const rank of sortedRanks) {
    const nodesInRank = rankGroups.get(rank)!;
    const y = rankYOffsets.get(rank) ?? 0;

    // Compute total width of this rank
    let totalWidth = 0;
    for (let i = 0; i < nodesInRank.length; i++) {
      totalWidth += getNodeDimensions(nodesInRank[i]).width;
      if (i < nodesInRank.length - 1) totalWidth += NODE_GAP;
    }

    // Position nodes centered around x=0
    let x = -totalWidth / 2;
    for (const node of nodesInRank) {
      const { width } = getNodeDimensions(node);
      positionMap.set(node.id, { x, y });
      x += width + NODE_GAP;
    }
  }

  // 6. Apply positions to nodes
  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positionMap.get(node.id) ?? { x: 0, y: 0 },
  }));

  return { nodes: layoutedNodes, edges };
}

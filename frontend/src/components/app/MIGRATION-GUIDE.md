# Migration Guide: Integrating Knowledge Graph Hooks

This guide explains how to integrate the new knowledge graph hooks into your existing `KnowledgeGraph` component.

## Overview

The new hooks provide:
1. **Better separation of concerns** - Logic is extracted from the component
2. **Reusability** - Hooks can be used in other graph components
3. **Performance** - Optimized with memoization and debouncing
4. **Maintainability** - Easier to test and debug

## Step-by-Step Migration

### Step 1: Import the Hooks

Add these imports to your `knowledge-graph.tsx`:

```typescript
import {
  useCluster,
  useDebounce,
  useForceSimulation,
  usePanelState,
  useZoom,
  type ZoomController,
} from "@/hooks";
```

### Step 2: Replace Zoom Logic

**Before:**
```typescript
// Manual zoom behavior setup in useEffect
useEffect(() => {
  if (!svgRef.current) return;
  const svg = select(svgRef.current);
  const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      // ... zoom handling
    });
  svg.call(zoomBehavior);
}, []);
```

**After:**
```typescript
// Use the hook
const zoomController = useZoom({
  svgElement: svgRef.current,
  onTransformChange: (newTransform) => {
    setTransform({
      x: newTransform.x,
      y: newTransform.y,
      k: newTransform.k,
    });
  },
  containerWidth: dimensions.width,
  containerHeight: dimensions.height,
});

// Zoom controls become simple
<button onClick={() => zoomController?.zoomIn()}>Zoom In</button>
<button onClick={() => zoomController?.zoomOut()}>Zoom Out</button>
<button onClick={() => zoomController?.resetZoom()}>Reset</button>
```

### Step 3: Replace Force Simulation Logic

**Before:**
```typescript
useEffect(() => {
  if (!simulationRef.current) {
    simulationRef.current = forceSimulation<ForceNode>([])
      .force("link", forceLink<ForceNode, ForceLink>([])
        .id((d) => d.id)
        .distance(120)
        .strength(0.5))
      .force("charge", forceManyBody<ForceNode>().strength(-300))
      // ... more forces
      .on("tick", () => {
        // ... tick handling
      });
  }
}, []);
```

**After:**
```typescript
const getSimulation = useForceSimulation({
  nodes,
  connections,
  width: dimensions.width,
  height: dimensions.height,
  onTick: () => {
    setRenderTrigger((prev) => prev + 1);
  },
  onSimulationCreated: (simulation) => {
    simulationRef.current = simulation;
  },
  linkDistance: 120,
  linkStrength: 0.5,
  chargeStrength: -300,
});
```

### Step 4: Add Cluster Selection

**New Feature** - Add cluster highlighting:

```typescript
const {
  clusterState,
  selectNode,
  clearSelection,
  getNodeOpacity,
  getConnectionOpacity,
  getNodeScale,
} = useCluster(nodes, connections);

// In your node rendering:
const renderNode = (node: GraphNode) => {
  const opacity = getNodeOpacity(node.id);
  const scale = getNodeScale(node.id);
  
  return (
    <g
      opacity={opacity}
      transform={`translate(${x}, ${y}) scale(${scale})`}
      onClick={() => selectNode(node.id)}
    >
      {/* ... node content */}
    </g>
  );
};

// In your connection rendering:
const renderConnection = (conn: GraphConnection, index: number) => {
  const opacity = getConnectionOpacity(index);
  
  return (
    <line
      opacity={opacity}
      {/* ... other props */}
    />
  );
};
```

### Step 5: Add Search with Debouncing

**New Feature** - Add search functionality:

```typescript
const [searchQuery, setSearchQuery] = useState("");
const debouncedSearchQuery = useDebounce(searchQuery, 300);

// Filter nodes based on debounced search
const filteredNodes = nodes.filter((node) => {
  if (!debouncedSearchQuery) return true;
  const searchLower = debouncedSearchQuery.toLowerCase();
  if (node.type === "entity") {
    return node.data.name.toLowerCase().includes(searchLower);
  }
  // ... other node types
  return false;
});

// Use filteredNodes instead of nodes in rendering
```

### Step 6: Add Panel State Persistence

**New Feature** - Persist panel collapse state:

```typescript
const legendPanel = usePanelState("legend-panel", false);
const nodeInfoPanel = usePanelState("node-info-panel", true);

// In your render:
{!legendPanel.isCollapsed && (
  <div className="legend-panel">
    <button onClick={legendPanel.toggleCollapse}>Close</button>
    {/* ... legend content */}
  </div>
)}
```

## Benefits After Migration

### 1. Backend Data Sensitivity

The hooks automatically respond to data changes:
- `useCluster` rebuilds adjacency map when nodes/connections change
- `useForceSimulation` restarts simulation on data updates
- All hooks use proper React dependency arrays

### 2. Live Data Adaptability

Real-time updates work seamlessly:
- Simulation tick callbacks trigger re-renders
- Zoom/pan state updates immediately
- Cluster selection responds instantly

### 3. Performance Improvements

- **Debouncing**: Search doesn't trigger on every keystroke
- **Memoization**: Expensive computations cached with `useMemo`
- **Efficient Re-renders**: Only affected components re-render

### 4. Code Organization

- **Separation of Concerns**: Logic separated from rendering
- **Reusability**: Hooks can be used in other components
- **Testability**: Hooks can be tested independently

## Testing the Migration

### 1. Visual Testing

- [ ] Nodes render correctly
- [ ] Connections render correctly
- [ ] Zoom in/out works smoothly
- [ ] Pan works correctly
- [ ] Node dragging works
- [ ] Cluster selection highlights correctly

### 2. Interaction Testing

- [ ] Click node to select cluster
- [ ] Click again to deselect
- [ ] Search filters nodes correctly
- [ ] Search is debounced (doesn't lag)
- [ ] Panel collapse state persists on refresh

### 3. Performance Testing

- [ ] Graph loads quickly with 100+ nodes
- [ ] Simulation runs smoothly
- [ ] No memory leaks on unmount
- [ ] Search doesn't cause lag

## Troubleshooting

### Issue: Nodes not rendering

**Solution**: Make sure you're using the simulation's node positions:
```typescript
const x = (node as any).x || 0;
const y = (node as any).y || 0;
```

### Issue: Zoom not working

**Solution**: Ensure SVG ref is set before creating zoom controller:
```typescript
const zoomController = useZoom({
  svgElement: svgRef.current, // Must not be null
  // ...
});
```

### Issue: Cluster selection not highlighting

**Solution**: Make sure you're passing the connection index to `getConnectionOpacity`:
```typescript
connections.map((conn, index) => {
  const opacity = getConnectionOpacity(index); // Pass index, not conn
  // ...
});
```

### Issue: Search is slow

**Solution**: Increase debounce delay:
```typescript
const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms instead of 300ms
```

## Next Steps

After successful migration:

1. **Add Advanced Features**:
   - Multi-hop cluster selection (2nd degree connections)
   - Zoom-to-fit functionality
   - Zoom-to-cluster on selection
   - Advanced filtering by entity/evidence type

2. **Optimize Performance**:
   - Add virtualization for large graphs (1000+ nodes)
   - Implement level-of-detail rendering
   - Add WebGL rendering for very large graphs

3. **Enhance UX**:
   - Add keyboard shortcuts (Ctrl+F for search, etc.)
   - Add minimap for navigation
   - Add timeline scrubbing for temporal data
   - Add export functionality (PNG, SVG, JSON)

## Reference Files

- **Hooks Documentation**: `src/hooks/KNOWLEDGE-GRAPH-HOOKS.md`
- **Integration Example**: `src/components/app/INTEGRATION-EXAMPLE.tsx`
- **D3 Helpers**: `src/lib/d3-helpers.ts`
- **Current Implementation**: `src/components/app/knowledge-graph.tsx`

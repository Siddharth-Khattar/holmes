# Knowledge Graph Hooks

This document describes the custom React hooks designed for the Holmes knowledge graph visualization. These hooks ensure backend data sensitivity, live data adaptability, and optimal performance.

## Overview

The knowledge graph hooks provide:
- **Backend Data Sensitivity**: Efficient data fetching, caching, and state management
- **Live Data Adaptability**: Real-time updates and reactive state changes
- **Performance Optimization**: Debouncing, memoization, and efficient re-renders
- **User Interaction**: Drag, zoom, pan, and cluster selection
- **State Persistence**: LocalStorage integration for UI preferences

## Hooks

### 1. `useCluster`

**Purpose**: Manages graph cluster selection state and operations for highlighting connected nodes.

**Features**:
- Builds adjacency map for O(1) neighbor lookups
- Computes clusters (selected node + all connected nodes)
- Provides opacity and scale calculations for visual feedback
- Tracks connection statistics (min, max, percentiles)

**Usage**:
```typescript
import { useCluster } from '@/hooks';

const {
  clusterState,
  selectNode,
  clearSelection,
  isNodeInCluster,
  getNodeOpacity,
  getConnectionOpacity,
  connectionStats,
} = useCluster(nodes, connections);

// Select a node to highlight its cluster
selectNode(nodeId);

// Apply visual feedback
const opacity = getNodeOpacity(nodeId);
const connectionOpacity = getConnectionOpacity(connectionIndex);
```

**Backend Sensitivity**: Recomputes adjacency map when nodes/connections change from backend updates.

---

### 2. `useDebounce`

**Purpose**: Delays value updates until user stops typing, preventing excessive operations.

**Features**:
- Configurable delay (default: 300ms)
- Automatic cleanup on unmount
- Generic type support

**Usage**:
```typescript
import { useDebounce } from '@/hooks';

const [searchQuery, setSearchQuery] = useState("");
const debouncedQuery = useDebounce(searchQuery, 300);

useEffect(() => {
  // Only runs 300ms after user stops typing
  performSearch(debouncedQuery);
}, [debouncedQuery]);
```

**Backend Sensitivity**: Reduces API calls by batching rapid user input changes.

---

### 3. `useDrag`

**Purpose**: Creates D3 drag behavior for interactive node manipulation with click detection.

**Features**:
- Distinguishes between clicks and drags (configurable threshold)
- Integrates with D3 force simulation
- Fixes node position during drag
- Reheats simulation for responsive physics

**Usage**:
```typescript
import { createDragBehaviorWithClick } from '@/hooks';

const dragBehavior = createDragBehaviorWithClick({
  simulation,
  onNodeClick: (node) => console.log('Clicked:', node),
  clickThreshold: 5,
});

// Apply to SVG elements
if (dragBehavior) {
  select(nodeElement).call(dragBehavior);
}
```

**Live Adaptability**: Responds to simulation state changes in real-time.

---

### 4. `useForceSimulation`

**Purpose**: Manages D3 force simulation physics for force-directed graph layout.

**Features**:
- Configurable forces (link, charge, center, collision)
- Automatic cleanup on unmount
- Tick callback for re-renders
- Simulation ready callback

**Usage**:
```typescript
import { useForceSimulation } from '@/hooks';

const getSimulation = useForceSimulation({
  nodes,
  connections,
  width,
  height,
  onTick: () => setRenderTrigger(prev => prev + 1),
  onSimulationCreated: (sim) => simulationRef.current = sim,
  linkDistance: 120,
  chargeStrength: -300,
});

const simulation = getSimulation();
```

**Backend Sensitivity**: Automatically restarts simulation when nodes/connections update from backend.

---

### 5. `usePanelState`

**Purpose**: Manages panel collapse state with localStorage persistence.

**Features**:
- SSR-safe hydration
- Automatic persistence across page refreshes
- Independent state per panel ID
- Programmatic control

**Usage**:
```typescript
import { usePanelState } from '@/hooks';

const { isCollapsed, toggleCollapse, setCollapsed } = usePanelState(
  "evidence-panel",
  true // default collapsed
);

return (
  <div style={{ width: isCollapsed ? '0px' : '300px' }}>
    <button onClick={toggleCollapse}>
      {isCollapsed ? '▶' : '◀'}
    </button>
  </div>
);
```

**Live Adaptability**: Persists user preferences across sessions.

---

### 6. `useZoom`

**Purpose**: Creates D3 zoom and pan behavior for graph canvas navigation.

**Features**:
- Mouse wheel zoom centered on cursor
- Click-and-drag panning
- Programmatic zoom controls (zoomIn, zoomOut, resetZoom)
- Configurable scale limits and translate extent
- Smooth transitions

**Usage**:
```typescript
import { useZoom } from '@/hooks';

const zoomController = useZoom({
  svgElement: svgRef.current,
  onTransformChange: (transform) => setTransform(transform),
  containerWidth: width,
  containerHeight: height,
  minScale: 0.1,
  maxScale: 5,
});

// Programmatic controls
zoomController?.zoomIn();
zoomController?.zoomOut();
zoomController?.resetZoom();
```

**Live Adaptability**: Responds to container size changes and provides smooth user interactions.

---

## Integration Guidelines

### Backend Data Sensitivity

1. **Reactive Updates**: All hooks use React's dependency arrays to automatically respond to data changes
2. **Memoization**: Expensive computations (adjacency maps, statistics) are memoized with `useMemo`
3. **Efficient Re-renders**: Hooks trigger re-renders only when necessary using `useCallback` and refs

### Live Data Adaptability

1. **Real-time State**: Hooks maintain internal state that updates immediately on user interaction
2. **Simulation Integration**: Force simulation hooks integrate seamlessly with D3's tick-based updates
3. **Event Handling**: All hooks properly clean up event listeners and timers on unmount

### Performance Considerations

1. **Debouncing**: Use `useDebounce` for search inputs and filters
2. **Clustering**: Use `useCluster` to reduce visual complexity when many nodes are present
3. **Simulation Control**: Pause simulation when not needed to save CPU cycles
4. **LocalStorage**: Panel states persist to avoid unnecessary re-computation

## Example: Complete Integration

```typescript
import {
  useCluster,
  useDebounce,
  useForceSimulation,
  usePanelState,
  useZoom,
} from '@/hooks';

function KnowledgeGraph({ nodes, connections }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Cluster selection
  const {
    selectNode,
    getNodeOpacity,
    getConnectionOpacity,
  } = useCluster(nodes, connections);
  
  // Force simulation
  const getSimulation = useForceSimulation({
    nodes,
    connections,
    width: 800,
    height: 600,
    onTick: () => forceUpdate(),
  });
  
  // Zoom controls
  const zoomController = useZoom({
    svgElement: svgRef.current,
    onTransformChange: setTransform,
    containerWidth: 800,
    containerHeight: 600,
  });
  
  // Panel state
  const panel = usePanelState("node-info", true);
  
  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search nodes..."
      />
      
      <svg ref={svgRef}>
        {/* Render nodes and connections */}
      </svg>
      
      <div style={{ width: panel.isCollapsed ? 0 : 300 }}>
        {/* Panel content */}
      </div>
    </div>
  );
}
```

## Testing Recommendations

1. **Unit Tests**: Test each hook in isolation with mock data
2. **Integration Tests**: Test hook combinations with realistic scenarios
3. **Performance Tests**: Measure re-render counts and simulation performance
4. **Edge Cases**: Test with empty data, single node, and large graphs (1000+ nodes)

## Future Enhancements

1. **useGraphData Enhancement**: Add WebSocket support for real-time backend updates
2. **useCluster Enhancement**: Support multi-hop clusters (2nd degree connections)
3. **useZoom Enhancement**: Add zoom-to-fit and zoom-to-cluster features
4. **New Hook**: `useGraphFilters` for entity/evidence type filtering
5. **New Hook**: `useGraphSearch` for advanced search with highlighting

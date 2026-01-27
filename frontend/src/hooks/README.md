# Knowledge Graph Hooks

Custom React hooks for the Holmes knowledge graph visualization system.

## Quick Start

```typescript
import {
  useCluster,
  useDebounce,
  useForceSimulation,
  usePanelState,
  useZoom,
} from "@/hooks";
```

## Available Hooks

### Core Graph Hooks

| Hook | Purpose | Key Features |
|------|---------|--------------|
| `useCluster` | Cluster selection & highlighting | Adjacency map, opacity calculations, connection stats |
| `useForceSimulation` | D3 force-directed layout | Configurable forces, tick callbacks, auto-cleanup |
| `useZoom` | Zoom & pan controls | Programmatic zoom, smooth transitions, extent limits |
| `useDrag` | Node drag behavior | Click detection, simulation integration, fixed positioning |

### Utility Hooks

| Hook | Purpose | Key Features |
|------|---------|--------------|
| `useDebounce` | Delay value updates | Configurable delay, automatic cleanup |
| `usePanelState` | Panel collapse state | localStorage persistence, SSR-safe |

## Documentation

- **[Complete Hook Documentation](./KNOWLEDGE-GRAPH-HOOKS.md)** - Detailed API reference and usage examples
- **[Integration Example](../components/app/INTEGRATION-EXAMPLE.tsx)** - Full working example
- **[Migration Guide](../components/app/MIGRATION-GUIDE.md)** - Step-by-step integration guide

## Key Benefits

### 🎯 Backend Data Sensitivity
- Automatic response to data changes
- Efficient re-computation with memoization
- Proper React dependency management

### ⚡ Live Data Adaptability
- Real-time simulation updates
- Instant user interaction feedback
- Smooth transitions and animations

### 🚀 Performance Optimization
- Debounced search and filters
- Memoized expensive computations
- Efficient re-render strategies

### 🧩 Code Organization
- Separation of concerns
- Reusable across components
- Easy to test and maintain

## Example Usage

```typescript
function KnowledgeGraph({ nodes, connections }) {
  // Search with debouncing
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
      />
      <svg ref={svgRef}>
        {/* Render graph */}
      </svg>
      <button onClick={() => zoomController?.zoomIn()}>
        Zoom In
      </button>
    </div>
  );
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   KnowledgeGraph Component               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  useCluster  │  │ useDebounce  │  │  usePanelState│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │useForceSimul │  │   useZoom    │  │   useDrag    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                      D3 Layer                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  d3-force • d3-zoom • d3-drag • d3-selection     │  │
│  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  GraphNode • GraphConnection • Entity • Evidence │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Testing

Each hook includes:
- Unit tests for isolated functionality
- Integration tests with other hooks
- Performance benchmarks
- Edge case handling

Run tests:
```bash
npm test src/hooks
```

## Contributing

When adding new hooks:
1. Follow the existing naming convention (`use*`)
2. Add comprehensive JSDoc comments
3. Include usage examples
4. Update this README
5. Add tests

## Related Files

- `src/lib/d3-helpers.ts` - D3 utility functions
- `src/types/knowledge-graph.ts` - TypeScript types
- `src/components/app/knowledge-graph.tsx` - Main component

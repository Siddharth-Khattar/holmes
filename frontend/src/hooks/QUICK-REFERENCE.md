# Knowledge Graph Hooks - Quick Reference

## Import

```typescript
import {
  useCluster,
  useDebounce,
  useForceSimulation,
  usePanelState,
  useZoom,
} from "@/hooks";
```

## useCluster

```typescript
const {
  clusterState, // { selectedNodeId, clusterNodeIds, clusterConnectionIndices }
  selectNode, // (nodeId: string) => void
  clearSelection, // () => void
  getNodeOpacity, // (nodeId: string) => number
  getConnectionOpacity, // (index: number) => number
  getNodeScale, // (nodeId: string) => number
  connectionStats, // { min, max, average, p50, p75, p90, p95 }
} = useCluster(nodes, connections);
```

## useDebounce

```typescript
const debouncedValue = useDebounce(value, 300); // delay in ms
```

## useForceSimulation

```typescript
const getSimulation = useForceSimulation({
  nodes,
  connections,
  width,
  height,
  onTick: () => forceUpdate(),
  onSimulationCreated: (sim) => (simulationRef.current = sim),
  linkDistance: 120,
  linkStrength: 0.5,
  chargeStrength: -300,
});

const simulation = getSimulation();
```

## usePanelState

```typescript
const { isCollapsed, toggleCollapse, setCollapsed } = usePanelState(
  "panel-id",
  true, // default collapsed
);
```

## useZoom

```typescript
const zoomController = useZoom({
  svgElement: svgRef.current,
  onTransformChange: (transform) => setTransform(transform),
  containerWidth: 800,
  containerHeight: 600,
  minScale: 0.1,
  maxScale: 5,
});

zoomController?.zoomIn();
zoomController?.zoomOut();
zoomController?.resetZoom();
```

## Common Patterns

### Search with Debouncing

```typescript
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

const filtered = nodes.filter((node) =>
  node.data.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
);
```

### Cluster Highlighting

```typescript
const { selectNode, getNodeOpacity } = useCluster(nodes, connections);

<circle
  opacity={getNodeOpacity(node.id)}
  onClick={() => selectNode(node.id)}
/>
```

### Persistent Panels

```typescript
const panel = usePanelState("my-panel", false);

<div style={{ width: panel.isCollapsed ? 0 : 300 }}>
  <button onClick={panel.toggleCollapse}>Toggle</button>
</div>
```

### Complete Integration

```typescript
function KnowledgeGraph({ nodes, connections }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  const cluster = useCluster(nodes, connections);
  const zoom = useZoom({
    svgElement: svgRef.current,
    onTransformChange: setTransform,
    containerWidth: 800,
    containerHeight: 600,
  });

  useForceSimulation({
    nodes,
    connections,
    width: 800,
    height: 600,
    onTick: () => forceUpdate(),
  });

  return (
    <svg ref={svgRef}>
      <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
        {nodes.map(node => (
          <circle
            key={node.id}
            opacity={cluster.getNodeOpacity(node.id)}
            onClick={() => cluster.selectNode(node.id)}
          />
        ))}
      </g>
    </svg>
  );
}
```

## Tips

1. **Always check for null**: `zoomController?.zoomIn()`
2. **Use connection index**: `getConnectionOpacity(index)` not `getConnectionOpacity(connection)`
3. **Debounce search**: Prevents lag on typing
4. **Persist panels**: Users appreciate saved preferences
5. **Clear on unmount**: Hooks handle cleanup automatically

## See Also

- [Full Documentation](./KNOWLEDGE-GRAPH-HOOKS.md)
- [Integration Example](../components/app/INTEGRATION-EXAMPLE.tsx)
- [Migration Guide](../components/app/MIGRATION-GUIDE.md)

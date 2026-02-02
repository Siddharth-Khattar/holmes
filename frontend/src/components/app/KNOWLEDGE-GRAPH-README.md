# Knowledge Graph Implementation

## Overview

The Knowledge Graph is a red string board visualization that displays entities, evidence, and their relationships in an interactive force-directed graph. This implementation follows the technical specification with proper D3.js force simulation lifecycle management.

## Current Implementation

### Components

1. **KnowledgeGraph** (`knowledge-graph.tsx`)
   - Main visualization component
   - Modal overlay with cork board aesthetic
   - D3 force simulation for node positioning
   - Interactive drag, zoom, and pan
   - Node selection and hover states

2. **Data Structures** (`types/knowledge-graph.ts`)
   - Entity types: person, organization, location, event, document, evidence
   - Relationship types with strength and metadata
   - Graph nodes and connections
   - Transform and filter types

3. **Data Management** (`lib/graph-dataset.ts`)
   - DataSet class for managing nodes and edges
   - Subscribe/notify pattern for reactive updates
   - Inspired by vis-network architecture

4. **Event System** (`lib/graph-event-emitter.ts`)
   - Event emitter for graph interactions
   - Type-safe event handling
   - Support for node clicks, drags, zoom, etc.

5. **Mock Data** (`lib/mock-graph-data.ts`)
   - Sample entities and relationships
   - Demonstrates data structure
   - Easy to replace with real API data

## Key Features Implemented

### ✅ Force Simulation

- Single simulation instance (no recreation on render)
- Proper lifecycle management with refs
- Adaptive forces based on node types
- Smooth transitions on data updates

### ✅ Visual Design

- Cork board background (#2C2416)
- Dotted pattern (fixed size, doesn't zoom)
- Red string connections (dashed amber lines)
- Color-coded entity types
- Hover and selection states

### ✅ Interactions

- Drag nodes to reposition
- Zoom with mouse wheel
- Pan by dragging background
- Click to select nodes
- Hover for highlights

### ✅ Performance

- Position updates via refs (not state)
- RequestAnimationFrame for smooth rendering
- Proper event listener cleanup
- Memoized calculations

## Future Backend Integration

### API Endpoints Needed

```typescript
// Get graph data for a case
GET /api/cases/:caseId/graph
Response: {
  entities: Entity[];
  evidence: Evidence[];
  relationships: Relationship[];
}

// Add entity
POST /api/cases/:caseId/entities
Body: { type, name, description, metadata }

// Add relationship
POST /api/cases/:caseId/relationships
Body: { sourceEntityId, targetEntityId, type, label, strength }

// Update entity
PATCH /api/cases/:caseId/entities/:entityId
Body: { name?, description?, metadata? }

// Delete entity (cascade relationships)
DELETE /api/cases/:caseId/entities/:entityId

// Search entities
GET /api/cases/:caseId/entities/search?q=query

// Get entity details with connections
GET /api/cases/:caseId/entities/:entityId
Response: {
  entity: Entity;
  connections: Relationship[];
  connectedEntities: Entity[];
}
```

### Data Fetching Hook

```typescript
// hooks/use-case-graph.ts
export function useCaseGraph(caseId: string) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGraph() {
      const response = await api.get(`/api/cases/${caseId}/graph`);
      setData(response);
      setLoading(false);
    }
    fetchGraph();
  }, [caseId]);

  const addEntity = async (entity: Partial<Entity>) => {
    const newEntity = await api.post(`/api/cases/${caseId}/entities`, entity);
    setData((prev) => ({
      ...prev!,
      entities: [...prev!.entities, newEntity],
    }));
  };

  const addRelationship = async (rel: Partial<Relationship>) => {
    const newRel = await api.post(`/api/cases/${caseId}/relationships`, rel);
    setData((prev) => ({
      ...prev!,
      relationships: [...prev!.relationships, newRel],
    }));
  };

  return { data, loading, addEntity, addRelationship };
}
```

### Real-time Updates (Optional)

```typescript
// Use SSE or WebSocket for live updates
useEffect(() => {
  const eventSource = new EventSource(`/api/cases/${caseId}/graph/stream`);

  eventSource.addEventListener("entity-added", (e) => {
    const entity = JSON.parse(e.data);
    // Update graph data
  });

  eventSource.addEventListener("relationship-added", (e) => {
    const relationship = JSON.parse(e.data);
    // Update graph data
  });

  return () => eventSource.close();
}, [caseId]);
```

## Database Schema

### Entities Table

```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- person, organization, location, event, document, evidence
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_entities_case_id ON entities(case_id);
CREATE INDEX idx_entities_type ON entities(type);
```

### Relationships Table

```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- employment, ownership, transaction, etc.
  label VARCHAR(255) NOT NULL,
  strength DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  is_cross_modal BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT different_entities CHECK (source_entity_id != target_entity_id)
);

CREATE INDEX idx_relationships_case_id ON relationships(case_id);
CREATE INDEX idx_relationships_source ON relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON relationships(target_entity_id);
```

## Migration Path

### Phase 1: Replace Mock Data

1. Create API endpoints in backend
2. Implement database schema
3. Create `useCaseGraph` hook
4. Replace `generateMockGraphData()` with API call

### Phase 2: Add CRUD Operations

1. Add entity creation UI
2. Add relationship creation UI
3. Implement delete operations
4. Add edit/update functionality

### Phase 3: Advanced Features

1. Filters by entity type
2. Search functionality
3. Export graph as image
4. Save graph layouts
5. Real-time collaboration

## Usage Example

```typescript
// In knowledge-graph page
import { useCaseGraph } from '@/hooks/use-case-graph';

export default function KnowledgeGraphPage() {
  const params = useParams();
  const { data, loading, addEntity, addRelationship } = useCaseGraph(params.id as string);

  if (loading) return <LoadingSpinner />;
  if (!data) return <ErrorState />;

  const { nodes, connections } = transformGraphData(data);

  return (
    <KnowledgeGraph
      nodes={nodes}
      connections={connections}
      onClose={() => setShowGraph(false)}
      onAddEntity={addEntity}
      onAddRelationship={addRelationship}
    />
  );
}
```

## Performance Considerations

- **Large Graphs**: For 500+ nodes, implement viewport culling
- **Real-time**: Debounce updates to avoid excessive re-renders
- **Memory**: Clean up simulation on unmount
- **Rendering**: Use canvas instead of SVG for 1000+ nodes

## Testing

```typescript
// Test force simulation lifecycle
test('simulation is created once', () => {
  const { rerender } = render(<KnowledgeGraph nodes={[]} connections={[]} />);
  const sim1 = getSimulationRef();

  rerender(<KnowledgeGraph nodes={newNodes} connections={[]} />);
  const sim2 = getSimulationRef();

  expect(sim1).toBe(sim2); // Same instance
});

// Test drag cleanup
test('drag handlers are cleaned up', () => {
  const { unmount } = render(<KnowledgeGraph nodes={nodes} connections={[]} />);
  const spy = jest.spyOn(document, 'removeEventListener');

  unmount();

  expect(spy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  expect(spy).toHaveBeenCalledWith('mouseup', expect.any(Function));
});
```

## Architecture Decisions

1. **D3 + React**: D3 for force simulation, React for rendering
2. **Refs over State**: Position updates don't trigger re-renders
3. **Single Simulation**: Created once, updated with new data
4. **Event System**: Decoupled event handling for extensibility
5. **DataSet Pattern**: Familiar API for developers from vis-network

## Known Limitations

- SVG performance degrades with 500+ nodes (consider canvas)
- No undo/redo yet
- No graph layout persistence
- No collaborative editing
- No graph export functionality

## Next Steps

1. Implement backend API endpoints
2. Create database migrations
3. Build entity/relationship CRUD UI
4. Add filters and search
5. Implement graph export
6. Add layout persistence

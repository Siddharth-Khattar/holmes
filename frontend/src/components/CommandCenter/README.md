# Command Center

Real-time agent processing visualization for the Holmes Legal Intelligence Platform.

## Overview

The Command Center provides a live, interactive visualization of AI agent processing flows. It displays how multiple specialized agents collaborate to process legal case files, extract entities, identify relationships, and build knowledge graphs.

## Features

- **Real-time Updates**: SSE-based live streaming of agent processing events
- **Infinite Canvas**: Zoom, pan, and navigate an infinitely expanding plane (like the Knowledge Graph)
- **Agent Visualization**: Six specialized agents with status indicators and processing information
- **Connection Animation**: Animated data flow between agents
- **Agent Details Panel**: Comprehensive information about each agent's processing
- **Processing History**: Track recent tasks and results for each agent

## Architecture

### Components

1. **CommandCenter** - Main container component
   - Manages SSE subscription
   - Maintains agent state
   - Handles event processing
   - Provides agent details panel

2. **AgentFlowCanvas** - Infinite canvas visualization
   - D3-based zoom and pan
   - Agent node rendering
   - Connection visualization
   - Zoom controls

3. **AgentNode** - Individual agent visualization
   - Status indicators
   - Current task display
   - Processing results summary
   - Interactive selection

4. **AgentDetailsPanel** - Side panel for agent details
   - Current task information
   - Output findings
   - Tools called
   - Processing history

### Agent Types

1. **Triage Agent** - Entry point, analyzes and routes files
2. **Orchestrator** - Coordinates parallel processing
3. **Financial Agent** - Processes financial documents
4. **Legal Agent** - Extracts legal entities and relationships
5. **Strategy Agent** - Identifies patterns and insights
6. **Knowledge Graph Agent** - Builds unified knowledge graph

### Processing Flow

```
Files → Triage → Orchestrator → [Financial, Legal, Strategy] → Knowledge Graph
```

## Usage

### Basic Usage

```tsx
import { CommandCenter } from "@/components/CommandCenter";

function CasePage({ caseId }: { caseId: string }) {
  return (
    <div className="h-screen">
      <CommandCenter caseId={caseId} />
    </div>
  );
}
```

### With Mock Data (Testing)

```tsx
import { simulateProcessingFlow } from "@/lib/mock-command-center-data";

// Simulate processing events
simulateProcessingFlow((event) => {
  console.log("Event:", event);
}, 2000); // 2 second delay between events
```

## SSE Events

The Command Center subscribes to the following SSE events:

### agent-started
```typescript
{
  type: "agent-started",
  agentType: "financial",
  taskId: "task-123",
  fileId: "file-456",
  fileName: "bank_statement.pdf"
}
```

### agent-complete
```typescript
{
  type: "agent-complete",
  agentType: "financial",
  taskId: "task-123",
  result: {
    taskId: "task-123",
    agentType: "financial",
    outputs: [...],
    routingDecisions: [...],
    toolsCalled: [...]
  }
}
```

### agent-error
```typescript
{
  type: "agent-error",
  agentType: "legal",
  taskId: "task-789",
  error: "Failed to parse document"
}
```

### processing-complete
```typescript
{
  type: "processing-complete",
  caseId: "case-001",
  filesProcessed: 12,
  entitiesCreated: 247,
  relationshipsCreated: 89
}
```

## Styling

The Command Center uses the Holmes design system with warm brown color palette:

- **Triage**: #8B7355 (Warm brown)
- **Orchestrator**: #6B5A47 (Deep warm brown)
- **Financial**: #9D8B73 (Light warm brown)
- **Legal**: #B89968 (Golden brown)
- **Strategy**: #A68A6A (Tan brown)
- **Knowledge Graph**: #7A6B5D (Medium warm brown)

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatible
- Status updates announced via aria-live regions

## Performance

- Memoized agent nodes and connections
- Efficient D3 rendering
- Optimized SSE event handling
- Automatic reconnection with exponential backoff

## Backend Integration

The Command Center expects an SSE endpoint at:
```
/api/cases/{caseId}/command-center/stream
```

This endpoint should emit events as agents process files and complete tasks.

## Future Enhancements

- Agent metrics and performance graphs
- Historical playback of processing runs
- Connection tooltips with routing details
- Agent filtering and focus modes
- Export capabilities for flow diagrams
- Real-time performance monitoring

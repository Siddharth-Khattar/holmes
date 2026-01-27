// Knowledge Graph Types

export type EntityType = 'person' | 'organization' | 'location' | 'event' | 'document' | 'evidence';

export type EvidenceType = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  content?: string;
  url?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Relationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  label: string;
  strength: number; // 0-1
  isCrossModal?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface GraphNode {
  id: string;
  type: 'entity' | 'evidence';
  data: Entity | Evidence;
  position: Position;
  isPinned: boolean;
  degree?: number; // Number of connections
}

export interface GraphConnection {
  id: string;
  source: string; // node id
  target: string; // node id
  relationship: Relationship;
}

export interface Transform {
  x: number;
  y: number;
  k: number; // scale
}

export interface GraphFilters {
  entityTypes: Set<EntityType>;
  evidenceTypes: Set<EvidenceType>;
  relationshipTypes: Set<string>;
  searchQuery: string;
}

export interface RedStringBoardOptions {
  layout: {
    randomSeed?: number;
    improvedLayout: boolean;
  };
  physics: {
    enabled: boolean;
    stabilization: {
      enabled: boolean;
      iterations: number;
    };
    forces: {
      linkDistance: number;
      linkStrength: number;
      chargeStrength: number;
      collisionRadius: number;
      centerStrength: number;
    };
  };
  nodes: {
    borderWidth: number;
    borderWidthSelected: number;
    font: {
      size: number;
      face: string;
    };
  };
  edges: {
    width: number;
    smooth: boolean;
  };
  interaction: {
    dragNodes: boolean;
    dragView: boolean;
    zoomView: boolean;
    hover: boolean;
  };
}

export type GraphEvent =
  | { type: 'nodeClick'; nodeId: string; event: React.MouseEvent }
  | { type: 'nodeDoubleClick'; nodeId: string; event: React.MouseEvent }
  | { type: 'nodeHover'; nodeId: string; event: React.MouseEvent }
  | { type: 'nodeHoverLeave'; nodeId: string; event: React.MouseEvent }
  | { type: 'nodeDragStart'; nodeId: string; event: React.MouseEvent }
  | { type: 'nodeDragging'; nodeId: string; position: Position; event: MouseEvent }
  | { type: 'nodeDragEnd'; nodeId: string; position: Position; event: MouseEvent }
  | { type: 'edgeClick'; edgeId: string; event: React.MouseEvent }
  | { type: 'backgroundClick'; position: Position; event: React.MouseEvent }
  | { type: 'zoom'; scale: number; translation: Position }
  | { type: 'stabilizationProgress'; progress: number }
  | { type: 'stabilizationDone' };

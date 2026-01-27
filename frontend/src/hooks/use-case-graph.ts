import { useState, useEffect } from 'react';
import { GraphNode, GraphConnection, Entity, Evidence, Relationship } from '@/types/knowledge-graph';
import { generateMockGraphData } from '@/lib/mock-graph-data';

interface GraphData {
  nodes: GraphNode[];
  connections: GraphConnection[];
  entities: Entity[];
  evidence: Evidence[];
  relationships: Relationship[];
}

interface UseCaseGraphReturn {
  data: GraphData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and manage knowledge graph data for a case
 * 
 * TODO: Replace mock data with real API calls when backend is ready
 * 
 * Future API endpoints:
 * - GET /api/cases/:caseId/graph
 * - POST /api/cases/:caseId/entities
 * - POST /api/cases/:caseId/relationships
 * - PATCH /api/cases/:caseId/entities/:entityId
 * - DELETE /api/cases/:caseId/entities/:entityId
 */
export function useCaseGraph(caseId: string): UseCaseGraphReturn {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await api.get(`/api/cases/${caseId}/graph`);
      // const { entities, evidence, relationships } = response;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use mock data for now
      const mockData = generateMockGraphData();

      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch graph data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [caseId]);

  return {
    data,
    loading,
    error,
    refetch: fetchGraph,
  };
}

/**
 * Future implementation with real API:
 * 
 * export function useCaseGraph(caseId: string) {
 *   const [data, setData] = useState<GraphData | null>(null);
 *   const [loading, setLoading] = useState(true);
 *   
 *   useEffect(() => {
 *     async function fetchGraph() {
 *       const response = await api.get(`/api/cases/${caseId}/graph`);
 *       
 *       // Transform API response to graph format
 *       const nodes: GraphNode[] = [
 *         ...response.entities.map(entity => ({
 *           id: entity.id,
 *           type: 'entity' as const,
 *           data: entity,
 *           position: { x: 0, y: 0 },
 *           isPinned: false,
 *         })),
 *         ...response.evidence.map(ev => ({
 *           id: ev.id,
 *           type: 'evidence' as const,
 *           data: ev,
 *           position: { x: 0, y: 0 },
 *           isPinned: false,
 *         })),
 *       ];
 *       
 *       const connections: GraphConnection[] = response.relationships.map(rel => ({
 *         id: rel.id,
 *         source: rel.sourceEntityId,
 *         target: rel.targetEntityId,
 *         relationship: rel,
 *       }));
 *       
 *       setData({ nodes, connections, ...response });
 *       setLoading(false);
 *     }
 *     
 *     fetchGraph();
 *   }, [caseId]);
 *   
 *   const addEntity = async (entity: Partial<Entity>) => {
 *     const newEntity = await api.post(`/api/cases/${caseId}/entities`, entity);
 *     setData(prev => ({
 *       ...prev!,
 *       entities: [...prev!.entities, newEntity],
 *       nodes: [...prev!.nodes, {
 *         id: newEntity.id,
 *         type: 'entity',
 *         data: newEntity,
 *         position: { x: 0, y: 0 },
 *         isPinned: false,
 *       }],
 *     }));
 *     return newEntity;
 *   };
 *   
 *   const addRelationship = async (rel: Partial<Relationship>) => {
 *     const newRel = await api.post(`/api/cases/${caseId}/relationships`, rel);
 *     setData(prev => ({
 *       ...prev!,
 *       relationships: [...prev!.relationships, newRel],
 *       connections: [...prev!.connections, {
 *         id: newRel.id,
 *         source: newRel.sourceEntityId,
 *         target: newRel.targetEntityId,
 *         relationship: newRel,
 *       }],
 *     }));
 *     return newRel;
 *   };
 *   
 *   return { data, loading, addEntity, addRelationship };
 * }
 */

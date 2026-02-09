// ABOUTME: React hook for geospatial data management with status tracking, generation triggering, and polling.
// ABOUTME: Transforms API LocationResponse to frontend Landmark type; provides generate/refresh/refetch functions.

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchGeospatialStatus,
  fetchLocations,
  generateGeospatialIntelligence,
  deleteGeospatialData,
  type GeospatialStatus,
  type LocationResponse,
} from "@/lib/api/geospatial";
import type { Landmark } from "@/types/geospatial.types";

export function useGeospatialData(caseId: string) {
  const [status, setStatus] = useState<GeospatialStatus | null>(null);
  const [locations, setLocations] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transform API location to frontend Landmark type
  const transformLocation = (loc: LocationResponse): Landmark => ({
    id: loc.id,
    name: loc.name,
    location: loc.coordinates
      ? { lat: loc.coordinates.lat, lng: loc.coordinates.lng }
      : { lat: 0, lng: 0 }, // Fallback for unmappable locations
    type: loc.location_type as
      | "crime_scene"
      | "witness_location"
      | "evidence_location"
      | "suspect_location"
      | "other",
    events: [], // Will be populated from detail endpoint if needed
  });

  // Fetch status and locations
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check status first
      const statusData = await fetchGeospatialStatus(caseId);
      setStatus(statusData);

      // If complete, fetch locations
      if (statusData.exists && statusData.status === "complete") {
        const locationsData = await fetchLocations(caseId);
        const transformedLocations = locationsData.map(transformLocation);
        setLocations(transformedLocations);
      } else {
        setLocations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      console.error("Geospatial data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Generate intelligence
  const generate = useCallback(
    async (force = false) => {
      try {
        setGenerating(true);
        setError(null);
        await generateGeospatialIntelligence(caseId, force);
        setStatus({ exists: true, status: "generating", location_count: 0 });
        // Poll for completion
        const pollInterval = setInterval(async () => {
          const statusData = await fetchGeospatialStatus(caseId);
          setStatus(statusData);
          if (statusData.status === "complete") {
            clearInterval(pollInterval);
            setGenerating(false);
            await fetchData();
          }
        }, 3000); // Poll every 3 seconds
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate intelligence",
        );
        setGenerating(false);
        console.error("Geospatial generation error:", err);
      }
    },
    [caseId, fetchData],
  );

  // Refresh (delete + regenerate)
  const refresh = useCallback(async () => {
    try {
      setError(null);
      await deleteGeospatialData(caseId);
      await generate(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
      console.error("Geospatial refresh error:", err);
    }
  }, [caseId, generate]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    status,
    locations,
    loading,
    generating,
    error,
    generate,
    refresh,
    refetch: fetchData,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  Globe,
  MapIcon,
  X,
  Clock,
  FileText,
  MapPin,
  Navigation,
  Building2,
  Calendar,
  Link2,
} from "lucide-react";
import { clsx } from "clsx";
import type {
  Landmark,
  GeospatialPath,
  MapView,
} from "@/types/geospatial.types";
import {
  fetchLocationDetail,
  type LocationDetailResponse,
} from "@/lib/api/geospatial";

interface PlaceInfo {
  name?: string;
  address?: string;
  phone?: string;
  rating?: number;
  types?: string[];
  website?: string;
  photos?: unknown[];
}

interface GeospatialMapProps {
  caseId: string;
  landmarks: Landmark[];
  paths: GeospatialPath[];
  onViewSource?: (fileId: string, locator: string) => void;
}

// Landmark type colors
const LANDMARK_COLORS: Record<string, string> = {
  crime_scene: "#FF6B6B",
  witness_location: "#4A90E2",
  evidence_location: "#F5A623",
  suspect_location: "#7B68EE",
  other: "#8A8A82",
};

// Map type IDs for Google Maps
type GoogleMapTypeId = "roadmap" | "satellite" | "hybrid" | "terrain";

export function GeospatialMap({
  caseId,
  landmarks,
  paths,
  onViewSource,
}: GeospatialMapProps) {
  const [mapView, setMapView] = useState<MapView>("2d");
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(
    null,
  );
  const [hoveredLandmark, setHoveredLandmark] = useState<string | null>(null);
  const [showStreetView, setShowStreetView] = useState(false);
  const [streetViewLandmark, setStreetViewLandmark] = useState<Landmark | null>(
    null,
  );
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [loadingPlaceInfo, setLoadingPlaceInfo] = useState(false);
  const [selectedLocationDetail, setSelectedLocationDetail] =
    useState<LocationDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Get API key from environment
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Calculate center point from landmarks
  const center = useMemo(() => {
    if (landmarks.length === 0) {
      return { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco
    }
    const centerLat =
      landmarks.reduce((sum, l) => sum + l.location.lat, 0) / landmarks.length;
    const centerLng =
      landmarks.reduce((sum, l) => sum + l.location.lng, 0) / landmarks.length;
    return { lat: centerLat, lng: centerLng };
  }, [landmarks]);

  // Map type based on view
  const mapTypeId: GoogleMapTypeId = mapView === "3d" ? "satellite" : "roadmap";

  // Fetch place information using Places API
  const fetchPlaceInfo = useCallback(
    async (landmark: Landmark) => {
      if (!apiKey) return;

      // Check if Google Maps API is loaded
      if (
        typeof window === "undefined" ||
        !(window as any).google?.maps?.places
      ) {
        console.warn("Google Maps Places API not loaded yet");
        setLoadingPlaceInfo(false);
        return;
      }

      setLoadingPlaceInfo(true);
      try {
        const googleMaps = (window as any).google.maps;

        // Use Places API to get nearby place information
        const service = new googleMaps.places.PlacesService(
          document.createElement("div"),
        );

        const request = {
          location: new googleMaps.LatLng(
            landmark.location.lat,
            landmark.location.lng,
          ),
          radius: 50, // 50 meters radius
        };

        service.nearbySearch(request, (results: any, status: any) => {
          if (
            status === googleMaps.places.PlacesServiceStatus.OK &&
            results &&
            results[0]
          ) {
            const place = results[0];

            // Get detailed place information
            service.getDetails(
              { placeId: place.place_id! },
              (placeDetails: any, detailsStatus: any) => {
                if (
                  detailsStatus === googleMaps.places.PlacesServiceStatus.OK
                ) {
                  setPlaceInfo({
                    name: placeDetails?.name,
                    address: placeDetails?.formatted_address,
                    phone: placeDetails?.formatted_phone_number,
                    rating: placeDetails?.rating,
                    types: placeDetails?.types,
                    website: placeDetails?.website,
                    photos: placeDetails?.photos?.slice(0, 3),
                  });
                }
                setLoadingPlaceInfo(false);
              },
            );
          } else {
            setPlaceInfo(null);
            setLoadingPlaceInfo(false);
          }
        });
      } catch (error) {
        console.error("Error fetching place info:", error);
        setPlaceInfo(null);
        setLoadingPlaceInfo(false);
      }
    },
    [apiKey],
  );

  // Handle landmark click
  const handleLandmarkClick = useCallback(
    async (landmark: Landmark) => {
      setSelectedLandmark(landmark);
      setPlaceInfo(null);
      setSelectedLocationDetail(null);
      fetchPlaceInfo(landmark);

      // Fetch full location detail
      try {
        setLoadingDetail(true);
        const detail = await fetchLocationDetail(caseId, landmark.id);
        setSelectedLocationDetail(detail);
      } catch (error) {
        console.error("Failed to fetch location detail:", error);
      } finally {
        setLoadingDetail(false);
      }
    },
    [caseId, fetchPlaceInfo],
  );

  // Close dialog
  const handleBackdropClick = useCallback(() => {
    setSelectedLandmark(null);
    setPlaceInfo(null);
  }, []);

  // Open Street View
  const handleOpenStreetView = useCallback((landmark: Landmark) => {
    setStreetViewLandmark(landmark);
    setShowStreetView(true);
  }, []);

  // If no API key, show error
  if (!apiKey) {
    return (
      <div
        className="w-full h-full flex items-center justify-center rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="text-center p-8">
          <Globe
            size={64}
            className="mx-auto mb-4"
            style={{ color: "var(--muted-foreground)" }}
          />
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Google Maps API Key Required
          </h3>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your frontend/.env
            file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        // Hardware acceleration for smoother performance
        transform: "translateZ(0)",
        willChange: mapView === "3d" ? "transform" : "auto",
      }}
    >
      <APIProvider apiKey={apiKey} libraries={["places"]}>
        {/* Main Map */}
        {!showStreetView && (
          <Map
            defaultCenter={center}
            defaultZoom={13}
            mapTypeId={mapTypeId}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId={mapView === "3d" ? "satellite-map" : "roadmap-map"}
            style={{ width: "100%", height: "100%" }}
            tilt={mapView === "3d" ? 30 : 0}
            heading={mapView === "3d" ? 0 : 0}
            options={{
              // Performance optimizations
              renderingType: mapView === "3d" ? "RASTER" : "VECTOR",
              isFractionalZoomEnabled: false,
              // Reduce quality slightly for better performance in 3D
              ...(mapView === "3d" && {
                maxZoom: 20,
                minZoom: 10,
              }),
            }}
          >
            {/* Render landmarks as markers */}
            {landmarks.map((landmark) => {
              const color =
                LANDMARK_COLORS[landmark.type] || LANDMARK_COLORS.other;
              const isHovered = hoveredLandmark === landmark.id;
              const isSelected = selectedLandmark?.id === landmark.id;

              return (
                <AdvancedMarker
                  key={landmark.id}
                  position={landmark.location}
                  onClick={() => handleLandmarkClick(landmark)}
                  onMouseEnter={() => setHoveredLandmark(landmark.id)}
                  onMouseLeave={() => setHoveredLandmark(null)}
                  zIndex={isSelected ? 30 : isHovered ? 20 : 10}
                >
                  <div
                    className="relative flex items-center justify-center rounded-full cursor-pointer"
                    style={{
                      width: isSelected ? "52px" : isHovered ? "48px" : "44px",
                      height: isSelected ? "52px" : isHovered ? "48px" : "44px",
                      backgroundColor: color,
                      boxShadow:
                        isSelected || isHovered
                          ? `0 0 24px ${color}90, 0 4px 16px rgba(0, 0, 0, 0.3)`
                          : `0 4px 12px rgba(0, 0, 0, 0.2)`,
                      border: `3px solid ${isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.9)"}`,
                      transition: "all 0.2s ease-out",
                      // Hardware acceleration
                      transform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <MapPin
                      size={isSelected ? 26 : isHovered ? 24 : 22}
                      color="white"
                      strokeWidth={2.5}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Render paths as polylines */}
            <PathsOverlay paths={paths} landmarks={landmarks} />
          </Map>
        )}

        {/* Street View */}
        {showStreetView && streetViewLandmark && (
          <StreetViewComponent
            landmark={streetViewLandmark}
            onClose={() => {
              setShowStreetView(false);
              setStreetViewLandmark(null);
            }}
          />
        )}

        {/* View Toggle Controls */}
        <div
          className="absolute top-4 right-4 flex gap-2 p-2 rounded-lg shadow-lg z-10"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setMapView("2d")}
            className={clsx(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              mapView === "2d"
                ? "text-[var(--foreground)]"
                : "text-[var(--muted-foreground)]",
            )}
            style={{
              backgroundColor:
                mapView === "2d" ? "var(--muted)" : "transparent",
            }}
          >
            <MapIcon size={16} />
            2D
          </button>
          <button
            onClick={() => setMapView("3d")}
            className={clsx(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              mapView === "3d"
                ? "text-[var(--foreground)]"
                : "text-[var(--muted-foreground)]",
            )}
            style={{
              backgroundColor:
                mapView === "3d" ? "var(--muted)" : "transparent",
            }}
          >
            <Globe size={16} />
            Satellite
          </button>
        </div>

        {/* Legend */}
        <div
          className="absolute bottom-4 left-4 p-4 rounded-lg shadow-lg max-w-xs z-10"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Landmark Types
          </h3>
          <div className="space-y-2">
            {Object.entries(LANDMARK_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-xs capitalize"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {type.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Landmark Detail Dialog */}
        {selectedLandmark && (
          <div
            className="absolute inset-0 flex items-center justify-center p-4 z-20"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={handleBackdropClick}
          >
            <div
              className="relative max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="sticky top-0 px-6 py-4 flex items-start justify-between"
                style={{
                  backgroundColor: "var(--card)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: LANDMARK_COLORS[selectedLandmark.type],
                      }}
                    >
                      <MapPin size={18} color="white" />
                    </div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {selectedLandmark.name}
                    </h2>
                  </div>
                  <p
                    className="text-sm capitalize mb-3"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {selectedLandmark.type.replace("_", " ")}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenStreetView(selectedLandmark)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                      style={{
                        backgroundColor: "var(--muted)",
                        color: "var(--foreground)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--muted)";
                      }}
                    >
                      <Navigation size={14} />
                      Street View
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLandmark(null)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Place Information from Places API */}
              {loadingPlaceInfo && (
                <div
                  className="px-6 py-4"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2">
                    <Building2
                      size={16}
                      style={{ color: "var(--muted-foreground)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Loading location information...
                    </span>
                  </div>
                </div>
              )}

              {placeInfo && (
                <div
                  className="px-6 py-4"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Building2
                      size={20}
                      style={{ color: "var(--foreground)" }}
                    />
                    <div className="flex-1">
                      <h3
                        className="font-semibold text-sm mb-2"
                        style={{ color: "var(--foreground)" }}
                      >
                        Location Information
                      </h3>
                      {placeInfo.name && (
                        <p
                          className="text-sm mb-1"
                          style={{ color: "var(--foreground)" }}
                        >
                          <strong>Name:</strong> {placeInfo.name}
                        </p>
                      )}
                      {placeInfo.address && (
                        <p
                          className="text-sm mb-1"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <strong>Address:</strong> {placeInfo.address}
                        </p>
                      )}
                      {placeInfo.phone && (
                        <p
                          className="text-sm mb-1"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <strong>Phone:</strong> {placeInfo.phone}
                        </p>
                      )}
                      {placeInfo.rating && (
                        <p
                          className="text-sm mb-1"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <strong>Rating:</strong> {placeInfo.rating} ⭐
                        </p>
                      )}
                      {placeInfo.website && (
                        <p
                          className="text-sm"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <strong>Website:</strong>{" "}
                          <a
                            href={placeInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: "var(--primary)" }}
                          >
                            Visit
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-4">
                {/* Section 1: Events at this Location */}
                <div className="mb-6">
                  <h4 className="mb-3 flex items-center text-sm font-semibold text-neutral-200">
                    <Calendar className="mr-2 h-4 w-4" />
                    Events at this Location (
                    {selectedLocationDetail?.events.length || 0})
                  </h4>
                  {loadingDetail ? (
                    <p className="text-xs text-neutral-400">
                      Loading events...
                    </p>
                  ) : selectedLocationDetail &&
                    selectedLocationDetail.events.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLocationDetail.events.map((event, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
                        >
                          <p className="text-sm font-medium text-neutral-200">
                            {event.event_title}
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {event.event_description}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                            <span>
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                            <span className="capitalize">
                              Layer: {event.layer}
                            </span>
                            <span>
                              Confidence: {(event.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      No events at this location
                    </p>
                  )}
                </div>

                {/* Section 2: Citations */}
                <div className="mb-6">
                  <h4 className="mb-3 flex items-center text-sm font-semibold text-neutral-200">
                    <FileText className="mr-2 h-4 w-4" />
                    Citations ({selectedLocationDetail?.citations.length || 0})
                  </h4>
                  {loadingDetail ? (
                    <p className="text-xs text-neutral-400">
                      Loading citations...
                    </p>
                  ) : selectedLocationDetail &&
                    selectedLocationDetail.citations.length > 0 ? (
                    <div className="space-y-3">
                      {selectedLocationDetail.citations.map((citation, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-neutral-300">
                                {citation.file_name || "Source Document"}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {citation.locator}
                              </p>
                            </div>
                            {onViewSource && (
                              <button
                                onClick={() =>
                                  onViewSource(
                                    citation.file_id,
                                    citation.locator,
                                  )
                                }
                                className="text-xs text-primary-400 hover:text-primary-300"
                              >
                                View
                              </button>
                            )}
                          </div>
                          <div className="mt-2 rounded bg-neutral-950/50 p-2">
                            <p className="text-xs italic text-neutral-400">
                              &ldquo;{citation.excerpt}&rdquo;
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      No citations available
                    </p>
                  )}
                </div>

                {/* Section 3: Temporal Analysis */}
                <div className="mb-6">
                  <h4 className="mb-3 flex items-center text-sm font-semibold text-neutral-200">
                    <Clock className="mr-2 h-4 w-4" />
                    Temporal Analysis
                  </h4>
                  {loadingDetail ? (
                    <p className="text-xs text-neutral-400">
                      Loading temporal data...
                    </p>
                  ) : selectedLocationDetail?.temporal_associations ? (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
                      <p className="text-xs text-neutral-400">
                        Location was relevant during:
                      </p>
                      <p className="mt-1 text-sm font-medium text-neutral-200">
                        {selectedLocationDetail.temporal_associations.start
                          ? new Date(
                              selectedLocationDetail.temporal_associations
                                .start,
                            ).toLocaleDateString()
                          : "Unknown start"}
                        {" → "}
                        {selectedLocationDetail.temporal_associations.end
                          ? new Date(
                              selectedLocationDetail.temporal_associations.end,
                            ).toLocaleDateString()
                          : "Unknown end"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      No temporal data available
                    </p>
                  )}
                </div>

                {/* Section 4: Related Entities */}
                <div>
                  <h4 className="mb-3 flex items-center text-sm font-semibold text-neutral-200">
                    <Link2 className="mr-2 h-4 w-4" />
                    Related Entities (
                    {selectedLocationDetail?.source_entity_ids.length || 0})
                  </h4>
                  {loadingDetail ? (
                    <p className="text-xs text-neutral-400">
                      Loading entities...
                    </p>
                  ) : selectedLocationDetail &&
                    selectedLocationDetail.source_entity_ids.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLocationDetail.source_entity_ids.map(
                        (entityId) => (
                          <div
                            key={entityId}
                            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-2"
                          >
                            <div className="h-2 w-2 rounded-full bg-primary-500" />
                            <p className="text-xs text-neutral-300">
                              {entityId}
                            </p>
                            {/* Phase 10: Add click handler to navigate to KG filtered by entity */}
                          </div>
                        ),
                      )}
                      <p className="mt-2 text-xs text-neutral-500">
                        Click entity to view in Knowledge Graph (Phase 10)
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      No related entities
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </APIProvider>
    </div>
  );
}

// Component to render paths as polylines
function PathsOverlay({
  paths,
  landmarks,
}: {
  paths: GeospatialPath[];
  landmarks: Landmark[];
}) {
  const map = useMap();

  useMemo(() => {
    if (!map || typeof window === "undefined" || !(window as any).google?.maps)
      return;

    const googleMaps = (window as any).google.maps;

    // Clear existing polylines
    const polylines: any[] = [];

    paths.forEach((path) => {
      const fromLandmark = landmarks.find((l) => l.id === path.from);
      const toLandmark = landmarks.find((l) => l.id === path.to);

      if (!fromLandmark || !toLandmark) return;

      const polyline = new googleMaps.Polyline({
        path: [fromLandmark.location, toLandmark.location],
        geodesic: true,
        strokeColor: path.color || "#8A8A82",
        strokeOpacity: 0.7,
        strokeWeight: 3,
        icons: [
          {
            icon: {
              path: googleMaps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: path.color || "#8A8A82",
            },
            offset: "100%",
          },
        ],
        map: map,
        // Performance optimization
        clickable: false,
        draggable: false,
      });

      polylines.push(polyline);
    });

    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, paths, landmarks]);

  return null;
}

// Street View Component
function StreetViewComponent({
  landmark,
  onClose,
}: {
  landmark: Landmark;
  onClose: () => void;
}) {
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full">
      <div
        id="street-view"
        className="w-full h-full"
        ref={(node) => {
          if (
            node &&
            typeof window !== "undefined" &&
            (window as any).google?.maps?.StreetViewPanorama
          ) {
            try {
              const googleMaps = (window as any).google.maps;
              new googleMaps.StreetViewPanorama(node, {
                position: landmark.location,
                pov: { heading: 0, pitch: 0 },
                zoom: 1,
              });
            } catch (err) {
              console.error("Street View error:", err);
              setError(true);
            }
          }
        }}
      />

      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="text-center p-8">
            <p style={{ color: "var(--muted-foreground)" }}>
              Street View not available for this location
            </p>
          </div>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 rounded-lg shadow-lg transition-colors z-10"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--muted)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--card)";
        }}
      >
        <X size={20} />
      </button>

      {/* Info */}
      {!error && (
        <div
          className="absolute bottom-4 left-4 px-4 py-3 rounded-lg shadow-lg"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Navigation size={16} style={{ color: "var(--foreground)" }} />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {landmark.name}
            </span>
          </div>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Street View • Use mouse to look around
          </p>
        </div>
      )}
    </div>
  );
}

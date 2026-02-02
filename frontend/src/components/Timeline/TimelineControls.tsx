"use client";

import React from "react";
import { ZoomIn, ZoomOut, Filter } from "lucide-react";
import { TimelineZoomLevel, TimelineLayer } from "@/types/timeline.types";
import { LAYER_CONFIG, ZOOM_CONFIG } from "@/constants/timeline.constants";
import { cn } from "@/lib/utils";

interface TimelineControlsProps {
  zoomLevel: TimelineZoomLevel;
  onZoomChange: (zoom: TimelineZoomLevel) => void;
  selectedLayers: TimelineLayer[];
  onLayersChange: (layers: TimelineLayer[]) => void;
  totalEvents: number;
  filteredEvents: number;
}

const ZOOM_LEVELS: TimelineZoomLevel[] = ["day", "week", "month", "year"];

export function TimelineControls({
  zoomLevel,
  onZoomChange,
  selectedLayers,
  onLayersChange,
  totalEvents,
  filteredEvents,
}: TimelineControlsProps) {
  const toggleLayer = (layer: TimelineLayer) => {
    if (selectedLayers.includes(layer)) {
      // Don't allow removing all layers
      if (selectedLayers.length > 1) {
        onLayersChange(selectedLayers.filter((l) => l !== layer));
      }
    } else {
      onLayersChange([...selectedLayers, layer]);
    }
  };

  const currentZoomIndex = ZOOM_LEVELS.indexOf(zoomLevel);

  return (
    <div className="bg-(--card) border-b border-(--border) px-4 md:px-10 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-(--foreground) mr-2">
            Zoom:
          </span>

          <button
            onClick={() => {
              if (currentZoomIndex > 0) {
                onZoomChange(ZOOM_LEVELS[currentZoomIndex - 1]);
              }
            }}
            disabled={currentZoomIndex === 0}
            className="p-2 rounded-md hover:bg-(--muted) disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-(--foreground)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="flex gap-1 bg-(--muted) rounded-md p-1">
            {ZOOM_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => onZoomChange(level)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-all",
                  level === zoomLevel
                    ? "bg-(--background) text-(--foreground) shadow-sm"
                    : "text-(--muted-foreground) hover:text-(--foreground)",
                )}
              >
                {ZOOM_CONFIG[level].label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (currentZoomIndex < ZOOM_LEVELS.length - 1) {
                onZoomChange(ZOOM_LEVELS[currentZoomIndex + 1]);
              }
            }}
            disabled={currentZoomIndex === ZOOM_LEVELS.length - 1}
            className="p-2 rounded-md hover:bg-(--muted) disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-(--foreground)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Layer filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-(--muted-foreground)" />
            <span className="text-sm font-medium text-(--foreground)">
              Layers:
            </span>
          </div>

          <div className="flex gap-2">
            {(Object.keys(LAYER_CONFIG) as TimelineLayer[]).map((layer) => {
              const config = LAYER_CONFIG[layer];
              const isSelected = selectedLayers.includes(layer);

              return (
                <button
                  key={layer}
                  onClick={() => toggleLayer(layer)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md border-2 transition-all",
                    isSelected
                      ? `${config.bgColor} ${config.borderColor} ${config.color}`
                      : "bg-transparent border-(--border) text-(--muted-foreground) hover:border-(--muted-foreground)",
                  )}
                >
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Event count */}
          <div className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1.5 bg-(--muted) rounded-md">
            <span className="text-xs text-(--muted-foreground)">
              Showing {filteredEvents} of {totalEvents} events
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

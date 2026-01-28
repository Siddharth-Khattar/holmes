"use client";

import React, { useState, useMemo } from "react";
import { TimelineCore } from "./TimelineCore";
import { TimelineControls } from "./TimelineControls";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineSkeleton } from "./TimelineSkeleton";
import { EventDetailModal } from "../EventDetail/EventDetailModal";
import { useTimelineData } from "@/hooks/useTimelineData";
import { useTimelineFilters } from "@/hooks/useTimelineFilters";
import { useTimelineSSE } from "@/hooks/useTimelineSSE";
import type { TimelineProps, TimelineEvent } from "@/types/timeline.types";

export function Timeline({
  caseId,
  initialEvents = [],
  onEventClick,
  onEventUpdate,
  onEventDelete,
  enableRealtimeUpdates = true,
  className,
}: TimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  // Filter and zoom state
  const {
    zoomLevel,
    setZoomLevel,
    selectedLayers,
    setSelectedLayers,
    filters,
  } = useTimelineFilters();

  // Data fetching
  const {
    data: timelineData,
    isLoading,
    error,
    refetch,
  } = useTimelineData(caseId, filters);

  // Real-time updates via SSE
  useTimelineSSE(caseId, {
    enabled: enableRealtimeUpdates,
    onEventCreated: () => refetch(),
    onEventUpdated: () => refetch(),
    onEventDeleted: () => refetch(),
  });

  // Filter events by selected layers
  const filteredEvents = useMemo(() => {
    const events = timelineData?.events || initialEvents;
    return events.filter(event => selectedLayers.includes(event.layer));
  }, [timelineData?.events, initialEvents, selectedLayers]);

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  const handleEventUpdate = async (updatedEvent: TimelineEvent) => {
    await onEventUpdate?.(updatedEvent);
    await refetch();
    setSelectedEvent(null);
  };

  const handleEventDelete = async (eventId: string) => {
    await onEventDelete?.(eventId);
    await refetch();
    setSelectedEvent(null);
  };

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="text-red-600 dark:text-red-400 text-lg font-medium">
          Failed to load timeline
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalEvents = timelineData?.events.length || initialEvents.length;

  return (
    <div className={className}>
      <TimelineHeader
        caseId={caseId}
        dateRange={timelineData?.dateRange}
        layerCounts={timelineData?.layerCounts}
      />

      <TimelineControls
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        selectedLayers={selectedLayers}
        onLayersChange={setSelectedLayers}
        totalEvents={totalEvents}
        filteredEvents={filteredEvents.length}
      />

      <TimelineCore
        events={filteredEvents}
        zoomLevel={zoomLevel}
        onEventClick={handleEventClick}
      />

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={handleEventUpdate}
          onDelete={handleEventDelete}
        />
      )}
    </div>
  );
}

"use client";

import {
  useScroll,
  useTransform,
  motion,
  AnimatePresence,
} from "framer-motion";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { format } from "date-fns";
import { TimelineEvent, TimelineZoomLevel } from "@/types/timeline.types";
import { TimelineEventCard } from "./TimelineEventCard";
import { ZOOM_CONFIG } from "@/constants/timeline.constants";
import { cn } from "@/lib/utils";

interface TimelineCoreProps {
  events: TimelineEvent[];
  zoomLevel: TimelineZoomLevel;
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

interface GroupedEvents {
  [key: string]: TimelineEvent[];
}

export function TimelineCore({
  events,
  zoomLevel,
  onEventClick,
  className,
}: TimelineCoreProps) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Group events by zoom level
  const groupedEvents = useMemo(() => {
    const groups: GroupedEvents = {};
    const { groupingKey } = ZOOM_CONFIG[zoomLevel];

    events.forEach((event) => {
      const eventDate = new Date(event.date);
      const key = groupingKey(eventDate);

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    });

    // Sort events within each group by date
    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });

    return groups;
  }, [events, zoomLevel]);

  // Sort group keys chronologically
  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedEvents).sort((a, b) => {
      const dateA = new Date(groupedEvents[a][0].date);
      const dateB = new Date(groupedEvents[b][0].date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [groupedEvents]);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref, events, zoomLevel]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  // Format title based on first event in the group
  const formatGroupTitle = (groupKey: string) => {
    const firstEvent = groupedEvents[groupKey][0];
    const date = new Date(firstEvent.date);
    const { dateFormat } = ZOOM_CONFIG[zoomLevel];
    return format(date, dateFormat);
  };

  if (sortedGroupKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="text-lg" style={{ color: "var(--color-stone, #8A8A82)" }}>
          No timeline events found
        </div>
        <p className="text-sm mt-2" style={{ color: "var(--color-stone, #8A8A82)" }}>
          Try adjusting your filters or extract events from case documents
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("w-full font-sans md:px-10", className)}
      style={{ backgroundColor: "var(--color-charcoal, #1A1A1A)" }}
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        <AnimatePresence mode="popLayout">
          {sortedGroupKeys.map((groupKey, groupIndex) => {
            const groupEvents = groupedEvents[groupKey];

            return (
              <motion.div
                key={groupKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: groupIndex * 0.05 }}
                className="flex justify-start pt-10 md:pt-40 md:gap-10"
              >
                {/* Timeline marker and date */}
                <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
                  <div
                    className="h-10 absolute left-3 md:left-3 w-10 rounded-full flex items-center justify-center border-2"
                    style={{
                      backgroundColor: "rgba(17, 17, 17, 0.9)",
                      borderColor: "rgba(138, 138, 130, 0.3)",
                    }}
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        background:
                          "linear-gradient(135deg, #B89968 0%, #8B7355 100%)",
                      }}
                    />
                  </div>

                  <h3
                    className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold tracking-tight"
                    style={{ color: "var(--color-smoke, #E5E5E5)" }}
                  >
                    {formatGroupTitle(groupKey)}
                  </h3>
                </div>

                {/* Event cards */}
                <div className="relative pl-20 pr-4 md:pl-4 w-full space-y-4">
                  <h3
                    className="md:hidden block text-2xl mb-4 text-left font-bold tracking-tight"
                    style={{ color: "var(--color-smoke, #E5E5E5)" }}
                  >
                    {formatGroupTitle(groupKey)}
                  </h3>

                  {groupEvents.map((event, eventIndex) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: groupIndex * 0.05 + eventIndex * 0.02,
                      }}
                    >
                      <TimelineEventCard
                        event={event}
                        onClick={() => onEventClick?.(event)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Animated progress line */}
        <div
          style={{
            height: height + "px",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(138, 138, 130, 0.3) 10%, rgba(138, 138, 130, 0.3) 90%, transparent 100%)",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px]"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
              background:
                "linear-gradient(to top, #A68A6A 0%, #B89968 50%, transparent 100%)",
            }}
            className="absolute inset-x-0 top-0 w-[2px] rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

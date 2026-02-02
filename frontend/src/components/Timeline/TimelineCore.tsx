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
        <div className="text-(--muted-foreground) text-lg">
          No timeline events found
        </div>
        <p className="text-(--muted-foreground) text-sm mt-2">
          Try adjusting your filters or extract events from case documents
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("w-full bg-(--background) font-sans md:px-10", className)}
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
                  <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-(--card) flex items-center justify-center border-2 border-(--border)">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-600 to-purple-600" />
                  </div>

                  <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-(--foreground) tracking-tight">
                    {formatGroupTitle(groupKey)}
                  </h3>
                </div>

                {/* Event cards */}
                <div className="relative pl-20 pr-4 md:pl-4 w-full space-y-4">
                  <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-(--foreground) tracking-tight">
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
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-(--border) to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-purple-600 via-blue-600 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { TimelineLayer } from "@/types/timeline.types";
import { LAYER_CONFIG } from "@/constants/timeline.constants";
import { cn } from "@/lib/utils";

interface TimelineHeaderProps {
  dateRange?: {
    earliest: string;
    latest: string;
  };
  layerCounts?: Record<TimelineLayer, number>;
  className?: string;
}

export function TimelineHeader({
  dateRange,
  layerCounts,
  className,
}: TimelineHeaderProps) {
  const totalEvents = layerCounts
    ? Object.values(layerCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div
      className={cn("bg-(--background) border-b border-(--border)", className)}
    >
      <div className="max-w-7xl mx-auto py-12 px-4 md:px-8 lg:px-10">
        {/* Title and description */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-sans font-bold text-(--foreground) mb-3 tracking-tight">
            Case Timeline
          </h1>
          <p className="text-(--muted-foreground) text-base md:text-lg max-w-2xl tracking-body">
            Chronological visualization of case events extracted from documents,
            organized by evidence, legal proceedings, and strategic actions.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total events card */}
          <div className="bg-(--card) rounded-lg p-4 border border-(--border) shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-(--muted-foreground)">
                Total Events
              </span>
              <TrendingUp className="w-4 h-4" style={{ color: "#B89968" }} />
            </div>
            <div className="text-3xl font-bold text-(--foreground)">
              {totalEvents}
            </div>
          </div>

          {/* Date range card */}
          {dateRange && (
            <div className="bg-(--card) rounded-lg p-4 border border-(--border) shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-(--muted-foreground)">
                  Date Range
                </span>
                <Calendar className="w-4 h-4" style={{ color: "#8B7355" }} />
              </div>
              <div className="text-sm font-semibold text-(--foreground)">
                {format(new Date(dateRange.earliest), "MMM d, yyyy")}
              </div>
              <div className="text-xs text-(--muted-foreground)">
                to {format(new Date(dateRange.latest), "MMM d, yyyy")}
              </div>
            </div>
          )}

          {/* Layer breakdown cards */}
          {layerCounts &&
            (Object.keys(layerCounts) as TimelineLayer[])
              .slice(0, 2)
              .map((layer) => {
                const config = LAYER_CONFIG[layer];
                const count = layerCounts[layer] || 0;

                return (
                  <div
                    key={layer}
                    className="rounded-lg p-4 border-2 shadow-sm transition-shadow hover:shadow-md"
                    style={{
                      backgroundColor: config.hexColor + "15",
                      borderColor: config.hexColor + "50",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: config.hexColor }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div
                      className="text-3xl font-bold"
                      style={{ color: config.hexColor }}
                    >
                      {count}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

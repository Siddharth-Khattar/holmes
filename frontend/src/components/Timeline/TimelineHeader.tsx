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
  const totalEvents =
    layerCounts
      ? Object.values(layerCounts).reduce((sum, count) => sum + count, 0)
      : 0;

  return (
    <div className={cn("bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 border-b border-neutral-200 dark:border-neutral-800", className)}>
      <div className="max-w-7xl mx-auto py-12 px-4 md:px-8 lg:px-10">
        {/* Title and description */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            Case Timeline
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-lg max-w-2xl">
            Chronological visualization of case events extracted from documents, organized by evidence, legal proceedings, and strategic actions.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total events card */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Total Events
              </span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalEvents}
            </div>
          </div>

          {/* Date range card */}
          {dateRange && (
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Date Range
                </span>
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {format(new Date(dateRange.earliest), 'MMM d, yyyy')}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-500">
                to {format(new Date(dateRange.latest), 'MMM d, yyyy')}
              </div>
            </div>
          )}

          {/* Layer breakdown cards */}
          {layerCounts && (Object.keys(layerCounts) as TimelineLayer[]).slice(0, 2).map((layer) => {
            const config = LAYER_CONFIG[layer];
            const count = layerCounts[layer] || 0;

            return (
              <div
                key={layer}
                className={cn(
                  "rounded-lg p-4 border-2 shadow-sm",
                  config.bgColor,
                  config.borderColor,
                  "bg-opacity-30 dark:bg-opacity-20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm font-medium",
                    config.color
                  )}>
                    {config.label}
                  </span>
                </div>
                <div className={cn(
                  "text-3xl font-bold",
                  config.color
                )}>
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

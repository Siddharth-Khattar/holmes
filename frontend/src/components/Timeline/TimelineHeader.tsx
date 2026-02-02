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
      className={cn("border-b", className)}
      style={{
        backgroundColor: "var(--color-charcoal, #1A1A1A)",
        borderColor: "rgba(138, 138, 130, 0.15)",
      }}
    >
      <div className="max-w-7xl mx-auto py-12 px-4 md:px-8 lg:px-10">
        {/* Title and description */}
        <div className="mb-8">
          <h1
            className="text-3xl md:text-5xl font-sans font-bold mb-3 tracking-tight"
            style={{ color: "var(--color-smoke, #E5E5E5)" }}
          >
            Case Timeline
          </h1>
          <p
            className="text-base md:text-lg max-w-2xl tracking-body"
            style={{ color: "var(--color-stone, #8A8A82)" }}
          >
            Chronological visualization of case events extracted from documents,
            organized by evidence, legal proceedings, and strategic actions.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total events card */}
          <div
            className="rounded-lg p-4 border shadow-sm transition-shadow hover:shadow-md"
            style={{
              backgroundColor: "rgba(17, 17, 17, 0.6)",
              borderColor: "rgba(138, 138, 130, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-medium"
                style={{ color: "#8A8A82" }}
              >
                Total Events
              </span>
              <TrendingUp className="w-4 h-4" style={{ color: "#B89968" }} />
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: "var(--color-smoke, #E5E5E5)" }}
            >
              {totalEvents}
            </div>
          </div>

          {/* Date range card */}
          {dateRange && (
            <div
              className="rounded-lg p-4 border shadow-sm transition-shadow hover:shadow-md"
              style={{
                backgroundColor: "rgba(17, 17, 17, 0.6)",
                borderColor: "rgba(138, 138, 130, 0.3)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "#8A8A82" }}
                >
                  Date Range
                </span>
                <Calendar className="w-4 h-4" style={{ color: "#8B7355" }} />
              </div>
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--color-smoke, #E5E5E5)" }}
              >
                {format(new Date(dateRange.earliest), "MMM d, yyyy")}
              </div>
              <div className="text-xs" style={{ color: "#8A8A82" }}>
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

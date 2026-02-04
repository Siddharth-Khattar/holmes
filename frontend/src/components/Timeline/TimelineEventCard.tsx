"use client";

import React from "react";
import { format } from "date-fns";
import { FileText, Scale, Target, AlertCircle, Check } from "lucide-react";
import { TimelineEvent } from "@/types/timeline.types";
import { LAYER_CONFIG } from "@/constants/timeline.constants";
import { cn } from "@/lib/utils";

interface TimelineEventCardProps {
  event: TimelineEvent;
  onClick?: () => void;
}

const ICON_MAP = {
  FileText,
  Scale,
  Target,
};

export function TimelineEventCard({ event, onClick }: TimelineEventCardProps) {
  const layerConfig = LAYER_CONFIG[event.layer];
  const IconComponent = ICON_MAP[layerConfig.icon as keyof typeof ICON_MAP];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative p-4 rounded-lg border transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "bg-white/90 dark:bg-[rgba(17,17,17,0.6)]",
        "dark:shadow-none",
        "border-warm-gray/15 dark:border-stone/20",
      )}
      style={{
        borderLeftColor: layerConfig.hexColor + "40",
        borderLeftWidth: "3px",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-md"
            style={{ backgroundColor: layerConfig.hexColor + "12" }}
          >
            <IconComponent
              className="w-4 h-4 opacity-60"
              style={{ color: layerConfig.hexColor }}
            />
          </div>
          <span
            className="text-xs font-medium uppercase tracking-wide opacity-60"
            style={{ color: layerConfig.hexColor }}
          >
            {layerConfig.label}
          </span>
        </div>

        {/* Confidence indicator */}
        <div className="flex items-center gap-1">
          {event.isUserCorrected ? (
            <div
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-500/12 text-green-700 dark:text-green-400"
              title="User verified"
            >
              <Check className="w-3 h-3" />
              <span className="hidden sm:inline">Verified</span>
            </div>
          ) : event.confidence < 0.7 ? (
            <div
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/12 text-amber-700 dark:text-amber-400"
              title={`Confidence: ${Math.round(event.confidence * 100)}%`}
            >
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">
                {Math.round(event.confidence * 100)}%
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold mb-1 transition-colors text-foreground">
        {event.title}
      </h4>

      {/* Description */}
      {event.description && (
        <p className="text-sm line-clamp-2 mb-3 text-muted-foreground">
          {event.description}
        </p>
      )}

      {/* Footer metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <time dateTime={event.date}>
          {format(new Date(event.date), "h:mm a")}
        </time>

        {event.sourceIds && event.sourceIds.length > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {event.sourceIds.length}{" "}
            {event.sourceIds.length === 1 ? "source" : "sources"}
          </span>
        )}

        {event.entityIds && event.entityIds.length > 0 && (
          <span>
            {event.entityIds.length}{" "}
            {event.entityIds.length === 1 ? "entity" : "entities"}
          </span>
        )}
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ring-1 ring-inset ring-stone/30" />
    </div>
  );
}

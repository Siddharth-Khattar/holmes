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
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative p-4 rounded-lg border-2 transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        layerConfig.bgColor,
        layerConfig.borderColor,
        "bg-opacity-50 dark:bg-opacity-30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-md",
            layerConfig.bgColor,
            "bg-opacity-80 dark:bg-opacity-60"
          )}>
            <IconComponent className={cn("w-4 h-4", layerConfig.color)} />
          </div>
          <span className={cn(
            "text-xs font-medium uppercase tracking-wide",
            layerConfig.color
          )}>
            {layerConfig.label}
          </span>
        </div>

        {/* Confidence indicator */}
        <div className="flex items-center gap-1">
          {event.isUserCorrected ? (
            <div 
              className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
              title="User verified"
            >
              <Check className="w-3 h-3" />
              <span className="hidden sm:inline">Verified</span>
            </div>
          ) : event.confidence < 0.7 ? (
            <div 
              className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
              title={`Confidence: ${Math.round(event.confidence * 100)}%`}
            >
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">{Math.round(event.confidence * 100)}%</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
        {event.title}
      </h4>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3">
          {event.description}
        </p>
      )}

      {/* Footer metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-500">
        <time dateTime={event.date}>
          {format(new Date(event.date), 'h:mm a')}
        </time>
        
        {event.sourceIds && event.sourceIds.length > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {event.sourceIds.length} {event.sourceIds.length === 1 ? 'source' : 'sources'}
          </span>
        )}
        
        {event.entityIds && event.entityIds.length > 0 && (
          <span>
            {event.entityIds.length} {event.entityIds.length === 1 ? 'entity' : 'entities'}
          </span>
        )}
      </div>

      {/* Hover indicator */}
      <div className={cn(
        "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
        "ring-2 ring-inset",
        layerConfig.borderColor
      )} />
    </div>
  );
}

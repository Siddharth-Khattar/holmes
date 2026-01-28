"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function TimelineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full bg-white dark:bg-neutral-950", className)}>
      {/* Header skeleton */}
      <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto py-12 px-4 md:px-8 lg:px-10">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-neutral-300 dark:bg-neutral-700 rounded-lg w-1/3" />
            <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-2/3" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="sticky top-0 z-50 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-4 md:px-10 py-4">
        <div className="max-w-7xl mx-auto animate-pulse flex items-center justify-between">
          <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-64" />
          <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-48" />
        </div>
      </div>

      {/* Timeline events skeleton */}
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-10">
        <div className="relative space-y-20">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-neutral-200 dark:bg-neutral-800" />

          {[...Array(3)].map((_, groupIndex) => (
            <div key={groupIndex} className="flex justify-start md:gap-10">
              {/* Date marker skeleton */}
              <div className="sticky top-40 flex items-center self-start max-w-xs lg:max-w-sm md:w-full">
                <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                </div>
                <div className="hidden md:block ml-12 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-48 animate-pulse" />
              </div>

              {/* Event cards skeleton */}
              <div className="relative pl-20 md:pl-4 w-full space-y-4">
                {[...Array(2)].map((_, eventIndex) => (
                  <div
                    key={eventIndex}
                    className="animate-pulse bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-24" />
                      <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-16" />
                    </div>
                    <div className="h-6 bg-neutral-300 dark:bg-neutral-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full mb-1" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-5/6" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

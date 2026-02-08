// ABOUTME: HTML5 video player with custom timestamp marker support on the seekbar.
// ABOUTME: Supports seek-to-timestamp and marker click navigation.

"use client";

import type { VideoMarker } from "./SourceViewerModal";

interface VideoViewerProps {
  /** Signed URL to the video file. */
  videoUrl: string;
  /** Timestamp in seconds to seek to when set. */
  initialTimestamp?: number;
  /** Timestamp markers to display on the seekbar. */
  markers?: VideoMarker[];
}

/** Placeholder -- full implementation in Task 2. */
export function VideoViewer({
  videoUrl,
  initialTimestamp,
  markers,
}: VideoViewerProps) {
  void videoUrl;
  void initialTimestamp;
  void markers;
  return (
    <div className="flex items-center justify-center h-full text-stone text-sm">
      Video viewer loading...
    </div>
  );
}

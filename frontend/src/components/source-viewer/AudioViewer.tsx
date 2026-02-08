// ABOUTME: Audio waveform player using wavesurfer.js with transcript card display.
// ABOUTME: Supports play/pause, seek-to-timestamp, and active transcript highlighting.

"use client";

import type { TranscriptEntry } from "./SourceViewerModal";

interface AudioViewerProps {
  /** Signed URL to the audio file. */
  audioUrl: string;
  /** Timestamp in seconds to seek to when set. */
  initialTimestamp?: number;
  /** Transcript entries with speaker and time data. */
  transcriptEntries?: TranscriptEntry[];
}

/** Placeholder -- full implementation in Task 2. */
export function AudioViewer({
  audioUrl,
  initialTimestamp,
  transcriptEntries,
}: AudioViewerProps) {
  void audioUrl;
  void initialTimestamp;
  void transcriptEntries;
  return (
    <div className="flex items-center justify-center h-full text-stone text-sm">
      Audio viewer loading...
    </div>
  );
}

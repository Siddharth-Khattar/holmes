// ABOUTME: Zoomable image viewer with pan/zoom controls and metadata display.
// ABOUTME: Uses CSS transforms for zoom and mouse drag for panning.

"use client";

interface ImageViewerProps {
  /** Signed URL to the image file. */
  imageUrl: string;
  /** Display file name. */
  fileName: string;
  /** Optional key-value metadata to display below the image. */
  metadata?: Record<string, string>;
}

/** Placeholder -- full implementation in Task 2. */
export function ImageViewer({
  imageUrl,
  fileName,
  metadata,
}: ImageViewerProps) {
  void imageUrl;
  void fileName;
  void metadata;
  return (
    <div className="flex items-center justify-center h-full text-stone text-sm">
      Image viewer loading...
    </div>
  );
}

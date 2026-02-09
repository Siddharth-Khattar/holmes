// ABOUTME: PDF rendering component using @react-pdf-viewer with page navigation
// ABOUTME: and text search/highlight plugins. Supports jump-to-page and keyword highlighting.

"use client";

import { useEffect, useRef } from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

// ---------------------------------------------------------------------------
// Worker URL for pdfjs-dist 3.11.174 (must match installed version)
// ---------------------------------------------------------------------------

const PDFJS_WORKER_URL =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// ---------------------------------------------------------------------------
// PdfViewer
// ---------------------------------------------------------------------------

interface PdfViewerProps {
  /** Signed URL or path to the PDF file. */
  fileUrl: string;
  /** Page to jump to on mount or when changed (1-indexed, human-friendly). */
  initialPage?: number;
  /** Keyword text to highlight across the PDF. */
  highlightKeyword?: string;
}

export function PdfViewer({
  fileUrl,
  initialPage,
  highlightKeyword,
}: PdfViewerProps) {
  // Plugin factories are called at the top level of the component body.
  // They internally register React hooks, so they MUST NOT be wrapped in
  // useState, useMemo, useEffect, or any other hook. The library manages
  // instance identity across renders internally.
  const pageNavInstance = pageNavigationPlugin();
  const searchInstance = searchPlugin();

  // Stable plugins array via ref to avoid recreating on every render
  const pluginsRef = useRef([pageNavInstance, searchInstance]);
  pluginsRef.current = [pageNavInstance, searchInstance];

  // Jump to page when initialPage changes (convert 1-indexed to 0-indexed)
  useEffect(() => {
    if (initialPage !== undefined && initialPage > 0) {
      // Small delay to ensure the viewer has rendered and plugin is installed
      const timer = setTimeout(() => {
        pageNavInstance.jumpToPage(initialPage - 1);
      }, 300);
      return () => clearTimeout(timer);
    }
    // pageNavInstance changes identity every render but jumpToPage is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPage]);

  // Highlight keyword when it changes
  useEffect(() => {
    if (highlightKeyword) {
      // Small delay to ensure the document is loaded
      const timer = setTimeout(() => {
        searchInstance.highlight({
          keyword: highlightKeyword,
          matchCase: false,
          wholeWords: false,
        });
      }, 500);
      return () => clearTimeout(timer);
    } else {
      searchInstance.clearHighlights();
    }
    // searchInstance changes identity every render but highlight/clear are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightKeyword]);

  return (
    <div className="h-full w-full pdf-viewer-container">
      <Worker workerUrl={PDFJS_WORKER_URL}>
        <Viewer
          fileUrl={fileUrl}
          plugins={pluginsRef.current}
          theme="dark"
          defaultScale={1}
          renderLoader={(percentages: number) => (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-sm text-stone mb-2">Loading PDF...</div>
                <div className="w-48 h-1.5 bg-charcoal/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-smoke/60 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(percentages)}%` }}
                  />
                </div>
                <div className="text-xs text-stone mt-1">
                  {Math.round(percentages)}%
                </div>
              </div>
            </div>
          )}
          renderError={(error) => (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <div className="text-sm text-red-400 mb-1">
                  Failed to load PDF
                </div>
                <div className="text-xs text-stone">
                  {error.message || "Unknown error occurred"}
                </div>
              </div>
            </div>
          )}
        />
      </Worker>
      {/* Override PDF viewer styles to match Holmes dark theme */}
      <style jsx global>{`
        .pdf-viewer-container .rpv-core__viewer {
          background-color: var(--color-jet, #111111);
        }
        .pdf-viewer-container .rpv-core__inner-page {
          background-color: transparent;
        }
        .pdf-viewer-container .rpv-core__page-layer {
          box-shadow: none;
        }
        .pdf-viewer-container .rpv-search__highlight {
          background-color: rgba(212, 168, 67, 0.35);
          border-radius: 2px;
        }
        .pdf-viewer-container .rpv-search__highlight--current {
          background-color: rgba(212, 168, 67, 0.6);
        }
      `}</style>
    </div>
  );
}

// ABOUTME: Custom ReactFlow edge that renders a compact file-count pill on the path.
// ABOUTME: Click to expand a vertical file-name list (max 5 visible, overflow indicator).

"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

// -----------------------------------------------------------------------
// Type contract: edges with type "fileRouting" carry this data shape
// -----------------------------------------------------------------------

interface FileRoutingEdgeData extends Record<string, unknown> {
  files: string[];
}

type FileRoutingEdgeType = Edge<FileRoutingEdgeData, "fileRouting">;

// -----------------------------------------------------------------------
// Style constants (module scope — avoids re-creation on render)
// -----------------------------------------------------------------------

const PILL_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1.4,
  color: "hsl(0 0% 75%)",
  background: "hsl(0 0% 12% / 0.9)",
  border: "1px solid hsl(0 0% 30% / 0.4)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  userSelect: "none",
};

const POPUP_STYLE: React.CSSProperties = {
  marginTop: 4,
  minWidth: 140,
  maxWidth: 220,
  padding: "6px 0",
  borderRadius: 6,
  fontSize: 10,
  lineHeight: 1.4,
  color: "hsl(0 0% 75%)",
  background: "hsl(0 0% 10% / 0.95)",
  border: "1px solid hsl(0 0% 30% / 0.4)",
  boxShadow: "0 4px 12px hsl(0 0% 0% / 0.4)",
};

const FILE_ITEM_STYLE: React.CSSProperties = {
  padding: "2px 10px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const OVERFLOW_STYLE: React.CSSProperties = {
  padding: "2px 10px",
  color: "hsl(0 0% 55%)",
  fontStyle: "italic",
};

const MAX_VISIBLE_FILES = 5;

// foreignObject dimensions: wide enough for content, tall enough for the
// expanded popup so mouse events are captured within bounds.
const FOREIGN_OBJECT_WIDTH = 240;
const FOREIGN_OBJECT_HEIGHT = 200;

// The pill sits at the top of the foreignObject; the popup renders below it.
// Vertical centering offset keeps the pill visually centered on the edge path.
const PILL_OFFSET_Y = 12;

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

function FileRoutingEdgeComponent({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  style,
  markerStart,
  markerEnd,
}: EdgeProps<FileRoutingEdgeType>) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const files = data?.files ?? [];
  const fileCount = files.length;

  const toggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />

      {fileCount > 0 && (
        <foreignObject
          x={labelX - FOREIGN_OBJECT_WIDTH / 2}
          y={labelY - PILL_OFFSET_Y}
          width={FOREIGN_OBJECT_WIDTH}
          height={FOREIGN_OBJECT_HEIGHT}
          style={{ overflow: "visible", pointerEvents: "none" }}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            ref={containerRef}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pointerEvents: "all",
            }}
          >
            {/* Compact pill — click to toggle */}
            <span
              style={PILL_STYLE}
              onClick={toggleExpanded}
              role="button"
              tabIndex={0}
            >
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </span>

            {/* Expanded file list */}
            {expanded && (
              <div style={POPUP_STYLE}>
                {files.slice(0, MAX_VISIBLE_FILES).map((file) => (
                  <div key={file} style={FILE_ITEM_STYLE}>
                    {file}
                  </div>
                ))}
                {fileCount > MAX_VISIBLE_FILES && (
                  <div style={OVERFLOW_STYLE}>
                    +{fileCount - MAX_VISIBLE_FILES} more
                  </div>
                )}
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const FileRoutingEdge = memo(FileRoutingEdgeComponent);

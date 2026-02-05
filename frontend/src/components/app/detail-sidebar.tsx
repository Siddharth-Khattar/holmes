// ABOUTME: App-wide resizable right detail sidebar with content registry.
// ABOUTME: Renders content based on discriminated union descriptors from context.

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useDetailSidebar,
  useDetailSidebarDispatch,
  useResizeHandle,
} from "@/hooks";
import { NodeDetailsSidebar } from "@/components/CommandCenter/NodeDetailsSidebar";
import type { SidebarContentDescriptor } from "@/types/detail-sidebar";
import { SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX } from "@/types/detail-sidebar";

// ---------------------------------------------------------------------------
// Content Registry
// ---------------------------------------------------------------------------

/**
 * Maps a content descriptor to its rendered component.
 * To add a content type: add a union member in detail-sidebar.ts and a case here.
 */
function renderContent(descriptor: SidebarContentDescriptor): React.ReactNode {
  switch (descriptor.type) {
    case "command-center-agent":
      return (
        <NodeDetailsSidebar
          agentType={descriptor.props.agentType}
          agentState={descriptor.props.agentState}
          allAgentStates={descriptor.props.allAgentStates}
          onClose={descriptor.props.onClose}
        />
      );
    case "knowledge-graph-evidence":
      // Placeholder: render when KG evidence viewer is built
      return (
        <div className="p-6 text-sm text-stone">
          Evidence detail view (ID: {descriptor.props.evidenceId})
        </div>
      );
  }
}

/**
 * Returns a CSS scope class for the sidebar container so that
 * scoped CSS variables (e.g. --cc-accent) resolve correctly.
 */
function getCssScope(descriptor: SidebarContentDescriptor): string | undefined {
  switch (descriptor.type) {
    case "command-center-agent":
      return "command-center-scope";
    case "knowledge-graph-evidence":
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// DetailSidebar Component
// ---------------------------------------------------------------------------

export function DetailSidebar() {
  const { content, isCollapsed, widthPercent } = useDetailSidebar();
  const { setCollapsed, toggleCollapsed, setWidthPercent } =
    useDetailSidebarDispatch();

  const { onPointerDown } = useResizeHandle({
    minPercent: SIDEBAR_WIDTH_MIN,
    maxPercent: SIDEBAR_WIDTH_MAX,
    onResize: setWidthPercent,
  });

  // Nothing to show
  if (!content) return null;

  // Collapsed: show floating reopen button
  if (isCollapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center
                   w-6 h-12 rounded-l-md transition-colors duration-150"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRight: "none",
          color: "var(--muted-foreground)",
        }}
        aria-label="Open detail sidebar"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }

  const cssScope = getCssScope(content);

  return (
    <aside
      className={`relative flex-none flex flex-col overflow-hidden${cssScope ? ` ${cssScope}` : ""}`}
      style={{
        width: `${widthPercent}%`,
        backgroundColor: "var(--card)",
        borderLeft: "1px solid var(--border)",
      }}
    >
      {/* Resize handle (left edge) */}
      <div
        onPointerDown={onPointerDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10
                   hover:bg-white/10 transition-colors duration-150"
        aria-label="Resize sidebar"
      />

      {/* Collapse button (top-right) */}
      <div className="flex-none flex items-center justify-end px-2 py-1.5">
        <button
          onClick={toggleCollapsed}
          className="p-1 rounded-md transition-colors duration-150"
          style={{
            color: "var(--muted-foreground)",
          }}
          aria-label="Collapse detail sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderContent(content)}
      </div>
    </aside>
  );
}

// ABOUTME: Gantt-style execution timeline showing agent processing overlap as horizontal bars.
// ABOUTME: Renders in the sidebar to visualize sequential and parallel agent execution timing.

"use client";

import { AGENT_CONFIGS, getAgentColors } from "@/lib/command-center-config";
import type { AgentType, AgentState } from "@/types/command-center";

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------
interface ExecutionTimelineProps {
  agentStates: Map<AgentType, AgentState>;
}

// -----------------------------------------------------------------------
// Timing data extracted from agent metadata
// -----------------------------------------------------------------------
interface AgentTimingEntry {
  agentType: AgentType;
  name: string;
  startMs: number;
  durationMs: number;
  tintColor: string;
}

/**
 * Format milliseconds into a human-readable duration string.
 * Under 1 second: "Xms", under 60 seconds: "X.Xs", above: "Xm Ys"
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// -----------------------------------------------------------------------
// ExecutionTimeline
// -----------------------------------------------------------------------
export function ExecutionTimeline({ agentStates }: ExecutionTimelineProps) {
  // Extract timing entries from agent states
  const entries: AgentTimingEntry[] = [];

  for (const [agentType, state] of agentStates) {
    const metadata = state.lastResult?.metadata;
    if (!metadata) continue;

    const startedAt = metadata.startedAt as string | undefined;
    const durationMs = metadata.durationMs as number | undefined;

    if (!startedAt || !durationMs || durationMs <= 0) continue;

    const startTime = new Date(startedAt).getTime();
    if (isNaN(startTime)) continue;

    const config = AGENT_CONFIGS[agentType];
    const { accent } = getAgentColors(agentType);

    entries.push({
      agentType,
      name: config?.name ?? agentType,
      startMs: startTime,
      durationMs,
      tintColor: `hsl(${accent})`,
    });
  }

  // Need at least 1 agent with timing data to render
  if (entries.length === 0) return null;

  // Compute timeline scale
  const earliestStart = Math.min(...entries.map((e) => e.startMs));
  const latestEnd = Math.max(...entries.map((e) => e.startMs + e.durationMs));
  const totalSpan = latestEnd - earliestStart;

  // Prevent division by zero for very fast executions
  const safeSpan = totalSpan > 0 ? totalSpan : 1;

  return (
    <div className="space-y-2">
      {/* Time axis labels */}
      <div className="flex justify-between text-[10px] text-stone/60 px-0.5">
        <span>0s</span>
        <span>{formatDuration(safeSpan / 2)}</span>
        <span>{formatDuration(safeSpan)}</span>
      </div>

      {/* Timeline bars */}
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const leftPercent =
            ((entry.startMs - earliestStart) / safeSpan) * 100;
          const widthPercent = (entry.durationMs / safeSpan) * 100;
          // Ensure minimum visible width for very short durations
          const displayWidth = Math.max(widthPercent, 2);

          return (
            <div key={entry.agentType} className="flex items-center gap-2">
              {/* Agent label */}
              <div className="w-20 shrink-0 text-right">
                <span className="text-[10px] text-stone truncate block">
                  {entry.name}
                </span>
              </div>

              {/* Bar container */}
              <div
                className="flex-1 h-5 rounded relative"
                style={{ background: "hsl(0 0% 12% / 0.5)" }}
              >
                <div
                  className="absolute top-0 h-full rounded flex items-center justify-end pr-1.5"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${displayWidth}%`,
                    background: entry.tintColor,
                    opacity: 0.7,
                    minWidth: 24,
                  }}
                >
                  <span className="text-[9px] text-white/90 font-medium whitespace-nowrap">
                    {formatDuration(entry.durationMs)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

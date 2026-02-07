// ABOUTME: Gantt-style execution timeline showing agent processing overlap as horizontal bars.
// ABOUTME: Renders in the sidebar to visualize sequential and parallel agent execution timing.

"use client";

import { AGENT_CONFIGS, getAgentColors } from "@/lib/command-center-config";
import { formatDuration } from "@/lib/formatting";
import type { AgentState } from "@/types/command-center";

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------
interface ExecutionTimelineProps {
  agentStates: Map<string, AgentState>;
}

// -----------------------------------------------------------------------
// Timing data extracted from agent metadata
// -----------------------------------------------------------------------
interface AgentTimingEntry {
  instanceId: string;
  name: string;
  startMs: number;
  durationMs: number;
  tintColor: string;
}

// -----------------------------------------------------------------------
// ExecutionTimeline
// -----------------------------------------------------------------------
export function ExecutionTimeline({ agentStates }: ExecutionTimelineProps) {
  // Extract timing entries from agent states
  const entries: AgentTimingEntry[] = [];

  for (const [instanceId, state] of agentStates) {
    const metadata = state.lastResult?.metadata;
    if (!metadata) continue;

    const startedAt = metadata.startedAt as string | undefined;
    const durationMs = metadata.durationMs as number | undefined;

    if (!startedAt || !durationMs || durationMs <= 0) continue;

    const startTime = new Date(startedAt).getTime();
    if (isNaN(startTime)) continue;

    const config = AGENT_CONFIGS[state.type];
    const { accent } = getAgentColors(state.type);

    entries.push({
      instanceId,
      name: config?.name ?? instanceId,
      startMs: startTime,
      durationMs,
      tintColor: `hsl(${accent})`,
    });
  }

  // Need at least 1 agent with timing data to render
  if (entries.length === 0) return null;

  // Sort by actual start time so bars appear in execution order (top = earliest)
  entries.sort((a, b) => a.startMs - b.startMs);

  // Compute timeline scale
  const earliestStart = Math.min(...entries.map((e) => e.startMs));
  const latestEnd = Math.max(...entries.map((e) => e.startMs + e.durationMs));
  const totalSpan = latestEnd - earliestStart;

  // Prevent division by zero for very fast executions
  const safeSpan = totalSpan > 0 ? totalSpan : 1;

  return (
    <div
      className="space-y-2"
      role="figure"
      aria-label={`Execution timeline showing ${entries.length} agents over ${formatDuration(safeSpan)}`}
    >
      {/* Time axis labels */}
      <div
        className="flex justify-between text-[10px] text-stone/60 px-0.5"
        aria-hidden="true"
      >
        <span>0s</span>
        <span>{formatDuration(safeSpan / 2)}</span>
        <span>{formatDuration(safeSpan)}</span>
      </div>

      {/* Timeline bars */}
      <div
        className="space-y-1.5"
        role="list"
        aria-label="Agent execution times"
      >
        {entries.map((entry) => {
          const leftPercent =
            ((entry.startMs - earliestStart) / safeSpan) * 100;
          const widthPercent = (entry.durationMs / safeSpan) * 100;
          // Ensure minimum visible width for very short durations,
          // and clamp so bar never overflows the container
          const displayWidth = Math.min(
            Math.max(widthPercent, 2),
            100 - leftPercent,
          );

          return (
            <div
              key={entry.instanceId}
              className="flex items-center gap-2"
              role="listitem"
              aria-label={`${entry.name}: ${formatDuration(entry.durationMs)}`}
            >
              {/* Agent label */}
              <div className="w-20 shrink-0 text-right">
                <span className="text-[10px] text-stone truncate block">
                  {entry.name}
                </span>
              </div>

              {/* Bar container */}
              <div
                className="flex-1 h-5 rounded relative overflow-hidden"
                style={{ background: "hsl(0 0% 12% / 0.5)" }}
                aria-hidden="true"
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

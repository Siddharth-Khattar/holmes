"use client";

import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { AGENT_CONFIGS } from "@/lib/command-center-config";
import type { AgentState } from "@/types/command-center";

interface AgentDetailsPanelProps {
  agentState?: AgentState;
  onClose: () => void;
}

export function AgentDetailsPanel({
  agentState,
  onClose,
}: AgentDetailsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["input", "tools", "output"]),
  );

  if (!agentState) return null;

  const config = AGENT_CONFIGS[agentState.type];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  return (
    <div className="h-full flex flex-col bg-charcoal border-l border-stone/15 overflow-hidden">
      {/* Header */}
      <div
        className="flex-none px-6 py-5 border-b border-stone/15"
        style={{
          background: `linear-gradient(135deg, ${config.color}15 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs font-medium text-stone uppercase tracking-wide">
                Agent Details
              </span>
            </div>
            <h3 className="text-lg font-semibold text-smoke">
              {config.name}
            </h3>
            <p className="text-xs text-stone mt-1">{config.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone/10 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-stone" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-jet/50 border border-stone/10">
            <div
              className={`w-2 h-2 rounded-full ${
                agentState.status === "processing"
                  ? "bg-blue-500 animate-pulse"
                  : agentState.status === "complete"
                    ? "bg-green-500"
                    : agentState.status === "error"
                      ? "bg-red-500"
                      : "bg-stone"
              }`}
            />
            <span className="text-xs text-smoke capitalize">
              {agentState.status}
            </span>
          </div>
          {config.model && (
            <div className="px-3 py-1.5 rounded-lg bg-jet/50 border border-stone/10">
              <span className="text-xs text-stone">{config.model}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Current Task */}
        {agentState.currentTask && (
          <div className="border-b border-stone/10">
            <div className="px-6 py-4 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                  Current Task
                </span>
              </div>
              <div className="text-sm text-smoke font-medium mb-1">
                {agentState.currentTask.fileName}
              </div>
              <div className="text-xs text-stone">
                Started: {agentState.currentTask.startedAt.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Input Context Section */}
        {agentState.lastResult && (
          <div className="border-b border-stone/10">
            <button
              onClick={() => toggleSection("input")}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone uppercase tracking-wide">
                  Input Context
                </span>
              </div>
              {isExpanded("input") ? (
                <ChevronUp className="w-4 h-4 text-stone" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone" />
              )}
            </button>
            {isExpanded("input") && (
              <div className="px-6 pb-4 space-y-3">
                <div>
                  <div className="text-xs text-stone mb-1">From Agent</div>
                  <div className="text-sm text-smoke">
                    {agentState.type === "triage"
                      ? "File Upload System"
                      : agentState.type === "orchestrator"
                        ? "Triage Agent"
                        : "Orchestrator"}
                  </div>
                </div>
                {agentState.lastResult.metadata && (
                  <div>
                    <div className="text-xs text-stone mb-2">Metadata</div>
                    <div className="p-3 rounded-lg bg-jet/50 border border-stone/10">
                      <pre className="text-xs text-stone font-mono overflow-x-auto">
                        {JSON.stringify(
                          agentState.lastResult.metadata,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tools Called Section */}
        {agentState.lastResult?.toolsCalled &&
          agentState.lastResult.toolsCalled.length > 0 && (
            <div className="border-b border-stone/10">
              <button
                onClick={() => toggleSection("tools")}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone uppercase tracking-wide">
                    Tools Called
                  </span>
                  <span className="text-xs text-stone/60">
                    ({agentState.lastResult.toolsCalled.length})
                  </span>
                </div>
                {isExpanded("tools") ? (
                  <ChevronUp className="w-4 h-4 text-stone" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone" />
                )}
              </button>
              {isExpanded("tools") && (
                <div className="px-6 pb-4">
                  <div className="space-y-2">
                    {agentState.lastResult.toolsCalled.map((tool, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-3 rounded-lg bg-jet/50 border border-stone/10"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-smoke font-mono">
                          {tool}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Output Findings Section */}
        {agentState.lastResult && (
          <div className="border-b border-stone/10">
            <button
              onClick={() => toggleSection("output")}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone uppercase tracking-wide">
                  Output Findings
                </span>
                <span className="text-xs text-stone/60">
                  ({agentState.lastResult.outputs.length} items)
                </span>
              </div>
              {isExpanded("output") ? (
                <ChevronUp className="w-4 h-4 text-stone" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone" />
              )}
            </button>
            {isExpanded("output") && (
              <div className="px-6 pb-4 space-y-3">
                {agentState.lastResult.outputs.map((output, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-jet/50 border border-stone/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-accent">
                        {output.type}
                      </span>
                      {output.confidence && (
                        <span className="text-xs text-stone">
                          {(output.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                    <pre className="text-xs text-smoke font-mono overflow-x-auto">
                      {JSON.stringify(output.data, null, 2)}
                    </pre>
                  </div>
                ))}

                {agentState.lastResult.routingDecisions &&
                  agentState.lastResult.routingDecisions.length > 0 && (
                    <div>
                      <div className="text-xs text-stone mb-2 mt-4">
                        Routing Decisions
                      </div>
                      <div className="space-y-2">
                        {agentState.lastResult.routingDecisions.map(
                          (decision, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-jet/50 border border-stone/10"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-smoke font-medium">
                                  → {decision.targetAgent}
                                </span>
                                <span className="text-xs text-accent">
                                  {(decision.domainScore * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="text-xs text-stone">
                                {decision.reason}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Processing History Section */}
        {agentState.processingHistory.length > 0 && (
          <div className="border-b border-stone/10">
            <button
              onClick={() => toggleSection("history")}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone uppercase tracking-wide">
                  Recent Processing
                </span>
                <span className="text-xs text-stone/60">
                  ({agentState.processingHistory.length})
                </span>
              </div>
              {isExpanded("history") ? (
                <ChevronUp className="w-4 h-4 text-stone" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone" />
              )}
            </button>
            {isExpanded("history") && (
              <div className="px-6 pb-4">
                <div className="space-y-2">
                  {agentState.processingHistory.map((task) => (
                    <div
                      key={task.taskId}
                      className="p-3 rounded-lg bg-jet/50 border border-stone/10"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-sm text-smoke flex-1">
                          {task.fileName}
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            task.status === "complete"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                      </div>
                      <div className="text-xs text-stone">
                        {task.completedAt?.toLocaleTimeString()}
                      </div>
                      {task.error && (
                        <div className="mt-2 text-xs text-red-400">
                          {task.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Idle State */}
        {!agentState.currentTask &&
          !agentState.lastResult &&
          agentState.processingHistory.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-stone/10 flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 rounded-full border-2 border-stone/30 border-t-stone animate-spin" />
              </div>
              <p className="text-sm text-stone">Waiting for tasks...</p>
            </div>
          )}
      </div>
    </div>
  );
}

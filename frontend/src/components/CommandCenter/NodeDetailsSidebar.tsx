// ABOUTME: Spring-animated right-sliding detail sidebar for Command Center nodes.
// ABOUTME: Shows agent-type-specific sections, thinking traces, and collapsible panels.

"use client";

import {
  AlertTriangle,
  Brain,
  FileText,
  Network,
  Wrench,
  Clock,
  Route,
  BarChart3,
  Users,
  Briefcase,
  Lightbulb,
} from "lucide-react";

import { AGENT_CONFIGS, getAgentColors } from "@/lib/command-center-config";
import { getEntityBadgeStyle } from "@/lib/knowledge-graph-config";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  formatDuration,
  formatModelName,
  formatNumber,
  formatTime,
} from "@/lib/formatting";
import { ExecutionTimeline } from "@/components/CommandCenter/ExecutionTimeline";
import { InstanceRoutingView } from "@/components/CommandCenter/InstanceRoutingView";
import { useAgentExecutionDetail } from "@/hooks/useAgentExecutionDetail";
import type {
  AgentType,
  AgentState,
  AgentOutput,
} from "@/types/command-center";

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------
interface NodeDetailsSidebarProps {
  agentType: AgentType | null;
  agentState: AgentState | null;
  allAgentStates?: Map<string, AgentState>;
}

// -----------------------------------------------------------------------
// Status helpers
// -----------------------------------------------------------------------
function statusDotClass(status: AgentState["status"]): string {
  switch (status) {
    case "idle":
      return "bg-gray-500";
    case "processing":
      return "bg-blue-500 animate-pulse";
    case "complete":
      return "bg-[hsl(180_60%_45%)]";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function statusLabel(status: AgentState["status"]): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "processing":
      return "Processing";
    case "complete":
      return "Complete";
    case "error":
      return "Error";
    default:
      return "Unknown";
  }
}

// -----------------------------------------------------------------------
// Agent-type-specific section components
// -----------------------------------------------------------------------

interface AgentSectionsProps {
  agentState: AgentState;
  outputData?: Record<string, unknown> | null;
  /** All agent instance states — only needed by OrchestratorSections for instance routing view. */
  allAgentStates?: Map<string, AgentState>;
}

/** Triage-specific sections: domain scores, entities, complexity */
function TriageSections({ agentState, outputData }: AgentSectionsProps) {
  const result = agentState.lastResult;
  if (!result) return null;

  // Prefer rich data from REST execution detail (outputData), fall back to SSE outputs
  const fileResult = getFirstFileResult(outputData);

  const domainScores =
    fileResult?.domainScores ??
    extractFromOutputs<Record<string, number>>(result.outputs, "domain_scores");
  const entities =
    fileResult?.entities ??
    extractFromOutputs<Array<{ name: string; type: string }>>(
      result.outputs,
      "entities",
    );
  const complexity =
    fileResult?.complexity ??
    extractFromOutputs<string>(result.outputs, "complexity");
  const summary =
    fileResult?.summary ??
    extractFromOutputs<string>(result.outputs, "summary");
  const detailedSummary =
    fileResult?.detailedSummary ??
    extractFromOutputs<string>(result.outputs, "detailed_summary");

  return (
    <>
      {/* Analysis Summary */}
      <CollapsibleSection
        title="Analysis Summary"
        color="hsl(37 90% 68%)"
        icon={<FileText className="w-3.5 h-3.5" />}
      >
        {summary && <MarkdownContent content={summary} />}
        {detailedSummary && (
          <div
            className="p-3 rounded-lg text-xs leading-relaxed"
            style={{
              background: "hsl(37 90% 68% / 0.05)",
              border: "1px solid hsl(37 90% 68% / 0.15)",
            }}
          >
            <MarkdownContent content={detailedSummary} />
          </div>
        )}
        {!summary && !detailedSummary && (
          <p className="text-xs text-stone/50 italic">No summary available</p>
        )}
      </CollapsibleSection>

      {/* Domain Scores */}
      {domainScores && Object.keys(domainScores).length > 0 && (
        <CollapsibleSection
          title="Domain Scores"
          color="hsl(37 90% 68%)"
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          badge={Object.keys(domainScores).length}
        >
          <div className="flex flex-wrap gap-2">
            {Object.entries(domainScores).map(([domain, score]) => (
              <DomainScorePill key={domain} domain={domain} score={score} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Extracted Entities */}
      {entities && entities.length > 0 && (
        <CollapsibleSection
          title="Extracted Entities"
          color="hsl(37 90% 68%)"
          icon={<Users className="w-3.5 h-3.5" />}
          badge={entities.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {entities.map((entity, idx) => (
              <EntityBadge
                key={`${entity.name}-${idx}`}
                name={entity.name}
                type={entity.type}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Complexity */}
      {complexity && (
        <CollapsibleSection
          title="Complexity"
          color="hsl(37 90% 68%)"
          icon={<Lightbulb className="w-3.5 h-3.5" />}
        >
          <ComplexityBadge tier={complexity} />
        </CollapsibleSection>
      )}
    </>
  );
}

/** Orchestrator-specific sections: routing summary, file routing table, warnings, file groups */
function OrchestratorSections({
  agentState,
  outputData,
  allAgentStates,
}: AgentSectionsProps) {
  const result = agentState.lastResult;
  if (!result) return null;

  // Try REST output_data first (routing_summary field), fall back to SSE outputs
  const rawRoutingSummary = outputData?.routing_summary;
  const routingReasoning =
    (typeof rawRoutingSummary === "string" ? rawRoutingSummary : undefined) ??
    extractFromOutputs<string>(result.outputs, "routing_reasoning");
  const warnings = (result.metadata?.warnings as string[] | undefined) ?? [];
  const fileGroups = extractFromOutputs<
    Array<{
      name: string;
      file_count: number;
      shared_context: string;
      target_agents: string[];
    }>
  >(result.outputs, "file_groups");

  return (
    <>
      {/* Routing Summary */}
      <CollapsibleSection
        title="Routing Summary"
        color="hsl(37 90% 68%)"
        icon={<Route className="w-3.5 h-3.5" />}
      >
        {routingReasoning ? (
          <MarkdownContent content={routingReasoning} />
        ) : (
          <p className="text-xs text-stone/50 italic">
            No routing reasoning available
          </p>
        )}
      </CollapsibleSection>

      {/* File Routing Table */}
      {result.routingDecisions && result.routingDecisions.length > 0 && (
        <CollapsibleSection
          title="File Routing Table"
          color="hsl(220 50% 35%)"
          icon={<Network className="w-3.5 h-3.5" />}
          badge={result.routingDecisions.length}
        >
          <InstanceRoutingView
            decisions={result.routingDecisions}
            agentStates={allAgentStates ?? new Map()}
          />
        </CollapsibleSection>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <CollapsibleSection
          title="Warnings"
          color="hsl(45 100% 50%)"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          badge={warnings.length}
        >
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                style={{
                  background: "hsl(45 100% 50% / 0.05)",
                  border: "1px solid hsl(45 100% 50% / 0.15)",
                }}
              >
                <AlertTriangle
                  className="w-3.5 h-3.5 shrink-0 mt-0.5"
                  style={{ color: "hsl(45 100% 60%)" }}
                />
                <span className="text-smoke">{warning}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* File Groups */}
      {fileGroups && fileGroups.length > 0 && (
        <CollapsibleSection
          title="File Groups"
          color="hsl(260 30% 45%)"
          icon={<Briefcase className="w-3.5 h-3.5" />}
          badge={fileGroups.length}
        >
          <div className="space-y-3">
            {fileGroups.map((group, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg"
                style={{
                  background: "hsl(260 30% 45% / 0.05)",
                  border: "1px solid hsl(260 30% 45% / 0.15)",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-smoke font-medium">
                    {group.name}
                  </span>
                  <span className="text-xs text-stone">
                    {group.file_count} files
                  </span>
                </div>
                {group.shared_context && (
                  <p className="text-xs text-stone mb-2 leading-relaxed">
                    {group.shared_context}
                  </p>
                )}
                {group.target_agents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.target_agents.map((agent) => (
                      <span
                        key={agent}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: "hsl(var(--cc-accent) / 0.1)",
                          color: "hsl(var(--cc-accent))",
                        }}
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}

/** Domain agent-specific sections (financial, legal, evidence) */
function DomainAgentSections({ agentState, outputData }: AgentSectionsProps) {
  const result = agentState.lastResult;
  if (!result) return null;

  // Try REST output_data first, fall back to SSE outputs
  const rawFindingsSummary = outputData?.findings_summary;
  const findingsSummary =
    (typeof rawFindingsSummary === "string" ? rawFindingsSummary : undefined) ??
    extractFromOutputs<string>(result.outputs, "findings_summary");

  const rawFilesProcessed = outputData?.files_processed;
  const filesProcessed =
    (Array.isArray(rawFilesProcessed)
      ? (rawFilesProcessed as string[])
      : undefined) ??
    extractFromOutputs<string[]>(result.outputs, "files_processed");

  const rawKeyExtractions = outputData?.key_extractions;
  const keyExtractions =
    (Array.isArray(rawKeyExtractions)
      ? (rawKeyExtractions as Array<{ label: string; value: string }>)
      : undefined) ??
    extractFromOutputs<Array<{ label: string; value: string }>>(
      result.outputs,
      "key_extractions",
    );

  return (
    <>
      {/* Findings Summary */}
      <CollapsibleSection
        title="Findings Summary"
        color="hsl(37 90% 68%)"
        icon={<FileText className="w-3.5 h-3.5" />}
      >
        {findingsSummary ? (
          <MarkdownContent content={findingsSummary} />
        ) : (
          <p className="text-xs text-stone/50 italic">
            No findings summary available
          </p>
        )}
      </CollapsibleSection>

      {/* Files Processed */}
      {filesProcessed && filesProcessed.length > 0 && (
        <CollapsibleSection
          title="Files Processed"
          color="hsl(220 50% 35%)"
          icon={<FileText className="w-3.5 h-3.5" />}
          badge={filesProcessed.length}
        >
          <div className="space-y-1.5">
            {filesProcessed.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-smoke"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--cc-accent))] shrink-0" />
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Key Extractions */}
      {keyExtractions && keyExtractions.length > 0 && (
        <CollapsibleSection
          title="Key Extractions"
          color="hsl(var(--cc-accent))"
          icon={<Lightbulb className="w-3.5 h-3.5" />}
          badge={keyExtractions.length}
        >
          <div className="space-y-2">
            {keyExtractions.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                <span className="text-xs text-stone font-medium">
                  {item.label}
                </span>
                <span className="text-sm text-smoke">{item.value}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}

/** Knowledge graph agent-specific sections */
function KnowledgeGraphSections({ agentState }: AgentSectionsProps) {
  const result = agentState.lastResult;
  if (!result) return null;

  const graphSummary = extractFromOutputs<string>(
    result.outputs,
    "graph_summary",
  );
  const entitiesCreated = extractFromOutputs<number>(
    result.outputs,
    "entities_created",
  );
  const relationshipsCreated = extractFromOutputs<number>(
    result.outputs,
    "relationships_created",
  );
  const sampleRelationships = extractFromOutputs<
    Array<{ source: string; target: string; type: string }>
  >(result.outputs, "sample_relationships");

  return (
    <>
      {/* Graph Summary */}
      <CollapsibleSection
        title="Graph Summary"
        color="hsl(37 90% 68%)"
        icon={<Network className="w-3.5 h-3.5" />}
      >
        {graphSummary ? (
          <MarkdownContent content={graphSummary} />
        ) : (
          <p className="text-xs text-stone/50 italic">
            No graph summary available
          </p>
        )}
      </CollapsibleSection>

      {/* Entities Created */}
      {entitiesCreated !== undefined && (
        <CollapsibleSection
          title="Entities Created"
          color="hsl(var(--cc-accent))"
          icon={<Users className="w-3.5 h-3.5" />}
          badge={entitiesCreated}
        >
          <div className="text-2xl font-bold text-[hsl(var(--cc-accent))]">
            {entitiesCreated}
          </div>
          <p className="text-xs text-stone mt-1">
            entities added to the knowledge graph
          </p>
        </CollapsibleSection>
      )}

      {/* Relationships Created */}
      {relationshipsCreated !== undefined && (
        <CollapsibleSection
          title="Relationships Created"
          color="hsl(270 30% 45%)"
          icon={<Network className="w-3.5 h-3.5" />}
          badge={relationshipsCreated}
        >
          <div className="text-2xl font-bold text-[hsl(270_30%_55%)]">
            {relationshipsCreated}
          </div>
          {sampleRelationships && sampleRelationships.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-stone font-medium">Sample:</p>
              {sampleRelationships.slice(0, 5).map((rel, idx) => (
                <div
                  key={idx}
                  className="text-xs text-smoke flex items-center gap-1.5"
                >
                  <span className="truncate max-w-20">{rel.source}</span>
                  <span className="text-stone">--</span>
                  <span className="text-[hsl(var(--cc-accent))]">
                    {rel.type}
                  </span>
                  <span className="text-stone">--&gt;</span>
                  <span className="truncate max-w-20">{rel.target}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}
    </>
  );
}

// -----------------------------------------------------------------------
// Shared small components
// -----------------------------------------------------------------------

/** Color-coded pill for domain scores */
function DomainScorePill({ domain, score }: { domain: string; score: number }) {
  // Intensity: higher score = more saturated/brighter
  const hue = domainHue(domain);
  const lightness = 30 + (score / 100) * 25;
  const saturation = 30 + (score / 100) * 40;
  const bgColor = `hsl(${hue} ${saturation}% ${lightness}% / 0.25)`;
  const textColor = `hsl(${hue} ${saturation + 10}% ${lightness + 25}%)`;
  const borderColor = `hsl(${hue} ${saturation}% ${lightness}% / 0.4)`;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{
        background: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <span>{domain}</span>
      <span className="opacity-75">{score}</span>
    </span>
  );
}

function domainHue(domain: string): number {
  const hues: Record<string, number> = {
    financial: 140,
    legal: 220,
    evidence: 50,
    "knowledge-graph": 270,
  };
  return hues[domain] ?? 180;
}

/** Badge for entity type — uses shared color source from knowledge-graph-config. */
function EntityBadge({ name, type }: { name: string; type: string }) {
  const colors = getEntityBadgeStyle(type);

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span className="font-medium">{name}</span>
      <span className="opacity-60 text-[10px]">{type}</span>
    </span>
  );
}

/** Complexity tier badge */
function ComplexityBadge({ tier }: { tier: string }) {
  const tierColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    low: {
      bg: "hsl(140 40% 25% / 0.15)",
      text: "hsl(140 50% 60%)",
      border: "hsl(140 40% 40% / 0.3)",
    },
    medium: {
      bg: "hsl(45 60% 30% / 0.15)",
      text: "hsl(45 70% 60%)",
      border: "hsl(45 60% 40% / 0.3)",
    },
    high: {
      bg: "hsl(0 50% 30% / 0.15)",
      text: "hsl(0 60% 60%)",
      border: "hsl(0 50% 40% / 0.3)",
    },
  };
  const normalized = tier.toLowerCase();
  const colors = tierColors[normalized] ?? tierColors.medium;

  return (
    <span
      className="inline-flex items-center text-sm px-3 py-1.5 rounded-lg font-medium"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {tier}
    </span>
  );
}

// -----------------------------------------------------------------------
// Helper to extract typed data from AgentOutput[]
// -----------------------------------------------------------------------
function extractFromOutputs<T>(
  outputs: AgentOutput[],
  type: string,
): T | undefined {
  const found = outputs.find((o) => o.type === type);
  return found?.data as T | undefined;
}

// -----------------------------------------------------------------------
// Helper to extract triage file result from REST output_data
// -----------------------------------------------------------------------
interface TriageFileResultData {
  domainScores: Record<string, number> | undefined;
  entities: Array<{ name: string; type: string }> | undefined;
  complexity: string | undefined;
  summary: string | undefined;
  detailedSummary: string | undefined;
}

/**
 * Extract the first triage file result from REST execution output_data.
 * The triage agent stores results under `file_results[0]` with nested structures.
 * Returns undefined if output_data doesn't contain triage data.
 */
function getFirstFileResult(
  outputData: Record<string, unknown> | null | undefined,
): TriageFileResultData | undefined {
  if (!outputData) return undefined;
  const fileResults = outputData.file_results;
  if (!Array.isArray(fileResults) || fileResults.length === 0) return undefined;

  const fr = fileResults[0] as Record<string, unknown>;
  if (!fr || typeof fr !== "object") return undefined;

  // Map domain_scores array [{domain, score}] to Record<string, number>
  let domainScores: Record<string, number> | undefined;
  const rawScores = fr.domain_scores;
  if (Array.isArray(rawScores)) {
    domainScores = {};
    for (const item of rawScores) {
      if (
        item &&
        typeof item === "object" &&
        "domain" in item &&
        "score" in item
      ) {
        const entry = item as { domain: string; score: number };
        domainScores[entry.domain] = entry.score;
      }
    }
  }

  // Map entities array [{type, value}] to [{name, type}]
  let entities: Array<{ name: string; type: string }> | undefined;
  const rawEntities = fr.entities;
  if (Array.isArray(rawEntities)) {
    entities = rawEntities
      .filter(
        (e): e is { type: string; value: string } =>
          e != null &&
          typeof e === "object" &&
          "type" in e &&
          "value" in e &&
          typeof (e as Record<string, unknown>).type === "string" &&
          typeof (e as Record<string, unknown>).value === "string",
      )
      .map((e) => ({ name: e.value, type: e.type }));
  }

  // Complexity tier
  let complexity: string | undefined;
  const rawComplexity = fr.complexity;
  if (rawComplexity && typeof rawComplexity === "object") {
    complexity = (rawComplexity as { tier?: string }).tier;
  }

  // Summaries
  let summary: string | undefined;
  let detailedSummary: string | undefined;
  const rawSummary = fr.summary;
  if (rawSummary && typeof rawSummary === "object") {
    const summaryObj = rawSummary as { short?: string; detailed?: string };
    summary = summaryObj.short;
    detailedSummary = summaryObj.detailed;
  }

  return { domainScores, entities, complexity, summary, detailedSummary };
}

// -----------------------------------------------------------------------
// Source label for the input context section
// -----------------------------------------------------------------------
function getSourceLabel(agentType: AgentType): string {
  switch (agentType) {
    case "triage":
      return "File Upload System";
    case "orchestrator":
      return "Triage Agent";
    default:
      return "Orchestrator";
  }
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------
export function NodeDetailsSidebar({
  agentType,
  agentState,
  allAgentStates,
}: NodeDetailsSidebarProps) {
  // Hook must be called unconditionally (Rules of Hooks)
  const executionId = agentState?.lastResult?.metadata?.executionId as
    | string
    | undefined;
  const { data: executionDetail, isLoading: isDetailLoading } =
    useAgentExecutionDetail(executionId);

  if (!agentType || !agentState) return null;

  const config = AGENT_CONFIGS[agentType];
  const { tint } = getAgentColors(agentType);
  const result = agentState.lastResult;
  const isActiveState =
    agentState.status === "processing" || agentState.status === "complete";
  const thinkingTraces = result?.metadata?.thinkingTraces as string | undefined;

  const isDomainAgent =
    agentType === "financial" ||
    agentType === "legal" ||
    agentType === "evidence";

  const outputData = executionDetail?.output_data ?? null;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ---- Header ---- */}
      <div
        className="flex-none px-5 py-5 border-b border-stone/15"
        style={{
          background: `linear-gradient(135deg, hsl(${tint} / 0.15) 0%, transparent 100%)`,
        }}
      >
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-smoke truncate">
            {config.name}
          </h3>
          {result?.fileNames && result.fileNames.length > 0 && (
            <p
              className="text-xs text-[hsl(var(--cc-accent))] mt-0.5 truncate"
              title={result.fileNames.join(", ")}
            >
              {result.fileNames.join(", ")}
            </p>
          )}
          <p className="text-xs text-stone mt-0.5 leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* Status + Model badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone/8">
            <div
              className={`w-1.5 h-1.5 rounded-full ${statusDotClass(agentState.status)}`}
            />
            <span className="text-[11px] text-smoke">
              {statusLabel(agentState.status)}
            </span>
          </div>
          {(() => {
            const modelId = result?.metadata?.model;
            if (typeof modelId !== "string") return null;
            return (
              <span className="text-[11px] text-stone/70" title={modelId}>
                {formatModelName(modelId)}
              </span>
            );
          })()}
          {isActiveState && (
            <div
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: "hsl(var(--cc-accent) / 0.15)",
                color: "hsl(var(--cc-accent))",
                border: "1px solid hsl(var(--cc-accent) / 0.3)",
              }}
            >
              Selected Path
            </div>
          )}
        </div>
      </div>

      {/* ---- Scrollable content ---- */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {/* Current Task (always visible at top when processing) */}
        {agentState.currentTask && (
          <div className="border-b border-stone/10">
            <div className="px-5 py-4 bg-blue-500/5">
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

        {/* Thinking Traces (always shown if data exists) */}
        <CollapsibleSection
          title="Thinking Traces"
          color="hsl(var(--cc-accent))"
          icon={<Brain className="w-3.5 h-3.5" />}
        >
          {thinkingTraces ? (
            <div
              className="p-3 rounded-lg text-sm leading-relaxed wrap-break-word"
              style={{
                background: "hsl(var(--cc-accent) / 0.05)",
                borderLeft: "3px solid hsl(var(--cc-accent) / 0.3)",
              }}
            >
              <MarkdownContent content={thinkingTraces} />
            </div>
          ) : (
            <p className="text-xs text-stone/50 italic">
              No thinking traces available
            </p>
          )}
        </CollapsibleSection>

        {/* Token Usage */}
        {(() => {
          const inputTokens = result?.metadata?.inputTokens as
            | number
            | undefined;
          const outputTokens = result?.metadata?.outputTokens as
            | number
            | undefined;
          const model = result?.metadata?.model as string | undefined;
          if (inputTokens === undefined && outputTokens === undefined)
            return null;
          return (
            <CollapsibleSection
              title="Token Usage"
              color="hsl(var(--cc-accent))"
              icon={<BarChart3 className="w-3.5 h-3.5" />}
            >
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                {inputTokens !== undefined && (
                  <>
                    <span className="text-stone text-xs">Input Tokens</span>
                    <span className="text-smoke text-xs font-medium text-right">
                      {formatNumber(inputTokens)}
                    </span>
                  </>
                )}
                {outputTokens !== undefined && (
                  <>
                    <span className="text-stone text-xs">Output Tokens</span>
                    <span className="text-smoke text-xs font-medium text-right">
                      {formatNumber(outputTokens)}
                    </span>
                  </>
                )}
                {model && (
                  <>
                    <span className="text-stone text-xs">Model</span>
                    <span
                      className="text-smoke text-xs font-medium text-right truncate"
                      title={model}
                    >
                      {formatModelName(model)}
                    </span>
                  </>
                )}
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* Timing */}
        {(() => {
          const durationMs = result?.metadata?.durationMs as number | undefined;
          const startedAt = result?.metadata?.startedAt as string | undefined;
          const completedAt = result?.metadata?.completedAt as
            | string
            | undefined;
          if (!durationMs && !startedAt) return null;
          return (
            <CollapsibleSection
              title="Timing"
              color="hsl(var(--cc-accent))"
              icon={<Clock className="w-3.5 h-3.5" />}
            >
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                {durationMs !== undefined && durationMs > 0 && (
                  <>
                    <span className="text-stone text-xs">Duration</span>
                    <span className="text-smoke text-xs font-medium text-right">
                      {formatDuration(durationMs)}
                    </span>
                  </>
                )}
                {startedAt && (
                  <>
                    <span className="text-stone text-xs">Started</span>
                    <span className="text-smoke text-xs font-medium text-right">
                      {formatTime(startedAt)}
                    </span>
                  </>
                )}
                {completedAt && (
                  <>
                    <span className="text-stone text-xs">Completed</span>
                    <span className="text-smoke text-xs font-medium text-right">
                      {formatTime(completedAt)}
                    </span>
                  </>
                )}
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* Loading indicator for execution detail fetch */}
        {isDetailLoading && executionId && (
          <div className="px-5 py-2">
            <div className="h-1 w-full rounded-full bg-stone/10 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-[hsl(var(--cc-accent))] animate-pulse" />
            </div>
          </div>
        )}

        {/* Agent-type-specific sections */}
        {agentType === "triage" && (
          <TriageSections agentState={agentState} outputData={outputData} />
        )}
        {agentType === "orchestrator" && (
          <OrchestratorSections
            agentState={agentState}
            outputData={outputData}
            allAgentStates={allAgentStates}
          />
        )}
        {isDomainAgent && (
          <DomainAgentSections
            agentState={agentState}
            outputData={outputData}
          />
        )}
        {agentType === "knowledge-graph" && (
          <KnowledgeGraphSections agentState={agentState} />
        )}

        {/* Input Context (shared, from AgentDetailsPanel pattern) */}
        {result && (
          <CollapsibleSection
            title="Input Context"
            color="hsl(220 50% 35%)"
            icon={<FileText className="w-3.5 h-3.5" />}
          >
            <div>
              <div className="text-xs text-stone mb-1">From Agent</div>
              <div className="text-sm text-smoke">
                {getSourceLabel(agentType)}
              </div>
            </div>
            {result.metadata && (
              <div>
                <div className="text-xs text-stone mb-2">Metadata</div>
                <div className="p-3 rounded-lg bg-jet/50 border border-stone/10">
                  <pre className="text-xs text-stone font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(result.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Output Findings (shared, from AgentDetailsPanel pattern) */}
        {result && result.outputs.length > 0 && (
          <CollapsibleSection
            title="Output Findings"
            color="hsl(var(--cc-accent))"
            icon={<FileText className="w-3.5 h-3.5" />}
            badge={`${result.outputs.length} items`}
          >
            {result.outputs.map((output: AgentOutput, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-jet/50 border border-stone/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[hsl(var(--cc-accent))]">
                    {output.type}
                  </span>
                  {output.confidence !== undefined && (
                    <span className="text-xs text-stone">
                      {(output.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
                <pre className="text-xs text-smoke font-mono overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(output.data, null, 2)}
                </pre>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Tools Called (shared) */}
        {result?.toolsCalled && result.toolsCalled.length > 0 && (
          <CollapsibleSection
            title="Tools Called"
            color="hsl(0 0% 50%)"
            icon={<Wrench className="w-3.5 h-3.5" />}
            badge={result.toolsCalled.length}
          >
            <div className="space-y-1.5">
              {result.toolsCalled.map((tool, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-jet/50 border border-stone/10"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--cc-accent))] shrink-0" />
                  <span className="text-sm text-smoke font-mono">{tool}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Processing History (shared) */}
        {agentState.processingHistory.length > 0 && (
          <CollapsibleSection
            title="Processing History"
            color="hsl(0 0% 40%)"
            icon={<Clock className="w-3.5 h-3.5" />}
            badge={agentState.processingHistory.length}
          >
            <div className="space-y-2">
              {agentState.processingHistory.map((task) => (
                <div
                  key={task.taskId}
                  className="p-3 rounded-lg bg-jet/50 border border-stone/10"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-sm text-smoke flex-1 truncate">
                      {task.fileName}
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        task.status === "complete"
                          ? "bg-[hsl(180_60%_45%)]"
                          : "bg-red-500"
                      }`}
                    />
                  </div>
                  <div className="text-xs text-stone">
                    {task.completedAt?.toLocaleTimeString()}
                  </div>
                  {task.error && (
                    <div className="mt-1.5 text-xs text-red-400">
                      {task.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Execution Timeline (requires multiple agents with timing data) */}
        {allAgentStates &&
          (() => {
            let agentsWithTiming = 0;
            for (const [, s] of allAgentStates) {
              if (s.lastResult?.metadata?.durationMs) agentsWithTiming++;
            }
            if (agentsWithTiming < 2) return null;
            return (
              <CollapsibleSection
                title="Execution Timeline"
                color="hsl(var(--cc-accent))"
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                badge={`${agentsWithTiming} agents`}
              >
                <ExecutionTimeline agentStates={allAgentStates} />
              </CollapsibleSection>
            );
          })()}

        {/* Idle/empty state */}
        {!agentState.currentTask &&
          !result &&
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

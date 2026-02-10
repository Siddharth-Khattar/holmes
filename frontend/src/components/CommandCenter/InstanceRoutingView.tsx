// ABOUTME: Instance-centric routing view for the orchestrator sidebar.
// ABOUTME: Shows collapsible agent sections → instance groups → file chips,
// ABOUTME: correlating routing decisions with live agent instance states.

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  Layers,
  File,
} from "lucide-react";

import { AGENT_CONFIGS, getAgentColors } from "@/lib/command-center-config";
import { formatInstanceLabel, isGroupInstance } from "@/lib/formatting";
import { Tooltip } from "@/components/ui/tooltip";
import type {
  AgentType,
  AgentState,
  RoutingDecision,
} from "@/types/command-center";

// -----------------------------------------------------------------------
// Public types & props
// -----------------------------------------------------------------------

export type PriorityLevel = "high" | "medium" | "low";

export interface InstanceRoutingViewProps {
  /** Routing decisions from the orchestrator (base agent types only). */
  decisions: RoutingDecision[];
  /** All agent instance states — keyed by compound instance ID. */
  agentStates: Map<string, AgentState>;
}

// -----------------------------------------------------------------------
// Priority config — shared visual identity for priority levels
// -----------------------------------------------------------------------

const PRIORITY_CONFIG: Record<PriorityLevel, { color: string; label: string }> =
  {
    high: { color: "hsl(0 60% 55%)", label: "High priority" },
    medium: { color: "hsl(45 80% 55%)", label: "Medium priority" },
    low: { color: "hsl(140 50% 50%)", label: "Low priority" },
  };

// -----------------------------------------------------------------------
// PriorityIndicator — reusable colored dot with sr-only label
// -----------------------------------------------------------------------

interface PriorityIndicatorProps {
  priority: PriorityLevel;
  /** Render size variant. */
  size?: "sm" | "md";
}

export function PriorityIndicator({
  priority,
  size = "sm",
}: PriorityIndicatorProps) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className="inline-flex items-center" aria-label={config.label}>
      <span
        className={`${dotSize} rounded-full shrink-0`}
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      <span className="sr-only">{config.label}</span>
    </span>
  );
}

// -----------------------------------------------------------------------
// Data model — correlate routing decisions with agent instance states
// -----------------------------------------------------------------------

/** A file within an instance group, enriched with its routing decision. */
interface InstanceFile {
  fileName: string;
  /** The routing decision for this file→agent pairing (if found). */
  routingDecision: RoutingDecision | null;
}

/** A single agent instance (e.g. financial_grp_0) with its assigned files. */
interface InstanceData {
  instanceId: string;
  baseType: AgentType;
  /** Human label: "Group 1", "File 3", or null for singletons */
  label: string | null;
  /** Whether this is a grouped instance (grp_N) vs ungrouped */
  isGroup: boolean;
  /** Files assigned to this instance, with their routing decisions */
  files: InstanceFile[];
  /** Live status from AgentState */
  status: string;
}

/** Top-level agent section aggregating all instances of one base agent type. */
interface AgentSectionData {
  baseType: AgentType;
  agentName: string;
  instances: InstanceData[];
  /** Total files across all instances */
  totalFiles: number;
}

/**
 * Build the instance-centric data model by correlating routing decisions
 * (which only have base agent types) with agent instance states (which have
 * compound IDs and fileNames).
 *
 * Strategy:
 * 1. Collect all domain-agent instances from agentStates (those with compound IDs
 *    or base types matching routing decision target agents).
 * 2. For each instance, read its `lastResult.fileNames` (authoritative file list).
 * 3. For each file in an instance, find the matching routing decision by fileId/fileName
 *    and targetAgent === baseType.
 * 4. Group instances by base agent type into collapsible sections.
 */
function buildAgentSections(
  decisions: RoutingDecision[],
  agentStates: Map<string, AgentState>,
): AgentSectionData[] {
  // Index routing decisions by (targetAgent, fileName) for O(1) lookup
  const decisionIndex = new Map<string, RoutingDecision>();
  for (const d of decisions) {
    // Use fileName (case-insensitive) as primary key, fall back to fileId
    const fileKey = (d.fileName ?? d.fileId).toLowerCase();
    decisionIndex.set(`${d.targetAgent}::${fileKey}`, d);
  }

  // Collect domain agent instances from agentStates
  // Domain agents: financial, legal, evidence (not triage, orchestrator, knowledge-graph)
  const domainTypes = new Set<AgentType>(["financial", "legal", "evidence"]);

  // Also include any base types referenced by routing decisions
  for (const d of decisions) {
    domainTypes.add(d.targetAgent);
  }

  // Group instances by base agent type
  const instancesByAgent = new Map<AgentType, InstanceData[]>();

  for (const [instanceId, state] of agentStates) {
    if (!domainTypes.has(state.type)) continue;

    // Get files from the instance's result
    const instanceFileNames = state.lastResult?.fileNames ?? [];

    // Build InstanceFile entries by correlating with routing decisions
    const files: InstanceFile[] = instanceFileNames.map((fileName) => {
      const fileKey = fileName.toLowerCase();
      const decision = decisionIndex.get(`${state.type}::${fileKey}`) ?? null;
      return { fileName, routingDecision: decision };
    });

    // If instance has no files yet (still processing), create a placeholder
    // by finding routing decisions that target this base type
    if (files.length === 0) {
      // Gather decisions for this base type that aren't claimed by other instances
      for (const d of decisions) {
        if (d.targetAgent === state.type) {
          const fileName = d.fileName ?? d.fileId;
          // Avoid duplicating files we've already seen in other instances
          if (
            !files.some(
              (f) => f.fileName.toLowerCase() === fileName.toLowerCase(),
            )
          ) {
            files.push({ fileName, routingDecision: d });
          }
        }
      }
    }

    const instance: InstanceData = {
      instanceId,
      baseType: state.type,
      label: formatInstanceLabel(instanceId, state.type),
      isGroup: isGroupInstance(instanceId, state.type),
      files,
      status: state.status,
    };

    const existing = instancesByAgent.get(state.type);
    if (existing) {
      existing.push(instance);
    } else {
      instancesByAgent.set(state.type, [instance]);
    }
  }

  // If there are routing decisions for agents that have no instances yet,
  // create synthetic sections from routing decisions alone
  for (const d of decisions) {
    if (!instancesByAgent.has(d.targetAgent)) {
      const fileName = d.fileName ?? d.fileId;
      const syntheticInstance: InstanceData = {
        instanceId: d.targetAgent,
        baseType: d.targetAgent,
        label: null,
        isGroup: false,
        files: [{ fileName, routingDecision: d }],
        status: "idle",
      };

      // Check if we already have a synthetic entry for this agent
      const existing = instancesByAgent.get(d.targetAgent);
      if (existing) {
        // Merge file into existing synthetic instance (the singleton one)
        const singleton = existing.find((i) => i.instanceId === d.targetAgent);
        if (singleton) {
          if (
            !singleton.files.some(
              (f) => f.fileName.toLowerCase() === fileName.toLowerCase(),
            )
          ) {
            singleton.files.push({ fileName, routingDecision: d });
          }
        } else {
          existing.push(syntheticInstance);
        }
      } else {
        instancesByAgent.set(d.targetAgent, [syntheticInstance]);
      }
    }
  }

  // Build sorted AgentSectionData array
  const sections: AgentSectionData[] = [];
  for (const [baseType, instances] of instancesByAgent) {
    const config = AGENT_CONFIGS[baseType];
    const totalFiles = instances.reduce(
      (sum, inst) => sum + inst.files.length,
      0,
    );

    sections.push({
      baseType,
      agentName: config?.name ?? baseType,
      instances,
      totalFiles,
    });
  }

  // Sort by total files descending (busiest agents first)
  sections.sort((a, b) => b.totalFiles - a.totalFiles);

  return sections;
}

// -----------------------------------------------------------------------
// StatusBadge — tiny colored indicator for instance processing status
// -----------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    idle: { color: "hsl(0 0% 40%)", label: "Idle" },
    processing: { color: "hsl(45 80% 55%)", label: "Processing" },
    complete: { color: "hsl(140 50% 50%)", label: "Complete" },
    error: { color: "hsl(0 60% 55%)", label: "Error" },
  };

  const config = statusConfig[status] ?? statusConfig.idle;

  return (
    <Tooltip content={config.label} position="top" delay={100}>
      <span className="inline-flex items-center">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: config.color }}
          aria-label={config.label}
        />
      </span>
    </Tooltip>
  );
}

// -----------------------------------------------------------------------
// FileChip — individual file with tooltip showing routing reasoning
// -----------------------------------------------------------------------

interface FileChipProps {
  file: InstanceFile;
  accent: string;
}

function FileChip({ file, accent }: FileChipProps) {
  const { fileName, routingDecision: rd } = file;
  const priority = rd?.priority ?? "medium";
  const isLowConfidence =
    rd?.routingConfidence != null && rd.routingConfidence < 70;

  // Truncate long file names for display
  const displayName =
    fileName.length > 32 ? fileName.substring(0, 29) + "..." : fileName;

  const tooltipContent = rd ? (
    <div className="space-y-1.5 max-w-64">
      <div className="font-medium text-xs" style={{ color: `hsl(${accent})` }}>
        {fileName}
      </div>
      <p className="text-xs leading-relaxed opacity-90">{rd.reason}</p>
      <div className="flex items-center gap-3 pt-0.5">
        <span className="text-[10px] opacity-70">
          Score: {Math.round(rd.domainScore)}%
        </span>
        <span className="text-[10px] opacity-70">
          Priority: <span className="capitalize">{priority}</span>
        </span>
        {rd.routingConfidence != null && (
          <span className="text-[10px] opacity-70">
            Confidence: {Math.round(rd.routingConfidence)}%
          </span>
        )}
      </div>
    </div>
  ) : (
    <span className="text-xs">{fileName}</span>
  );

  return (
    <Tooltip content={tooltipContent} position="top" delay={100}>
      <span
        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md cursor-help transition-colors hover:brightness-125"
        style={{
          background: "hsl(0 0% 100% / 0.04)",
          color: "var(--smoke)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
        }}
      >
        <FileText className="w-3 h-3 shrink-0 opacity-50" aria-hidden="true" />
        <PriorityIndicator priority={priority} size="sm" />
        <span className="truncate" title={fileName}>
          {displayName}
        </span>
        {rd && (
          <span className="opacity-40 text-[10px]">
            {Math.round(rd.domainScore)}%
          </span>
        )}
        {isLowConfidence && (
          <AlertTriangle
            className="w-3 h-3 shrink-0"
            style={{ color: "hsl(45 80% 55%)" }}
            aria-label="Low routing confidence"
          />
        )}
      </span>
    </Tooltip>
  );
}

// -----------------------------------------------------------------------
// InstanceGroup — one instance's file assignment card
// -----------------------------------------------------------------------

interface InstanceGroupProps {
  instance: InstanceData;
  accent: string;
}

function InstanceGroup({ instance, accent }: InstanceGroupProps) {
  const { label, isGroup, files, status } = instance;
  const icon = isGroup ? (
    <Layers className="w-3 h-3 shrink-0 opacity-50" aria-hidden="true" />
  ) : (
    <File className="w-3 h-3 shrink-0 opacity-50" aria-hidden="true" />
  );

  return (
    <div
      className="p-2.5 rounded-md"
      style={{
        background: "hsl(0 0% 100% / 0.02)",
        border: "1px solid hsl(0 0% 100% / 0.06)",
      }}
      role="group"
      aria-label={label ? `Instance: ${label}` : "Singleton instance"}
    >
      {/* Instance header (only show for multi-instance agents) */}
      {label && (
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-[11px] font-medium text-smoke/80">{label}</span>
          <StatusBadge status={status} />
          <span className="text-[10px] text-stone/40 ml-auto shrink-0">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
        </div>
      )}

      {/* File chips */}
      <div className="flex flex-wrap gap-1.5">
        {files.map((file, idx) => (
          <FileChip
            key={`${file.fileName}-${idx}`}
            file={file}
            accent={accent}
          />
        ))}
      </div>

      {files.length === 0 && (
        <p className="text-[10px] text-stone/40 italic">
          No files assigned yet
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// AgentSection — collapsible section per base agent type
// -----------------------------------------------------------------------

interface AgentSectionProps {
  section: AgentSectionData;
  /** Whether to start expanded. */
  defaultOpen?: boolean;
}

function AgentSection({ section, defaultOpen = false }: AgentSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { accent } = getAgentColors(section.baseType);
  const instanceCount = section.instances.length;
  const hasMultipleInstances = instanceCount > 1;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const ChevronIcon = isOpen ? ChevronDown : ChevronRight;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: `hsl(${accent} / 0.04)`,
        border: `1px solid hsl(${accent} / 0.15)`,
      }}
    >
      {/* Collapsible header */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors"
        style={{
          borderBottom: isOpen ? `1px solid hsl(${accent} / 0.1)` : "none",
        }}
        aria-expanded={isOpen}
        aria-controls={`agent-section-${section.baseType}`}
      >
        <ChevronIcon
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: `hsl(${accent})` }}
          aria-hidden="true"
        />
        <span
          className="text-xs font-semibold"
          style={{ color: `hsl(${accent})` }}
        >
          {section.agentName}
        </span>

        {/* Summary pills */}
        <span className="text-[10px] text-stone/50 ml-auto shrink-0">
          {hasMultipleInstances && (
            <span>
              {instanceCount} {instanceCount === 1 ? "instance" : "instances"}{" "}
              ·{" "}
            </span>
          )}
          {section.totalFiles} {section.totalFiles === 1 ? "file" : "files"}
        </span>
      </button>

      {/* Instance groups */}
      {isOpen && (
        <div
          id={`agent-section-${section.baseType}`}
          className="p-2.5 space-y-2"
          role="list"
          aria-label={`${section.agentName} instances`}
        >
          {section.instances.map((instance) => (
            <InstanceGroup
              key={instance.instanceId}
              instance={instance}
              accent={accent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// InstanceRoutingView — main exported component
// -----------------------------------------------------------------------

/**
 * Instance-centric routing view showing how the orchestrator distributed
 * files across agent instances.
 *
 * Architecture:
 * - Collapsible sections per base agent type (e.g. "Financial Agent")
 * - Inside each section: one card per instance (e.g. "Group 1", "File 3")
 * - Inside each card: file chips with tooltip reasoning from routing decisions
 *
 * Data correlation:
 * - Routing decisions (from orchestrator) have base agent types + file info
 * - Agent states (from SSE) have compound instance IDs + fileNames
 * - This component correlates the two to show which files went to which instance
 */
export function InstanceRoutingView({
  decisions,
  agentStates,
}: InstanceRoutingViewProps) {
  const sections = useMemo(
    () => buildAgentSections(decisions, agentStates),
    [decisions, agentStates],
  );

  if (sections.length === 0) return null;

  return (
    <div
      className="space-y-2"
      role="list"
      aria-label="Agent instance routing assignments"
    >
      {sections.map((section, idx) => (
        <AgentSection
          key={section.baseType}
          section={section}
          // First section starts expanded for immediate visibility
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}

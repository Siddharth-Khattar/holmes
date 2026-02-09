// ABOUTME: Modal for viewing timeline event details including description, date, and source documents.
// ABOUTME: Displays resolved findings as source links (file-backed) or excerpt text (non-file findings).

"use client";

import {
  X,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  ExternalLink,
  Quote,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { TimelineEvent } from "@/types/timeline.types";
import { LAYER_CONFIG } from "@/constants/timeline.constants";
import { cn } from "@/lib/utils";
import {
  useFindingResolver,
  type ResolvedFinding,
} from "@/hooks/useFindingResolver";

interface EventDetailModalProps {
  caseId: string;
  event: TimelineEvent;
  onClose: () => void;
  /** Called when the user clicks a source document entry (sourceId = finding ID). */
  onViewSource?: (sourceId: string) => void;
}

/**
 * Renders a source entry that is backed by an actual file (has fileId).
 * Shows filename + finding title with a "View source" action.
 */
function FileSourceEntry({
  sourceId,
  resolved,
  onViewSource,
}: {
  sourceId: string;
  resolved: ResolvedFinding;
  onViewSource?: (sourceId: string) => void;
}) {
  return (
    <button
      key={sourceId}
      type="button"
      onClick={() => onViewSource?.(sourceId)}
      disabled={!onViewSource}
      className={cn(
        "flex items-start gap-3 p-3 w-full text-left rounded-lg transition-colors",
        "bg-(--muted)",
        onViewSource
          ? "hover:bg-(--muted)/80 cursor-pointer group"
          : "opacity-60 cursor-default",
      )}
    >
      <FileText className="w-4 h-4 text-(--muted-foreground) shrink-0 mt-0.5" />
      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
        <span className="text-sm text-(--foreground) font-medium break-words">
          {resolved.fileName}
        </span>
        {resolved.title !== resolved.id.slice(0, 8) && (
          <span className="text-xs text-(--muted-foreground) leading-relaxed break-words">
            {resolved.title}
          </span>
        )}
      </div>
      {onViewSource && (
        <ExternalLink className="w-3.5 h-3.5 text-(--muted-foreground) opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      )}
    </button>
  );
}

/**
 * Renders a source entry that has no file backing (excerpt-only finding).
 * Shows the finding title/excerpt as plain readable text.
 */
function ExcerptSourceEntry({ resolved }: { resolved: ResolvedFinding }) {
  const displayText =
    resolved.excerpt ??
    (resolved.title !== resolved.id.slice(0, 8) ? resolved.title : null);

  if (!displayText) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-(--muted)/50">
      <Quote className="w-3.5 h-3.5 text-(--muted-foreground) shrink-0 mt-0.5" />
      <p className="text-xs text-(--muted-foreground) leading-relaxed break-words">
        {displayText}
      </p>
    </div>
  );
}

export function EventDetailModal({
  caseId,
  event,
  onClose,
  onViewSource,
}: EventDetailModalProps) {
  const layerConfig = LAYER_CONFIG[event.layer];
  const { getFinding } = useFindingResolver(caseId);

  // Partition source IDs into file-backed (can open source viewer) and excerpt-only
  const { fileSources, excerptSources } = partitionSources(
    event.sourceIds ?? [],
    getFinding,
  );
  const totalSources = fileSources.length + excerptSources.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-(--card) rounded-xl shadow-2xl border border-(--border)"
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-start justify-between p-6 border-b-2",
              layerConfig.borderColor,
              layerConfig.bgColor,
              "bg-opacity-20 dark:bg-opacity-10",
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "px-2 py-1 text-xs font-medium uppercase tracking-wide rounded",
                    layerConfig.bgColor,
                    layerConfig.color,
                  )}
                >
                  {layerConfig.label}
                </span>

                {event.isUserCorrected && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded">
                    <Check className="w-3 h-3" />
                    Verified
                  </span>
                )}

                {!event.isUserCorrected && event.confidence < 0.7 && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded">
                    <AlertCircle className="w-3 h-3" />
                    {Math.round(event.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-(--foreground)">
                {event.title}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-(--muted) rounded-lg transition-colors text-(--foreground)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Date and time */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-(--muted-foreground)">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {format(new Date(event.date), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-(--muted-foreground)">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  {format(new Date(event.date), "h:mm a")}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-(--foreground) mb-2">
                Description
              </h3>
              <p className="text-(--muted-foreground) leading-relaxed">
                {event.description || "No description provided"}
              </p>
            </div>

            {/* Source documents — only show file-backed sources as clickable */}
            {fileSources.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-(--foreground) mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Source Documents ({fileSources.length})
                </h3>
                <div className="space-y-2">
                  {fileSources.map(({ sourceId, resolved }) => (
                    <FileSourceEntry
                      key={sourceId}
                      sourceId={sourceId}
                      resolved={resolved}
                      onViewSource={onViewSource}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Excerpt-only citations — shown as readable text, not clickable */}
            {excerptSources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-(--foreground) mb-2 flex items-center gap-2">
                  <Quote className="w-4 h-4" />
                  Related Excerpts ({excerptSources.length})
                </h3>
                <div className="space-y-2">
                  {excerptSources.map(({ sourceId, resolved }) => (
                    <ExcerptSourceEntry key={sourceId} resolved={resolved} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when no sources at all */}
            {totalSources === 0 &&
              event.sourceIds &&
              event.sourceIds.length > 0 && (
                <div className="text-xs text-(--muted-foreground) italic">
                  Source references are still loading...
                </div>
              )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Partitioning helpers
// ---------------------------------------------------------------------------

interface PartitionedSource {
  sourceId: string;
  resolved: ResolvedFinding;
}

/**
 * Partitions an array of source IDs into file-backed (openable in source viewer)
 * and excerpt-only (display as text). A source is considered file-backed only if
 * both fileId AND fileName are resolved — meaning the file actually exists in the
 * case files list and can be opened in the source viewer.
 */
function partitionSources(
  sourceIds: string[],
  getFinding: (id: string) => ResolvedFinding,
): { fileSources: PartitionedSource[]; excerptSources: PartitionedSource[] } {
  const fileSources: PartitionedSource[] = [];
  const excerptSources: PartitionedSource[] = [];

  for (const sourceId of sourceIds) {
    const resolved = getFinding(sourceId);
    if (resolved.fileId && resolved.fileName) {
      fileSources.push({ sourceId, resolved });
    } else {
      excerptSources.push({ sourceId, resolved });
    }
  }

  return { fileSources, excerptSources };
}

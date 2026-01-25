// ABOUTME: Case card component for displaying case in grid or list view
// ABOUTME: Shows case name, status badge, file count, and last updated

"use client";

import { useRouter } from "next/navigation";
import { Trash2, FileText, Clock } from "lucide-react";
import { clsx } from "clsx";
import type { Case, CaseStatus } from "@/types/case";

interface CaseCardProps {
  caseData: Case;
  viewMode: "grid" | "list";
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-stone/20 text-stone",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-amber-500/20 text-amber-400",
  },
  READY: {
    label: "Ready",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  ERROR: {
    label: "Error",
    className: "bg-red-500/20 text-red-400",
  },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CaseCard({
  caseData,
  viewMode,
  onDelete,
  isDeleting,
}: CaseCardProps) {
  const router = useRouter();
  const status = statusConfig[caseData.status];

  const handleClick = () => {
    router.push(`/cases/${caseData.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${caseData.name}"?`)) {
      onDelete(caseData.id);
    }
  };

  if (viewMode === "list") {
    return (
      <div
        onClick={handleClick}
        className={clsx(
          "flex items-center gap-4 p-4",
          "bg-jet border border-smoke/10 rounded-xl",
          "cursor-pointer transition-all duration-200",
          "hover:shadow-lg hover:shadow-black/20 hover:border-smoke/20",
          isDeleting && "opacity-50 pointer-events-none",
        )}
      >
        {/* Name */}
        <div className="flex-1 min-w-0">
          <h3 className="text-smoke font-medium truncate">{caseData.name}</h3>
          {caseData.description && (
            <p className="text-stone text-sm truncate mt-0.5">
              {caseData.description}
            </p>
          )}
        </div>

        {/* Status */}
        <span
          className={clsx(
            "px-2.5 py-1 rounded-full text-xs font-medium",
            status.className,
          )}
        >
          {status.label}
        </span>

        {/* File count */}
        <div className="flex items-center gap-1.5 text-stone text-sm w-20">
          <FileText className="w-4 h-4" />
          <span>{caseData.file_count} files</span>
        </div>

        {/* Last updated */}
        <div className="flex items-center gap-1.5 text-stone text-sm w-24">
          <Clock className="w-4 h-4" />
          <span>{formatRelativeTime(caseData.updated_at)}</span>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={clsx(
            "p-2 rounded-lg transition-colors",
            "text-stone hover:text-red-400 hover:bg-red-500/10",
            "focus:outline-none focus:ring-2 focus:ring-red-500/50",
          )}
          title="Delete case"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Grid mode
  return (
    <div
      onClick={handleClick}
      className={clsx(
        "flex flex-col p-4",
        "bg-jet border border-smoke/10 rounded-xl",
        "cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/20 hover:border-smoke/20",
        isDeleting && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header with status and delete */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={clsx(
            "px-2.5 py-1 rounded-full text-xs font-medium",
            status.className,
          )}
        >
          {status.label}
        </span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={clsx(
            "p-1.5 rounded-lg transition-colors",
            "text-stone hover:text-red-400 hover:bg-red-500/10",
            "focus:outline-none focus:ring-2 focus:ring-red-500/50",
          )}
          title="Delete case"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Name and description */}
      <h3 className="text-smoke font-medium mb-1 line-clamp-1">
        {caseData.name}
      </h3>
      {caseData.description && (
        <p className="text-stone text-sm line-clamp-2 mb-4">
          {caseData.description}
        </p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer with metadata */}
      <div className="flex items-center justify-between text-stone text-sm pt-3 border-t border-smoke/5">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>{caseData.file_count} files</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{formatRelativeTime(caseData.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}

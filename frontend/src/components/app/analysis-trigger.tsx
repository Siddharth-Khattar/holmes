// ABOUTME: Button component to start or rerun case analysis.
// ABOUTME: Shows contextual states (run/analyzing/split-dropdown) based on case status.

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, ChevronDown, RefreshCw, FilePlus2 } from "lucide-react";
import { toast } from "sonner";

import { startAnalysis, ApiError, type AnalysisMode } from "@/lib/api/analysis";
import type { CaseStatus } from "@/types/case";

type TriggerState = "idle" | "submitting" | "navigating";

interface AnalysisTriggerProps {
  caseId: string;
  caseStatus: CaseStatus;
  fileCount: number;
  onAnalysisStarted: () => void;
}

export function AnalysisTrigger({
  caseId,
  caseStatus,
  fileCount,
  onAnalysisStarted,
}: AnalysisTriggerProps) {
  const router = useRouter();
  const [triggerState, setTriggerState] = useState<TriggerState>("idle");
  const [showDropdown, setShowDropdown] = useState(false);

  const handleStart = useCallback(
    async (mode: AnalysisMode) => {
      if (triggerState !== "idle") return;

      setTriggerState("submitting");
      setShowDropdown(false);

      try {
        await startAnalysis(caseId, mode);
        setTriggerState("navigating");
        onAnalysisStarted();
        router.push(`/cases/${caseId}/command-center`);
      } catch (error) {
        setTriggerState("idle");
        if (error instanceof ApiError) {
          if (error.status === 409) {
            toast.error("Analysis already in progress");
          } else if (error.status === 400) {
            const detail =
              error.data &&
              typeof error.data === "object" &&
              "detail" in error.data
                ? String((error.data as Record<string, unknown>).detail)
                : "No files to analyze";
            toast.error(detail);
          } else {
            toast.error("Failed to start analysis");
          }
        } else {
          toast.error("Failed to start analysis");
        }
      }
    },
    [caseId, triggerState, onAnalysisStarted, router],
  );

  const isDisabled =
    triggerState !== "idle" || caseStatus === "PROCESSING" || fileCount === 0;
  const isProcessing =
    caseStatus === "PROCESSING" || triggerState === "submitting";

  // PROCESSING state: show spinner
  if (isProcessing) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: "var(--muted)",
          color: "var(--muted-foreground)",
          cursor: "not-allowed",
          opacity: 0.7,
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing...</span>
      </button>
    );
  }

  // DRAFT state: simple "Run Analysis" button
  if (caseStatus === "DRAFT") {
    return (
      <button
        onClick={() => handleStart("uploaded_only")}
        disabled={isDisabled}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: isDisabled ? "var(--muted)" : "var(--primary)",
          color: isDisabled
            ? "var(--muted-foreground)"
            : "var(--primary-foreground)",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.7 : 1,
        }}
      >
        <Play className="w-4 h-4" />
        <span>Run Analysis</span>
      </button>
    );
  }

  // READY or ERROR state: split button with dropdown
  return (
    <div className="relative">
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{
          border: "1px solid var(--border)",
        }}
      >
        {/* Primary action: Analyze New Files */}
        <button
          onClick={() => handleStart("uploaded_only")}
          disabled={isDisabled}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--card)",
            color: isDisabled ? "var(--muted-foreground)" : "var(--foreground)",
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.7 : 1,
          }}
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Analyze New Files</span>
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={triggerState !== "idle"}
          className="flex items-center px-2 py-2 transition-colors"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--muted-foreground)",
            borderLeft: "1px solid var(--border)",
            cursor: triggerState !== "idle" ? "not-allowed" : "pointer",
          }}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          {/* Menu */}
          <div
            className="absolute right-0 mt-2 w-48 z-20 rounded-lg shadow-lg py-1"
            style={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => handleStart("uploaded_only")}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
              style={{ color: "var(--foreground)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--muted)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Analyze New Files</span>
            </button>
            <button
              onClick={() => handleStart("rerun_all")}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
              style={{ color: "var(--foreground)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--muted)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <RefreshCw className="w-4 h-4" />
              <span>Rerun All Files</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ABOUTME: Button component to start or rerun case analysis.
// ABOUTME: Shows contextual states (run/confirm-refresh/analyzing) based on case status.

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { startAnalysis, ApiError, type AnalysisMode } from "@/lib/api/analysis";
import { emitAnalysisReset } from "@/lib/case-events";
import type { CaseStatus } from "@/types/case";

type TriggerState = "idle" | "submitting" | "navigating";

interface AnalysisTriggerProps {
  caseId: string;
  caseStatus: CaseStatus;
  fileCount: number;
  hasAnalysis: boolean;
  onAnalysisStarted: () => void;
}

export function AnalysisTrigger({
  caseId,
  caseStatus,
  fileCount,
  hasAnalysis,
  onAnalysisStarted,
}: AnalysisTriggerProps) {
  const router = useRouter();
  const [triggerState, setTriggerState] = useState<TriggerState>("idle");
  const [showConfirmRefresh, setShowConfirmRefresh] = useState(false);

  // Reset triggerState when caseStatus changes. After the user triggers
  // analysis, triggerState transitions: idle → submitting → navigating.
  // Once the layout poll picks up the new caseStatus (PROCESSING → READY/ERROR),
  // reset to idle so the button becomes interactive again.
  useEffect(() => {
    if (triggerState !== "idle") {
      setTriggerState("idle");
    }
    // Only reset when caseStatus changes — triggerState is intentionally
    // omitted from the dependency array to avoid resetting during the
    // idle → submitting → navigating flow within a single status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseStatus]);

  const handleStart = useCallback(
    async (mode: AnalysisMode) => {
      if (triggerState !== "idle") return;

      setTriggerState("submitting");

      try {
        await startAnalysis(caseId, mode);
        setTriggerState("navigating");
        emitAnalysisReset();
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

  const handleClick = useCallback(() => {
    const hasPriorAnalysis =
      hasAnalysis || caseStatus === "READY" || caseStatus === "ERROR";

    if (!hasPriorAnalysis) {
      handleStart("rerun_all");
      return;
    }

    // Confirm-refresh pattern: first click shows confirmation, second click triggers
    if (showConfirmRefresh) {
      handleStart("rerun_all");
      setShowConfirmRefresh(false);
    } else {
      setShowConfirmRefresh(true);
    }
  }, [hasAnalysis, caseStatus, showConfirmRefresh, handleStart]);

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

  const hasPriorAnalysis =
    hasAnalysis || caseStatus === "READY" || caseStatus === "ERROR";

  // Determine button label and icon based on analysis state
  const Icon = hasPriorAnalysis ? RefreshCw : Play;
  const label = hasPriorAnalysis
    ? showConfirmRefresh
      ? "Confirm Refresh?"
      : "Refresh"
    : "Run Analysis";

  return (
    <button
      onClick={handleClick}
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
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

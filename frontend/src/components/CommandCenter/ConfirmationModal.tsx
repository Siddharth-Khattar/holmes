// ABOUTME: HITL confirmation modal for sensitive agent actions in the Command Center.
// ABOUTME: Displays action context, affected items, and approve/reject controls with motion animation.

"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { ShieldAlert, Check, X, Loader2 } from "lucide-react";

import { AGENT_CONFIGS } from "@/lib/command-center-config";
import { respondToConfirmation } from "@/lib/api/confirmations";
import type { ConfirmationRequiredEvent } from "@/types/command-center";

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------
interface ConfirmationModalProps {
  confirmation: ConfirmationRequiredEvent;
  caseId: string;
  onResolved: (requestId: string) => void;
}

// -----------------------------------------------------------------------
// ConfirmationModal
// -----------------------------------------------------------------------
export function ConfirmationModal({
  confirmation,
  caseId,
  onResolved,
}: ConfirmationModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const agentConfig = AGENT_CONFIGS[confirmation.agentType];

  const handleResponse = useCallback(
    async (approved: boolean) => {
      setIsSubmitting(true);
      try {
        await respondToConfirmation(
          caseId,
          confirmation.requestId,
          approved,
          reason.trim() || undefined,
        );
        onResolved(confirmation.requestId);
      } catch (err) {
        // Allow retry on failure
        console.error("Confirmation response failed:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [caseId, confirmation.requestId, reason, onResolved],
  );

  // Extract context entries for display
  const contextEntries = Object.entries(confirmation.context).filter(
    ([, value]) => value !== null && value !== undefined,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - no click-to-dismiss for important agent decisions */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{
          background: "hsl(0 0% 10% / 0.95)",
          border: "1px solid hsl(0 0% 20% / 0.5)",
          boxShadow:
            "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px hsl(var(--cc-accent) / 0.1)",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b"
          style={{
            borderColor: "hsl(0 0% 20% / 0.4)",
            background:
              "linear-gradient(135deg, hsl(var(--cc-accent) / 0.08) 0%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "hsl(var(--cc-accent) / 0.15)",
                border: "1px solid hsl(var(--cc-accent) / 0.25)",
              }}
            >
              <ShieldAlert
                className="w-5 h-5"
                style={{ color: "hsl(var(--cc-accent))" }}
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-smoke">
                Confirmation Required
              </h3>
              <p className="text-xs text-stone mt-0.5">
                {agentConfig.name} is requesting approval
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Action description */}
          <div>
            <label className="text-xs font-medium text-stone uppercase tracking-wide">
              Action Requested
            </label>
            <p className="mt-1.5 text-sm text-smoke leading-relaxed">
              {confirmation.actionDescription}
            </p>
          </div>

          {/* Affected items */}
          {confirmation.affectedItems.length > 0 && (
            <div>
              <label className="text-xs font-medium text-stone uppercase tracking-wide">
                Affected Items
              </label>
              <div className="mt-1.5 space-y-1">
                {confirmation.affectedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-smoke"
                    style={{
                      background: "hsl(0 0% 15% / 0.5)",
                      border: "1px solid hsl(0 0% 20% / 0.3)",
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--cc-accent))] shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional context */}
          {contextEntries.length > 0 && (
            <div>
              <label className="text-xs font-medium text-stone uppercase tracking-wide">
                Context
              </label>
              <div
                className="mt-1.5 rounded-lg p-3"
                style={{
                  background: "hsl(0 0% 12% / 0.6)",
                  border: "1px solid hsl(0 0% 18% / 0.4)",
                }}
              >
                <div className="space-y-1.5">
                  {contextEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-stone font-medium">{key}</span>
                      <span className="text-smoke">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reason textarea */}
          <div>
            <label
              htmlFor="confirmation-reason"
              className="text-xs font-medium text-stone uppercase tracking-wide"
            >
              Reason (optional)
            </label>
            <textarea
              id="confirmation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context for your decision..."
              rows={2}
              className="mt-1.5 w-full rounded-lg px-3 py-2 text-sm text-smoke placeholder:text-stone/40 resize-none focus:outline-none focus:ring-1"
              style={{
                background: "hsl(0 0% 12% / 0.6)",
                border: "1px solid hsl(0 0% 20% / 0.4)",
              }}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3 border-t"
          style={{ borderColor: "hsl(0 0% 20% / 0.4)" }}
        >
          {/* Reject */}
          <button
            onClick={() => handleResponse(false)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "hsl(0 0% 15% / 0.5)",
              border: "1px solid hsl(0 0% 25% / 0.5)",
              color: "hsl(0 0% 70%)",
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Reject
          </button>

          {/* Approve */}
          <button
            onClick={() => handleResponse(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "hsl(var(--cc-accent) / 0.2)",
              border: "1px solid hsl(var(--cc-accent) / 0.4)",
              color: "hsl(var(--cc-accent))",
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve
          </button>
        </div>
      </motion.div>
    </div>
  );
}

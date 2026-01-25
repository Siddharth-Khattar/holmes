// ABOUTME: Modal dialog for creating a new investigation case
// ABOUTME: Uses react-hook-form with Zod validation for form handling

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api-client";
import {
  caseCreateSchema,
  type CaseCreateFormData,
} from "@/lib/validations/case";
import type { Case } from "@/types/case";

interface CreateCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newCase: Case) => void;
}

export function CreateCaseModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCaseModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CaseCreateFormData>({
    resolver: zodResolver(caseCreateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: CaseCreateFormData) => {
    try {
      setIsSubmitting(true);
      const newCase = await api.post<Case>("/api/cases", {
        name: data.name,
        description: data.description || null,
      });

      toast.success("Case created successfully");
      reset();
      onOpenChange(false);
      onSuccess?.(newCase);

      // Navigate to the new case
      router.push(`/cases/${newCase.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const errorData = error.data as { detail?: string } | null;
        toast.error(
          errorData?.detail || `Failed to create case: ${error.statusText}`,
        );
      } else {
        toast.error("Failed to create case");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={clsx(
            "relative w-full max-w-lg",
            "bg-jet border border-smoke/10 rounded-2xl",
            "shadow-2xl shadow-black/50",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-smoke/10">
            <h2 className="text-lg font-medium text-smoke">Create New Case</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                "text-stone hover:text-smoke hover:bg-smoke/10",
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {/* Name field */}
            <div>
              <label
                htmlFor="case-name"
                className="block text-sm font-medium text-smoke mb-2"
              >
                Case Name <span className="text-red-400">*</span>
              </label>
              <input
                id="case-name"
                type="text"
                autoFocus
                placeholder="e.g., Acme Corp Investigation"
                {...register("name")}
                className={clsx(
                  "w-full px-4 py-3 rounded-lg",
                  "bg-charcoal border",
                  "text-smoke placeholder:text-stone",
                  "focus:outline-none focus:ring-2 focus:ring-smoke/30",
                  "transition-colors",
                  errors.name
                    ? "border-red-500/50"
                    : "border-smoke/10 focus:border-smoke/20",
                )}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description field */}
            <div>
              <label
                htmlFor="case-description"
                className="block text-sm font-medium text-smoke mb-2"
              >
                Description
                <span className="text-stone font-normal ml-1">(optional)</span>
              </label>
              <textarea
                id="case-description"
                rows={4}
                placeholder="Describe the case context..."
                {...register("description")}
                className={clsx(
                  "w-full px-4 py-3 rounded-lg resize-none",
                  "bg-charcoal border",
                  "text-smoke placeholder:text-stone",
                  "focus:outline-none focus:ring-2 focus:ring-smoke/30",
                  "transition-colors",
                  errors.description
                    ? "border-red-500/50"
                    : "border-smoke/10 focus:border-smoke/20",
                )}
              />
              <p className="mt-2 text-xs text-stone">
                This context helps the AI understand your case better.
              </p>
              {errors.description && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className={clsx(
                  "px-4 py-2 rounded-lg",
                  "text-sm font-medium text-stone",
                  "hover:text-smoke hover:bg-smoke/5",
                  "transition-colors",
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "text-sm font-medium",
                  "bg-smoke text-charcoal",
                  "hover:bg-accent transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? "Creating..." : "Create Case"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ABOUTME: Individual case page shell
// ABOUTME: Will show case library and analysis in future phases

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

import { api, ApiError } from "@/lib/api-client";
import type { Case, CaseStatus } from "@/types/case";

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

export default function CasePage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCase() {
      try {
        const data = await api.get<Case>(`/api/cases/${params.id}`);
        setCaseData(data);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          router.push("/cases");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchCase();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        {/* Back link skeleton */}
        <div className="h-5 w-24 bg-jet/50 rounded animate-pulse mb-6" />
        {/* Header skeleton */}
        <div className="h-8 w-64 bg-jet/50 rounded animate-pulse mb-2" />
        <div className="h-5 w-48 bg-jet/50 rounded animate-pulse mb-8" />
        {/* Content skeleton */}
        <div className="h-48 bg-jet/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  const status = statusConfig[caseData.status];

  return (
    <div className="p-6 lg:p-8">
      {/* Back link */}
      <Link
        href="/cases"
        className={clsx(
          "inline-flex items-center gap-1.5 mb-6",
          "text-sm text-stone hover:text-smoke transition-colors",
        )}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Cases</span>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-medium text-smoke">{caseData.name}</h1>
            <span
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs font-medium",
                status.className,
              )}
            >
              {status.label}
            </span>
          </div>
          {caseData.description && (
            <p className="text-stone max-w-2xl">{caseData.description}</p>
          )}
        </div>
      </div>

      {/* Empty state for files */}
      <div className="bg-jet/50 border border-smoke/10 rounded-xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-smoke/5 flex items-center justify-center mx-auto mb-6">
          <Upload className="w-8 h-8 text-stone" />
        </div>
        <h3 className="text-lg font-medium text-smoke mb-2">No files yet</h3>
        <p className="text-stone text-sm max-w-md mx-auto mb-6">
          Upload evidence documents to start your investigation. Holmes will
          analyze and extract insights from your files.
        </p>
        <p className="text-stone/60 text-xs">File upload coming in Phase 3</p>
      </div>
    </div>
  );
}

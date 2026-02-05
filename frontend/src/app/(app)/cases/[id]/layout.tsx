"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clsx } from "clsx";

import { api, ApiError } from "@/lib/api-client";
import type { Case, CaseStatus } from "@/types/case";
import { Chatbot } from "@/components/app/chatbot";

const statusConfig: Record<
  CaseStatus,
  { label: string; className: string; style?: React.CSSProperties }
> = {
  DRAFT: {
    label: "Draft",
    className: "text-(--muted-foreground)",
    style: { backgroundColor: "var(--muted)" },
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-amber-500/20 text-amber-500 dark:text-amber-400",
  },
  READY: {
    label: "Ready",
    className: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  ERROR: {
    label: "Error",
    className: "bg-red-500/20 text-red-600 dark:text-red-400",
  },
};

export default function CaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="px-6 pt-4 pb-6 lg:px-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="h-7 w-64 rounded animate-pulse"
            style={{ backgroundColor: "var(--muted)" }}
          />
        </div>
        <div
          className="h-5 w-80 rounded animate-pulse mb-4"
          style={{ backgroundColor: "var(--muted)" }}
        />
        <div
          className="h-48 rounded-xl animate-pulse"
          style={{ backgroundColor: "var(--muted)" }}
        />
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  const status = statusConfig[caseData.status];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="px-6 pt-4 pb-6 lg:px-8">
        {/* Case header: title and status */}
        <div className="flex items-center gap-2.5 mb-1">
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {caseData.name}
          </h1>
          <span
            className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              status.className,
            )}
            style={status.style}
          >
            {status.label}
          </span>
        </div>

        {/* Case description */}
        {caseData.description && (
          <p
            className="max-w-2xl text-sm mb-4"
            style={{ color: "var(--muted-foreground)" }}
          >
            {caseData.description}
          </p>
        )}

        {/* Page Content */}
        {children}
      </div>

      {/* Chatbot - Available on all case pages */}
      <Chatbot
        caseId={params.id as string}
        caseContext={{
          name: caseData.name,
          description: caseData.description || undefined,
          status: caseData.status,
        }}
      />
    </div>
  );
}

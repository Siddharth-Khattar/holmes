"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Terminal, Network, Clock, FolderOpen } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

import { api, ApiError } from "@/lib/api-client";
import type { Case, CaseStatus } from "@/types/case";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
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

const navItems = [
  { title: "Command Center", icon: Terminal, href: "/command-center" },
  { title: "Knowledge Graph", icon: Network, href: "/knowledge-graph" },
  { title: "Evidence Library", icon: FolderOpen, href: "/library" },
  { title: "Timeline", icon: Clock, href: "/timeline" },
];

export default function CaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
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
        <div
          className="h-5 w-24 rounded animate-pulse mb-6"
          style={{ backgroundColor: "var(--muted)" }}
        />
        <div
          className="h-8 w-64 rounded animate-pulse mb-2"
          style={{ backgroundColor: "var(--muted)" }}
        />
        <div
          className="h-5 w-48 rounded animate-pulse mb-8"
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
  const basePath = `/cases/${params.id}`;

  // Get current section from pathname
  const currentSection = pathname.split("/").pop() || "upload";

  // Debug: log to verify matching
  console.log("CaseLayout - pathname:", pathname);
  console.log("CaseLayout - currentSection:", currentSection);
  console.log("CaseLayout - activeTab:", `/${currentSection}`);

  const handleTabChange = (href: string) => {
    router.push(`${basePath}${href}`);
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="p-6 lg:p-8">
        {/* Back link */}
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 mb-6 text-sm transition-colors"
          style={{
            color: "var(--muted-foreground)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cases</span>
        </Link>

        {/* Header with Navigation */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="text-2xl font-medium"
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
            {caseData.description && (
              <p
                className="max-w-2xl"
                style={{ color: "var(--muted-foreground)" }}
              >
                {caseData.description}
              </p>
            )}
          </div>

          {/* Floating Navigation Tabs - Top Right */}
          <div className="shrink-0">
            <ExpandableTabs
              tabs={navItems}
              activeTab={`/${currentSection}`}
              onTabChange={handleTabChange}
              className="shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]"
            />
          </div>
        </div>

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

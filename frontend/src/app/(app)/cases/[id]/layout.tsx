"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  Terminal,
  Network,
  Clock,
  FolderOpen,
  Globe,
} from "lucide-react";
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
  { title: "Geospatial", icon: Globe, href: "/geospatial" },
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
      <div className="px-6 pt-4 pb-6 lg:px-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-4 w-4 rounded animate-pulse"
            style={{ backgroundColor: "var(--muted)" }}
          />
          <div
            className="h-5 w-48 rounded animate-pulse"
            style={{ backgroundColor: "var(--muted)" }}
          />
        </div>
        <div
          className="h-4 w-72 rounded animate-pulse mb-4 ml-7"
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
      <div className="px-6 pt-4 pb-6 lg:px-8">
        {/* Case header row: back arrow, title, status, and navigation tabs */}
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2.5">
            <Link
              href="/cases"
              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted-foreground)";
              }}
              aria-label="Back to cases"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1
              className="text-base font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {caseData.name}
            </h1>
            <span
              className={clsx(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                status.className,
              )}
              style={status.style}
            >
              {status.label}
            </span>
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

        {/* Case description */}
        {caseData.description && (
          <p
            className="max-w-2xl text-xs mb-4 ml-9"
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

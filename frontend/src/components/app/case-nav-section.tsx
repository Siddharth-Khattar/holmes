// ABOUTME: Case-aware navigation section for sidebar
// ABOUTME: Self-detects case context and renders case-specific navigation

"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Terminal,
  Network,
  FolderOpen,
  Clock,
  Globe,
} from "lucide-react";
import { clsx } from "clsx";
import { api, ApiError } from "@/lib/api-client";
import type { Case } from "@/types/case";
import { SidebarTabs } from "@/components/ui/sidebar-tabs";

interface CaseNavSectionProps {
  collapsed: boolean;
}

const caseTabs = [
  { title: "Command Center", icon: Terminal, href: "/command-center" },
  { title: "Knowledge Graph", icon: Network, href: "/knowledge-graph" },
  { title: "Evidence Library", icon: FolderOpen, href: "/library" },
  { title: "Timeline", icon: Clock, href: "/timeline" },
  { title: "Geospatial", icon: Globe, href: "/geospatial" },
];

export function CaseNavSection({ collapsed }: CaseNavSectionProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  // Detect if we're on a case route
  const caseId = params?.id as string | undefined;
  const isOnCaseRoute = pathname?.startsWith("/cases/") && caseId;

  useEffect(() => {
    if (!isOnCaseRoute) {
      setCaseData(null);
      setLoading(false);
      return;
    }

    async function fetchCase() {
      try {
        const data = await api.get<Case>(`/api/cases/${caseId}`);
        setCaseData(data);
      } catch (error) {
        // Silent error handling - if case fetch fails, just don't show name
        if (error instanceof ApiError) {
          console.error("Failed to fetch case data:", error);
        }
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    fetchCase();
  }, [caseId, isOnCaseRoute]);

  // Return null if not on a case route
  if (!isOnCaseRoute) {
    return null;
  }

  // Get active tab from pathname
  const pathSegments = pathname.split("/");
  const currentSection =
    pathSegments[pathSegments.length - 1] || "command-center";
  const activeTab = `/${currentSection}`;
  const basePath = `/cases/${caseId}`;

  return (
    <>
      {/* Section divider */}
      <div
        className="my-2 mx-2"
        style={{ borderTop: "1px solid var(--border)" }}
      />

      {/* Back to Cases button */}
      <div className="px-2">
        <button
          onClick={() => router.push("/cases")}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "transition-colors duration-150",
            collapsed ? "justify-center" : "justify-start",
          )}
          style={{
            color: "var(--muted-foreground)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--muted)";
            e.currentTarget.style.opacity = "0.5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.opacity = "1";
          }}
          title={collapsed ? "Back to Cases" : undefined}
          aria-label="Back to Cases"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Back to Cases</span>}
        </button>
      </div>

      {/* Case name (only when expanded) */}
      {!collapsed && (
        <div className="px-5 py-2">
          {loading ? (
            <div
              className="h-4 w-32 rounded animate-pulse"
              style={{ backgroundColor: "var(--muted)" }}
            />
          ) : caseData ? (
            <p
              className="text-xs truncate"
              style={{ color: "var(--muted-foreground)" }}
              title={caseData.name}
            >
              {caseData.name}
            </p>
          ) : null}
        </div>
      )}

      {/* Case tabs */}
      <div className="px-2">
        <SidebarTabs
          tabs={caseTabs}
          activeTab={activeTab}
          basePath={basePath}
          collapsed={collapsed}
        />
      </div>
    </>
  );
}

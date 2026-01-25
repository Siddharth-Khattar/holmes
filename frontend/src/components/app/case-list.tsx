// ABOUTME: Case list component with grid/list toggle, sort, and pagination
// ABOUTME: Fetches cases from backend API with JWT authentication

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api-client";
import type { Case, CaseListResponse } from "@/types/case";
import { CaseCard } from "./case-card";
import { EmptyState } from "./empty-state";
import { CreateCaseModal } from "./create-case-modal";

type SortOption = "name" | "created_at" | "updated_at" | "status";
type ViewMode = "grid" | "list";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "updated_at", label: "Last Updated" },
  { value: "created_at", label: "Date Created" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

export function CaseList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("updated_at");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(12);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort_by: sortBy,
        sort_order: sortBy === "name" ? "asc" : "desc",
      });
      const data = await api.get<CaseListResponse>(`/api/cases?${params}`);
      setCases(data.cases);
      setTotal(data.total);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(`Failed to load cases: ${error.statusText}`);
      } else {
        toast.error("Failed to load cases");
      }
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await api.delete(`/api/cases/${id}`);
      toast.success("Case deleted");
      // Refresh the list
      fetchCases();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(`Failed to delete case: ${error.statusText}`);
      } else {
        toast.error("Failed to delete case");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCaseCreated = () => {
    // Refresh the list to include the new case
    fetchCases();
  };

  const totalPages = Math.ceil(total / perPage);
  const currentSortLabel =
    sortOptions.find((opt) => opt.value === sortBy)?.label || "Sort";

  // Loading skeleton
  if (loading && cases.length === 0) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-24 bg-jet/50 rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-jet/50 rounded animate-pulse" />
            <div className="h-10 w-32 bg-jet/50 rounded animate-pulse" />
          </div>
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-jet/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-smoke">Cases</h1>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-jet rounded-lg p-1 border border-smoke/10">
            <button
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-smoke/10 text-smoke"
                  : "text-stone hover:text-smoke",
              )}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-smoke/10 text-smoke"
                  : "text-stone hover:text-smoke",
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2",
                "bg-jet border border-smoke/10 rounded-lg",
                "text-sm text-stone hover:text-smoke transition-colors",
              )}
            >
              <span>{currentSortLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showSortDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortDropdown(false)}
                />
                {/* Dropdown */}
                <div
                  className={clsx(
                    "absolute right-0 mt-2 w-40 z-20",
                    "bg-jet border border-smoke/10 rounded-lg",
                    "shadow-lg shadow-black/30",
                    "py-1",
                  )}
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                        setPage(1);
                      }}
                      className={clsx(
                        "w-full px-3 py-2 text-left text-sm transition-colors",
                        sortBy === option.value
                          ? "text-smoke bg-smoke/10"
                          : "text-stone hover:text-smoke hover:bg-smoke/5",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* New Case button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2",
              "bg-smoke text-charcoal rounded-lg",
              "font-medium text-sm",
              "hover:bg-accent transition-colors",
            )}
          >
            <Plus className="w-4 h-4" />
            <span>New Case</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && cases.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No cases yet"
          description="Create your first case to start organizing your investigation files and evidence."
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2",
                "bg-smoke text-charcoal rounded-lg",
                "font-medium text-sm",
                "hover:bg-accent transition-colors",
              )}
            >
              <Plus className="w-4 h-4" />
              <span>Create Case</span>
            </button>
          }
        />
      )}

      {/* Case grid/list */}
      {cases.length > 0 && (
        <>
          <div
            className={clsx(
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col gap-3",
            )}
          >
            {cases.map((caseItem) => (
              <CaseCard
                key={caseItem.id}
                caseData={caseItem}
                viewMode={viewMode}
                onDelete={handleDelete}
                isDeleting={deletingId === caseItem.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={clsx(
                  "flex items-center gap-1 px-3 py-2 rounded-lg",
                  "text-sm transition-colors",
                  page === 1
                    ? "text-stone/50 cursor-not-allowed"
                    : "text-stone hover:text-smoke hover:bg-smoke/5",
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-sm text-stone">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={clsx(
                  "flex items-center gap-1 px-3 py-2 rounded-lg",
                  "text-sm transition-colors",
                  page === totalPages
                    ? "text-stone/50 cursor-not-allowed"
                    : "text-stone hover:text-smoke hover:bg-smoke/5",
                )}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create case modal */}
      <CreateCaseModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCaseCreated}
      />
    </div>
  );
}

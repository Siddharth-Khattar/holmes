// ABOUTME: Command Center page with tab toggle between Agent Flow and Verdict.
// ABOUTME: Verdict tab activates when synthesis-data-ready SSE event fires or synthesis data exists.

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Scale, Workflow } from "lucide-react";

import { CommandCenter } from "@/components/CommandCenter";
import { ConfirmationModal } from "@/components/CommandCenter/ConfirmationModal";
import { BatchConfirmationModal } from "@/components/CommandCenter/BatchConfirmationModal";
import { VerdictView } from "@/components/verdict/VerdictView";
import { useAgentStates } from "@/hooks/useAgentStates";
import { useSynthesis } from "@/hooks/useSynthesisData";
import { useDetailSidebarDispatch } from "@/hooks";
import { extractBaseAgentType } from "@/lib/command-center-validation";
import type { AgentType } from "@/types/command-center";
import type { SidebarContentDescriptor } from "@/types/detail-sidebar";

// ---------------------------------------------------------------------------
// Tab Types
// ---------------------------------------------------------------------------

type CommandCenterTab = "agent-flow" | "verdict";

interface TabDefinition {
  id: CommandCenterTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDefinition[] = [
  { id: "agent-flow", label: "Agent Flow", icon: <Workflow size={14} /> },
  { id: "verdict", label: "Verdict", icon: <Scale size={14} /> },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CommandCenterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const caseId = params.id as string;

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Tab state: initialize from URL search params
  const [activeTab, setActiveTab] = useState<CommandCenterTab>(() =>
    searchParams.get("tab") === "verdict" ? "verdict" : "agent-flow",
  );

  const {
    agentStates,
    lastProcessingSummary,
    pendingConfirmations,
    pendingBatchConfirmations,
    removePendingConfirmation,
    removePendingBatchConfirmation,
    synthesisReady: sseReady,
    isConnected,
    isReconnecting,
  } = useAgentStates(caseId);

  // Fallback: check if synthesis data already exists (page loaded after analysis)
  const { data: synthesisData } = useSynthesis(caseId);

  // Synthesis is available if SSE event fired OR data already exists from API
  const synthesisAvailable = useMemo(
    () => sseReady || synthesisData != null,
    [sseReady, synthesisData],
  );

  // Invalidate React Query synthesis caches when synthesis-data-ready fires
  useEffect(() => {
    if (!sseReady) return;
    queryClient.invalidateQueries({ queryKey: ["synthesis"] });
    queryClient.invalidateQueries({ queryKey: ["hypotheses"] });
    queryClient.invalidateQueries({ queryKey: ["contradictions"] });
    queryClient.invalidateQueries({ queryKey: ["gaps"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }, [sseReady, queryClient]);

  const { setContent, clearContent, setCollapsed } = useDetailSidebarDispatch();

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: CommandCenterTab) => {
      setActiveTab(tab);
      // Clear agent selection when switching tabs
      if (tab === "verdict") {
        setSelectedAgent(null);
      }
      router.replace(`?tab=${tab}`, { scroll: false });
    },
    [router],
  );

  // User-initiated agent selection: also ensures sidebar is expanded.
  // This is separate from the sync effect (which handles passive SSE updates
  // without forcing the sidebar open if the user collapsed it).
  const handleSelectAgent = useCallback(
    (agent: string | null) => {
      setSelectedAgent(agent);
      if (agent) {
        setCollapsed(false);
      }
    },
    [setCollapsed],
  );

  // Verdict item click -> open in DetailSidebar
  const handleOpenVerdictDetail = useCallback(
    (descriptor: SidebarContentDescriptor) => {
      setContent(descriptor);
      setCollapsed(false);
    },
    [setContent, setCollapsed],
  );

  // Sync selectedAgent + agentStates into the app-wide detail sidebar.
  // Derive the base AgentType from the instance's state for the content descriptor.
  useEffect(() => {
    if (activeTab !== "agent-flow") return;
    if (selectedAgent) {
      const state = agentStates.get(selectedAgent);
      const baseType =
        state?.type ??
        (extractBaseAgentType(selectedAgent) as AgentType | null);
      if (baseType) {
        setContent({
          type: "command-center-agent",
          props: {
            agentType: baseType,
            agentState: state ?? null,
            allAgentStates: agentStates,
          },
        });
      }
    } else {
      clearContent();
    }
  }, [selectedAgent, agentStates, activeTab, setContent, clearContent]);

  // Clear sidebar content on unmount (navigate away from Command Center)
  useEffect(() => {
    return () => {
      clearContent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optimistic removal for immediate UI feedback before SSE round-trip.
  // The SSE resolved events in useAgentStates serve as backup.
  const handleConfirmationResolved = useCallback(
    (requestId: string) => {
      removePendingConfirmation(requestId);
    },
    [removePendingConfirmation],
  );

  const handleBatchConfirmationResolved = useCallback(
    (batchId: string) => {
      removePendingBatchConfirmation(batchId);
    },
    [removePendingBatchConfirmation],
  );

  return (
    <div
      className="command-center-scope flex w-full flex-col"
      style={{ height: "calc(100vh - 200px)" }}
    >
      {/* Tab Toggle */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2">
        <div className="flex rounded-lg border border-stone/15 bg-stone/5 p-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDisabled = tab.id === "verdict" && !synthesisAvailable;

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && handleTabChange(tab.id)}
                disabled={isDisabled}
                className={`
                  relative flex items-center gap-1.5 rounded-md px-3 py-1.5
                  text-xs font-medium transition-all duration-150
                  ${
                    isActive
                      ? "bg-stone/20 text-smoke shadow-sm"
                      : isDisabled
                        ? "cursor-not-allowed text-stone/30"
                        : "text-stone/60 hover:text-smoke/80"
                  }
                `}
                title={isDisabled ? "Analysis in progress..." : undefined}
              >
                {tab.icon}
                {tab.label}
                {isDisabled && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-stone/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {activeTab === "agent-flow" ? (
          <CommandCenter
            agentStates={agentStates}
            lastProcessingSummary={lastProcessingSummary}
            isConnected={isConnected}
            isReconnecting={isReconnecting}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
            className="h-full w-full"
          />
        ) : (
          <VerdictView caseId={caseId} onOpenDetail={handleOpenVerdictDetail} />
        )}
      </div>

      {/* HITL Confirmation Modals - batch takes priority over single */}
      {pendingBatchConfirmations.length > 0 ? (
        <BatchConfirmationModal
          batch={pendingBatchConfirmations[0]}
          caseId={caseId}
          onResolved={handleBatchConfirmationResolved}
        />
      ) : pendingConfirmations.length > 0 ? (
        <ConfirmationModal
          confirmation={pendingConfirmations[0]}
          caseId={caseId}
          onResolved={handleConfirmationResolved}
        />
      ) : null}
    </div>
  );
}

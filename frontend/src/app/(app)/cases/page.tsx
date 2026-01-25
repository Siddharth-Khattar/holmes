// ABOUTME: Cases list page
// ABOUTME: Shows all user's cases with create/delete actions

"use client";

import { CaseList } from "@/components/app/case-list";

export default function CasesPage() {
  return (
    <div className="p-6 lg:p-8">
      <CaseList />
    </div>
  );
}

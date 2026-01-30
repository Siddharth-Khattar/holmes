"use client";

import { useParams } from "next/navigation";
import { CaseLibrary } from "@/components/library";

export default function LibraryPage() {
  const params = useParams();
  const caseId = params.id as string;

  return (
    <div className="h-screen flex flex-col">
      <CaseLibrary caseId={caseId} caseName="Offshore Holdings Investigation" />
    </div>
  );
}

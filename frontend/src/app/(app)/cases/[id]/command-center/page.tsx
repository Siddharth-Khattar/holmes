"use client";

import { useParams } from "next/navigation";
import { CommandCenter } from "@/components/CommandCenter";

export default function CommandCenterPage() {
  const params = useParams();
  const caseId = params.id as string;

  return (
    <div className="w-full" style={{ height: "calc(100vh - 280px)" }}>
      <CommandCenter caseId={caseId} className="h-full w-full" />
    </div>
  );
}

// ABOUTME: Sherlock's Diary notebook page for case notes.
// ABOUTME: Mobile-optimized note-taking interface with text and audio support.

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Notebook } from "@/components/notebook";
import { api } from "@/lib/api-client";
import type { Case } from "@/types/case";

export default function NotebookPage() {
    const params = useParams();
    const caseId = params.id as string;
    const [caseName, setCaseName] = useState<string | undefined>();

    useEffect(() => {
        async function fetchCase() {
            try {
                const caseData = await api.get<Case>(`/api/cases/${caseId}`);
                setCaseName(caseData.name);
            } catch {
                // Ignore errors, caseName is optional
            }
        }
        fetchCase();
    }, [caseId]);

    return <Notebook caseId={caseId} caseName={caseName} />;
}

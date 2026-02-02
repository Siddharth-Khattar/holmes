// ABOUTME: React hook for file upload with status tracking.
// ABOUTME: Handles sequential uploads and integrates with CaseLibrary.

"use client";

import { useState, useCallback } from "react";
import { uploadFile, FileResponse } from "@/lib/api/files";

interface UploadState {
  isUploading: boolean;
  currentFile: string | null;
  progress: number;
  error: string | null;
}

interface UseFileUploadReturn extends UploadState {
  upload: (files: File[]) => Promise<FileResponse[]>;
  clearError: () => void;
}

export function useFileUpload(caseId: string): UseFileUploadReturn {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    currentFile: null,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (files: File[]): Promise<FileResponse[]> => {
      const results: FileResponse[] = [];
      const totalFiles = files.length;

      setState({
        isUploading: true,
        currentFile: null,
        progress: 0,
        error: null,
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setState((s) => ({
          ...s,
          currentFile: file.name,
          progress: Math.round((i / totalFiles) * 100),
        }));

        try {
          const result = await uploadFile(caseId, file);
          results.push(result);
        } catch (err) {
          // Store error but continue with next file
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : "Upload failed",
          }));
        }
      }

      setState({
        isUploading: false,
        currentFile: null,
        progress: 100,
        error: state.error,
      });

      return results;
    },
    [caseId, state.error],
  );

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { ...state, upload, clearError };
}

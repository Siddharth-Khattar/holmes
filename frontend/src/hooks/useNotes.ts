// ABOUTME: React hook for managing diary notes with CRUD operations.
// ABOUTME: Provides state management and API integration for Sherlock's Diary.
// ABOUTME: Auto-generates AI titles/subtitles when notes are created.

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  listNotes,
  createTextNote,
  createAudioNote,
  updateNote,
  deleteNote,
  generateMetadata,
  exportNoteAsEvidence,
  getAudioUrl,
  NoteResponse,
} from "@/lib/api/notes";

interface UseNotesReturn {
  notes: NoteResponse[];
  isLoading: boolean;
  error: string | null;
  generatingIds: Set<string>;
  createText: (content: string) => Promise<NoteResponse | null>;
  createAudio: (
    file: File | Blob,
    duration?: number,
  ) => Promise<NoteResponse | null>;
  update: (
    noteId: string,
    data: { content?: string; title?: string; subtitle?: string },
  ) => Promise<NoteResponse | null>;
  remove: (noteId: string) => Promise<boolean>;
  generateMeta: (noteId: string) => Promise<boolean>;
  exportAsEvidence: (noteId: string, description?: string) => Promise<boolean>;
  getAudio: (noteId: string) => Promise<string | null>;
  refresh: () => Promise<void>;
  clearError: () => void;
  isGenerating: (noteId: string) => boolean;
}

export function useNotes(caseId: string): UseNotesReturn {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Fetch notes on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchNotes() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await listNotes(caseId, 1, 100);
        if (!cancelled) {
          setNotes(response.notes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load notes");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchNotes();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listNotes(caseId, 1, 100);
      setNotes(response.notes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh notes");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  const generateMeta = useCallback(
    async (noteId: string): Promise<boolean> => {
      // Add to generating set
      setGeneratingIds((prev) => new Set(prev).add(noteId));

      try {
        const result = await generateMetadata(caseId, noteId);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  title: result.title,
                  subtitle: result.subtitle,
                  content:
                    result.content !== undefined ? result.content : n.content,
                }
              : n,
          ),
        );
        return true;
      } catch (err) {
        console.error("Failed to generate metadata:", err);
        // Don't set error for auto-generation failures
        return false;
      } finally {
        // Remove from generating set
        setGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
      }
    },
    [caseId],
  );

  const createText = useCallback(
    async (content: string): Promise<NoteResponse | null> => {
      try {
        const note = await createTextNote(caseId, content);
        setNotes((prev) => [note, ...prev]);

        // Auto-generate title in background
        generateMeta(note.id).catch(() => {
          // Silently fail - title generation is best effort
        });

        return note;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create note");
        return null;
      }
    },
    [caseId, generateMeta],
  );

  const createAudio = useCallback(
    async (
      file: File | Blob,
      duration?: number,
    ): Promise<NoteResponse | null> => {
      try {
        const note = await createAudioNote(caseId, file, duration);
        setNotes((prev) => [note, ...prev]);

        // Auto-generate title in background (will use placeholder for audio)
        generateMeta(note.id).catch(() => {
          // Silently fail - title generation is best effort
        });

        return note;
      } catch (err) {
        console.error("createAudio error:", err);
        setError(err instanceof Error ? err.message : "Failed to upload audio");
        return null;
      }
    },
    [caseId, generateMeta],
  );

  const update = useCallback(
    async (
      noteId: string,
      data: { content?: string; title?: string; subtitle?: string },
    ): Promise<NoteResponse | null> => {
      try {
        const updated = await updateNote(caseId, noteId, data);
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update note");
        return null;
      }
    },
    [caseId],
  );

  const remove = useCallback(
    async (noteId: string): Promise<boolean> => {
      try {
        await deleteNote(caseId, noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete note");
        return false;
      }
    },
    [caseId],
  );

  const exportAsEvidence = useCallback(
    async (noteId: string, description?: string): Promise<boolean> => {
      try {
        await exportNoteAsEvidence(caseId, noteId, description);
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, is_exported: true } : n)),
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to export note");
        return false;
      }
    },
    [caseId],
  );

  const getAudio = useCallback(
    async (noteId: string): Promise<string | null> => {
      try {
        const result = await getAudioUrl(caseId, noteId, true);
        return result.download_url;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get audio URL",
        );
        return null;
      }
    },
    [caseId],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isGenerating = useCallback(
    (noteId: string): boolean => {
      return generatingIds.has(noteId);
    },
    [generatingIds],
  );

  return {
    notes,
    isLoading,
    error,
    generatingIds,
    createText,
    createAudio,
    update,
    remove,
    generateMeta,
    exportAsEvidence,
    getAudio,
    refresh,
    clearError,
    isGenerating,
  };
}

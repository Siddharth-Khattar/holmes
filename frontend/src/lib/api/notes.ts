// ABOUTME: API client for notes operations (Sherlock's Diary).
// ABOUTME: Handles note CRUD, audio upload, metadata generation, and evidence export.

import { getToken } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type NoteType = "TEXT" | "AUDIO";

export interface NoteResponse {
  id: string;
  case_id: string;
  user_id: string;
  type: NoteType;
  content: string | null;
  audio_storage_path: string | null;
  audio_duration_seconds: number | null;
  audio_mime_type: string | null;
  title: string | null;
  subtitle: string | null;
  is_exported: boolean;
  exported_file_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteListResponse {
  notes: NoteResponse[];
  total: number;
  page: number;
  per_page: number;
}

export interface NoteCreate {
  type: NoteType;
  content?: string;
}

export interface NoteUpdate {
  content?: string;
  title?: string;
  subtitle?: string;
}

export interface GenerateMetadataResponse {
  note_id: string;
  title: string;
  subtitle: string;
  content?: string | null;
}

export interface NoteExportResponse {
  note_id: string;
  file_id: string;
  file_name: string;
  message: string;
}

export interface AudioDownloadResponse {
  download_url: string;
  expires_in: number;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * List all notes for a case.
 */
export async function listNotes(
  caseId: string,
  page = 1,
  perPage = 50,
  type?: NoteType,
): Promise<NoteListResponse> {
  const headers = await getAuthHeaders();
  let url = `${API_URL}/api/cases/${caseId}/notes?page=${page}&per_page=${perPage}`;
  if (type) {
    url += `&type=${type}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to list notes" }));
    throw new Error(error.detail || "Failed to list notes");
  }
  return res.json();
}

/**
 * Get a single note by ID.
 */
export async function getNote(
  caseId: string,
  noteId: string,
): Promise<NoteResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/cases/${caseId}/notes/${noteId}`, {
    headers,
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to get note" }));
    throw new Error(error.detail || "Failed to get note");
  }
  return res.json();
}

/**
 * Create a new text note.
 */
export async function createTextNote(
  caseId: string,
  content: string,
): Promise<NoteResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/cases/${caseId}/notes`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "TEXT",
      content,
    }),
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to create note" }));
    throw new Error(error.detail || "Failed to create note");
  }
  return res.json();
}

/**
 * Create a new audio note by uploading an audio file.
 */
export async function createAudioNote(
  caseId: string,
  audioFile: File | Blob,
  durationSeconds?: number,
): Promise<NoteResponse> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  if (audioFile instanceof File) {
    formData.append("file", audioFile);
  } else {
    // Blob doesn't have a filename, so append one based on type
    let ext = "webm"; // Default for browser recordings
    const type = audioFile.type.toLowerCase();
    if (type.includes("mp4") || type.includes("m4a")) ext = "mp4";
    else if (type.includes("wav")) ext = "wav";
    else if (type.includes("ogg")) ext = "ogg";
    else if (type.includes("mp3")) ext = "mp3";

    formData.append("file", audioFile, `recording.${ext}`);
  }
  if (durationSeconds !== undefined) {
    formData.append("duration_seconds", durationSeconds.toString());
  }
  const res = await fetch(`${API_URL}/api/cases/${caseId}/notes/audio`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to upload audio" }));
    throw new Error(error.detail || "Failed to upload audio");
  }
  return res.json();
}

/**
 * Update a note's content or metadata.
 */
export async function updateNote(
  caseId: string,
  noteId: string,
  data: NoteUpdate,
): Promise<NoteResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/cases/${caseId}/notes/${noteId}`, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to update note" }));
    throw new Error(error.detail || "Failed to update note");
  }
  return res.json();
}

/**
 * Delete a note.
 */
export async function deleteNote(
  caseId: string,
  noteId: string,
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/cases/${caseId}/notes/${noteId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to delete note" }));
    throw new Error(error.detail || "Failed to delete note");
  }
}

/**
 * Get a signed URL for streaming/downloading audio.
 */
export async function getAudioUrl(
  caseId: string,
  noteId: string,
  inline = true,
): Promise<AudioDownloadResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/cases/${caseId}/notes/${noteId}/audio?inline=${inline}`,
    { headers },
  );
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to get audio URL" }));
    throw new Error(error.detail || "Failed to get audio URL");
  }
  return res.json();
}

/**
 * Generate AI-powered title and subtitle for a note.
 */
export async function generateMetadata(
  caseId: string,
  noteId: string,
): Promise<GenerateMetadataResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/cases/${caseId}/notes/${noteId}/generate-metadata`,
    {
      method: "POST",
      headers,
    },
  );
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to generate metadata" }));
    throw new Error(error.detail || "Failed to generate metadata");
  }
  return res.json();
}

/**
 * Export a note as evidence to the case's file library.
 */
export async function exportNoteAsEvidence(
  caseId: string,
  noteId: string,
  description?: string,
): Promise<NoteExportResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/cases/${caseId}/notes/${noteId}/export`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description }),
    },
  );
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to export note" }));
    throw new Error(error.detail || "Failed to export note");
  }
  return res.json();
}

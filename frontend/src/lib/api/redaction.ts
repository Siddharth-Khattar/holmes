// ABOUTME: API client for PDF redaction operations.
// ABOUTME: Handles file upload and redaction prompt submission to backend.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface RedactionTarget {
  text: string;
  page: number;
  context: string | null;
}

export interface RedactionResponse {
  redacted_pdf: string; // base64 encoded PDF
  redaction_count: number;
  targets: RedactionTarget[];
  reasoning: string | null;
  permanent: boolean;
}

export interface ImageRedactionResponse {
  censored_image: string; // base64 encoded image
  visualization_image: string; // base64 encoded visualization
  segments_censored: number;
  segments_found: number;
  categories_selected: string[];
  processing_time_seconds: number;
  method: string;
}

export interface VideoRedactionResponse {
  censored_video: string; // base64 encoded video
  visualization_image: string; // base64 encoded visualization frame
  segments_censored: number;
  segments_found: number;
  categories_selected: string[];
  agent1_reasoning: string;
  frames_processed: number;
  video_duration_seconds: number;
  processing_time_seconds: number;
  method: string;
  logs: string[];
}

export interface AudioCensorTarget {
  start_time: number;
  end_time: number;
  text: string;
  reason: string | null;
}

export interface AudioRedactionResponse {
  censored_audio: string; // base64 encoded audio
  segments_censored: number;
  segments_found: number;
  total_censored_duration: number;
  audio_duration_seconds: number;
  processing_time_seconds: number;
  transcript: string;
  reasoning: string | null;
  targets: AudioCensorTarget[];
  output_format: string;
}

export interface RedactionError {
  detail: string;
}

/**
 * Fetch PDF content from a URL and return as a Blob
 */
async function fetchPdfBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }
  return response.blob();
}

/**
 * Redact a PDF file using natural language instructions.
 *
 * @param pdfUrl - URL of the PDF to redact (can be a signed URL or data URL)
 * @param prompt - Natural language description of what to redact
 * @param fileName - Name of the file for the form submission
 * @param permanent - If true, permanently removes text. If false, draws black boxes.
 * @returns RedactionResponse with base64 encoded PDF and metadata
 */
export async function redactPdf(
  pdfUrl: string,
  prompt: string,
  fileName: string = "document.pdf",
  permanent: boolean = false,
): Promise<RedactionResponse> {
  // Fetch the PDF content
  let pdfBlob: Blob;

  try {
    if (pdfUrl.startsWith("data:")) {
      // Handle base64 data URL
      const base64Data = pdfUrl.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfBlob = new Blob([bytes], { type: "application/pdf" });
    } else {
      // Fetch from URL
      pdfBlob = await fetchPdfBlob(pdfUrl);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching PDF";
    throw new Error(`Failed to fetch PDF: ${message}`);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", pdfBlob, fileName);
  formData.append("prompt", prompt);
  formData.append("permanent", String(permanent));

  // Send to backend
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/redact/pdf`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new Error(
      `Network error: ${message}. Is the backend running at ${API_URL}?`,
    );
  }

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errorData: RedactionError = await response.json();
      errorDetail = errorData.detail;
    } catch {
      errorDetail = `Server returned ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Download a redacted PDF directly (returns blob for download)
 */
export async function downloadRedactedPdf(
  pdfUrl: string,
  prompt: string,
  fileName: string = "document.pdf",
  permanent: boolean = false,
): Promise<Blob> {
  // Fetch the PDF content
  let pdfBlob: Blob;

  if (pdfUrl.startsWith("data:")) {
    const base64Data = pdfUrl.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    pdfBlob = new Blob([bytes], { type: "application/pdf" });
  } else {
    pdfBlob = await fetchPdfBlob(pdfUrl);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", pdfBlob, fileName);
  formData.append("prompt", prompt);
  formData.append("permanent", String(permanent));

  // Send to backend download endpoint
  const response = await fetch(`${API_URL}/api/redact/pdf/download`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error: RedactionError = await response.json().catch(() => ({
      detail: `Download failed with status ${response.status}`,
    }));
    throw new Error(error.detail);
  }

  return response.blob();
}

/**
 * Convert a base64 string to a data URL for PDF display
 */
export function base64ToDataUrl(base64: string): string {
  return `data:application/pdf;base64,${base64}`;
}

/**
 * Trigger a browser download from a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fetch image content from a URL and return as a Blob
 */
async function fetchImageBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  return response.blob();
}

/**
 * Redact/censor an image using natural language instructions.
 *
 * @param imageUrl - URL of the image to redact (can be a signed URL or data URL)
 * @param prompt - Natural language description of what to censor
 * @param fileName - Name of the file for the form submission
 * @param method - Censorship method: "blur" or "pixelate"
 * @returns ImageRedactionResponse with base64 encoded images and metadata
 */
export async function redactImage(
  imageUrl: string,
  prompt: string,
  fileName: string = "image.jpg",
  method: "blur" | "pixelate" = "blur",
): Promise<ImageRedactionResponse> {
  // Fetch the image content
  let imageBlob: Blob;

  try {
    if (imageUrl.startsWith("data:")) {
      // Handle base64 data URL
      const base64Data = imageUrl.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Determine MIME type from data URL
      const mimeMatch = imageUrl.match(/^data:(image\/[^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      imageBlob = new Blob([bytes], { type: mimeType });
    } else {
      // Fetch from URL
      imageBlob = await fetchImageBlob(imageUrl);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching image";
    throw new Error(`Failed to fetch image: ${message}`);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", imageBlob, fileName);
  formData.append("prompt", prompt);
  formData.append("method", method);

  // Send to backend
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/redact/image`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new Error(
      `Network error: ${message}. Is the backend running at ${API_URL}?`,
    );
  }

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errorData: RedactionError = await response.json();
      errorDetail = errorData.detail;
    } catch {
      errorDetail = `Server returned ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Download a redacted image directly (returns blob for download)
 */
export async function downloadRedactedImage(
  imageUrl: string,
  prompt: string,
  fileName: string = "image.jpg",
  method: "blur" | "pixelate" = "blur",
): Promise<Blob> {
  // Fetch the image content
  let imageBlob: Blob;

  if (imageUrl.startsWith("data:")) {
    const base64Data = imageUrl.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const mimeMatch = imageUrl.match(/^data:(image\/[^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    imageBlob = new Blob([bytes], { type: mimeType });
  } else {
    imageBlob = await fetchImageBlob(imageUrl);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", imageBlob, fileName);
  formData.append("prompt", prompt);
  formData.append("method", method);

  // Send to backend download endpoint
  const response = await fetch(`${API_URL}/api/redact/image/download`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error: RedactionError = await response.json().catch(() => ({
      detail: `Download failed with status ${response.status}`,
    }));
    throw new Error(error.detail);
  }

  return response.blob();
}

/**
 * Convert a base64 string to a data URL for image display
 */
export function base64ToImageDataUrl(
  base64: string,
  mimeType: string = "image/jpeg",
): string {
  return `data:${mimeType};base64,${base64}`;
}


/**
 * Fetch video content from a URL and return as a Blob
 */
async function fetchVideoBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status}`);
  }
  return response.blob();
}

/**
 * Redact/censor a video using natural language instructions.
 *
 * @param videoUrl - URL of the video to redact (can be a signed URL or data URL)
 * @param prompt - Natural language description of what to censor
 * @param fileName - Name of the file for the form submission
 * @param method - Censorship method: "blur", "pixelate", or "blackbox"
 * @returns VideoRedactionResponse with base64 encoded video and metadata
 */
export async function redactVideo(
  videoUrl: string,
  prompt: string,
  fileName: string = "video.mp4",
  method: "blur" | "pixelate" | "blackbox" = "blur",
): Promise<VideoRedactionResponse> {
  // Fetch the video content
  let videoBlob: Blob;

  try {
    if (videoUrl.startsWith("data:")) {
      // Handle base64 data URL
      const base64Data = videoUrl.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Determine MIME type from data URL
      const mimeMatch = videoUrl.match(/^data:(video\/[^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "video/mp4";
      videoBlob = new Blob([bytes], { type: mimeType });
    } else {
      // Fetch from URL
      videoBlob = await fetchVideoBlob(videoUrl);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error fetching video";
    throw new Error(`Failed to fetch video: ${message}`);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", videoBlob, fileName);
  formData.append("prompt", prompt);
  formData.append("method", method);

  // Send to backend (15 minute timeout)
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/redact/video`, {
      method: "POST",
      body: formData,
      // Note: Browser fetch doesn't support timeout, but the backend has a 15min timeout
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new Error(`Network error: ${message}. Is the backend running at ${API_URL}?`);
  }

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errorData: RedactionError = await response.json();
      errorDetail = errorData.detail;
    } catch {
      errorDetail = `Server returned ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Download a redacted video directly (returns blob for download)
 */
export async function downloadRedactedVideo(
  videoUrl: string,
  prompt: string,
  fileName: string = "video.mp4",
  method: "blur" | "pixelate" | "blackbox" = "blur",
): Promise<Blob> {
  // Fetch the video content
  let videoBlob: Blob;

  if (videoUrl.startsWith("data:")) {
    const base64Data = videoUrl.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const mimeMatch = videoUrl.match(/^data:(video\/[^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "video/mp4";
    videoBlob = new Blob([bytes], { type: mimeType });
  } else {
    videoBlob = await fetchVideoBlob(videoUrl);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", videoBlob, fileName);
  formData.append("prompt", prompt);
  formData.append("method", method);

  // Send to backend download endpoint
  const response = await fetch(`${API_URL}/api/redact/video/download`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error: RedactionError = await response.json().catch(() => ({
      detail: `Download failed with status ${response.status}`,
    }));
    throw new Error(error.detail);
  }

  return response.blob();
}

/**
 * Convert a base64 string to a data URL for video display
 */
export function base64ToVideoDataUrl(base64: string, mimeType: string = "video/mp4"): string {
  return `data:${mimeType};base64,${base64}`;
}


/**
 * Fetch audio content from a URL and return as a Blob
 */
async function fetchAudioBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  return response.blob();
}

/**
 * Redact/censor audio using natural language instructions.
 *
 * @param audioUrl - URL of the audio to redact (can be a signed URL or data URL)
 * @param prompt - Natural language description of what to censor
 * @param fileName - Name of the file for the form submission
 * @returns AudioRedactionResponse with base64 encoded audio and metadata
 */
export async function redactAudio(
  audioUrl: string,
  prompt: string,
  fileName: string = "audio.mp3",
): Promise<AudioRedactionResponse> {
  // Fetch the audio content
  let audioBlob: Blob;

  try {
    if (audioUrl.startsWith("data:")) {
      // Handle base64 data URL
      const base64Data = audioUrl.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Determine MIME type from data URL
      const mimeMatch = audioUrl.match(/^data:(audio\/[^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "audio/mpeg";
      audioBlob = new Blob([bytes], { type: mimeType });
    } else {
      // Fetch from URL
      audioBlob = await fetchAudioBlob(audioUrl);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error fetching audio";
    throw new Error(`Failed to fetch audio: ${message}`);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", audioBlob, fileName);
  formData.append("prompt", prompt);

  // Send to backend
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/redact/audio`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new Error(`Network error: ${message}. Is the backend running at ${API_URL}?`);
  }

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errorData: RedactionError = await response.json();
      errorDetail = errorData.detail;
    } catch {
      errorDetail = `Server returned ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Download a redacted audio directly (returns blob for download)
 */
export async function downloadRedactedAudio(
  audioUrl: string,
  prompt: string,
  fileName: string = "audio.mp3",
): Promise<Blob> {
  // Fetch the audio content
  let audioBlob: Blob;

  if (audioUrl.startsWith("data:")) {
    const base64Data = audioUrl.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const mimeMatch = audioUrl.match(/^data:(audio\/[^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "audio/mpeg";
    audioBlob = new Blob([bytes], { type: mimeType });
  } else {
    audioBlob = await fetchAudioBlob(audioUrl);
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", audioBlob, fileName);
  formData.append("prompt", prompt);

  // Send to backend download endpoint
  const response = await fetch(`${API_URL}/api/redact/audio/download`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error: RedactionError = await response.json().catch(() => ({
      detail: `Download failed with status ${response.status}`,
    }));
    throw new Error(error.detail);
  }

  return response.blob();
}

/**
 * Convert a base64 string to a data URL for audio display
 */
export function base64ToAudioDataUrl(base64: string, mimeType: string = "audio/mpeg"): string {
  return `data:${mimeType};base64,${base64}`;
}

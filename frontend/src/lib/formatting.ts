// ABOUTME: Shared formatting utilities for duration, numbers, and time display.
// ABOUTME: Centralizes formatting logic used across Command Center components.

/**
 * Format milliseconds into a human-readable duration string.
 * Under 1 second: "Xms", under 60 seconds: "X.Xs", above: "Xm Ys"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a number with locale-appropriate thousand separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/**
 * Format an ISO timestamp string to a localized time string.
 * Returns original string if parsing fails.
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString();
}

/** Known Gemini model ID → friendly display name mappings. */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "gemini-3-pro-preview": "Gemini 3 Pro",
  "gemini-3-flash-preview": "Gemini 3 Flash",
  "gemini-2.5-pro-preview-05-06": "Gemini 2.5 Pro",
  "gemini-2.5-flash-preview-05-20": "Gemini 2.5 Flash",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
};

/**
 * Format a raw model ID into a human-friendly display name.
 * Returns a known mapping if available, otherwise strips "-preview"
 * suffixes and title-cases the remaining segments.
 */
export function formatModelName(modelId: string): string {
  if (!modelId) return "Unknown Model";

  const known = MODEL_DISPLAY_NAMES[modelId];
  if (known) return known;

  // Fallback: strip trailing "-preview" variants and title-case
  const cleaned = modelId.replace(/-preview.*$/, "");
  return cleaned
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

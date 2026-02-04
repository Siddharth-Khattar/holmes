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

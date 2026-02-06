// ABOUTME: Custom DOM events for cross-component case data synchronization.
// ABOUTME: Allows child pages (e.g. library) to notify parent layout of case data changes.

const CASE_DATA_CHANGED_EVENT = "case-data-changed";

/**
 * Dispatch when case-related data changes (file uploads, deletions, etc.)
 * so parent components can refetch stale case data.
 */
export function emitCaseDataChanged(): void {
  window.dispatchEvent(new CustomEvent(CASE_DATA_CHANGED_EVENT));
}

/**
 * Subscribe to case data change events. Returns an unsubscribe function.
 */
export function onCaseDataChanged(callback: () => void): () => void {
  window.addEventListener(CASE_DATA_CHANGED_EVENT, callback);
  return () => window.removeEventListener(CASE_DATA_CHANGED_EVENT, callback);
}

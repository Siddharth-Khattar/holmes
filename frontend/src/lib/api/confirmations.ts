// ABOUTME: API client for sending HITL confirmation responses (approve/reject).
// ABOUTME: Posts decisions to the backend confirmation endpoint to unblock agent pipelines.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ConfirmationResponse {
  status: string;
  approved: boolean;
}

/**
 * Send a confirmation response (approve or reject) for a pending agent action.
 * Unblocks the backend pipeline waiting on user decision.
 */
export async function respondToConfirmation(
  caseId: string,
  requestId: string,
  approved: boolean,
  reason?: string,
): Promise<ConfirmationResponse> {
  const res = await fetch(
    `${API_URL}/api/cases/${caseId}/confirmations/${requestId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved, reason }),
    },
  );
  if (!res.ok) {
    throw new Error(`Confirmation failed: ${res.status}`);
  }
  return res.json();
}

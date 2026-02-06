// ABOUTME: API client for sending HITL confirmation responses (approve/reject).
// ABOUTME: Posts decisions to the backend confirmation endpoint to unblock agent pipelines.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ConfirmationResponse {
  status: string;
  approved: boolean;
}

export interface BatchDecision {
  item_id: string;
  approved: boolean;
  reason?: string;
}

export interface BatchConfirmationResponse {
  status: string;
  resolved_count: number;
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
    // Try to extract error detail from response body
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errorBody = await res.json();
      if (errorBody.detail) {
        errorDetail = errorBody.detail;
      }
    } catch {
      // Ignore JSON parse errors on error response
    }
    throw new Error(`Confirmation failed: ${errorDetail}`);
  }

  // Safely parse JSON response
  try {
    return await res.json();
  } catch {
    throw new Error("Invalid response from server");
  }
}

/**
 * Send batch confirmation decisions for a set of pending agent actions.
 * Each item in the batch can be individually approved or rejected.
 */
export async function respondToBatchConfirmation(
  caseId: string,
  batchId: string,
  decisions: BatchDecision[],
): Promise<BatchConfirmationResponse> {
  const res = await fetch(
    `${API_URL}/api/cases/${caseId}/confirmations/batch/${batchId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions }),
    },
  );
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errorBody = await res.json();
      if (errorBody.detail) {
        errorDetail = errorBody.detail;
      }
    } catch {
      // Ignore JSON parse errors on error response
    }
    throw new Error(`Batch confirmation failed: ${errorDetail}`);
  }

  try {
    return await res.json();
  } catch {
    throw new Error("Invalid response from server");
  }
}

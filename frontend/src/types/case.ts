// ABOUTME: Case types matching backend schemas
// ABOUTME: Used for type-safe API responses

export type CaseStatus = "DRAFT" | "PROCESSING" | "READY" | "ERROR";
export type CaseType = "FRAUD" | "CORPORATE" | "CIVIL" | "CRIMINAL" | "OTHER";

export interface Case {
  id: string;
  name: string;
  description: string | null;
  type: CaseType;
  status: CaseStatus;
  file_count: number;
  latest_workflow_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseListResponse {
  cases: Case[];
  total: number;
  page: number;
  per_page: number;
}

export interface CaseCreateInput {
  name: string;
  description?: string;
  type?: CaseType;
}

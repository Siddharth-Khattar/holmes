// ABOUTME: Generated TypeScript types from backend Pydantic schemas
// ABOUTME: This file is auto-generated - do not edit manually

/**
 * Health check response from the API
 */
export interface HealthResponse {
  status: "healthy" | "unhealthy";
  database?: string;
}

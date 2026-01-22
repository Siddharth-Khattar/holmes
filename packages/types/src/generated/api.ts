/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

/**
 * Standard error response format for API errors.
 */
export interface ErrorResponse {
  /**
   * Machine-readable error code
   */
  code: string;
  /**
   * Human-readable error message
   */
  message: string;
  /**
   * Additional error context
   */
  details?: {
    [k: string]: unknown;
  } | null;
  /**
   * Whether the error can be resolved by the client
   */
  recoverable?: boolean;
  /**
   * Suggested action for the client to take
   */
  suggested_action?: string | null;
}
/**
 * Response model for health check endpoints.
 */
export interface HealthResponse {
  /**
   * Overall health status of the service
   */
  status: "healthy" | "unhealthy";
  /**
   * Database connection status
   */
  database?: string | null;
  /**
   * GCS storage status
   */
  storage?: string | null;
  /**
   * GCS bucket name
   */
  bucket?: string | null;
  /**
   * Time when the health check was performed
   */
  timestamp: string;
}
/**
 * Mixin for models that track creation and update timestamps.
 */
export interface TimestampMixin {
  /**
   * When the record was created
   */
  created_at: string;
  /**
   * When the record was last updated
   */
  updated_at: string;
}

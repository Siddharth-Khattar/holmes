// ABOUTME: API client for backend requests with JWT Authorization header.
// ABOUTME: Automatically includes Bearer token from Better Auth for all requests.

import { authClient } from "./auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
  ) {
    super(`${status} ${statusText}`);
    this.name = "ApiError";
  }
}

async function getAuthToken(): Promise<string | null> {
  try {
    // Use Better Auth's JWT client plugin to get token
    const result = await authClient.token();
    return result.data?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { json, ...init } = options;

  const headers: HeadersInit = {
    ...init.headers,
  };

  // Get JWT token and add to Authorization header
  const token = await getAuthToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  if (json) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers,
    body: json ? JSON.stringify(json) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, data);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, json?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "POST", json }),

  patch: <T>(endpoint: string, json?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", json }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

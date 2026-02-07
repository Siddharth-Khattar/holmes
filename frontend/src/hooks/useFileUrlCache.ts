// ABOUTME: Hook for caching signed file URLs to avoid regenerating them repeatedly
// ABOUTME: URLs are cached for 1 hour (well before the 24h expiration)

import { useCallback, useRef } from "react";

interface CachedUrl {
  url: string;
  timestamp: number;
  expiresIn: number; // seconds
}

interface UrlCache {
  [key: string]: CachedUrl; // key format: "caseId:fileId"
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export function useFileUrlCache() {
  const cacheRef = useRef<UrlCache>({});

  const getCacheKey = useCallback((caseId: string, fileId: string) => {
    return `${caseId}:${fileId}`;
  }, []);

  const getCachedUrl = useCallback(
    (caseId: string, fileId: string): string | null => {
      const key = getCacheKey(caseId, fileId);
      const cached = cacheRef.current[key];

      if (!cached) return null;

      const now = Date.now();
      const age = now - cached.timestamp;

      // Check if cache is still valid (within 1 hour)
      if (age < CACHE_DURATION) {
        return cached.url;
      }

      // Cache expired, remove it
      delete cacheRef.current[key];
      return null;
    },
    [getCacheKey],
  );

  const setCachedUrl = useCallback(
    (
      caseId: string,
      fileId: string,
      url: string,
      expiresIn: number = 86400,
    ) => {
      const key = getCacheKey(caseId, fileId);
      cacheRef.current[key] = {
        url,
        timestamp: Date.now(),
        expiresIn,
      };
    },
    [getCacheKey],
  );

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  const clearCacheForFile = useCallback(
    (caseId: string, fileId: string) => {
      const key = getCacheKey(caseId, fileId);
      delete cacheRef.current[key];
    },
    [getCacheKey],
  );

  return {
    getCachedUrl,
    setCachedUrl,
    clearCache,
    clearCacheForFile,
  };
}

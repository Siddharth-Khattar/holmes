import { useEffect, useRef, useCallback, useState } from "react";
import type { CommandCenterSSEEvent } from "@/types/command-center";
import { parseSSEEventData } from "@/lib/command-center-validation";

interface UseCommandCenterSSEOptions {
  enabled?: boolean;
  onAgentStarted?: (event: CommandCenterSSEEvent) => void;
  onAgentComplete?: (event: CommandCenterSSEEvent) => void;
  onAgentError?: (event: CommandCenterSSEEvent) => void;
  onProcessingComplete?: (event: CommandCenterSSEEvent) => void;
}

export function useCommandCenterSSE(
  caseId: string,
  options: UseCommandCenterSSEOptions,
) {
  const {
    enabled = true,
    onAgentStarted,
    onAgentComplete,
    onAgentError,
    onProcessingComplete,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  const setupConnection = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    try {
      const eventSource = new EventSource(
        `/api/cases/${caseId}/command-center/stream`,
      );

      eventSource.addEventListener("agent-started", (e) => {
        const event = parseSSEEventData(e.data);
        if (event && event.type === "agent-started") {
          onAgentStarted?.(event);
        }
      });

      eventSource.addEventListener("agent-complete", (e) => {
        const event = parseSSEEventData(e.data);
        if (event && event.type === "agent-complete") {
          onAgentComplete?.(event);
        }
      });

      eventSource.addEventListener("agent-error", (e) => {
        const event = parseSSEEventData(e.data);
        if (event && event.type === "agent-error") {
          onAgentError?.(event);
        }
      });

      eventSource.addEventListener("processing-complete", (e) => {
        const event = parseSSEEventData(e.data);
        if (event && event.type === "processing-complete") {
          onProcessingComplete?.(event);
        }
      });

      eventSource.onerror = () => {
        // Silently handle connection errors when endpoint doesn't exist yet
        // This is expected in demo mode before backend is implemented
        eventSource.close();
        eventSourceRef.current = null;
        setIsConnected(false);

        // Don't attempt reconnection if we've already tried multiple times
        // This prevents console spam when endpoint doesn't exist
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setIsReconnecting(true);
          reconnectAttemptsRef.current += 1;
          const delay =
            RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, delay);
        } else {
          setIsReconnecting(false);
          // Don't call onError for expected failures (endpoint not implemented)
          // onError?.(new Error("Max SSE reconnection attempts reached"));
        }
      };

      eventSource.onopen = () => {
        console.log("Command Center SSE connection established");
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setIsReconnecting(false);
      };

      eventSourceRef.current = eventSource;
    } catch {
      // Silently handle connection errors in demo mode
      console.debug("Command Center SSE not available (expected in demo mode)");
    }
  }, [
    enabled,
    caseId,
    onAgentStarted,
    onAgentComplete,
    onAgentError,
    onProcessingComplete,
  ]);

  useEffect(() => {
    connectRef.current = setupConnection;
  }, [setupConnection]);

  useEffect(() => {
    if (enabled) {
      setupConnection();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
      setIsReconnecting(false);
    };
  }, [enabled, setupConnection]);

  return {
    isConnected,
    isReconnecting,
    reconnect: setupConnection,
  };
}

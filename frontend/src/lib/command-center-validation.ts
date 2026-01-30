// Command Center SSE Event Validation
// Ensures backend events match expected format for backwards compatibility

import type {
  CommandCenterSSEEvent,
  AgentStartedEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  ProcessingCompleteEvent,
  AgentType,
} from "@/types/command-center";

const VALID_AGENT_TYPES: AgentType[] = [
  "triage",
  "orchestrator",
  "financial",
  "legal",
  "strategy",
  "knowledge-graph",
];

/**
 * Validates that a value is a valid AgentType
 */
function isValidAgentType(value: unknown): value is AgentType {
  return (
    typeof value === "string" && VALID_AGENT_TYPES.includes(value as AgentType)
  );
}

/**
 * Validates agent-started event
 */
function validateAgentStartedEvent(data: unknown): data is AgentStartedEvent {
  if (typeof data !== "object" || data === null) return false;

  const event = data as Record<string, unknown>;

  return (
    event.type === "agent-started" &&
    isValidAgentType(event.agentType) &&
    typeof event.taskId === "string" &&
    typeof event.fileId === "string" &&
    typeof event.fileName === "string"
  );
}

/**
 * Validates agent-complete event
 */
function validateAgentCompleteEvent(data: unknown): data is AgentCompleteEvent {
  if (typeof data !== "object" || data === null) return false;

  const event = data as Record<string, unknown>;

  if (
    event.type !== "agent-complete" ||
    !isValidAgentType(event.agentType) ||
    typeof event.taskId !== "string"
  ) {
    return false;
  }

  // Validate result object
  const result = event.result as Record<string, unknown>;
  if (typeof result !== "object" || result === null) return false;

  if (
    typeof result.taskId !== "string" ||
    !isValidAgentType(result.agentType) ||
    !Array.isArray(result.outputs)
  ) {
    return false;
  }

  // Validate outputs array
  for (const output of result.outputs) {
    if (
      typeof output !== "object" ||
      output === null ||
      typeof output.type !== "string"
    ) {
      return false;
    }

    // Confidence is optional but must be number if present
    if (
      output.confidence !== undefined &&
      (typeof output.confidence !== "number" ||
        output.confidence < 0 ||
        output.confidence > 1)
    ) {
      return false;
    }
  }

  // Validate optional routingDecisions
  if (result.routingDecisions !== undefined) {
    if (!Array.isArray(result.routingDecisions)) return false;

    for (const decision of result.routingDecisions) {
      if (
        typeof decision !== "object" ||
        decision === null ||
        typeof decision.fileId !== "string" ||
        !isValidAgentType(decision.targetAgent) ||
        typeof decision.reason !== "string" ||
        typeof decision.domainScore !== "number" ||
        decision.domainScore < 0 ||
        decision.domainScore > 1
      ) {
        return false;
      }
    }
  }

  // Validate optional toolsCalled
  if (result.toolsCalled !== undefined) {
    if (!Array.isArray(result.toolsCalled)) return false;
    for (const tool of result.toolsCalled) {
      if (typeof tool !== "string") return false;
    }
  }

  return true;
}

/**
 * Validates agent-error event
 */
function validateAgentErrorEvent(data: unknown): data is AgentErrorEvent {
  if (typeof data !== "object" || data === null) return false;

  const event = data as Record<string, unknown>;

  return (
    event.type === "agent-error" &&
    isValidAgentType(event.agentType) &&
    typeof event.taskId === "string" &&
    typeof event.error === "string"
  );
}

/**
 * Validates processing-complete event
 */
function validateProcessingCompleteEvent(
  data: unknown,
): data is ProcessingCompleteEvent {
  if (typeof data !== "object" || data === null) return false;

  const event = data as Record<string, unknown>;

  return (
    event.type === "processing-complete" &&
    typeof event.caseId === "string" &&
    typeof event.filesProcessed === "number" &&
    typeof event.entitiesCreated === "number" &&
    typeof event.relationshipsCreated === "number"
  );
}

/**
 * Validates any Command Center SSE event
 * Returns the validated event or null if invalid
 */
export function validateCommandCenterEvent(
  data: unknown,
): CommandCenterSSEEvent | null {
  if (typeof data !== "object" || data === null) {
    console.warn("Invalid SSE event: not an object", data);
    return null;
  }

  const event = data as Record<string, unknown>;

  switch (event.type) {
    case "agent-started":
      if (validateAgentStartedEvent(data)) {
        return data as AgentStartedEvent;
      }
      console.warn("Invalid agent-started event", data);
      return null;

    case "agent-complete":
      if (validateAgentCompleteEvent(data)) {
        return data as AgentCompleteEvent;
      }
      console.warn("Invalid agent-complete event", data);
      return null;

    case "agent-error":
      if (validateAgentErrorEvent(data)) {
        return data as AgentErrorEvent;
      }
      console.warn("Invalid agent-error event", data);
      return null;

    case "processing-complete":
      if (validateProcessingCompleteEvent(data)) {
        return data as ProcessingCompleteEvent;
      }
      console.warn("Invalid processing-complete event", data);
      return null;

    default:
      console.warn("Unknown event type", event.type);
      return null;
  }
}

/**
 * Safely parse SSE event data
 */
export function parseSSEEventData(
  eventData: string,
): CommandCenterSSEEvent | null {
  try {
    const parsed = JSON.parse(eventData);
    return validateCommandCenterEvent(parsed);
  } catch (error) {
    console.error("Failed to parse SSE event data", error);
    return null;
  }
}

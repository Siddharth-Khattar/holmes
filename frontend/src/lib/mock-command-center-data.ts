// Mock data generator for Command Center testing

import type {
  AgentType,
  AgentStartedEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  ProcessingCompleteEvent,
  AgentResult,
} from "@/types/command-center";

const MOCK_FILES = [
  "bank_statement_2023.pdf",
  "warehouse_footage.mp4",
  "email_thread.txt",
  "contract_agreement.pdf",
  "financial_report_q4.xlsx",
  "witness_testimony.txt",
  "security_camera_01.mp4",
  "invoice_12345.pdf",
];

const AGENT_SEQUENCE: AgentType[] = [
  "triage",
  "orchestrator",
  "financial",
  "legal",
  "strategy",
  "knowledge-graph",
];

export class MockCommandCenterEventGenerator {
  private currentFileIndex = 0;
  private currentAgentIndex = 0;
  private taskCounter = 0;

  generateAgentStartedEvent(): AgentStartedEvent {
    const agentType = AGENT_SEQUENCE[this.currentAgentIndex];
    const fileName = MOCK_FILES[this.currentFileIndex % MOCK_FILES.length];
    const taskId = `task-${++this.taskCounter}`;

    return {
      type: "agent-started",
      agentType,
      taskId,
      fileId: `file-${this.currentFileIndex}`,
      fileName,
    };
  }

  generateAgentCompleteEvent(
    taskId: string,
    agentType: AgentType,
  ): AgentCompleteEvent {
    const result: AgentResult = {
      taskId,
      agentType,
      outputs: this.generateMockOutputs(agentType),
      routingDecisions:
        agentType === "triage"
          ? this.generateMockRoutingDecisions()
          : undefined,
      toolsCalled: this.generateMockToolsCalled(agentType),
      metadata: {
        processingTime: Math.random() * 5000 + 1000,
        confidence: Math.random() * 0.3 + 0.7,
      },
    };

    return {
      type: "agent-complete",
      agentType,
      taskId,
      result,
    };
  }

  generateAgentErrorEvent(
    taskId: string,
    agentType: AgentType,
  ): AgentErrorEvent {
    const errors = [
      "Failed to parse document",
      "Timeout during processing",
      "Invalid file format",
      "Insufficient memory",
    ];

    return {
      type: "agent-error",
      agentType,
      taskId,
      error: errors[Math.floor(Math.random() * errors.length)],
    };
  }

  generateProcessingCompleteEvent(caseId: string): ProcessingCompleteEvent {
    return {
      type: "processing-complete",
      caseId,
      filesProcessed: this.currentFileIndex + 1,
      entitiesCreated: Math.floor(Math.random() * 100) + 50,
      relationshipsCreated: Math.floor(Math.random() * 50) + 20,
    };
  }

  private generateMockOutputs(agentType: AgentType) {
    const outputCount = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length: outputCount }, (_, i) => ({
      type: `${agentType}-output-${i}`,
      data: { result: `Mock output ${i} from ${agentType}` },
      confidence: Math.random() * 0.3 + 0.7,
    }));
  }

  private generateMockRoutingDecisions() {
    return [
      {
        fileId: `file-${this.currentFileIndex}`,
        targetAgent: "financial" as AgentType,
        reason: "Financial content detected",
        domainScore: 0.85,
      },
      {
        fileId: `file-${this.currentFileIndex}`,
        targetAgent: "legal" as AgentType,
        reason: "Legal terminology found",
        domainScore: 0.72,
      },
    ];
  }

  private generateMockToolsCalled(agentType: AgentType): string[] {
    const toolsByAgent: Record<AgentType, string[]> = {
      triage: [
        "file_analyzer()",
        "content_classifier()",
        "metadata_extractor()",
      ],
      orchestrator: [
        "task_scheduler()",
        "resource_allocator()",
        "priority_queue()",
      ],
      financial: [
        "pdf_table_extractor()",
        "transaction_analyzer()",
        "anomaly_detector()",
      ],
      legal: ["entity_extractor()", "citation_parser()", "clause_identifier()"],
      strategy: [
        "pattern_analyzer()",
        "cross_reference_finder()",
        "insight_generator()",
      ],
      "knowledge-graph": [
        "graph_builder()",
        "relationship_mapper()",
        "conflict_detector()",
      ],
    };

    return toolsByAgent[agentType] || [];
  }

  nextAgent() {
    this.currentAgentIndex =
      (this.currentAgentIndex + 1) % AGENT_SEQUENCE.length;
    if (this.currentAgentIndex === 0) {
      this.currentFileIndex++;
    }
  }

  reset() {
    this.currentFileIndex = 0;
    this.currentAgentIndex = 0;
    this.taskCounter = 0;
  }
}

// Simulate a processing flow
export async function simulateProcessingFlow(
  onEvent: (
    event:
      | AgentStartedEvent
      | AgentCompleteEvent
      | AgentErrorEvent
      | ProcessingCompleteEvent,
  ) => void,
  delayMs = 2000,
) {
  const generator = new MockCommandCenterEventGenerator();

  for (let fileIdx = 0; fileIdx < 3; fileIdx++) {
    for (const agentType of AGENT_SEQUENCE) {
      // Start event
      const startEvent = generator.generateAgentStartedEvent();
      onEvent(startEvent);

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Complete event (90% success rate)
      if (Math.random() > 0.1) {
        const completeEvent = generator.generateAgentCompleteEvent(
          startEvent.taskId,
          agentType,
        );
        onEvent(completeEvent);
      } else {
        const errorEvent = generator.generateAgentErrorEvent(
          startEvent.taskId,
          agentType,
        );
        onEvent(errorEvent);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs / 2));
      generator.nextAgent();
    }
  }

  // Processing complete
  const completeEvent = generator.generateProcessingCompleteEvent("case-123");
  onEvent(completeEvent);
}

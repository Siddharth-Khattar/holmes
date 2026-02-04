// Mock data generator for Command Center testing
// TODO: Remove demo state generation when backend SSE is fully integrated

import type {
  AgentType,
  AgentState,
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
        domainScore: 85, // 0-100 scale matching backend
      },
      {
        fileId: `file-${this.currentFileIndex}`,
        targetAgent: "legal" as AgentType,
        reason: "Legal terminology found",
        domainScore: 72, // 0-100 scale matching backend
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
      evidence: [
        "authenticity_verifier()",
        "chain_of_custody_tracker()",
        "corroboration_scorer()",
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

/**
 * Pre-populated agent states for visual testing when backend is unavailable.
 * Shows a realistic mid-pipeline state: triage and orchestrator complete,
 * financial processing, legal complete, strategy and KG idle/unchosen.
 *
 * TODO: Remove when backend SSE is fully integrated
 */
export function createDemoAgentStates(): Map<AgentType, AgentState> {
  const states = new Map<AgentType, AgentState>();

  states.set("triage", {
    id: "triage",
    type: "triage",
    status: "idle",
    lastResult: {
      taskId: "demo-triage-1",
      agentType: "triage",
      outputs: [
        {
          type: "triage-summary",
          data: {
            summary:
              "Case contains financial documents, legal contracts, and video evidence requiring multi-domain analysis.",
          },
          confidence: 0.92,
        },
      ],
      routingDecisions: [
        {
          fileId: "file-1",
          targetAgent: "financial",
          reason: "Bank statements and transaction records detected",
          domainScore: 91, // 0-100 scale matching backend
        },
        {
          fileId: "file-2",
          targetAgent: "legal",
          reason: "Contract documents with legal terminology",
          domainScore: 87, // 0-100 scale matching backend
        },
        {
          fileId: "file-3",
          targetAgent: "strategy",
          reason: "Communication patterns suggest strategic coordination",
          domainScore: 74, // 0-100 scale matching backend
        },
      ],
      toolsCalled: [
        "file_analyzer()",
        "content_classifier()",
        "metadata_extractor()",
      ],
      metadata: {
        processingTime: 2340,
        confidence: 0.92,
        model: "gemini-2.5-flash",
        domain_scores: {
          financial: 0.91,
          legal: 0.87,
          strategy: 0.74,
          evidence: 0.65,
        },
        complexity: "high",
        entities: [
          "Acme Corp",
          "John Doe",
          "Wire Transfer #4521",
          "Contract §4.2",
        ],
      },
    },
    processingHistory: [
      {
        taskId: "demo-triage-1",
        fileId: "file-1",
        fileName: "bank_statement_2023.pdf",
        startedAt: new Date(Date.now() - 120000),
        completedAt: new Date(Date.now() - 117000),
        status: "complete",
      },
    ],
  });

  states.set("orchestrator", {
    id: "orchestrator",
    type: "orchestrator",
    status: "idle",
    lastResult: {
      taskId: "demo-orch-1",
      agentType: "orchestrator",
      outputs: [
        {
          type: "routing-plan",
          data: {
            summary:
              "Routing 5 files to 3 domain agents based on content analysis. Financial and legal domains are primary.",
          },
          confidence: 0.88,
        },
      ],
      toolsCalled: [
        "task_scheduler()",
        "resource_allocator()",
        "priority_queue()",
      ],
      metadata: {
        processingTime: 3120,
        confidence: 0.88,
        model: "gemini-2.5-pro",
        routing_summary:
          "5 files routed: 2 financial, 2 legal, 1 strategy. High complexity case.",
        warnings: ["Large document set — processing may be slow"],
        file_routing: [
          { file: "bank_statement_2023.pdf", target: "financial" },
          { file: "financial_report_q4.xlsx", target: "financial" },
          { file: "contract_agreement.pdf", target: "legal" },
          { file: "witness_testimony.txt", target: "legal" },
          { file: "email_thread.txt", target: "strategy" },
        ],
      },
    },
    processingHistory: [
      {
        taskId: "demo-orch-1",
        fileId: "file-1",
        fileName: "case_analysis",
        startedAt: new Date(Date.now() - 115000),
        completedAt: new Date(Date.now() - 112000),
        status: "complete",
      },
    ],
  });

  states.set("financial", {
    id: "financial",
    type: "financial",
    status: "processing",
    currentTask: {
      taskId: "demo-fin-1",
      fileId: "file-1",
      fileName: "bank_statement_2023.pdf",
      startedAt: new Date(Date.now() - 5000),
      status: "processing",
    },
    processingHistory: [],
  });

  states.set("legal", {
    id: "legal",
    type: "legal",
    status: "idle",
    lastResult: {
      taskId: "demo-legal-1",
      agentType: "legal",
      outputs: [
        {
          type: "legal-analysis",
          data: {
            summary:
              "Contract breach identified in §4.2 — non-compete clause violated. Witness testimony corroborates timeline.",
          },
          confidence: 0.85,
        },
      ],
      toolsCalled: [
        "entity_extractor()",
        "citation_parser()",
        "clause_identifier()",
      ],
      metadata: {
        processingTime: 4200,
        confidence: 0.85,
        model: "gemini-2.5-pro",
      },
    },
    processingHistory: [
      {
        taskId: "demo-legal-1",
        fileId: "file-2",
        fileName: "contract_agreement.pdf",
        startedAt: new Date(Date.now() - 60000),
        completedAt: new Date(Date.now() - 56000),
        status: "complete",
      },
    ],
  });

  states.set("strategy", {
    id: "strategy",
    type: "strategy",
    status: "idle",
    processingHistory: [],
  });
  states.set("knowledge-graph", {
    id: "knowledge-graph",
    type: "knowledge-graph",
    status: "idle",
    processingHistory: [],
  });

  return states;
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

# ABOUTME: Pydantic schemas for agent execution logging and triage output.
# ABOUTME: Defines structured output types for Triage Agent results and CRUD schemas for execution records.

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.agent_execution import AgentExecutionStatus


class DomainScore(BaseModel):
    """Confidence score for a single investigation domain.

    Each file is scored across domains (financial, legal, strategy, evidence)
    to determine which domain specialists should process it.
    """

    domain: Literal["financial", "legal", "strategy", "evidence"] = Field(
        ..., description="Investigation domain category"
    )
    score: float = Field(..., ge=0, le=100, description="Confidence score 0-100")
    reasoning: str | None = Field(
        default=None, description="Brief rationale for the score"
    )


class ExtractedEntity(BaseModel):
    """Entity extracted from a file during triage.

    Quick entity extraction provides an initial knowledge graph seed
    before full domain analysis.
    """

    type: Literal[
        "person", "organization", "date", "location", "amount", "legal_term"
    ] = Field(..., description="Entity type category")
    value: str = Field(..., description="Extracted entity value")
    context: str | None = Field(
        default=None, description="Surrounding text for disambiguation"
    )
    confidence: float = Field(
        default=1.0,
        ge=0,
        le=1,
        description="Extraction confidence 0-1",
    )


class FileSummary(BaseModel):
    """Short and detailed summaries of a file's content."""

    short: str = Field(..., max_length=200, description="1-2 sentence summary")
    detailed: str = Field(..., max_length=2000, description="Paragraph-length summary")


class ComplexityAssessment(BaseModel):
    """Complexity tier assessment for routing to appropriate model/thinking level.

    Uses a hybrid approach: AI estimates tier, token metadata refines when available.
    """

    tier: Literal["low", "medium", "high"] = Field(
        ..., description="Complexity tier for model routing"
    )
    token_estimate: int | None = Field(
        default=None,
        description="Estimated token count from ADK metadata when available",
    )
    reasoning: str | None = Field(
        default=None, description="Rationale for the complexity assessment"
    )


class FileGrouping(BaseModel):
    """Suggested grouping of related files for batch processing."""

    group_name: str = Field(..., description="Descriptive name for the group")
    file_ids: list[str] = Field(..., description="IDs of files in this group")
    reason: str = Field(..., description="Why these files should be processed together")


class TriageFileResult(BaseModel):
    """Triage output for a single file.

    Contains domain scores, extracted entities, summaries, complexity
    assessment, and corruption detection results.
    """

    file_id: str = Field(..., description="ID of the analyzed file")
    domain_scores: list[DomainScore] = Field(
        ..., description="Confidence scores per investigation domain"
    )
    entities: list[ExtractedEntity] = Field(
        default_factory=list, description="Entities extracted from the file"
    )
    summary: FileSummary = Field(..., description="Short and detailed file summaries")
    complexity: ComplexityAssessment = Field(
        ..., description="Complexity tier assessment"
    )
    confidence: float = Field(
        ...,
        ge=0,
        le=1,
        description="Overall extraction confidence for this file",
    )
    is_corrupted: bool = Field(
        default=False,
        description="Whether the file appears corrupted or unreadable",
    )
    corruption_notes: str | None = Field(
        default=None,
        description="Details about corruption if detected",
    )


class TriageOutput(BaseModel):
    """Complete output from the Triage Agent for a set of files.

    Aggregates per-file results with cross-file grouping suggestions
    and total token estimates for downstream planning.
    """

    file_results: list[TriageFileResult] = Field(
        ..., description="Per-file triage results"
    )
    suggested_groupings: list[FileGrouping] = Field(
        default_factory=list,
        description="Suggested file groupings for batch processing",
    )
    total_token_estimate: int | None = Field(
        default=None,
        description="Estimated total tokens across all files",
    )


# --- Agent execution CRUD schemas ---


class AgentExecutionCreate(BaseModel):
    """Schema for creating a new agent execution record."""

    case_id: UUID = Field(..., description="ID of the case being analyzed")
    workflow_id: UUID = Field(
        ..., description="ID grouping executions in the same analysis run"
    )
    agent_name: str = Field(..., description="Logical agent name, e.g. 'triage'")
    agent_type: str = Field(..., description="ADK agent class, e.g. 'LlmAgent'")
    model_name: str = Field(..., description="Gemini model ID used for this execution")
    input_data: dict = Field(..., description="Agent input context")
    parent_execution_id: UUID | None = Field(
        default=None, description="Parent execution ID for sub-agent tracking"
    )


class AgentExecutionUpdate(BaseModel):
    """Schema for updating an existing agent execution record."""

    status: AgentExecutionStatus | None = Field(
        default=None, description="Updated execution status"
    )
    output_data: dict | None = Field(
        default=None, description="Structured agent output"
    )
    thinking_traces: list[dict] | None = Field(
        default=None, description="Captured thinking/reasoning traces"
    )
    tools_called: list[dict] | None = Field(
        default=None, description="Tool invocation log"
    )
    error_message: str | None = Field(
        default=None, description="Error message if execution failed"
    )
    input_tokens: int | None = Field(default=None, description="Input token count")
    output_tokens: int | None = Field(default=None, description="Output token count")
    completed_at: datetime | None = Field(
        default=None, description="Completion timestamp"
    )


class AgentExecutionResponse(BaseModel):
    """API response model for a single agent execution record."""

    id: UUID = Field(..., description="Execution record ID")
    case_id: UUID = Field(..., description="ID of the analyzed case")
    workflow_id: UUID = Field(..., description="Workflow group ID")
    agent_name: str = Field(..., description="Logical agent name")
    agent_type: str = Field(..., description="ADK agent class")
    model_name: str = Field(..., description="Gemini model ID")
    status: AgentExecutionStatus = Field(..., description="Execution status")
    parent_execution_id: UUID | None = Field(
        default=None, description="Parent execution ID"
    )
    input_data: dict = Field(..., description="Agent input context")
    output_data: dict | None = Field(
        default=None, description="Structured agent output"
    )
    thinking_traces: list[dict] | None = Field(
        default=None, description="Thinking traces"
    )
    tools_called: list[dict] | None = Field(
        default=None, description="Tool invocation log"
    )
    error_message: str | None = Field(default=None, description="Error message")
    input_tokens: int | None = Field(default=None, description="Input token count")
    output_tokens: int | None = Field(default=None, description="Output token count")
    started_at: datetime = Field(..., description="Execution start time")
    completed_at: datetime | None = Field(
        default=None, description="Execution completion time"
    )
    created_at: datetime = Field(..., description="Record creation time")
    updated_at: datetime = Field(..., description="Record last update time")

    model_config = ConfigDict(from_attributes=True)

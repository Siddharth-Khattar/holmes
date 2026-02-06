# ABOUTME: Financial domain agent for extracting transactions, anomalies, and account relationships.
# ABOUTME: Thin subclass of DomainAgentRunner with financial-specific content preparation.

import logging
from uuid import UUID

from google.adk.agents import LlmAgent
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import MODEL_PRO, PublishFn
from app.agents.domain_agent_runner import DomainAgentRunner
from app.agents.factory import AgentFactory
from app.models.file import CaseFile
from app.schemas.agent import FinancialOutput

logger = logging.getLogger(__name__)


class FinancialAgent:
    """Financial Agent for domain-specific financial analysis.

    Wraps ADK LlmAgent creation with case-specific configuration.
    Each instance is intended for a single workflow execution.
    """

    def __init__(
        self,
        case_id: str,
        model: str = MODEL_PRO,
        publish_fn: PublishFn | None = None,
    ) -> None:
        self.case_id = case_id
        self._agent = AgentFactory.create_financial_agent(
            case_id=case_id,
            model=model,
            publish_fn=publish_fn,
        )

    @property
    def agent(self) -> LlmAgent:
        """Access the underlying ADK LlmAgent."""
        return self._agent


class FinancialAgentRunner(DomainAgentRunner[FinancialOutput]):
    """Financial domain agent runner with financial-specific content preparation."""

    def get_agent_name(self) -> str:
        return "financial"

    def _get_output_type(self) -> type[FinancialOutput]:
        return FinancialOutput

    def _create_agent_instance(
        self,
        case_id: str,
        model: str,
        publish_fn: PublishFn | None,
    ) -> LlmAgent:
        return FinancialAgent(case_id=case_id, model=model, publish_fn=publish_fn).agent

    async def _prepare_content(
        self,
        files: list[CaseFile],
        gcs_bucket: str,
        hypotheses: list[dict[str, object]],
        context_injection: str | None = None,
        **kwargs: object,
    ) -> types.Content:
        return await self._build_standard_content(
            domain_prompt=(
                "Analyze the following documents for financial insights. "
                "Extract transactions, amounts, anomalies, and account relationships."
            ),
            files=files,
            gcs_bucket=gcs_bucket,
            hypotheses=hypotheses,
            context_injection=context_injection,
        )


async def run_financial(
    case_id: str,
    workflow_id: str,
    user_id: str,
    files: list[CaseFile],
    hypotheses: list[dict[str, object]],
    db_session: AsyncSession,
    publish_event: PublishFn | None = None,
    parent_execution_id: UUID | None = None,
    context_injection: str | None = None,
    stage_suffix: str = "",
) -> FinancialOutput | None:
    """Run financial analysis on a set of files.

    Backward-compatible public function delegating to FinancialAgentRunner.
    """
    return await FinancialAgentRunner().run(
        case_id=case_id,
        workflow_id=workflow_id,
        user_id=user_id,
        files=files,
        hypotheses=hypotheses,
        db_session=db_session,
        publish_event=publish_event,
        parent_execution_id=parent_execution_id,
        context_injection=context_injection,
        stage_suffix=stage_suffix,
    )

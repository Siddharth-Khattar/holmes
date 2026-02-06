# ABOUTME: Example integration of PDF redaction with existing agent system.
# ABOUTME: Shows how redaction can be called from orchestrator or domain agents.

"""
This file demonstrates how the PDFRedactionAgent can be integrated
into the existing Holmes agent workflow. It is NOT meant to be executed
directly, but serves as a reference for future integration work.
"""

from typing import Any

# Example 1: Standalone redaction as a preprocessing step
async def preprocess_case_files_with_redaction(
    case_id: str,
    files: list[Any],  # CaseFile objects
    redaction_rules: dict[str, str],  # file_id -> redaction_prompt
) -> list[Any]:
    """Redact sensitive files before passing to domain agents.

    This could be called before the orchestrator starts, allowing users
    to redact sensitive information from source documents.

    Args:
        case_id: The case ID
        files: List of case files
        redaction_rules: Mapping of file_id to redaction prompts

    Returns:
        List of files with redacted versions added
    """
    from app.agents.redaction import PDFRedactionAgent

    agent = PDFRedactionAgent()
    redacted_files = []

    for file in files:
        if file.id in redaction_rules:
            # Download from GCS
            local_path = await download_file(file.gcs_path)

            # Redact
            output_path, response = agent.redact_pdf(
                local_path, redaction_rules[file.id]
            )

            # Upload redacted version
            redacted_gcs_path = await upload_file(output_path, case_id)

            # Create new file record
            redacted_file = await create_case_file(
                case_id=case_id,
                filename=f"{file.filename}_redacted.pdf",
                gcs_path=redacted_gcs_path,
                metadata={
                    "redacted_from": file.id,
                    "redaction_count": len(response.targets),
                },
            )
            redacted_files.append(redacted_file)

    return files + redacted_files


# Example 2: Redaction as a tool for domain agents
class RedactionTool:
    """ADK tool that allows domain agents to request redaction.

    This would allow agents to say "I need this document redacted
    before I can analyze it" during their workflow.
    """

    name = "redact_document"
    description = "Redact sensitive information from a PDF document"

    async def execute(
        self,
        file_id: str,
        redaction_prompt: str,
        context: Any,  # ToolContext
    ) -> dict[str, Any]:
        """Execute redaction and return new file ID."""
        from app.agents.redaction import PDFRedactionAgent

        # Get file from context
        file = await get_file_by_id(file_id)

        # Download and redact
        local_path = await download_file(file.gcs_path)
        agent = PDFRedactionAgent()
        output_path, response = agent.redact_pdf(local_path, redaction_prompt)

        # Upload and return
        redacted_gcs_path = await upload_file(output_path, context.case_id)
        redacted_file = await create_case_file(
            case_id=context.case_id,
            filename=f"{file.filename}_redacted.pdf",
            gcs_path=redacted_gcs_path,
        )

        return {
            "redacted_file_id": redacted_file.id,
            "redaction_count": len(response.targets),
            "reasoning": response.reasoning,
        }


# Example 3: Post-analysis redaction for output documents
async def redact_agent_output(
    case_id: str,
    output_document_path: str,
    sensitivity_level: str = "high",
) -> str:
    """Redact sensitive information from agent-generated reports.

    This could be used to automatically redact PII from final reports
    before sharing with clients or external parties.

    Args:
        case_id: The case ID
        output_document_path: Path to the generated report
        sensitivity_level: "low", "medium", or "high"

    Returns:
        Path to redacted output document
    """
    from app.agents.redaction import PDFRedactionAgent

    # Define redaction rules based on sensitivity
    redaction_prompts = {
        "low": "Redact SSN and credit card numbers",
        "medium": "Redact all PII including names, addresses, and contact info",
        "high": "Redact all PII, financial data, and confidential business information",
    }

    prompt = redaction_prompts.get(sensitivity_level, redaction_prompts["medium"])

    agent = PDFRedactionAgent()
    output_path, response = agent.redact_pdf(output_document_path, prompt)

    return output_path


# Example 4: Batch redaction for case closure
async def redact_all_case_files_for_export(
    case_id: str,
    export_sensitivity: str = "high",
) -> list[str]:
    """Redact all case files before exporting for external review.

    This could be triggered when a case is marked for external review,
    automatically redacting all documents to the specified level.

    Args:
        case_id: The case ID
        export_sensitivity: Redaction level for export

    Returns:
        List of redacted file IDs
    """
    from app.agents.redaction import PDFRedactionAgent

    files = await get_case_files(case_id)
    agent = PDFRedactionAgent()
    redacted_ids = []

    redaction_prompt = {
        "low": "Redact SSN and account numbers",
        "medium": "Redact all PII",
        "high": "Redact all sensitive information including PII, financial data, and confidential details",
    }[export_sensitivity]

    for file in files:
        if file.file_type == "application/pdf":
            local_path = await download_file(file.gcs_path)
            output_path, response = agent.redact_pdf(local_path, redaction_prompt)

            redacted_gcs_path = await upload_file(output_path, case_id)
            redacted_file = await create_case_file(
                case_id=case_id,
                filename=f"EXPORT_{file.filename}",
                gcs_path=redacted_gcs_path,
                metadata={
                    "export_redaction": True,
                    "sensitivity_level": export_sensitivity,
                    "redaction_count": len(response.targets),
                },
            )
            redacted_ids.append(redacted_file.id)

    return redacted_ids


# Placeholder functions (would be implemented in actual integration)
async def download_file(gcs_path: str) -> str:
    """Download file from GCS to local temp file."""
    raise NotImplementedError


async def upload_file(local_path: str, case_id: str) -> str:
    """Upload file to GCS and return GCS path."""
    raise NotImplementedError


async def get_file_by_id(file_id: str) -> Any:
    """Get CaseFile by ID."""
    raise NotImplementedError


async def create_case_file(case_id: str, filename: str, gcs_path: str, **kwargs) -> Any:
    """Create new CaseFile record."""
    raise NotImplementedError


async def get_case_files(case_id: str) -> list[Any]:
    """Get all files for a case."""
    raise NotImplementedError

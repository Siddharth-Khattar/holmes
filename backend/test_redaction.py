#!/usr/bin/env python3
"""Test script for PDF redaction agent."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.agents.redaction import PDFRedactionAgent


def test_redaction():
    """Test the redaction agent with a sample PDF."""
    # Initialize agent
    agent = PDFRedactionAgent()

    # Example usage
    pdf_path = "sample.pdf"  # Replace with actual PDF
    redaction_prompt = "Redact all personal names, phone numbers, and email addresses"

    print(f"Testing redaction on: {pdf_path}")
    print(f"Prompt: {redaction_prompt}\n")

    try:
        output_file, response = agent.redact_pdf(pdf_path, redaction_prompt)

        print("✓ Success!")
        print(f"  Output: {output_file}")
        print(f"  Redacted: {len(response.targets)} items")
        print(f"  Reasoning: {response.reasoning}\n")

        print("Redaction targets:")
        for i, target in enumerate(response.targets, 1):
            print(f"  {i}. Page {target.page}: {target.text[:50]}...")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_redaction()

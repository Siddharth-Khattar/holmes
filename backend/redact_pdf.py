#!/usr/bin/env python3
"""Standalone PDF redaction script using Gemini 3 Flash.

Usage:
    python redact_pdf.py input.pdf "Redact all names and phone numbers"
    python redact_pdf.py input.pdf "Remove SSN and credit card numbers" --output secure.pdf
"""

import argparse
import sys
from pathlib import Path

# Add app to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.agents.redaction import redact_pdf_file


def main():
    parser = argparse.ArgumentParser(
        description="Redact PDF content using Gemini AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Redact personal information
  python redact_pdf.py contract.pdf "Redact all personal names and addresses"
  
  # Redact financial data with custom output
  python redact_pdf.py report.pdf "Remove all dollar amounts and account numbers" -o clean.pdf
  
  # Redact with custom API key
  GEMINI_API_KEY=your_key python redact_pdf.py doc.pdf "Redact SSN and phone numbers"
        """,
    )

    parser.add_argument("pdf_file", help="Path to input PDF file")
    parser.add_argument(
        "redaction_prompt",
        help="Natural language description of what to redact",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Output PDF path (default: input_redacted.pdf)",
        default=None,
    )
    parser.add_argument(
        "--api-key",
        help="Gemini API key (default: GEMINI_API_KEY env var)",
        default=None,
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--permanent",
        action="store_true",
        help="Permanently remove text (default: visual covering only)",
    )

    args = parser.parse_args()

    # Setup logging
    if args.verbose:
        import logging

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )

    # Validate input file
    input_path = Path(args.pdf_file)
    if not input_path.exists():
        print(f"Error: File not found: {args.pdf_file}", file=sys.stderr)
        sys.exit(1)

    if not input_path.suffix.lower() == ".pdf":
        print(
            f"Error: Input must be a PDF file: {args.pdf_file}",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        print(f"Processing: {args.pdf_file}")
        print(f"Redaction criteria: {args.redaction_prompt}")
        print(
            f"Mode: {'Permanent removal' if args.permanent else 'Visual covering (default)'}"
        )
        print()

        output_file, info = redact_pdf_file(
            pdf_path=str(input_path),
            redaction_prompt=args.redaction_prompt,
            output_path=args.output,
            api_key=args.api_key,
            permanent=args.permanent,
        )

        print("✓ Redaction complete!")
        print(f"  Output: {output_file}")
        print(f"  Redacted items: {info['redaction_count']}")

        if info["reasoning"]:
            print(f"  Reasoning: {info['reasoning']}")

        if args.verbose and info["targets"]:
            print("\nRedacted content:")
            for i, target in enumerate(info["targets"], 1):
                text_preview = target["text"][:50]
                if len(target["text"]) > 50:
                    text_preview += "..."
                print(f"  {i}. Page {target['page']}: {text_preview}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback

            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

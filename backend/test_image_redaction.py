#!/usr/bin/env python3
"""Test the image redaction API endpoint

This script tests the image redaction feature by sending a test image
to the backend API endpoint.
"""

import base64
import sys
from pathlib import Path

import requests


def test_image_redaction():
    """Test image redaction with a sample image."""
    # API endpoint
    API_URL = "http://localhost:8080"

    print("Testing Image Redaction API")
    print("=" * 50)

    # Check if a test image is provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        print("Usage: python test_image_redaction.py <image_path> [prompt]")
        print("\nExample:")
        print("  python test_image_redaction.py test_image.jpg 'Blur all faces'")
        return

    if not Path(image_path).exists():
        print(f"Error: Image not found: {image_path}")
        return

    # Get prompt from command line or use default
    prompt = sys.argv[2] if len(sys.argv) > 2 else "Blur all faces"
    method = "blur"

    print(f"Image: {image_path}")
    print(f"Prompt: {prompt}")
    print(f"Method: {method}")
    print()

    # Read image file
    with open(image_path, "rb") as f:
        image_data = f.read()

    # Prepare form data
    files = {"file": (Path(image_path).name, image_data, "image/jpeg")}
    data = {
        "prompt": prompt,
        "method": method,
    }

    print("Sending request to API...")
    try:
        response = requests.post(
            f"{API_URL}/api/redact/image",
            files=files,
            data=data,
            timeout=300,
        )

        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return

        result = response.json()

        print("✅ Success!")
        print(f"Segments found: {result['segments_found']}")
        print(f"Segments censored: {result['segments_censored']}")
        print(f"Categories: {result['categories_selected']}")
        print(f"Processing time: {result['processing_time_seconds']:.2f}s")
        print(f"Method: {result['method']}")

        # Save results
        stem = Path(image_path).stem

        # Save censored image
        censored_path = f"{stem}_censored.jpg"
        with open(censored_path, "wb") as f:
            f.write(base64.b64decode(result["censored_image"]))
        print(f"\n📸 Censored image saved: {censored_path}")

        # Save visualization
        vis_path = f"{stem}_visualization.jpg"
        with open(vis_path, "wb") as f:
            f.write(base64.b64decode(result["visualization_image"]))
        print(f"📸 Visualization saved: {vis_path}")

    except requests.RequestException as e:
        print(f"❌ Request failed: {e}")
        print("\nMake sure the backend is running:")
        print("  cd backend && uv run uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_image_redaction()

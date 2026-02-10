#!/usr/bin/env python3
"""Test the video redaction API endpoint

This script tests the video redaction feature by sending a test video
to the backend API endpoint.
"""

import base64
import sys
from datetime import datetime
from pathlib import Path

import requests


def test_video_redaction():
    """Test video redaction with a sample video."""
    # API endpoint
    API_URL = "http://localhost:8080"

    print("Testing Video Redaction API")
    print("=" * 60)

    # Check if a test video is provided
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
    else:
        print("Usage: python test_video_redaction.py <video_path> [prompt] [method]")
        print("\nExample:")
        print("  python test_video_redaction.py test_video.mp4 'Blur all faces' blur")
        print("\nMethods: blur, pixelate, blackbox")
        return

    if not Path(video_path).exists():
        print(f"Error: Video not found: {video_path}")
        return

    # Get prompt and method from command line or use defaults
    prompt = sys.argv[2] if len(sys.argv) > 2 else "Blur all faces"
    method = sys.argv[3] if len(sys.argv) > 3 else "blur"

    if method not in {"blur", "pixelate", "blackbox"}:
        print(f"Error: Invalid method '{method}'. Must be: blur, pixelate, or blackbox")
        return

    print(f"Video: {video_path}")
    print(f"Prompt: {prompt}")
    print(f"Method: {method}")
    print()

    # Check file size
    file_size_mb = Path(video_path).stat().st_size / (1024 * 1024)
    print(f"File size: {file_size_mb:.2f} MB")

    if file_size_mb > 100:
        print("⚠️  Warning: File is large, processing may take a while")

    # Read video file
    with open(video_path, "rb") as f:
        video_data = f.read()

    # Prepare form data
    files = {"file": (Path(video_path).name, video_data, "video/mp4")}
    data = {
        "prompt": prompt,
        "method": method,
    }

    print("\nSending request to API...")
    print("⏳ Processing... (this may take 2-10 minutes)")
    print(f"Started at: {datetime.now().strftime('%H:%M:%S')}")
    print()

    start_time = datetime.now()

    try:
        response = requests.post(
            f"{API_URL}/api/redact/video",
            files=files,
            data=data,
            timeout=900,  # 15 minute timeout
        )

        elapsed = (datetime.now() - start_time).total_seconds()

        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return

        result = response.json()

        print(f"✅ Success! (completed in {elapsed:.1f}s)")
        print()
        print("📊 Summary:")
        print(f"  Categories: {result['categories_selected']}")
        print(f"  Reasoning: {result.get('agent1_reasoning', 'N/A')[:100]}...")
        print(f"  Segments found: {result['segments_found']}")
        print(f"  Segments censored: {result['segments_censored']}")
        print(f"  Frames processed: {result['frames_processed']}")
        print(f"  Video duration: {result['video_duration_seconds']:.1f}s")
        print(f"  Processing time: {result['processing_time_seconds']:.1f}s")
        print(f"  Method: {result['method']}")

        # Save results
        stem = Path(video_path).stem
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Save censored video
        censored_path = f"{stem}_censored_{timestamp}.mp4"
        with open(censored_path, "wb") as f:
            f.write(base64.b64decode(result["censored_video"]))
        print(f"\n🎬 Censored video saved: {censored_path}")

        # Save visualization
        vis_path = f"{stem}_visualization_{timestamp}.jpg"
        with open(vis_path, "wb") as f:
            f.write(base64.b64decode(result["visualization_image"]))
        print(f"📸 Visualization saved: {vis_path}")

        # Save logs
        if result.get("logs"):
            log_path = f"{stem}_logs_{timestamp}.txt"
            with open(log_path, "w") as f:
                f.write("Video Censorship Pipeline Logs\n")
                f.write(f"Generated: {datetime.now().isoformat()}\n")
                f.write(f"Video: {video_path}\n")
                f.write(f"Prompt: {prompt}\n")
                f.write(f"Method: {method}\n")
                f.write("=" * 60 + "\n\n")
                for log in result["logs"]:
                    f.write(log + "\n")
            print(f"📝 Logs saved: {log_path}")

            # Print last 20 logs
            print("\n📋 Pipeline Logs (last 20 entries):")
            for log in result["logs"][-20:]:
                if "[ERROR]" in log:
                    print(f"  ❌ {log}")
                elif "[WARN]" in log:
                    print(f"  ⚠️  {log}")
                else:
                    print(f"  ℹ️  {log}")

    except requests.Timeout:
        print("❌ Request timed out after 15 minutes")
        print("   Video may be too long or complex")
    except requests.RequestException as e:
        print(f"❌ Request failed: {e}")
        print("\nMake sure the backend is running:")
        print("  cd backend && uv run uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_video_redaction()

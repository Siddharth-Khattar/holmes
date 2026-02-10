# Holmes - AI-Powered Legal and Investigation Intelligence Platform

## Inspiration

Legal professionals and investigators spend a large amount of their time manually reviewing evidence, which includes cross-referencing documents, videos, audio, and images for connections and contradictions. Holmes aims to make this this through domain-specialized AI agents, turning weeks of analysis into minutes of transparent, citation-grounded intelligence.

## What it does

With Holmes, investigators can easily input a large amount of multimodal (Mp3 Audio, Mp4 Videos, JPEG/png images, PDFs) case evidence files and Holmes then orchestrates specialized agents - Financial, Legal, Evidence, Knowledge Graph, Synthesis and Geospatial - that extract entities, detect contradictions, identify gaps, generate hypotheses, and build a complete red string board of all the key insights from a case's evidence files. 

Users can interact through five views: Agent Flow (real-time showcase of the agentic pipeline), Knowledge Graph (all the case enitities and their relationships), Timeline, Geospatial Map, and Verdict dashboard. A Chat agent answers questions grounded in clickable source citations. The Investigator's Notebook captures voice and text notes, while AI-powered redaction agents censor sensitive content across PDFs (black boxes), images (blur and pixelate), audio (bleep) and videos (blur, pixelate, blackbox) via natural language prompts - Gemini identifies targets, then applies pixel-level censorship (for videos and images, self-hosted locally deployed instances of SAM2 and SAM3 are utilised).

## How we built it - Gemini 3 at the Core

- **Deep Thinking & Reasoning:** All agents use Gemini 3's `ThinkingConfig` at HIGH level via Google ADK's `BuiltInPlanner`, enabling the Orchestrator to reason about routing and Synthesis to cross-reference findings holistically.

- **Native Multimodality:** Gemini 3 models process PDFs, videos, audio, and images natively. This allows specialised domain agents to receive raw files with configurable `media_resolution` (HIGH for forensic analysis, MEDIUM for strategy). Files ≤100MB go inline; larger files use Gemini's File API (up to 2GB).

- **1M Token Context Window:** Stage-isolated ADK sessions feed the Synthesis Agents all their generated findings, entities, and relationships in one call - enabling cross-domain contradiction detection - which is usually not possible with smaller windows.

- **Architecture:** 9 Gemini 3 agents orchestrated via Google ADK with PostgreSQL-backed stage-isolated sessions, Pro-to-Flash fallbacks, parallel execution, SSE streaming with thinking traces, and tool-based Chat. Orchestrator agent gets the autonomy to decide how many instances of a domain agent to spawn based on the case requirements derived from the initial triage.

### Stack
**Frontend:**
- Next.js 16
- React 19
- D3.js
- React Flow

**Backend:**
- FastAPI
- Google ADK
- Cloud Run
- Cloud SQL
- GCS

## Impact

Holmes transforms complex investigation from manual review into AI-augmented intelligence - surfacing connections humans miss, detecting cross-modal contradictions, and generating hypotheses. Every conclusion traces to its exact source, building the trust legal work demands.

## What's next for Holmes

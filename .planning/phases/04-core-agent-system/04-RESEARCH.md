# Phase 4: Core Agent System - Research

**Researched:** 2026-02-02
**Domain:** Google ADK (Agent Development Kit), Gemini 3 models, agent infrastructure
**Confidence:** MEDIUM-HIGH (verified with official docs, some areas need runtime validation)

## Summary

This research covers establishing Google ADK infrastructure with PostgreSQL session storage, GCS artifact storage, and implementing the Triage and Orchestrator agents. The ADK ecosystem is mature (v1.23.0) with solid documentation, though some limitations require workarounds.

Key findings:
- **DatabaseSessionService** works with PostgreSQL via asyncpg driver but has schema migration considerations
- **GcsArtifactService** provides built-in versioning ideal for audit trails
- **Gemini 3 Flash/Pro** models use `thinking_level` parameter (not `thinking_budget`)
- **Single parent constraint** requires factory pattern for reusable agent logic
- **Callback system** provides 6 hooks for SSE event mapping
- **State scopes** (`user:`, `app:`, `temp:`) enable proper namespacing

**Primary recommendation:** Use google-adk v1.23.0 with PostgreSQL via asyncpg, implement agent factory pattern for fresh instances, and map ADK callbacks to SSE events for real-time visualization.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| google-adk | 1.23.0 | Agent orchestration framework | Official Google ADK, bi-weekly releases, production-ready |
| google-genai | (bundled) | Gemini API client | Required by ADK for LLM calls |
| asyncpg | latest | PostgreSQL async driver | Required for DatabaseSessionService async operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| google-cloud-storage | >=2.19.0 | GCS operations | Already in codebase, used by GcsArtifactService internally |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DatabaseSessionService | InMemorySessionService | In-memory loses data on restart, but supports tool confirmation |
| DatabaseSessionService | VertexAiSessionService | Requires Agent Engine migration, adds complexity |
| PostgreSQL (asyncpg) | SQLite | SQLite doesn't support concurrent writes well at scale |

**Installation:**
```bash
# Add to backend/pyproject.toml dependencies
pip install google-adk>=1.23.0 asyncpg
```

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
├── agents/                    # Agent definitions
│   ├── __init__.py
│   ├── base.py               # Base agent configurations, callbacks
│   ├── factory.py            # Agent factory (fresh instances per workflow)
│   ├── triage.py             # Triage Agent implementation
│   └── orchestrator.py       # Orchestrator Agent implementation
├── services/
│   ├── adk_service.py        # ADK Runner, session service initialization
│   ├── agent_events.py       # Callback-to-SSE event mapping
│   └── file_service.py       # (existing)
├── models/
│   ├── agent_execution.py    # SQLAlchemy models for execution logging
│   └── ...
└── api/
    ├── agents.py             # Agent execution endpoints
    └── sse.py                # (existing, extend for agent events)
```

### Pattern 1: Agent Factory Pattern
**What:** Create fresh agent instances per workflow execution
**When to use:** Always, due to ADK's single parent constraint
**Example:**
```python
# Source: ADK single parent constraint documentation
from google.adk.agents import LlmAgent

class AgentFactory:
    """Creates fresh agent instances to avoid single-parent violations."""

    @staticmethod
    def create_triage_agent(case_id: str, file_ids: list[str]) -> LlmAgent:
        """Create a fresh Triage Agent instance."""
        return LlmAgent(
            name=f"triage_{case_id}",
            model="gemini-3-flash-preview",
            instruction=TRIAGE_SYSTEM_PROMPT.format(case_id=case_id),
            generate_content_config={
                "thinking_config": {
                    "thinking_level": "low",
                    "include_thoughts": True,
                }
            },
            output_key="triage_result",
        )

    @staticmethod
    def create_orchestrator_agent(
        case_id: str,
        triage_results: dict,
        sub_agents: list[LlmAgent]
    ) -> LlmAgent:
        """Create a fresh Orchestrator Agent instance."""
        return LlmAgent(
            name=f"orchestrator_{case_id}",
            model="gemini-3-pro-preview",
            instruction=ORCHESTRATOR_SYSTEM_PROMPT,
            generate_content_config={
                "thinking_config": {
                    "thinking_level": "high",
                    "include_thoughts": True,
                }
            },
            sub_agents=sub_agents,
            output_key="orchestrator_result",
        )
```

### Pattern 2: ADK Runner Initialization
**What:** Initialize ADK with DatabaseSessionService and GcsArtifactService
**When to use:** At application startup / per-request
**Example:**
```python
# Source: ADK documentation
from google.adk import Runner
from google.adk.sessions import DatabaseSessionService
from google.adk.artifacts import GcsArtifactService

# PostgreSQL connection (asyncpg driver)
DATABASE_URL = "postgresql+asyncpg://user:pass@host:5432/dbname"

# Initialize services
session_service = DatabaseSessionService(db_url=DATABASE_URL)
artifact_service = GcsArtifactService(bucket_name="holmes-artifacts")

# Create runner with services
runner = Runner(
    agent=root_agent,
    session_service=session_service,
    artifact_service=artifact_service,
    app_name="holmes",
)
```

### Pattern 3: Callback-to-SSE Event Mapping
**What:** Convert ADK callbacks to SSE events for real-time visualization
**When to use:** For Agent Flow UI updates
**Example:**
```python
# Source: ADK callbacks documentation
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest, LlmResponse
from typing import Optional
import json

async def publish_agent_event(case_id: str, event_type: str, data: dict):
    """Publish agent event to SSE subscribers."""
    # Reuse existing SSE pubsub pattern from sse.py
    await publish_agent_sse_event(case_id, event_type, data)

def create_before_agent_callback(case_id: str):
    """Factory for before_agent callback with case context."""
    def before_agent(ctx: CallbackContext) -> Optional[Content]:
        asyncio.create_task(publish_agent_event(
            case_id,
            "AGENT_SPAWNED",
            {
                "agent_name": ctx.agent_name,
                "timestamp": datetime.utcnow().isoformat(),
                "model": getattr(ctx, 'model', 'unknown'),
            }
        ))
        return None  # Continue execution
    return before_agent

def create_after_agent_callback(case_id: str):
    """Factory for after_agent callback with case context."""
    def after_agent(ctx: CallbackContext) -> Optional[Content]:
        asyncio.create_task(publish_agent_event(
            case_id,
            "AGENT_COMPLETED",
            {
                "agent_name": ctx.agent_name,
                "timestamp": datetime.utcnow().isoformat(),
                "output_preview": str(ctx.session_state.get(f"{ctx.agent_name}_result", ""))[:500],
            }
        ))
        return None
    return after_agent

def create_before_model_callback(case_id: str):
    """Factory for before_model callback - captures thinking."""
    def before_model(ctx: CallbackContext, request: LlmRequest) -> Optional[LlmResponse]:
        asyncio.create_task(publish_agent_event(
            case_id,
            "THINKING_UPDATE",
            {
                "agent_name": ctx.agent_name,
                "timestamp": datetime.utcnow().isoformat(),
                "status": "reasoning",
            }
        ))
        return None
    return before_model
```

### Pattern 4: State Namespacing
**What:** Use state scope prefixes for proper data isolation
**When to use:** Always when storing data in session state
**Example:**
```python
# Source: ADK state documentation
# Session state keys follow: {user_id}_{case_id}_{workflow_id} namespace

# No prefix: Current session only (case-specific)
session.state["triage_result"] = triage_output
session.state["domain_scores"] = {"financial": 0.8, "legal": 0.6}

# user: prefix: Persists across all sessions for this user
session.state["user:investigator_preferences"] = {"default_model": "pro"}

# app: prefix: Global application state
session.state["app:system_config"] = {"max_parallel_agents": 5}

# temp: prefix: Current invocation only (discarded after)
session.state["temp:intermediate_analysis"] = partial_result
```

### Anti-Patterns to Avoid
- **Reusing agent instances:** Each workflow needs fresh instances (single parent rule)
- **Using tools + output_schema together:** Split into tool-agent then schema-agent pipeline
- **Lowering temperature:** Gemini 3 requires temperature=1.0 (causes looping otherwise)
- **Using `thinking_budget` with Gemini 3:** Use `thinking_level` instead
- **Synchronous database operations:** ADK is async-first, use asyncpg not psycopg2

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | Custom session DB | ADK DatabaseSessionService | Handles schema, migrations, state scoping |
| Artifact versioning | Custom versioning | ADK GcsArtifactService | Auto-versioning, proper path structure |
| Agent orchestration | Custom workflow engine | ADK SequentialAgent/ParallelAgent | Deterministic, tested, handles state |
| Model thinking traces | Custom thinking parser | `include_thoughts=True` | ADK extracts and provides in response |
| Token counting | Manual token estimation | ADK `usage_metadata` on events | Accurate counts per turn |
| State scoping | Custom key prefixes | ADK `user:`/`app:`/`temp:` prefixes | Built-in persistence semantics |

**Key insight:** ADK provides battle-tested infrastructure for agent systems. Custom solutions will inevitably miss edge cases around state persistence, parent-child relationships, and async execution.

## Common Pitfalls

### Pitfall 1: Single Parent Violation
**What goes wrong:** `ValueError` when adding same agent instance to multiple parents
**Why it happens:** ADK enforces single parent rule to prevent ambiguous hierarchies
**How to avoid:** Use factory pattern to create fresh instances per workflow
**Warning signs:** "Agent already has a parent" error messages

### Pitfall 2: Tool Confirmation with DatabaseSessionService
**What goes wrong:** `require_confirmation` on tools silently fails
**Why it happens:** Tool confirmation only works with InMemorySessionService
**How to avoid:** Implement confirmation dialogs in frontend instead (already in CONTEXT.md as user-decided autonomous operation)
**Warning signs:** Tools execute without expected confirmation pause

### Pitfall 3: Schema Migration on ADK Upgrade
**What goes wrong:** Database errors after upgrading google-adk version
**Why it happens:** ADK 1.14.0, 1.17.0, 1.22.0 had schema changes
**How to avoid:** Run `adk migrate session` after upgrades (use sync driver for migration), or manually apply ALTER statements
**Warning signs:** Column not found errors, foreign key violations

### Pitfall 4: Gemini 3 Temperature Setting
**What goes wrong:** Model enters infinite loops
**Why it happens:** Gemini 3 requires temperature=1.0; lower values cause unexpected behavior
**How to avoid:** Don't override temperature in generate_content_config
**Warning signs:** Agent produces repetitive output, hangs

### Pitfall 5: after_agent_callback Not Called
**What goes wrong:** Callback never fires even though agent completed
**Why it happens:** Breaking loop after `event.is_final_response()` prevents callback
**How to avoid:** Use `adk run` patterns or ensure full event processing
**Warning signs:** "AGENT_COMPLETED" SSE events never sent

### Pitfall 6: State Updates Not Visible Immediately
**What goes wrong:** State changes made in tool not visible to subsequent code
**Why it happens:** State updates only commit after Event is yielded and processed
**How to avoid:** Return tool results before yielding next event
**Warning signs:** State appears empty even after setting values

### Pitfall 7: PostgreSQL AsyncPG Migration
**What goes wrong:** `adk migrate session` fails with greenlet error
**Why it happens:** Migration command uses sync SQLAlchemy but asyncpg is async-only
**How to avoid:** Use `postgresql+psycopg2://` for migrations, `postgresql+asyncpg://` for runtime
**Warning signs:** "greenlet_spawn has not been called" error

## Code Examples

Verified patterns from official sources:

### DatabaseSessionService with PostgreSQL
```python
# Source: ADK documentation + github issues
from google.adk.sessions import DatabaseSessionService

# For runtime (async operations)
session_service = DatabaseSessionService(
    db_url="postgresql+asyncpg://user:password@localhost:5432/holmes"
)

# For migrations (run separately with sync driver)
# adk migrate session --db-url="postgresql+psycopg2://user:password@localhost:5432/holmes"
```

### GcsArtifactService Setup
```python
# Source: ADK artifacts documentation
from google.adk.artifacts import GcsArtifactService

artifact_service = GcsArtifactService(
    bucket_name="holmes-artifacts",
    # bucket_name must exist, ADK doesn't create it
)

# Usage in tools via context
async def save_analysis_result(context: ToolContext, data: dict):
    """Save analysis result as artifact."""
    artifact = types.Part.from_bytes(
        data=json.dumps(data).encode(),
        mime_type="application/json"
    )
    version = await context.save_artifact("analysis_result.json", artifact)
    return {"saved_version": version}
```

### Thinking Configuration for Gemini 3
```python
# Source: Gemini 3 Developer Guide
from google.adk.agents import LlmAgent

# Triage: Fast, simple classification
triage_agent = LlmAgent(
    name="triage",
    model="gemini-3-flash-preview",  # Flash for speed
    instruction="...",
    generate_content_config={
        "thinking_config": {
            "thinking_level": "low",  # Minimal reasoning
            "include_thoughts": True,  # Capture for UI
        }
    },
)

# Orchestrator: Complex routing decisions
orchestrator_agent = LlmAgent(
    name="orchestrator",
    model="gemini-3-pro-preview",  # Pro for reasoning
    instruction="...",
    generate_content_config={
        "thinking_config": {
            "thinking_level": "high",  # Maximum reasoning
            "include_thoughts": True,
        }
    },
)
```

### ParallelAgent for Domain Agents
```python
# Source: ADK parallel agents documentation
from google.adk.agents import ParallelAgent, LlmAgent

# Each sub-agent writes to unique output_key to avoid race conditions
financial_agent = LlmAgent(
    name="financial",
    model="gemini-3-pro-preview",
    output_key="financial_analysis",
    # ...
)

legal_agent = LlmAgent(
    name="legal",
    model="gemini-3-pro-preview",
    output_key="legal_analysis",
    # ...
)

# ParallelAgent executes concurrently
parallel_domain_agents = ParallelAgent(
    name="domain_analysis",
    sub_agents=[financial_agent, legal_agent],
)

# Results accessible via session.state["financial_analysis"], session.state["legal_analysis"]
```

### Token Usage from Events
```python
# Source: ADK token tracking discussions
async for event in runner.run_async(session_id, user_message):
    # Token usage available per event
    if hasattr(event, 'usage_metadata') and event.usage_metadata:
        input_tokens = event.usage_metadata.prompt_token_count
        output_tokens = event.usage_metadata.candidates_token_count
        total_tokens = event.usage_metadata.total_token_count

        # Publish to SSE for UI
        await publish_agent_event(case_id, "TOKEN_USAGE", {
            "agent_name": event.agent_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        })
```

### Full Callback Setup on Agent
```python
# Source: ADK callbacks documentation
from google.adk.agents import LlmAgent

agent = LlmAgent(
    name="triage",
    model="gemini-3-flash-preview",
    instruction="...",
    # All 6 callback types
    before_agent_callback=create_before_agent_callback(case_id),
    after_agent_callback=create_after_agent_callback(case_id),
    before_model_callback=create_before_model_callback(case_id),
    after_model_callback=create_after_model_callback(case_id),
    before_tool_callback=create_before_tool_callback(case_id),
    after_tool_callback=create_after_tool_callback(case_id),
)
```

### Multimodal File Processing
```python
# Source: Gemini API docs
from google.genai import types

# For files already in GCS
file_part = types.Part(
    file_data=types.FileData(
        file_uri=f"gs://holmes-files/{storage_path}",
        mime_type="application/pdf"
    )
)

# For video with timestamp segments
video_part = types.Part(
    file_data=types.FileData(
        file_uri="gs://bucket/video.mp4",
        mime_type="video/mp4"
    ),
    video_metadata=types.VideoMetadata(
        start_offset="00:05:00",
        end_offset="00:10:00"
    )
)

# Include in agent's content
content = types.Content(
    role="user",
    parts=[
        types.Part(text="Analyze this document:"),
        file_part,
    ]
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `thinking_budget` | `thinking_level` | Gemini 3 (Dec 2025) | Gemini 3 requires level-based config |
| Manual session storage | DatabaseSessionService | ADK 1.0+ | Built-in persistence, scoping |
| Custom artifact versioning | GcsArtifactService | ADK 1.10+ | Auto-versioning in GCS paths |
| psycopg2 (sync) | asyncpg (async) | ADK 1.10+ | Full async support in ADK |

**Deprecated/outdated:**
- `thinking_budget`: Use `thinking_level` for Gemini 3 models
- `gemini-2.5-*` models: Still work but Gemini 3 is current
- Sync database drivers: ADK is async-first, sync causes issues

## Open Questions

Things that couldn't be fully resolved:

1. **Exact DatabaseSessionService table schemas**
   - What we know: Tables are `sessions`, `events`, `app_states`, `user_states`, `metadata`
   - What's unclear: Exact column definitions (SQLAlchemy generates dynamically)
   - Recommendation: Let ADK create tables, then inspect with `\d tablename` in psql

2. **Token usage in after_agent_callback**
   - What we know: `usage_metadata` available on events
   - What's unclear: Whether total token count is accessible in callback context
   - Recommendation: Accumulate token counts during event iteration, not in callbacks

3. **ADK + existing SQLAlchemy session coexistence**
   - What we know: ADK uses its own SQLAlchemy engine
   - What's unclear: Whether we can share engine/session with existing app
   - Recommendation: Use separate connection pool for ADK to avoid conflicts

4. **Gemini 3 model ID stability**
   - What we know: Current IDs are `gemini-3-flash-preview`, `gemini-3-pro-preview`
   - What's unclear: When `-preview` suffix will be removed
   - Recommendation: Use current IDs, plan for migration when GA

## Sources

### Primary (HIGH confidence)
- [ADK Documentation](https://google.github.io/adk-docs/) - Sessions, callbacks, artifacts, agents
- [ADK Python GitHub v1.23.0](https://github.com/google/adk-python) - Source code, issues
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3) - Model IDs, thinking_level

### Secondary (MEDIUM confidence)
- [ADK Blog Posts](https://cloud.google.com/blog/topics/developers-practitioners/remember-this-agent-state-and-memory-with-adk) - State management patterns
- [Google Developers Blog](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/) - Multi-agent patterns
- [ADK Codelabs](https://codelabs.developers.google.com/deploy-manage-observe-adk-cloud-run) - PostgreSQL deployment

### Tertiary (LOW confidence)
- [GitHub Issues](https://github.com/google/adk-python/issues) - Schema migration issues, known bugs
- [Dev.to articles](https://dev.to/greyisheepai/mastering-google-adk-databasesessionservice-and-events-complete-guide-to-event-injection-and-pdm) - Community patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official ADK documentation, stable releases
- Architecture: MEDIUM-HIGH - Based on official patterns, some integration details TBD
- Pitfalls: HIGH - Documented in issues and official docs
- Token tracking: MEDIUM - Community patterns, needs runtime validation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - ADK releases bi-weekly, Gemini 3 in preview)

---

## Appendix: Callback Signatures Reference

| Callback | Parameters | Return Type | Effect |
|----------|------------|-------------|--------|
| `before_agent_callback` | `CallbackContext` | `Optional[Content]` | Return Content to skip agent, None to continue |
| `after_agent_callback` | `CallbackContext` | `Optional[Content]` | Return Content to replace output, None to keep |
| `before_model_callback` | `CallbackContext`, `LlmRequest` | `Optional[LlmResponse]` | Return response to skip LLM call |
| `after_model_callback` | `CallbackContext`, `LlmResponse` | `Optional[LlmResponse]` | Return response to replace LLM output |
| `before_tool_callback` | `CallbackContext`, tool args | `Optional[dict]` | Return dict to skip tool, None to execute |
| `after_tool_callback` | `CallbackContext`, tool result | `Optional[dict]` | Return dict to replace tool output |

## Appendix: State Scope Persistence

| Prefix | Scope | DatabaseSessionService | InMemorySessionService |
|--------|-------|------------------------|------------------------|
| (none) | Current session | Persistent | Lost on restart |
| `user:` | All sessions for user | Persistent | Stored, lost on restart |
| `app:` | All users, all sessions | Persistent | Stored, lost on restart |
| `temp:` | Current invocation only | Discarded after | Discarded after |

## Appendix: Gemini 3 Model Comparison

| Aspect | gemini-3-pro-preview | gemini-3-flash-preview |
|--------|---------------------|------------------------|
| Best for | Complex reasoning, deep analysis | Speed, simple tasks, agentic workflows |
| Thinking levels | low, high | minimal, low, medium, high |
| Context window | 1M input / 64k output | 1M input / 64k output |
| Pricing | $2/$12 per 1M tokens | $0.50/$3 per 1M tokens |
| Use in Holmes | Orchestrator, domain agents | Triage, fallback |

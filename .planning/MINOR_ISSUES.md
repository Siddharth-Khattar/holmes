# Minor Issues

Deferred issues that are non-blocking but should be addressed in future work.

---

## MI-001: Triage/Orchestrator execution lookups use vulnerable re-query pattern

- **Files**: `backend/app/services/pipeline.py` lines ~260-269 (triage), ~342-351 (orchestrator)
- **Pattern**: `WHERE workflow_id = X AND agent_name = 'triage' ORDER BY created_at DESC LIMIT 1`
- **Risk**: Same antipattern that caused the domain agent execution ID misattribution bug. Safe today because triage and orchestrator each run exactly once per workflow. Breaks if retries are ever added.
- **Fix**: Update `run_triage` and `run_orchestrator` to return `tuple[OutputT | None, UUID | None]` (same pattern applied to domain agents in commits `176ce91`..`a5fef73`), then use the returned `execution_id` directly instead of re-querying.
- **Priority**: Low (no current bug, future-proofing only)
- **Added**: 2025-02-07, QC review of Phase 7 execution ID fix

## MI-002: DomainRunFn type alias covariance under strict pyright

- **File**: `backend/app/agents/domain_runner.py` line 24
- **Detail**: `DomainRunFn` is typed as `Callable[..., Awaitable[tuple[DomainAgentOutput | None, UUID | None]]]`. Concrete functions (`run_financial`, `run_legal`, `run_evidence`) return `tuple[FinancialOutput | None, UUID | None]` etc. Works at runtime via structural subtyping but could flag under pyright strict mode due to `Callable` return type covariance rules.
- **Fix**: Either annotate concrete functions to return `tuple[DomainAgentOutput | None, UUID | None]`, or use a generic `TypeVar` on the return type.
- **Priority**: Low (no runtime impact, passes pyright default mode)
- **Added**: 2025-02-07, QC review of Phase 7 execution ID fix

## MI-003: Fuzzy entity matching produces false positives on numeric/temporal values

- **File**: `backend/app/services/kg_builder.py`, `deduplicate_entities()` (~line 270-288)
- **Detail**: Fuzzy string matching (rapidfuzz ratio >=85%) flags semantically distinct values as potential duplicates when they are string-similar but numerically different. Observed in live testing:
  - `'2016-05-02 20:00'` vs `'2016-05-02 22:00'` (92%) — different timestamps (8 PM vs 10 PM)
  - `'50,000 dollars'` vs `'2,000 dollars'` (88%) — 25x difference in amount
  - `'$5,000'` vs `'$50,000'` (88%) — 10x difference in amount
- **Impact**: No data corruption (flags only, not auto-merged). But these false flags add noise for Phase 8 LLM resolution, wasting tokens and potentially confusing the synthesis agent.
- **Fix**: Add type-aware matching logic before fuzzy comparison. For `entity_type` in (`timestamp`, `monetary_amount`, `date`, `other` when value looks numeric): parse the actual value and compare semantically instead of string-matching. E.g., for monetary amounts, extract the number and compare magnitude; for timestamps, parse and compare actual time difference.
- **Priority**: Medium (should be fixed before or during Phase 8 to avoid noisy LLM resolution input)
- **Phase**: Fix during Phase 8 (Synthesis) when fuzzy flags are consumed
- **Added**: 2026-02-07, live pipeline testing

## MI-004: Pipeline summary log mixes two different entity count semantics

- **File**: `backend/app/services/pipeline.py` line ~1089
- **Log**: `entities=40 kg_entities=61` — confusing because both sound like entity counts but measure different things.
- **Detail**: `entities` = triage file-level entities (line 1048: `sum(len(fr.entities) for fr in triage_output.file_results)`) + domain agent top-level `output.entities` (line 1043). `kg_entities` = KG Builder total (includes both top-level AND per-finding entities). The KG count is always >= domain entity count because KG Builder also extracts from `finding.entities` lists. The naming makes them appear comparable when they are not.
- **Fix**: Rename `entities` to `triage_entities` and `total_domain_entities` to `domain_output_entities` in the log, or remove the triage entity count from this summary (it's already logged in the triage stage). The `processing-complete` SSE event (line 1065) also sums these two, which is sent to the frontend — verify frontend doesn't display this misleadingly.
- **Priority**: Low (cosmetic log clarity, no data impact)
- **Phase**: Fix opportunistically during Phase 8 pipeline extension
- **Added**: 2026-02-07, live pipeline testing

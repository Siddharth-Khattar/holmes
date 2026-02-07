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

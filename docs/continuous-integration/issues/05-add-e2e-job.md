---
id: PBI-CI-005
status: done
blocked_by: [PBI-CI-001, PBI-CI-002]
pr: 1
---

# PBI-CI-005: Add the E2E Job

## Directive
Run the full authenticated Playwright suite in CI with a SQL Server service container, a per-run dev certificate, and failure diagnostics uploaded as artifacts.

**Scope:**
- Workflow job, CI reporter configuration in the Playwright config, harness documentation for CI.
- Untrack and ignore committed E2E output.
- Do not add or change E2E scenarios.

## Dependencies
- Blocked by: PBI-CI-001, PBI-CI-002
- Must merge before: PBI-CI-006

## Context
Read: `specs/continuous-integration/spec.md`
- Blueprint: E2E in CI.
- Contract: E2E diagnostics scenarios.
Read: `docs/e2e/authenticated-harness.md`

## Verification
- [ ] The full suite passes in CI. Deferred: see Follow-ups.
- [x] A failing test uploads the report, traces, and server logs with 7-day retention; a passing run uploads none.
- [x] The harness documentation describes the CI run and no longer lists CI as out of scope.

## Refinement Protocol
If certificate trust or networking on the Linux runner requires a different approach than the spec describes, update the E2E in CI section of the spec in the same commit.

## Follow-ups
- Confirm on a recorded run that the full E2E suite passes in CI.

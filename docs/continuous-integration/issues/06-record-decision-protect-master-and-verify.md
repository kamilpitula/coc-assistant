---
id: PBI-CI-006
status: todo
blocked_by: [PBI-CI-003, PBI-CI-004, PBI-CI-005]
---

# PBI-CI-006: Record the Decision, Protect Master, and Verify Scenarios

## Directive
Record the CI design in an ADR, verify every spec scenario against real workflow runs, and require `ci-success` on `master`.

**Scope:**
- ADR 0004, branch protection on `master` (applied only after explicit confirmation).
- Do not change workflow behavior except to fix a failed scenario.

## Dependencies
- Blocked by: PBI-CI-003, PBI-CI-004, PBI-CI-005
- Must merge before: None

## Context
Read: `specs/continuous-integration/spec.md`
- Contract: Definition of Done, Regression Guardrails, Scenarios.

## Verification
- [x] ADR 0004 records the runner, database, aggregation, and E2E exemption decisions.
- [ ] Each spec scenario has been observed on a real run.
- [ ] `master` requires a pull request and the `ci-success` check.

## Refinement Protocol
Any scenario that cannot be observed as written is tightened in the spec before the ticket is closed.

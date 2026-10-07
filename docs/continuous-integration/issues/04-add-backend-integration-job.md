---
id: PBI-CI-004
status: done
blocked_by: [PBI-CI-001, PBI-CI-002]
pr: 1
---

# PBI-CI-004: Add the Backend Integration Job

## Directive
Run the backend integration test suite in CI against a SQL Server service container through `COC_SQLSERVER_CONNECTION`.

**Scope:**
- Workflow job with the SQL Server service container and test reporting.
- Do not change integration test behavior beyond what PBI-CI-001 introduced.

## Dependencies
- Blocked by: PBI-CI-001, PBI-CI-002
- Must merge before: PBI-CI-006

## Context
Read: `specs/continuous-integration/spec.md`
- Blueprint: Workflow jobs table (`backend-integration`), SQL Server connection configuration, Constraints on secrets.

## Verification
- [ ] The integration suite passes in CI. Deferred: see Follow-ups.
- [x] A failing integration test fails `ci-success`.
- [x] No repository secrets are used.

## Refinement Protocol
If a test depends on LocalDB-specific behavior, fix the test to be server-agnostic and note it in the spec only if the contract changes.

## Follow-ups
- Confirm on a recorded run that the integration suite passes in CI.

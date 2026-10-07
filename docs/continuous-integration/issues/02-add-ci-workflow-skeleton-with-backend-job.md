---
id: PBI-CI-002
status: done
blocked_by: []
pr: 1
---

# PBI-CI-002: Add the CI Workflow Skeleton with the Backend Job

## Directive
Introduce the GitHub Actions CI workflow with its triggers, concurrency, change detection, backend build/format/unit-test job, and the aggregated `ci-success` check.

**Scope:**
- Workflow file, toolchain version files (`global.json`, `.nvmrc`), Dependabot for GitHub Actions.
- A separate formatting commit if the backend is not `dotnet format` clean.
- Do not add frontend, Terraform, integration, or E2E jobs yet.

## Dependencies
- Blocked by: None
- Must merge before: PBI-CI-003, PBI-CI-004, PBI-CI-005

## Context
Read: `specs/continuous-integration/spec.md`
- Blueprint: Workflow (triggers, concurrency, `changes`, `backend`, `ci-success`), Toolchain versions, Workflow supply chain, Constraints.

## Verification
- [ ] The pull request shows a passing `ci-success` check. Deferred: see Follow-ups.
- [x] Unformatted C# code fails the backend job and `ci-success`.
- [x] Unit test results appear in the run summary.
- [x] Third-party actions are pinned by commit SHA and the default token permission is read-only.

## Refinement Protocol
If the path-filter or aggregation design cannot satisfy a spec scenario, stop and update the Blueprint before working around it.

## Follow-ups
- Confirm on a recorded run that a pull request shows a passing `ci-success` check.

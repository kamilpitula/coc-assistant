---
id: PBI-CI-003
status: done
blocked_by: [PBI-CI-002]
pr: 1
---

# PBI-CI-003: Add the Frontend and Terraform Jobs

## Directive
Extend CI with the frontend lint/build/test/Storybook job and the Terraform format/validate job, both path-filtered and aggregated into `ci-success`.

**Scope:**
- Workflow jobs for `frontend/` and `infrastructure/terraform/`.
- Untrack and ignore committed frontend test output.
- Do not change frontend or Terraform sources except to fix check failures.

## Dependencies
- Blocked by: PBI-CI-002
- Must merge before: PBI-CI-006

## Context
Read: `specs/continuous-integration/spec.md`
- Blueprint: Workflow jobs table (`frontend`, `terraform`).
- Contract: Terraform-only and frontend lint scenarios.

## Verification
- [x] A Terraform-only change runs only the Terraform job and passes `ci-success`.
- [x] A frontend lint failure fails `ci-success`.
- [x] Frontend test output is no longer tracked.

## Refinement Protocol
If a frontend or Terraform check cannot run headless on Linux, record the exception in the spec before skipping it.

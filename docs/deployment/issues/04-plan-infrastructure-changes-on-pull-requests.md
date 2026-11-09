---
id: PBI-DEP-004
status: todo
blocked_by: [PBI-DEP-001, PBI-DEP-003]
---

# PBI-DEP-004: Plan Infrastructure Changes on Pull Requests

## Directive
Show the `dev` Terraform plan on every pull request that changes infrastructure, using a read-only identity, so infrastructure changes are reviewed before they are applied.

**Scope:**
- **Workflow:** `.github/workflows/terraform-plan.yml` on `pull_request` to `master` touching `infrastructure/**`, skipped for forks; OIDC login as `id-cocassistant-github-plan`; `terraform plan` for `dev` written to the job summary.
- **Out of scope:** apply (PBI-DEP-005).

## Dependencies
- Blocked by: PBI-DEP-001 (plan identity and state), PBI-DEP-003 (the stack to plan)
- Must merge before: None

## Context
Read: `specs/deployment/spec.md` (Workflows, Constraints), `.github/workflows/ci.yml` (SHA-pinned actions, least-privilege permissions)

## Verification
- [ ] A pull request changing `infrastructure/**` shows the `dev` plan in its job summary.
- [ ] The workflow requests only `id-token: write` and `contents: read` (plus what the summary needs).
- [ ] The plan identity cannot change resources: an attempted write in a test run is denied.

## Refinement Protocol
Change `specs/deployment/spec.md` together with the workflow.

## Follow-ups

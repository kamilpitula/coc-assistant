---
id: PBI-DEP-004
status: done
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
- [ ] A pull request changing `infrastructure/**` shows the `dev` plan in its job summary. Deferred: see Follow-ups.
- [x] The workflow requests only `id-token: write` and `contents: read` (plus what the summary needs).
- [ ] The plan identity cannot change resources: an attempted write in a test run is denied. Deferred: see Follow-ups.

## Refinement Protocol
Change `specs/deployment/spec.md` together with the workflow.

## Follow-ups
- Confirm on the next pull request changing `infrastructure/**` that `terraform-plan.yml` shows the `dev` plan in its job summary (Verification item 1; needs a live PR run, which this branch's own PR cannot provide since it touches no `infrastructure/**` file).
- Run a denied-write probe as the plan identity (for example an attempted write, or a review of its role assignments) to evidence it cannot change resources (Verification item 3; needs Azure access the local run does not have).
- If a live plan run fails with authorization errors on resources that need list-keys or list-secrets actions, escalate to the Architect for a bootstrap role change; `infrastructure/terraform/bootstrap/identities.tf` must not change in this workflow's scope.
- Immutable OIDC subjects (2026-11-10): the owner must re-apply the bootstrap locally (see `docs/infrastructure/dev-environment-setup.md` section 4) and confirm the `Terraform plan (dev)` check goes green on a PR.

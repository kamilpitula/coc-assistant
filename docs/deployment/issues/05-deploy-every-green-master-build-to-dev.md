---
id: PBI-DEP-005
status: done
blocked_by: [PBI-DEP-002, PBI-DEP-003, PBI-DEP-007]
---

# PBI-DEP-005: Deploy Every Green Master Build to Dev

## Directive
Deploy each `master` commit that passes CI to the `dev` environment with no manual steps: infrastructure, image, database migrations, API rollout, and SPA.

**Scope:**
- **Workflow:** `.github/workflows/deploy-dev.yml` on `workflow_run` of `CI` succeeding on `master`, plus `workflow_dispatch`; GitHub Environment `dev`; OIDC login as `id-cocassistant-github-deploy`.
- **Jobs:** `terraform apply`; build and push `ghcr.io/kamilpitula/coc-assistant-api:<sha>`; migrate (bundles per DbContext, runner-IP firewall rule removed on success and failure, API identity database user with `db_datareader` and `db_datawriter`); `az containerapp update --image`; SPA build with the `VITE_*` values and Static Web Apps deploy with the token read at run time.
- **Out of scope:** the manual one-time steps and soak checks (PBI-DEP-006).

## Dependencies
- Blocked by: PBI-DEP-002 (image and SPA build), PBI-DEP-003 (resources and outputs), PBI-DEP-007 (an apply that completes in a region with SQL)
- Must merge before: PBI-DEP-006

## Context
Read: `specs/deployment/spec.md` (Workflows, API configuration in `dev`, Frontend build values, Constraints, Scenarios), ADR 0031
- Allow for a free-offer database resume of up to about a minute in the migrate job's timeouts.

## Verification
- [x] A green push to `master` runs the workflow to completion, and the active revision runs the image tagged with that SHA.
- [x] A failed CI run deploys nothing.
- [x] After a forced migration failure, the SQL server has no runner-IP firewall rule and the rollout did not run.
- [x] No Azure client secret or SQL password is stored in GitHub.

## Refinement Protocol
Change `specs/deployment/spec.md` and ADR 0031 together with the workflow.

## Follow-ups
- Immutable OIDC subjects (2026-11-10): the owner must re-apply the bootstrap locally (see `docs/infrastructure/dev-environment-setup.md` section 4) and confirm the `Terraform plan (dev)` check goes green on a PR.
- Plan secret-reader role (2026-11-10): the owner must re-apply the bootstrap locally for the custom role `CoC Assistant dev plan secret reader` (see `docs/infrastructure/dev-environment-setup.md` section 4, expected plan exactly 2 to add), then confirm the `Terraform plan (dev)` check is green on PR #63.
- Owner live runs: passed, reported by the owner on 2026-11-12: a green push runs to completion with the active revision on the SHA image; a failed CI run leaves every job skipped; a `simulate_migration_failure` dispatch leaves no `gh-deploy-*` rule and skips rollout and spa; the API reads data after deploy (proves the user and SID mapping); a re-run is idempotent. The last Verification item (no stored secret) is evidenced by this diff itself.
- Out-of-order CI finishes are not handled: when runs finish out of order, the newest run wins with no SHA comparison. Single-owner repo with additive migrations so far; revisit when this causes a real problem.
- First run stops at the GHCR preflight: the owner makes the `coc-assistant-api` package public, then Re-run failed jobs (docs/infrastructure/dev-environment-setup.md section 9).
- Human closure (2026-11-12): the human closed this PBI as done; the owner reported on 2026-11-12 that all owner live runs above passed.

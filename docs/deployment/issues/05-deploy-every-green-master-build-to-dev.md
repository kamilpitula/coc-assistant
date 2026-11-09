---
id: PBI-DEP-005
status: todo
blocked_by: [PBI-DEP-002, PBI-DEP-003]
---

# PBI-DEP-005: Deploy Every Green Master Build to Dev

## Directive
Deploy each `master` commit that passes CI to the `dev` environment with no manual steps: infrastructure, image, database migrations, API rollout, and SPA.

**Scope:**
- **Workflow:** `.github/workflows/deploy-dev.yml` on `workflow_run` of `CI` succeeding on `master`, plus `workflow_dispatch`; GitHub Environment `dev`; OIDC login as `id-cocassistant-github-deploy`.
- **Jobs:** `terraform apply`; build and push `ghcr.io/kamilpitula/coc-assistant-api:<sha>`; migrate (bundles per DbContext, runner-IP firewall rule removed on success and failure, API identity database user with `db_datareader` and `db_datawriter`); `az containerapp update --image`; SPA build with the `VITE_*` values and Static Web Apps deploy with the token read at run time.
- **Out of scope:** the manual one-time steps and soak checks (PBI-DEP-006).

## Dependencies
- Blocked by: PBI-DEP-002 (image and SPA build), PBI-DEP-003 (resources and outputs)
- Must merge before: PBI-DEP-006

## Context
Read: `specs/deployment/spec.md` (Workflows, API configuration in `dev`, Frontend build values, Constraints, Scenarios), ADR 0031
- Allow for a free-offer database resume of up to about a minute in the migrate job's timeouts.

## Verification
- [ ] A green push to `master` runs the workflow to completion, and the active revision runs the image tagged with that SHA.
- [ ] A failed CI run deploys nothing.
- [ ] After a forced migration failure, the SQL server has no runner-IP firewall rule and the rollout did not run.
- [ ] No Azure client secret or SQL password is stored in GitHub.

## Refinement Protocol
Change `specs/deployment/spec.md` and ADR 0031 together with the workflow.

## Follow-ups

---
id: PBI-DEP-008
status: todo
blocked_by: [PBI-DEP-005]
---

# PBI-DEP-008: Validate the Deploy Workflow on Pull Requests

## Directive
Catch invalid workflow files and broken deploy build steps in pull request CI, so a `deploy-dev` defect fails the PR instead of the first live run after merge.

**Scope:**
- **actionlint:** a pinned, checksum-verified actionlint runs over `.github/workflows/**` as a `ci.yml` job (gated by `ci-success`) and in `.githooks/pre-commit` when workflow files are staged. One documented local command runs it, so agents never download it ad hoc.
- **Shared build steps:** the build side of `deploy-dev.yml` (backend restore and build, the three `--no-build` migration bundles, the API image build, and the SPA `npm ci`, route generation and build) moves into a composite action or reusable workflow under `.github/actions/` or `.github/workflows/`. `deploy-dev.yml` calls it, so the PR check and the deploy cannot drift.
- **Deploy build check:** a `ci.yml` job calls the shared build steps on pull requests touching `backend/**`, `frontend/**`, `.github/workflows/**` or `.github/actions/**`, with no Azure login, no push and no secrets. SPA `VITE_*` values are non-secret placeholders.
- **Variables preflight:** `deploy-dev.yml` fails fast, before `terraform-apply`, with a message naming each missing `vars.*` it reads (`AZURE_DEPLOY_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`, `VITE_API_SCOPE`).
- **Out of scope:** any step that talks to Azure or GHCR (login, apply, migrate against SQL, rollout, SPA upload); `az` query-path correctness (PBI-DEP-009); a staging environment.

## Dependencies
- Blocked by: PBI-DEP-005 (the deploy workflow whose build steps are shared)
- Must merge before: None

## Context
Read: `.github/workflows/deploy-dev.yml`, `.github/workflows/ci.yml` (the `changes` filters and `ci-success` gate), `.githooks/pre-commit`, `specs/continuous-integration/spec.md`, `specs/deployment/spec.md`, ADR 0004, ADR 0031
- Live-run failures this would have caught (PBI-DEP-005 Follow-ups): `Unrecognized named-value: 'env'` at `deploy-dev.yml:240` (invalid file, no run started); `NETSDK1004 project.assets.json not found` (no restore before bundles); `MSB3552 Resource file "**/*.resx" cannot be found` (cold Linux bundle build, reproduced 5 of 5); the empty `AZURE_DEPLOY_CLIENT_ID` that made the azurerm backend fall back to `az login`.
- The deploy build check must run on `ubuntu-latest` from a clean checkout; the MSB3552 failure did not reproduce on warm trees.
- Pin actionlint by version and sha256 in one place that CI and the hook both read; follow the action SHA-pinning convention already used in the workflows.

## Verification
- [ ] actionlint runs in CI and in pre-commit; reintroducing `${{ env.DEPLOY_SHA }}` in a job-level `env:` block fails both with `context "env" is not allowed here`.
- [ ] Removing the `Restore backend` step from the shared build steps fails the deploy build check on a pull request.
- [ ] `deploy-dev.yml` uses the shared build steps and still passes a live green-master run end to end (owner).
- [ ] The deploy build check makes no Azure, GHCR push or secret access (reviewed against job `permissions` and steps).
- [ ] An unset `dev` environment variable fails `deploy-dev` in the preflight step with its name, before `terraform-apply` starts.
- [ ] `specs/continuous-integration/spec.md` and `specs/deployment/spec.md` describe the new jobs; the CI job list in `ci-success.needs` includes them.
- [ ] Tests cover any new script logic (for example an actionlint install or preflight script); purely declarative workflow YAML is exempt per `CLAUDE.md`. E2E exception: CI-internal, no user-visible change.

## Refinement Protocol
Change `specs/continuous-integration/spec.md`, `specs/deployment/spec.md`, ADR 0031 (if the deploy job layout changes), `.githooks/pre-commit` and `docs/infrastructure/dev-environment-setup.md` together with the workflows.

## Follow-ups

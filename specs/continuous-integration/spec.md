# Feature: Continuous Integration

## Blueprint

### Context
Every change to `master` must be proven buildable and tested before it lands. Continuous Integration runs the backend, frontend, authenticated E2E, and Terraform checks on GitHub Actions for every pull request targeting `master` and every push to `master`, and exposes a single required status check that branch protection relies on. The scope is CI only; deployment is out of scope until an Azure environment exists (`infrastructure/terraform/main.tf` defines no resources yet).

The existing integration tests and E2E harness were written local-first against SQL Server LocalDB, which only runs on Windows, while the E2E mock OIDC issuer is a Linux container. CI therefore runs on Linux runners against a SQL Server service container, with the SQL Server connection made configurable and LocalDB kept as the local default.

### Architecture
- **Workflow:** `.github/workflows/ci.yml`, a single workflow.
  - **Triggers:** `pull_request` targeting `master`, `push` to `master`, `workflow_dispatch`.
  - **Concurrency:** one group per ref; a newer run cancels an in-progress run for the same pull request. Runs on `master` are never cancelled.
  - **Jobs** (all on `ubuntu-latest`):
    | Job | Runs when | Steps |
    |-----|-----------|-------|
    | `changes` | always | `dorny/paths-filter` computes which areas changed |
    | `backend` | `backend/**` changed | restore, build, `dotnet format --verify-no-changes`, unit tests (`CocAssistant.Api.Tests`, `CocAssistant.Identity.Tests`, `CocAssistant.CampaignPlay.Tests`) with trx results in the job summary |
    | `backend-integration` | `backend/**` changed | `CocAssistant.Api.IntegrationTests` against a `mcr.microsoft.com/mssql/server:2022-latest` service container |
    | `frontend` | `frontend/**` changed | `npm ci`, `generate-routes` (the gitignored TanStack route tree), `lint`, `build` (includes `tsc -b`), `test`, `build-storybook` |
    | `e2e` | `backend/**`, `frontend/**`, or `e2e/**` changed | SQL Server service container, per-run dev certificate, Playwright chromium suite |
    | `terraform` | `infrastructure/**` changed | `terraform fmt -check`, `terraform init -backend=false`, `terraform validate` |
    | `ci-success` | always | aggregates the results of all jobs above; the only required status check |
  - A change to `.github/workflows/**`, `global.json`, or `.nvmrc` runs every job. A `push` to `master` runs every job.
  - Caches: NuGet packages, npm for `frontend/package-lock.json` and `e2e/package-lock.json`, Playwright browsers keyed on the Playwright version.
- **SQL Server connection configuration:**
  - Environment variable `COC_SQLSERVER_CONNECTION` holds the server portion of a connection string (server, credentials, `TrustServerCertificate`) without a database.
  - Each consumer appends its own database name: `CocAssistantIdentityTests` (`backend/tests/CocAssistant.Api.IntegrationTests/IdentityApiFactory.cs`), `CocAssistantCampaignPlayMigrationTests` (`backend/tests/CocAssistant.Api.IntegrationTests/CampaignPlayMigrationTests.cs`), and `CocAssistantE2E` (`e2e/playwright.config.ts`, `e2e/globalSetup.ts`).
  - When the variable is unset, each consumer uses `Server=(localdb)\mssqllocaldb;Trusted_Connection=True;MultipleActiveResultSets=true` with its database name, matching current local behavior.
  - The .NET connection-string helper lives in `backend/tests/CocAssistant.Api.IntegrationTests` and is built on `SqlConnectionStringBuilder`. A TypeScript helper in `e2e/` serves `playwright.config.ts` and `globalSetup.ts`.
- **E2E in CI:**
  - The dev certificate is generated per run with `dotnet dev-certs https --export-path e2e/.certs/dev-cert.pfx --password <committed password> --format Pfx`, and `COC_E2E_CERT_PASSWORD` is set from the same value. The password is the one committed in `e2e/docker/mock-oauth2-config.json`.
  - The mock OIDC issuer is started by Playwright's `webServer` via `docker compose -f e2e/docker/docker-compose.e2e.yml up`.
  - Under `CI`, Playwright uses the `line` and `html` reporters.
  - On failure, the Playwright report, traces, and webServer logs are uploaded as artifacts with 7-day retention.
- **Toolchain versions:** `global.json` (.NET SDK 10.0.x, `rollForward: latestFeature`) and `.nvmrc` (Node 24) at the repo root are the single source of truth. The workflow reads them through `global-json-file` and `node-version-file`.
- **Workflow supply chain:** `.github/dependabot.yml` updates the `github-actions` ecosystem.
- **Branch protection on `master`:** a pull request is required before merging, `ci-success` is a required status check, and zero approvals are required.
- **Dependencies:**
  - Depends on: GitHub Actions hosted Ubuntu runners, the SQL Server container image, `ghcr.io/navikt/mock-oauth2-server` (pinned in `e2e/docker/docker-compose.e2e.yml`), the pinned `dotnet-ef` local tool (`.config/dotnet-tools.json`).
  - Depended on by: branch protection on `master`; the E2E coverage requirement for user-visible changes in `CLAUDE.md`.
- **Decision record:** `docs/adr/0004-ci-on-github-actions-with-sql-server-service-container.md`. Local harness usage is documented in `docs/e2e/authenticated-harness.md`.

### Constraints
- The workflow's default token permission is `contents: read`. Jobs request any broader permission explicitly at the job level.
- Third-party actions are referenced by full commit SHA.
- The workflow uses no repository secrets. The SQL Server SA password is a literal scoped to the ephemeral service container, and the E2E certificate password is the documented, committed mock-only value.
- The integration test suite and E2E suite run against SQL Server through the same code paths locally (LocalDB) and in CI (service container); only `COC_SQLSERVER_CONNECTION` differs.
- `e2e/e2e-out.txt` and `frontend/test-results/` are untracked and covered by `.gitignore`.

## Contract

### Definition of Done
- [ ] `.github/workflows/ci.yml` exists and its run on the introducing pull request completes with `ci-success` passing.
- [ ] A push to `master` runs every job and does not cancel an earlier in-progress `master` run.
- [ ] `CocAssistant.Api.IntegrationTests` passes in CI against the SQL Server service container and passes locally against LocalDB with `COC_SQLSERVER_CONNECTION` unset.
- [ ] The full Playwright suite passes in the `e2e` job.
- [ ] xUnit tests cover the .NET connection-string helper for both the unset (LocalDB fallback) and set (configured server plus consumer database name) cases.
- [ ] `global.json`, `.nvmrc`, and `.github/dependabot.yml` exist and the workflow reads the toolchain versions from the first two.
- [ ] `e2e/e2e-out.txt` and `frontend/test-results/.last-run.json` are removed from git and ignored.
- [ ] ADR 0004 exists, and `docs/e2e/authenticated-harness.md` documents `COC_SQLSERVER_CONNECTION` and CI certificate generation and no longer lists a CI workflow as out of scope.
- [ ] Branch protection on `master` requires a pull request and the `ci-success` check.

### Regression Guardrails
- `ci-success` remains the single required status check, and it fails whenever any job it aggregates fails or is cancelled.
- A skipped job (no relevant changes) never causes `ci-success` to fail.
- Every `push` to `master` runs every job regardless of changed paths.
- With `COC_SQLSERVER_CONNECTION` unset, integration tests and the E2E harness target LocalDB exactly as before.
- Each SQL Server consumer keeps its own database name; consumers never share a database through the connection helper.
- The workflow runs without repository secrets.

### Scenarios
```gherkin
Scenario: A pull request to master is checked
  Given a pull request targeting master
  When the pull request is opened or receives a new commit
  Then the CI workflow runs
  And the ci-success check is reported on the pull request

Scenario: A newer commit cancels an older pull request run
  Given a CI run is in progress for a pull request
  When a new commit is pushed to that pull request
  Then the in-progress run for that pull request is cancelled
  And a new run starts for the latest commit

Scenario: Runs on master are never cancelled
  Given a CI run is in progress for a push to master
  When another commit is pushed to master
  Then the earlier run continues to completion

Scenario: A push to master runs every job
  Given a commit pushed to master that changes only files under docs/
  When the CI workflow runs
  Then the backend, backend-integration, frontend, e2e, and terraform jobs all run

Scenario: A Terraform-only pull request skips application jobs
  Given a pull request that changes only files under infrastructure/
  When the CI workflow runs
  Then the terraform job runs
  And the backend, backend-integration, frontend, and e2e jobs are skipped
  And ci-success passes when the terraform job passes

Scenario: A documentation-only pull request passes without running jobs
  Given a pull request that changes only files under docs/
  When the CI workflow runs
  Then the backend, backend-integration, frontend, e2e, and terraform jobs are skipped
  And ci-success passes

Scenario: A workflow change runs every job
  Given a pull request that changes .github/workflows/ci.yml
  When the CI workflow runs
  Then the backend, backend-integration, frontend, e2e, and terraform jobs all run

Scenario: A failing job fails the required check
  Given a pull request whose frontend lint fails
  When the CI workflow runs
  Then the frontend job fails
  And ci-success fails

Scenario: A frontend change runs E2E
  Given a pull request that changes only files under frontend/
  When the CI workflow runs
  Then the frontend and e2e jobs run
  And the backend, backend-integration, and terraform jobs are skipped

Scenario: Unformatted backend code fails CI
  Given a pull request containing C# code that dotnet format would change
  When the backend job runs
  Then the backend job fails

Scenario: Integration tests use the configured SQL Server
  Given COC_SQLSERVER_CONNECTION is set to a SQL Server without a database
  When IdentityApiFactory builds its connection string
  Then the connection string targets the configured server
  And its database is CocAssistantIdentityTests

Scenario: Integration tests fall back to LocalDB
  Given COC_SQLSERVER_CONNECTION is unset
  When IdentityApiFactory builds its connection string
  Then the connection string targets (localdb)\mssqllocaldb
  And its database is CocAssistantIdentityTests

Scenario: E2E failure diagnostics are preserved
  Given a Playwright test fails in the e2e job
  When the e2e job completes
  Then the Playwright report, traces, and webServer logs are uploaded as workflow artifacts
  And the artifacts are retained for 7 days

Scenario: E2E success uploads no diagnostics
  Given every Playwright test passes in the e2e job
  When the e2e job completes
  Then no Playwright diagnostics artifact is uploaded
```

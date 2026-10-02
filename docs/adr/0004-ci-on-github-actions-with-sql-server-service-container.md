# CI on GitHub Actions with a SQL Server service container

Continuous Integration runs as a single GitHub Actions workflow (`.github/workflows/ci.yml`) on `ubuntu-latest` for pull requests to `master`, pushes to `master`, and manual dispatch. Backend integration tests and the authenticated E2E suite run against a `mcr.microsoft.com/mssql/server:2022-latest` service container, selected through the `COC_SQLSERVER_CONNECTION` environment variable; when the variable is unset, every consumer keeps using LocalDB, so local development is unchanged. Path filtering decides which jobs run on a pull request, and one aggregating job, `ci-success`, is the only required status check. The integration tests and the E2E harness were written local-first against LocalDB, which only runs on Windows, while the E2E mock OIDC issuer (ADR 0002) is a Linux container that Windows runners cannot host.

## Considered Options
- Windows runners with LocalDB. Rejected: still cannot run the mock OIDC issuer container, so E2E would need a second runner type; Windows runners are also slower and billed at a higher rate on private repositories.
- Testcontainers for SQL Server inside the test code. Rejected: requires Docker for every local integration test run and is a larger change than an environment variable.
- Separate workflows per area with workflow-level `paths:` filters. Rejected: a skipped workflow never reports its check, so required checks block unrelated pull requests.
- One workflow, path-filtered jobs, `ci-success` aggregator, configurable SQL Server connection (chosen).

## Consequences
- `ci-success` fails when any job fails or is cancelled and passes when jobs are skipped; branch protection requires only this check, so adding or renaming jobs never touches repository settings.
- Every push to `master`, and every change to the workflow, its composite action, `global.json`, `.nvmrc`, or `.config/dotnet-tools.json`, runs every job.
- The workflow uses no repository secrets. The SA password is a literal scoped to the ephemeral service container, and the E2E certificate password is the committed mock-only value documented in `docs/e2e/authenticated-harness.md`.
- On the runner, the exported dev certificate is added to the OpenSSL trust store because the API fetches the mock issuer's metadata over HTTPS; Windows workstations get the same trust from `dotnet dev-certs https --trust`.
- A clean checkout of `frontend/` needs `frontend/.npmrc` (`legacy-peer-deps`, because `eslint-plugin-jsx-a11y` does not declare ESLint 10) and an explicit `generate-routes` step (the TanStack route tree is gitignored).
- This change has no user-visible behavior, so it adds no Playwright scenarios; the existing E2E suite runs in CI instead, which is the change's own end-to-end verification.

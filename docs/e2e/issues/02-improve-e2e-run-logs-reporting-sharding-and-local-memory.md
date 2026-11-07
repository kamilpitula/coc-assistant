---
id: PBI-E2E-002
status: todo
blocked_by: []
---

# PBI-E2E-002: Improve E2E Run Logs, Reporting, CI Sharding, and Local Memory Use

## Directive
Make E2E runs easy to follow and fast for developers: the console shows test progress instead of server logs, CI publishes a readable test report, the CI E2E job runs in shards, and local runs no longer die from memory exhaustion.

**Background (measured 2026-11-07):**
- The last green CI E2E job wrote about 544k log lines; about 488k were forwarded `[api]`/`[vite]` server output (`DEBUG=pw:webserver`), including about 38k EF Core SQL command lines and about 29k authentication debug lines (`appsettings.E2E.json`).
- The CI E2E job takes about 15 minutes: about 2 minutes of setup and 13.3 minutes of suite (182 tests, 2 workers). The HTML report is uploaded only on failure; there is no check run with per-test results.
- Local failures in past sessions were system-wide memory exhaustion, not one process hitting its own limit: Chromium failing to launch (`browserType.launch: Target page, context or browser has been closed`), contexts dying mid-test, and `tsc` failing with `Zone Allocation failed` at about 600 MB heap on a 16 GB machine. Runs from agent worktrees sometimes overlapped, and with fixed ports plus `reuseExistingServer` a second run silently tested another checkout's servers.

**Scope:**
- **Server logs:** remove `DEBUG=pw:webserver` from CI. Each `webServer` entry (API, Vite, mock OAuth) redirects its output through the shell to `e2e/logs/{api,vite,mock-oauth2}.log` (gitignored; outside `test-results/`, which Playwright clears at the start of a run).
- **Log levels:** `appsettings.E2E.json` uses `Default: Information` (keeps `CocAssistant.*`), `Microsoft: Warning` (covers EF Core and ASP.NET Core), and drops the `Microsoft.AspNetCore.Authentication: Debug` override. Document how to re-enable it for one run with `Logging__LogLevel__Microsoft.AspNetCore.Authentication=Debug`.
- **Reporters:** `list` in the console locally and on CI. Locally the HTML report is also written and opens only on failure. On CI each shard writes a blob report.
- **CI report:** JUnit XML published through `dorny/test-reporter` as an "E2E tests" check run, matching the backend jobs. The merged HTML report is uploaded as an artifact on every run.
- **CI sharding:** the E2E job becomes a 4-shard matrix (`fail-fast: false`, 2 workers per shard, own SQL service container per shard). Each shard uploads its blob report and its server logs (always, 7-day retention). A `merge-reports` job merges blob reports into one HTML report and the JUnit check run; `ci-success` depends on it. Target: E2E wall time about 6 minutes.
- **Leaner local API:** the API runs from build output (`dotnet <path>/CocAssistant.Api.dll`) instead of `dotnet run`. Playwright starts `webServer` entries before `globalSetup`, so the build and `dotnet build-server shutdown` are chained in the API `webServer` command.
- **Worker count:** read from `E2E_WORKERS`, defaulting to 1 locally and 2 on CI.
- **Single-run lock:** `globalSetup` refuses to start while another E2E run holds the lock; a lock whose owning process is gone is treated as stale and cleared. An occupied server port fails fast with a clear message.
- **Server reuse:** no reuse by default; `E2E_REUSE_SERVERS=1` opts in to `reuseExistingServer` locally (the developer is then responsible for the running servers matching the checkout). The lock applies either way.
- **Out of scope:** serving the frontend with `vite build` plus `vite preview` instead of the dev server (revisit only if a measured local run is still short on memory); changing retries; fixing the `Failed to invoke hub method 'SubscribeToCampaign'` errors seen in CI logs.

## Dependencies
- Blocked by: None
- Must merge before: None

## Context
Read: `.github/workflows/ci.yml` (E2E job), `e2e/playwright.config.ts`, `e2e/globalSetup.ts`, `e2e/localDbMemory.ts` and its test (style for new helper tests), `backend/src/CocAssistant.Api/appsettings.E2E.json`, `specs/continuous-integration/spec.md`, `docs/e2e/authenticated-harness.md`, `docs/adr/0002-authenticated-e2e-uses-local-mock-oidc-issuer.md`.
- `webServer` commands run in `cmd` on Windows and `sh` on Linux; the redirection and command chaining must work in both.
- CI already builds the API before the suite; avoid building it twice per shard.
- No user-visible UI changes, so the UX specification step is skipped. These are build and CI tooling changes with no external user workflow, so no new E2E scenarios are added; the existing suite passing locally and in all shards is the end-to-end check.

## Verification
- [ ] A CI run shows no forwarded `[api]`/`[vite]` lines in the E2E step log; the console shows one `list` line per test.
- [ ] Each shard uploads `e2e/logs/*.log` on success and failure, kept for 7 days.
- [ ] An "E2E tests" check run lists per-test results, and the merged HTML report artifact is uploaded on every run.
- [ ] The E2E job runs as 4 shards plus `merge-reports`; `ci-success` fails when any shard or the merge fails; E2E wall time is recorded in the PR (target about 6 minutes).
- [ ] Locally, a full run writes `e2e/logs/*.log`, shows `list` progress, and uses 1 worker unless `E2E_WORKERS` is set.
- [ ] Locally, the API process is `dotnet <dll>` and no MSBuild or compiler server stays resident after the build.
- [ ] Starting a second local run while one is active fails fast with a clear message; a stale lock from a killed run does not block the next run.
- [ ] With `E2E_REUSE_SERVERS=1`, already-running servers are reused; without it, an occupied port fails fast.
- [ ] Unit tests cover the lock (acquire, refuse, stale-lock recovery), the port check, and the worker-count and reuse env parsing, in the style of `localDbMemory.test.ts`, and run in `npm run test:unit`.
- [ ] `specs/continuous-integration/spec.md` describes the shards, report, check run, and log artifacts; `docs/e2e/authenticated-harness.md` describes local logs, workers, the lock, server reuse, and the auth debug switch.

## Refinement Protocol
If shard count, reporters, log locations, or env variables change, update `.github/workflows/ci.yml`, `e2e/playwright.config.ts`, `e2e/globalSetup.ts` and its helpers with their tests, `specs/continuous-integration/spec.md`, and `docs/e2e/authenticated-harness.md` together.

## Follow-ups

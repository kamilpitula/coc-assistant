# Design: PBI-E2E-002: Make E2E runs readable, sharded on CI, and safe to run locally

## Triggers
- 1 New dependency: `actions/download-artifact` is new to the workflow (merge-reports needs it).
- 3 New cross-layer pattern: a wrapper script becomes the only way to start an E2E run, and it holds a machine-wide lock.
- 6 The Explorer's open questions have competing answers: where the lock and port check go, how the server commands run on Windows and Linux, how to avoid double builds, and how sharding is wired.

## Constraints
- ADR 0004 (`docs/adr/0004-ci-on-github-actions-with-sql-server-service-container.md`): one workflow with path-filtered jobs, `ci-success` as the only required check, which passes when a job is skipped. The shards and merge-reports must stay inside that shape.
- ADR 0002 (local mock OIDC issuer): the mock stays a docker compose `webServer` entry.
- `specs/continuous-integration/spec.md` lines 21, 25, 33-35, 51 and scenarios at lines 160-169. The scenario "E2E success uploads no diagnostics" (166) contradicts the PBI and must be replaced.
- Helper style: pure functions with an injectable `env` (`e2e/sqlServerConnection.ts:9-15`), tested with `node:test` and `.ts` import extensions (`e2e/localDbMemory.test.ts:1-8`), run natively by Node 24 (`.nvmrc`). No TS enums or parameter properties, because type stripping cannot run them. Any module the wrapper imports must use `.ts` relative imports.
- Existing CI action shapes to copy: dorny/test-reporter pinned at `d1b5dff021aa968b288b02285a8bf47471c5928a` v3.2.0, `if: success() || failure()`, `checks: write` (`.github/workflows/ci.yml:104-110`). upload-artifact pinned at `cf430e030ddbb5b0abf93d22962f4752f3646cd9` v7.0.2 (`.github/workflows/ci.yml:262`).
- Facts about Playwright 1.63 (`e2e/node_modules/playwright/lib/runner/index.js`):
  - Servers start before `globalSetup`: `createGlobalSetupTasks` runs `createPluginSetupTasks` before `config2.globalSetups`.
  - A `webServer` entry without reuse throws "is already used" when its port is open, before it starts anything.
  - `isPortUsed` probes by connecting to 127.0.0.1 and ::1.
  - Blob report names get a shard suffix automatically (`_defaultReportName`).
  - Reporter output can be set through `PLAYWRIGHT_<NAME>_OUTPUT_FILE` / `_OUTPUT_DIR`.
- `dotnet build --disable-build-servers` and `dotnet ef database update --no-build` both exist in this SDK (checked with `--help`).
- Observed: a `coc-mock-oauth2` container left running for 2 days after an earlier local run (`docker ps`).
- Cyclomatic complexity of 10 or less per function (CLAUDE.md).

## Decisions

### D1: Where the single-run lock and the occupied-port check run
| Metric | A: `npm test` wrapper `e2e/runE2e.ts` | B: side effect when the config loads | C: `globalSetup` (PBI wording) |
| --- | --- | --- | --- |
| Consistency | 0 new entry script; npm scripts already wrap Playwright | - hidden side effects; the config is also loaded by workers, `--list`, and the VS Code extension's test discovery | + matches the PBI text |
| Modifiability | + all pre-run steps live in one place | - must guess whether it runs in the main process or a worker | 0 |
| Testability | + lock and port helpers are pure and injectable; the wrapper is thin wiring | - hard to test because it depends on how Playwright loads the config | + helpers testable |
| Simplicity | 0 one small script | - needs guards for worker processes and an exit hook to release the lock | + least code |
| Reversibility | + delete the script and restore the npm script | 0 | + |
| Security and correctness | + lock and port check run before any server starts, so a refused second run never touches the first run's servers | 0 correct only if the guards are right | - the second run's servers start first. During the first run's startup it can attach to the same mock container (fixed `container_name`, same compose project `docker`), and stopping it can take the first run's mock down |

- **Chosen:** A, because of correctness and testability. Given up: a direct `npx playwright test` no longer works, and the VS Code extension cannot run tests directly.
- **Rejected:** B (fragile process detection, and it breaks test discovery). C as the lock owner (it fires too late). The Developer must not move the lock into the config or into `globalSetup`.
- Sub-decision D1b, runs that skip the wrapper: `globalSetup` throws when `COC_E2E_RUN_LOCK` (set by the wrapper in the child's env) is missing, and tells the user to run `npm test -- <args>`. **Rejected:** having `globalSetup` take the lock itself as a fallback; that is a second way to acquire it, and it comes too late. **Rejected:** no guard at all; agents would bypass the lock silently, which is how the overlapping runs in the PBI background happened.

### D2: How server commands work on both Windows (cmd) and Linux (sh), with output to `e2e/logs`
| Metric | A: commands that only use syntax both shells share | B: committed Node launcher script | C: separate commands per OS in the config |
| --- | --- | --- | --- |
| Consistency | + commands stay plain strings as they are today | 0 | - two versions of every command |
| Modifiability | + one string per server | 0 | - every change made twice |
| Testability | 0 checked by real runs | + launcher could be unit-tested | - |
| Simplicity | + no new code | - spawn, pipe, and kill handling | - |
| Reversibility | + | 0 | 0 |
| Security and correctness | + `&&`, `>`, `>>`, `2>&1`, and double-quoted paths behave the same in cmd and sh, and Playwright kills the whole shell process tree | 0 | 0 |

- **Chosen:** A. Log paths are absolute paths built with `resolve()` and wrapped in double quotes. Every part of a chain appends to the same log: first `>`, then `>>`, each with `2>&1`. `playwright.config.ts` creates `e2e/logs` with `mkdirSync(..., { recursive: true })` when it loads. That one side effect is safe to repeat, and it keeps the redirects valid whatever started the run. Entries keep `stdout`/`stderr: 'pipe'`; nothing reaches them anyway.
- **Rejected:** B and C (more code for no gain). Grouping a chain with `( ... ) > file` was also rejected; per-command `>>` is just as portable and simpler to read.

### D3: The API build: one command for local and CI, with no resident build servers
| Metric | A: webServer runs `dotnet build --disable-build-servers ... && dotnet <dll>`; CI's separate build step is removed; ef uses `--no-build` | B: PBI chain `dotnet build && dotnet build-server shutdown && dotnet <dll>`; same CI and ef changes | C: keep CI's build step, add `E2E_SKIP_API_BUILD` to drop the build from the command |
| --- | --- | --- | --- |
| Consistency | + one command everywhere | + one command everywhere | - an extra env variable and two paths |
| Modifiability | + | + | - |
| Testability | 0 | 0 | 0 |
| Simplicity | + | + | - |
| Reversibility | + | + | 0 |
| Security and correctness | + leaves no MSBuild or compiler server behind, and does not touch builds running in other worktrees | - `build-server shutdown` kills every build server on the machine for this user, including other worktrees' builds | 0 |
| Performance | - a cold compile without the compiler server may take tens of seconds longer; a no-op build costs little | + uses a warm compiler server | + |

- **Chosen:** A, because it does not disturb other worktrees. Given up: some speed on cold builds.
- The DLL path is `backend/src/CocAssistant.Api/bin/Debug/net10.0/CocAssistant.Api.dll`. The build target is `backend/src/CocAssistant.Api`, with `-v q -nologo`.
- The three `dotnet ef database update` calls in `e2e/globalSetup.ts:88-102` get `--no-build`. Why:
  - The API build already covers the Infrastructure projects.
  - Ef's own builds would start build servers again.
  - Ef's builds are also the source of the cold-build MSBuild lock collision described in `docs/e2e/authenticated-harness.md:81-85`, which this removes.
- CI step "Build the API" (`.github/workflows/ci.yml:220-221`) is removed, so each shard builds exactly once.
- **Rejected:** B (human decision H2: the machine-wide shutdown disturbs other worktrees). C (two paths for one job). The Developer must not reintroduce `dotnet build-server shutdown`.

### D4: Lock location, contents, and stale-lock detection
- Location: `join(os.tmpdir(), 'coc-assistant-e2e-run.lock')`. It must be machine-wide, because the ports are machine-wide and the overlapping runs come from different worktrees.
- **Rejected:** a lock file inside the checkout, because it does not protect across worktrees.
- Contents: JSON `{ pid, checkout (repo root), startedAt (ISO) }`.
- Acquire: `openSync(path, 'wx')`, which creates the file atomically and fails if it exists. On `EEXIST`, read and parse the file:
  - Owner alive: refuse, naming the pid, checkout, start time, and the lock path to delete if that pid is not actually an E2E run.
  - Owner dead, or file unreadable or unparsable: delete it and retry `wx` once. A second `EEXIST` means refuse.
- Liveness check: `process.kill(pid, 0)`. `ESRCH` means dead, `EPERM` means alive. This works on Windows. It is injectable for tests.
- Release: the wrapper deletes the file in `finally`, and only if the file still holds its own pid.
- Known limitations, documented and not fixed:
  - Windows reuses pids, so a stale lock can look alive. The refusal message gives the lock path so it can be deleted.
  - Two runs clearing the same stale lock at the same moment can both end up holding it.
- Ports checked: all three servers, 8443 / 5059 / 5174. They are defined once in `e2e/e2eServers.ts` and imported by both the config and the wrapper.
- The check connects to 127.0.0.1 and ::1, the same probe Playwright uses for readiness. This keeps it consistent with reuse. A listen-based probe was rejected because a wildcard bind on Windows can hide the conflict.

### D5: Wrapper run sequence and the leftover mock container
Sequence:
1. Acquire the lock (refuse means exit 1).
2. If not reusing servers, run `docker compose -f docker/docker-compose.e2e.yml down` (cwd `e2e/`).
3. If not reusing servers, check the ports. If any is occupied, exit 1 with one line per port: name, port, and the hint `E2E_REUSE_SERVERS=1` (the servers must match this checkout).
4. Start Playwright with `spawn(process.execPath, [<e2e>/node_modules/@playwright/test/cli.js, 'test', ...argv], { stdio: 'inherit', env: { ...process.env, COC_E2E_RUN_LOCK: lockPath } })`. The wrapper ignores SIGINT; the terminal delivers Ctrl+C to the child anyway.
5. In `finally`: if not reusing servers, run `docker compose down` again, then release the lock and exit with the child's exit code.

Why step 2: on Windows, Playwright kills the compose CLI with `taskkill /F`, and the container survives (observed: `coc-mock-oauth2 Up 2 days`). Without reuse, that leftover container would fail every later run. While the machine-wide lock is held, any `coc-mock-oauth2` container is a leftover.

**Rejected:** only detecting the leftover and telling the user to clean it up. Every Windows run would then fail on the second attempt.

### Single-option decisions
- `E2E_WORKERS`, via `resolveWorkerCount(env)` in `e2e/runSettings.ts`:
  - Unset, empty, or whitespace: the default, 2 when `env.CI` is truthy, otherwise 1.
  - A string matching `/^\d+$/` with value 1 or more: that number.
  - Anything else (0, negative, decimal, `50%`, text): throw an Error naming the value.
  - Reason: a typo should fail loudly instead of silently falling back.
- `E2E_REUSE_SERVERS`, via `resolveReuseServers(env)`:
  - `'1'` means true, unless `env.CI` is set, in which case it is false (the PBI says reuse is local only).
  - Unset, empty, or `'0'` means false.
  - Any other value throws.
- Reporters:
  - Local: `[['list'], ['html', { open: 'on-failure' }]]`. Note that `open: 'on-failure'` serves the report and blocks until Ctrl+C, which is the current behavior. Agents set `PLAYWRIGHT_HTML_OPEN=never`, and the docs must say so.
  - CI: `[['list'], ['blob']]`.
- Shard and merge mechanics:
  - Matrix `shardIndex: [1, 2, 3, 4]`, `shardTotal: [4]`, `fail-fast: false`. Each shard runs `npm test -- --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}`.
  - Blob files go to `e2e/blob-report/`; Playwright names them per shard automatically.
  - Each shard uploads `blob-report-<shardIndex>` and `e2e-logs-<shardIndex>` (`e2e/logs/*.log`), both `if: success() || failure()`, retention 7 days.
  - JUnit comes from the merged blobs in merge-reports, so there is one check run. **Rejected:** JUnit per shard, which gives one check run per shard.
- Removed from CI: `DEBUG: pw:webserver`, the `tee`, "Collect mock issuer logs" (its output now goes to `e2e/logs/mock-oauth2.log`), and the failure-only `e2e-diagnostics` upload (traces are now inside the blob reports and the merged HTML).

## Patterns
- **Used:** Facade, at `e2e/runE2e.ts`. Force: the pre-run steps (lock, mock cleanup, port check) must happen before Playwright's own startup, and callers should see one entry point (`npm test`).
- **Rejected:**
  - Strategy for per-OS commands: there is no OS-dependent branch, see D2.
  - Chain of Responsibility for the pre-run checks: only three fixed steps.
  - Template Method or Builder for `webServer` entries: three literal entries read more clearly. The Developer may add a small `logRedirect(name)` helper that returns the quoted redirect strings (DRY), and nothing beyond that.

## Invariants
- No `webServer` process starts unless the wrapper holds the lock and, when not reusing servers, all three ports were free.
- A refused run never stops, rebuilds, or connects to another run's servers.
- `globalSetup` refuses when `COC_E2E_RUN_LOCK` is missing.
- With `E2E_REUSE_SERVERS=1` (local only), the wrapper skips mock cleanup and the port check, but still takes the lock.
- No MSBuild or compiler server stays running because of an E2E run. Nothing in the E2E path calls `dotnet build-server shutdown`.
- On CI, every shard and merge-reports feed `ci-success`. A skipped E2E (no relevant changes) still passes.
- With `COC_SQLSERVER_CONNECTION` unset, the run uses LocalDB as before (`specs/continuous-integration/spec.md:72`).
- Every function has cyclomatic complexity of 10 or less.

## Implementation plan
1. `e2e/runSettings.ts` + `e2e/runSettings.test.ts`: `resolveWorkerCount`, `resolveReuseServers`.
2. `e2e/e2eServers.ts`: the server name-to-port constant.
3. `e2e/serverPorts.ts` + `e2e/serverPorts.test.ts`:
   - `isPortInUse(port)` probes 127.0.0.1 and ::1 with a short timeout.
   - `findOccupiedPorts(servers, probe = isPortInUse)`.
   - `describeOccupiedPorts(occupied)` builds the message.
4. `e2e/runLock.ts` + `e2e/runLock.test.ts`: `acquireRunLock({ path, pid, checkout, isProcessAlive })` returns acquired or refused-with-message, `releaseRunLock(path, pid)`, and `isProcessAlive(pid)`.
5. `e2e/runE2e.ts`: the wrapper, sequence D5. Only wiring; logic stays in the helpers.
6. `e2e/package.json`:
   - `"test": "node runE2e.ts"`
   - `"test:ui": "node runE2e.ts --ui"`
   - `"test:unit": "node --test *.test.ts"` (Node expands the glob, so it works in cmd and sh)
7. `e2e/playwright.config.ts`:
   - Create the logs directory.
   - `workers` from `resolveWorkerCount`; `reuseExistingServer` from `resolveReuseServers`.
   - Reporters per the single-option decisions.
   - Commands with redirects. The API runs from the DLL per D3. Mock: `docker compose ... up > "<logs>/mock-oauth2.log" 2>&1`. Vite: `npm run dev -- ... > "<logs>/vite.log" 2>&1`.
   - Ports come from `e2eServers.ts`.
   - Update the workers and reporter comments (lines 43-48).
8. `e2e/globalSetup.ts`: the `COC_E2E_RUN_LOCK` guard first; `--no-build` on the three ef calls.
9. `backend/src/CocAssistant.Api/appsettings.E2E.json`: `Default: Information`, `Microsoft: Warning`. Remove the `Microsoft.AspNetCore` and `Microsoft.AspNetCore.Authentication` overrides; `Microsoft` covers both.
10. `.gitignore`: add `e2e/logs/` and `e2e/blob-report/`.
11. `.github/workflows/ci.yml`:
    - The e2e job becomes the matrix, named `E2E (shard N/4)`. Its per-shard SQL service stays `*sql-service`. Remove the build step, DEBUG, tee, and the collect and diagnostics steps; add the blob and log uploads.
    - New `merge-reports` job, named "E2E report":
      - Trigger: `needs: [changes, e2e]`, `if: always() && needs.changes.outputs.e2e == 'true'`, permissions `contents: read, checks: write`.
      - Setup: checkout, setup-node with the e2e cache, `npm ci` in `e2e`.
      - Download: `actions/download-artifact` pinned to a full SHA with a version comment (look up the SHA with `gh api`), pattern `blob-report-*`, `merge-multiple: true`, into `all-blob-reports`.
      - Merge: in `e2e`, run `npx playwright merge-reports --reporter html,junit ../all-blob-reports` with env `PLAYWRIGHT_JUNIT_OUTPUT_FILE=results.xml`, `PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report`, `PLAYWRIGHT_HTML_OPEN=never`.
      - Report: dorny/test-reporter (same SHA as the backend jobs) with name `E2E tests`, path `e2e/results.xml`, reporter `java-junit`, `if: success() || failure()`.
      - Upload the merged HTML as `e2e-html-report`, `if: success() || failure()`, retention 7.
    - `ci-success.needs` gains `merge-reports`.
12. `specs/continuous-integration/spec.md`:
    - Line 21: the e2e row describes the shards.
    - Add a `merge-reports` row.
    - "E2E in CI": logs, blob reports, the check run, artifacts, no separate API build.
    - Line 51: add `e2e/logs/` and `e2e/blob-report/`.
    - Scenarios: replace 160-169 with the shard-artifact, merged-report, and check-run scenarios below; update the job lists in scenarios 98/104/110/117/141 to include merge-reports where e2e is listed.
13. `docs/e2e/authenticated-harness.md`:
    - "Running": `npm test -- <args>` only; logs in `e2e/logs`; `E2E_WORKERS`; the lock and its stale recovery; `E2E_REUSE_SERVERS`; `PLAYWRIGHT_HTML_OPEN=never` for agents; the auth debug switch `Logging__LogLevel__Microsoft.AspNetCore.Authentication=Debug`.
    - Remove the build-collision workaround (lines 81-85).
    - Server table: "Owner" for the API becomes `dotnet <dll>`.
    - "Running in CI" (lines 115-129): rewrite for the shards.
14. `.claude/agents/verifier.md:73`: `npx playwright test --retries=0` becomes `npm test -- --retries=0` (approved under H3).

## Reuse
- Using:
  - The pattern from `e2e/sqlServerConnection.ts` (injectable `env`) for the settings helpers.
  - The `e2e/localDbMemory.test.ts` style for tests.
  - The `*sql-service` anchor for each shard.
  - The existing pinned dorny/test-reporter and upload-artifact SHAs.
  - Playwright's own connect probe semantics for the port check.
- Not using:
  - A `proper-lockfile` style npm package: one more dependency for about 40 lines.
  - `npm run build:backend` (`dotnet build` of the whole solution) in the server command: builds far more than the API.

## TDD units
- `resolveWorkerCount`:
  - Unset, empty, or whitespace gives 1 locally and 2 with `CI`.
  - `"3"` gives 3.
  - `"0"`, `"-1"`, `"1.5"`, `"50%"`, `"abc"` throw.
- `resolveReuseServers`:
  - `"1"` gives true locally.
  - `"1"` with `CI` gives false.
  - Unset, `""`, or `"0"` gives false.
  - `"true"` throws.
- `acquireRunLock` (temp-dir path, injected liveness):
  - No file: acquired, and the file holds pid, checkout, and startedAt.
  - Live owner: refused, and the message names the pid, checkout, and lock path.
  - Dead owner: stale lock cleared, then acquired.
  - Corrupt JSON: treated as stale.
- `releaseRunLock`:
  - Removes the file when it holds our pid.
  - Leaves the file when another pid holds it.
- `isProcessAlive`: true for `process.pid`, false for a pid that cannot exist.
- `findOccupiedPorts` with a real `net.Server` on an ephemeral port: reports that port and not a free one.
- `describeOccupiedPorts`: names the server and port and mentions `E2E_REUSE_SERVERS=1`.

## E2E coverage
- Exception, from the PBI (Context, line 37) and ADR 0004 (line 17): this is build and CI tooling with no user-visible workflow. No Playwright scenarios are added. The existing suite passing locally and in all 4 shards is the end-to-end check.
- These replace the CI spec's Gherkin scenarios at lines 160-169. They are checked on the PR's CI run, not by Playwright:
  - "E2E shard artifacts are preserved": every shard uploads its blob report and `e2e/logs/*.log` on success and on failure, kept 7 days.
  - "E2E results are reported": merge-reports publishes the "E2E tests" check run and uploads the merged HTML report on every run.
  - "A failing shard fails the required check": a failed shard or a failed merge-reports fails `ci-success`.

## ADR
- None. ADR 0004 already covers the CI shape (one workflow, `ci-success` aggregator), and sharding fits inside it. The wrapper and lock are a local dev convention that is easy to reverse and is documented in `docs/e2e/authenticated-harness.md`. `actions/download-artifact` is GitHub's own companion to upload-artifact, which is already in use. Nothing here changes a shared interface or data model.

## Phases
- Phase 1: helpers, tests, wrapper, config, `globalSetup`, appsettings, `.gitignore`; checkpoint `feat(e2e): run lock, port check, server logs, workers and reuse settings (PBI-E2E-002)`.
- Phase 2: `.github/workflows/ci.yml` shards and merge-reports; checkpoint `ci(e2e): shard the E2E job and publish merged report and check run (PBI-E2E-002)`.
- Phase 3: spec, harness doc, verifier doc; checkpoint `docs(e2e): document logs, lock, reuse, shards (PBI-E2E-002)`.

## Human decisions
Approved as written ("h1-h3 look ok, approved"):
- H1: the lock and port check live in the `npm test` wrapper, not in `globalSetup` as the PBI says, because servers start before `globalSetup`. `globalSetup` only refuses runs that skip the wrapper. The PBI's Scope line 25 is read this way.
- H2: `dotnet build --disable-build-servers` instead of chaining `dotnet build-server shutdown` (PBI Scope line 23). The verification goal "no build server stays resident" is unchanged.
- H3: direct `npx playwright test` and running tests from the VS Code extension are refused. This also approves editing `.claude/agents/verifier.md:73` to use `npm test -- --retries=0`.

## Revisions

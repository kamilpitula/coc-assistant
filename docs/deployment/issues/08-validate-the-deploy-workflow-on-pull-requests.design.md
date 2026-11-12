# Design: PBI-DEP-008: Validate the deploy workflow on pull requests

## Triggers
- 2 (shared interface): the deploy build steps become shared units used by two workflows (`deploy-dev.yml` and `ci.yml`).
- 3 (new cross-layer pattern): composite build actions shared by deploy and CI, and a pinned binary tool downloaded by a tested `tools/` command line.
- 4 (ADR): the deploy job graph changes, so ADR 0031 gets an amendment. The tool-pinning pattern will probably be copied, so ADR 0004 gets an amendment too.
- 6 (open questions): the Explorer left 6 open questions with more than one reasonable answer.
- Trigger 7 does not apply: there is no user-visible UI, so the UX step is skipped.

## Constraints
- **ADR 0031 D6, job graph** (amendment PBI-DEP-005, ADR line 57): `terraform-apply` and `image` run in parallel, `migrate` needs the apply, `rollout` needs `image` and `migrate`, `spa` needs `rollout` and the apply. Any change to this graph needs an ADR amendment.
- **ADR 0031 D1, testing exception** (ADR line 59): workflow shell is tested only by live runs. This PBI narrows it.
- **ADR 0031 OIDC rules** (ADR line 16) and `specs/deployment/spec.md:66`: only the `dev` environment's deploy identity can change Azure. Pull request workflows can only read.
- **`specs/continuous-integration/spec.md`:**
  - line 50: actions are pinned by full SHA;
  - line 49: default permission is `contents: read`;
  - line 51 and guardrail 76: no secrets;
  - guardrails 69-73: `ci-success` is the only required check, a skipped job never fails it, and every push to master runs every job.
- **Where the variables live,** per `specs/deployment/spec.md:57`:
  - repository variables: `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_PLAN_CLIENT_ID`;
  - `dev` environment variables: `AZURE_DEPLOY_CLIENT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`, `VITE_API_SCOPE`.
  - Discrepancy: `docs/infrastructure/dev-environment-setup.md:140-141` lists only `AZURE_DEPLOY_CLIENT_ID`. The spec wins and the doc is fixed here.
- **Existing patterns this design reuses:**
  - composite action: `.github/actions/setup-dotnet/action.yml:1-14`;
  - pinned download with sha256 check: `deploy-dev.yml:165-173`;
  - path-change detection: the `changes` job, `ci.yml:28-74`. The `toolchain` filter at lines 64-69 already sets run-all for `.github/workflows/**` and `.github/actions/**` (line 73).
  - tested tool with injected file and command access: `tools/ascii-check/src/cli.ts:9-31`, with the CI job at `ci.yml:374-394`;
  - hook gating on staged paths: `.githooks/pre-commit:16`.
- **Facts the design relies on:**
  - `ci-success` treats `skipped` as passing: it fails only on `failure` or `cancelled` (`ci.yml:403`).
  - `backend/Dockerfile` restores and publishes inside the container, so the image build needs no host build output.
  - The SPA build does not fail on empty `VITE_*` values: `buildMsalConfig.ts:45-47` falls back to `''`.
- **Complexity limit:** cyclomatic complexity 10 or less (`CLAUDE.md`) applies to all new TypeScript.
- No game rules or `CONTEXT.md` terms are involved.

## Decisions

### D1: How the build steps are shared (composite actions or a reusable workflow)

| Metric | A: composite actions run inside the existing jobs | B: one reusable workflow with build jobs that upload artifacts |
| --- | --- | --- |
| Consistency | + Same mechanism as `.github/actions/setup-dotnet`. The deploy graph from ADR 0031 D6 stays as it is. | - First reusable workflow in the repo. Deploy needs new artifact upload/download jobs. |
| Modifiability | + Each build lives in one place. Jobs keep their own `environment` and `permissions`. | 0 One place, but every consumer is tied to the artifact contract. |
| Testability | + The PR job runs exactly the steps the deploy runs. | 0 Same steps, but the artifact handoff is only tested in a live deploy. |
| Simplicity | + Outputs stay on the same runner: bundles in `$RUNNER_TEMP/bundles` (`deploy-dev.yml:155`), `frontend/dist` and the local image as they are now. | - `upload-artifact` drops the execute bit on bundles. The image needs `docker save`/`load` or a push inside the shared workflow. The SPA build needs Terraform outputs (`deploy-dev.yml:334-335`), so its build would have to wait for the apply anyway. |
| Reversibility | + Undo by inlining the steps again. | 0 More moving parts to undo. |
| Security and correctness | + No push or login inside the shared unit, so the PR caller cannot reach GHCR or Azure. | - A push flag inside the shared unit puts `packages: write` on a path the PR also calls. |

- **Chosen: A.** Simplicity, consistency and security decided it. Given up: each deploy job still runs its own checkout and toolchain setup.
- **Rejected: B,** for the reasons in the table. The Developer must not add it again.

### D2: How finely the shared steps are split

| Metric | A: three actions: `build-migration-bundles`, `build-api-image`, `build-spa` | B: one `deploy-build` action with switch inputs |
| --- | --- | --- |
| Consistency | + One action per deploy job (`migrate`, `image`, `spa`). | - Each deploy job would pass switches to turn off two thirds of the action. |
| Modifiability | + A change to one build touches one file. | - Conditionals pile up in one file. |
| Testability | + Each action can be checked on its own in the PR job. | 0 |
| Simplicity | + No conditional steps. | - Every step carries an `if:` on a switch input. |
| Reversibility | + | + |
| Security and correctness | + | 0 |

- **Chosen: A.** Modifiability and simplicity decided it. Given up: three files instead of one.
- **Rejected: B,** because switch-driven conditionals are what a mode-based Strategy would be needed to tame (see Patterns). Splitting into three actions removes the switches instead.

### D3: Where actionlint is pinned and how it is installed (CI, pre-commit hook and local command)

| Metric | A: tested TypeScript tool `tools/actionlint` (download, sha256 check, extract, run) | B: shell installer plus a version file | C: Docker image `rhysd/actionlint@sha256:<digest>` |
| --- | --- | --- | --- |
| Consistency | + Same shape as `tools/ascii-check` and `tools/backlog`, run with `node .../cli.ts` like the hook at `pre-commit:12`. | 0 Reuses the shell pattern from `deploy-dev.yml:165-173`. | - First tool run through Docker. |
| Modifiability | + Pins live in one TypeScript module read by CI, the hook and the local command. | 0 One version file, but each script reads it separately. | + Only the digest changes. |
| Testability | + vitest with injected download, hash and command steps. | - Needs bats, a new dependency, or a testing exception. | 0 Nothing to test, but nothing to run without Docker. |
| Simplicity | 0 About 4 small modules. | + About 20 lines. | + One command. |
| Reversibility | + | + | + |
| Security and correctness | + Never runs a binary whose archive hash did not match. | + The same `sha256sum -c` check. | + Digest pin. |
| Cross-platform (Git Bash, PowerShell, Linux) | + Node runs everywhere. On win32 it uses `%SystemRoot%\System32\tar.exe`, which also extracts zip. | - PowerShell users need Git Bash; Git Bash may lack `unzip`. | - Docker must be running at commit time; Git Bash mangles `-v` paths (MSYS). |

- **Chosen: A.** Testability and cross-platform behaviour decided it, and it meets the PBI's "one documented local command". Given up: more code than a shell script.
- **Rejected: B** (needs a test dependency or an exception, and is fragile on Windows) and **C** (Docker must be running to commit). The Developer must not add either.

### D4: The variables preflight in `deploy-dev.yml`

| Metric | A: new first job `preflight` (`environment: dev`, no permissions, owns the master gate); `terraform-apply` and `image` need it | B: first step inside `terraform-apply` |
| --- | --- | --- |
| Consistency | 0 Changes the D6 graph, so ADR 0031 needs an amendment. | + Graph unchanged. |
| Modifiability | + The gate expression, now copied at `deploy-dev.yml:38-42` and `:99-103`, moves to one place. Jobs that need `preflight` skip when it skips. | - The gate stays copied in two places. |
| Testability | + Owner live check: unset one variable, and `preflight` fails while `terraform-apply` stays skipped. | 0 The apply job starts, then fails at its first step. |
| Simplicity | 0 One more job. | + One step. |
| Reversibility | + | + |
| Security and correctness | + Nothing runs, and nothing is pushed to GHCR, when variables are missing. | - The parallel `image` job still pushes an image. Harmless per ADR 0031 line 57, but wasted. |
| Performance | - About 15 seconds before the image build starts. | + |

- **Chosen: A.** It satisfies "before terraform-apply starts" literally, and the gate is no longer copied. Given up: about 15 seconds and a graph amendment.
- **Rejected: B** for the reasons above. The human confirmed D4-A at the gate (Q2).
- The preflight must run under `environment: dev`. Environment variables are visible only to jobs that declare the environment, and repository variables are visible there too.

### D5: Is the preflight check a tested script or inline shell?

| Metric | A: inline shell in the `preflight` step, about 10 lines, covered by the narrowed ADR 0031 D1 exception | B: a `tools/` TypeScript module |
| --- | --- | --- |
| Consistency | + Same as the other deploy shell steps. | - The preflight job would need checkout and setup-node. |
| Testability | 0 Owner live check, which the PBI Verification asks for anyway. | + Unit tests. |
| Simplicity | + One loop with no branching beyond `-z`. | - A package for one loop. |
| Reversibility | + | + |
| Security and correctness | + | + |

- **Chosen: A.** The logic is a straight loop. Given up: a unit test of the loop.
- **Rejected: B,** because it is too heavy for the logic it would hold.
- **ADR 0031 D1 amendment wording:** "Workflow YAML and straight-line workflow shell (no branching beyond a single emptiness or exit-code check) stay tested by live runs and, from PBI-DEP-008, by actionlint and the pull request deploy build check. Script logic with branching, such as a tool installer, lives in `tools/` with unit tests."

### D6: How the deploy build check is wired in `ci.yml`

| Metric | A: one job `deploy-build` that runs the three actions one after another | B: three jobs, one per action |
| --- | --- | --- |
| Consistency | + One entry in `ci-success.needs`. | 0 Three entries. |
| Simplicity | + | - Three times the checkout and permissions blocks. |
| Testability | 0 A failure shows as a step, not a job. | + |
| Performance | 0 About 7-8 minutes, which runs while E2E is still running, so it adds no wall-clock time. | + Runs in parallel. |

- **Chosen: A.** Given up: per-area skipping and parallel runs.
- **Rejected: B.**

### Single-option decisions
- **Gating the deploy build check:** a new `changes` output `deploy-build` = run-all OR backend OR frontend. The `toolchain` filter (`ci.yml:64-69`) already covers `.github/workflows/**` and `.github/actions/**`. The job condition is `github.event_name == 'pull_request' && needs.changes.outputs.deploy-build == 'true'`.
  - Why PR-only: on master, `deploy-dev` runs the same actions a few minutes later.
  - A separate paths filter would duplicate the backend and frontend lists (not DRY).
  - The guardrail at `specs/continuous-integration/spec.md:73` gets a stated exception for `deploy-build` (human-approved, Q3).
- **When skipped:** it is listed in `ci-success.needs`, and a skip passes (`ci.yml:403`).
- **Gating the actionlint job:** a new filter `workflows`, covering `.github/workflows/**`, `.github/actions/**` and `tools/actionlint/**`. Its output is run-all OR workflows, so it runs on every master push, when its own code or pin changes, and on any workflow change. It is listed in `ci-success.needs`.
- **Image build without push:** a plain `docker build` (as at `deploy-dev.yml:117`), because it adds no dependency.
  - Rejected: `docker/build-push-action` and an explicit `buildx`. Both add a dependency for no gain, since BuildKit is already the default on `ubuntu-latest`.
  - Login stays in the deploy job before the action, and `docker push` stays in the deploy job after it.
  - Action inputs: `image` (full reference). The `org.opencontainers.image.source` label is built inside the action.
  - The PR job passes `coc-assistant-api:ci-${{ github.sha }}`, a local tag that is never pushed.
- **`build-migration-bundles` action:**
  - It owns `./.github/actions/setup-dotnet`, `dotnet tool restore`, restore, build with `--no-restore`, and the three `--no-build` bundles.
  - These move as they are from `deploy-dev.yml:140-158`, including the comment at lines 143-146.
  - Bundles go to `$RUNNER_TEMP/bundles/<name>-bundle`, which is a stated contract of the action. The run steps at `deploy-dev.yml:217-225` keep their paths.
- **`build-spa` action:**
  - It owns setup-node, `npm ci`, `generate-routes` and `npm run build`.
  - It has five required inputs, so the deploy cannot silently drop one: `entra-client-id`, `entra-authority`, `entra-redirect-uri`, `api-scope`, `api-base-url`. They are mapped to `VITE_*` in the build step's `env`.
  - The output is `frontend/dist`, which `deploy-dev.yml:355` already reads.
- **PR placeholder values** (non-secret; the `.invalid` top-level domain is reserved, so these can never resolve):
  - `00000000-0000-0000-0000-000000000000` for the client id;
  - `https://login.invalid/ci-placeholder` for the authority (`buildMsalConfig.ts:17` can parse it);
  - `api://00000000-0000-0000-0000-000000000000/ci-placeholder` for the scope;
  - `https://spa.invalid` for the redirect URI;
  - `https://api.invalid` for the API base URL.
- **Preflight messages:** one `::error::` per missing variable, for example ``Missing vars.AZURE_TENANT_ID (repository variable, docs/infrastructure/dev-environment-setup.md section 7)``, or "environment `dev` variable ... section 8". All missing names are reported before the step exits 1.
- **actionlint pin (Q1):**
  - Use the current actionlint release that parses YAML anchors, which `ci.yml` uses at lines 121 and 204.
  - Pin only `linux_amd64` (CI) and `windows_amd64` (owner). The Developer copies each sha256 from that release's official `actionlint_<v>_checksums.txt`, with the date checked in a comment.
  - Any other platform fails with a message naming the supported ones.
- **actionlint invocation:** run from the repo root with no file arguments, plus `-shellcheck= -pyflakes=`.
  - Reason: `ubuntu-latest` ships shellcheck but Windows usually does not, so leaving them on would make CI and local results differ.
  - Turning shellcheck on is a Follow-up.
- **Cache:** `tools/actionlint/.cache/<version>-<sha256 prefix>/` (gitignored), so changing the pin invalidates the cache.

## Patterns
- **Used: Facade.** Each composite action (`.github/actions/build-*/action.yml`) hides a multi-step build behind one `uses:`. Force: identical step sequences in two callers that must not drift.
- **Rejected:**
  - **Strategy** for the per-platform download: a table `{asset, sha256, archive}` keyed by `process.platform-process.arch` plus one tar-path branch stays well under complexity 10, and the varying parts are data, not behaviour.
  - **Strategy/State** for a single action with mode switches: removed by D2-A.
  - **Template Method** across the three actions: they share no skeleton beyond "set up the toolchain, then build".
  - **Chain of Responsibility** for preflight checks: one loop.
  - **Builder** for actionlint arguments: a fixed array.
- The Developer must not introduce any of these.

## Invariants
- **The `deploy-build` job:**
  - has job-level `permissions: contents: read` only, with no `id-token`, `packages` or `environment`;
  - has no `azure/login`, no `docker login`, no `docker push`, no `secrets.*` and no `vars.*`.
- **The `build-*` actions:** contain no login, push, `secrets.*` or `vars.*`. Every value comes in through `inputs`. Every `run:` step declares `shell: bash`.
- **Clean checkout:** `deploy-build` runs on `ubuntu-latest` from a fresh checkout. It never caches `bin/` or `obj/`; the NuGet package cache through `setup-dotnet` is allowed, as in the deploy.
- **No drift:** `deploy-dev.yml` contains no inline restore, build, bundle, `docker build` or `npm` step after the change. The only copies live in the actions.
- **Variables and graph:**
  - The `preflight` job checks exactly the six variables named in the PBI.
  - It runs before `terraform-apply` and `image`, and is the only job that carries the master gate expression.
  - Every other job keeps its current `needs` order relative to the other deploy jobs.
- **Tested commit:** every checkout and image tag still uses the tested commit (`env.DEPLOY_SHA`).
- **actionlint binary:** never executed unless its archive's sha256 matched the pin. The version and hashes live in exactly one file, which CI, the hook and the local command all use.
- **Clean baseline:** actionlint passes on all three workflows at the end of the PBI. If an existing finding needs more than a mechanical fix, escalate.
- **Tests and checks:** the existing `ci.yml` jobs, their gating, and the guardrails other than the stated `deploy-build` exception are unchanged.

## Implementation plan
1. **`tools/actionlint/`** (`package.json`, `tsconfig.json`, and `src/` with tests), modelled on `tools/ascii-check`:
   - `actionlintPin.ts`: version and per-platform asset and sha256;
   - `resolveAsset.ts`;
   - `installActionlint.ts`: cache check, download through `fetch`, sha256 through `node:crypto`, extract through the injected command runner;
   - `cli.ts`: install if needed, then run with the fixed arguments and pass its exit code through.
   - Add `.gitignore` entry `tools/actionlint/.cache/`.
2. **`.github/actions/build-migration-bundles/action.yml`, `build-api-image/action.yml`, `build-spa/action.yml`**, using the contents from the single-option decisions.
3. **`deploy-dev.yml`:**
   - add `preflight` and move the gate into it;
   - `terraform-apply` and `image` `needs: preflight`;
   - the `image` job calls `build-api-image`, then `docker push`;
   - the `migrate` job calls `build-migration-bundles` in place of lines 140-158;
   - the `spa` job calls `build-spa` in place of lines 315-335.
4. **`ci.yml`:**
   - `changes` outputs `deploy-build` and `workflows`, plus the `workflows` filter;
   - job `actionlint` (setup-node, `npm ci`, typecheck, test, `check`) in `tools/actionlint`;
   - job `deploy-build` with placeholders;
   - both added to `ci-success.needs`.
5. **`.githooks/pre-commit`:**
   - when `git diff --cached --name-only` matches `^\.github/(workflows|actions)/`, run `node tools/actionlint/src/cli.ts`;
   - it has no runtime dependencies, so it is not added to the `node_modules` check loop at lines 5-10.
6. **Docs:**
   - `specs/continuous-integration/spec.md`: jobs table, guardrails (`deploy-build` exception, actionlint), new scenarios, local command;
   - `specs/deployment/spec.md`: workflow list (preflight, shared actions), line 57 unchanged;
   - `docs/infrastructure/dev-environment-setup.md` section 8: add the three `VITE_*` variables, and note the preflight in section 9;
   - ADR 0031 amendment (D4, D5 wording, D1 shared actions);
   - ADR 0004 amendment (actionlint job, deploy build check, pinned-binary tools pattern);
   - `CLAUDE.md`, Git hooks bullet: one sentence saying actionlint runs locally with `node tools/actionlint/src/cli.ts` and is never downloaded ad hoc (Q4).
7. Run actionlint over all workflows and fix any findings.

## Reuse
- **Using:**
  - `setup-dotnet` composite, nested in `build-migration-bundles`;
  - `tools/ascii-check` structure, and its injected-dependency CLI pattern (`cli.ts:9-31`);
  - the `changes` filter;
  - the `ci-success` skip semantics;
  - the existing pinned SHAs of `actions/setup-node` (`ci.yml:170`) and `actions/checkout` (`ci.yml:85`).
- **Not using:**
  - `docker/build-push-action`, as a new dependency;
  - a separate paths filter, which would not be DRY;
  - `actions/cache` for build output, which would break the clean-checkout invariant.

## TDD units
- **`resolveAsset`:**
  - `linux-x64` gives the `linux_amd64` tar.gz and its sha256;
  - `win32-x64` gives the `windows_amd64` zip and its sha256;
  - an unsupported platform throws, naming the supported ones.
- **`installActionlint`:**
  - a cache hit skips the download;
  - a sha256 mismatch throws, leaves no binary behind and never runs extraction;
  - a matching hash extracts into the version-keyed directory;
  - on win32 it uses `%SystemRoot%\System32\tar.exe`;
  - a failed download throws with the URL.
- **`cli`:**
  - passes `-shellcheck=` and `-pyflakes=`, with the repo root as working directory;
  - passes the actionlint exit code through: 0 stays 0, 1 stays 1;
  - an install error exits non-zero with its message.
- **Live and PR checks** (no unit test; ADR 0031 D1 as amended):
  - preflight with one variable unset, checked by the owner;
  - `deploy-build` fails when the `Restore backend` step is removed (a throwaway PR commit);
  - actionlint fails on `${{ env.DEPLOY_SHA }}` placed in a job-level `env:`, both in CI and in the hook.

## E2E coverage
- **Exception:** CI-internal change with no user-visible behaviour, as the PBI's Verification states. No Playwright tests change.
- **New Gherkin scenarios in `specs/continuous-integration/spec.md`**, each traced to a PR run:
  - "An invalid workflow file fails the required check";
  - "A broken deploy build step fails the required check";
  - "A docs-only pull request skips the deploy build check".

## ADR
- **ADR 0031 amendment (PBI-DEP-008):** preflight job and master gate (D4), shared build actions (D1, D2), narrowed D1 testing exception (D5).
- **ADR 0004 amendment:** actionlint and `deploy-build` jobs, and the pattern "pinned third-party binaries come through a tested `tools/` command that checks the sha256" (D3).
- No new ADR: both are amendments to decisions that already exist.
- Both amendments are Developer work in Phase 3.

## Phases
- **Phase 1:** `tools/actionlint`, the CI job, the hook, and actionlint fixes. Checkpoint: `ci(actionlint): lint workflows in CI and pre-commit (PBI-DEP-008)`.
- **Phase 2:** the three actions, `deploy-dev` rewired with the preflight, and the `deploy-build` job. Checkpoint: `ci(deploy): share deploy build steps and add PR build check (PBI-DEP-008)`.
- **Phase 3:** specs, ADR 0031 and ADR 0004 amendments, setup doc, `CLAUDE.md` Git hooks sentence. Checkpoint: `docs(deployment): document deploy build check and preflight (PBI-DEP-008)`.

## Human decisions
- Proceed despite the `blocked_by` warning for PBI-DEP-005: the human said DEP-005 is closed and its live runs passed. The Explorer verified it is merged to `origin/master` (PR #63).
- Gate answers (2026-11-12, human, relayed by the coordinator): "Approve all: Q1 yes, Q2 D4-A, Q3 yes, Q4 yes".
  - Q1: the Developer fills in the actionlint version and sha256 values from the release's official checksums file.
  - Q2: D4-A, a separate `preflight` job; D4-B (a step in `terraform-apply`) is rejected.
  - Q3: `deploy-build` runs on pull requests only, with a stated exception to the "every push to master runs every job" guardrail.
  - Q4: add one sentence about `node tools/actionlint/src/cli.ts` to the Git hooks bullet in `CLAUDE.md` (Developer work, Phase 3).

## Revisions

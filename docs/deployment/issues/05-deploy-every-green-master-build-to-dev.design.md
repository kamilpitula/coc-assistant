# Design: PBI-DEP-005: Deploy every green master build to dev with no manual steps

## Triggers
- 3, new cross-layer pattern: the first deploy workflow, with an Azure login through `azure/login`, migrations run from a pipeline, and a temporary SQL firewall rule.
- 1, new dependency: the `azure/login` and `Azure/static-web-apps-deploy` actions, plus the `go-sqlcmd` binary (D3).
- 2, shared data model: the Terraform outputs get a new `sql_server_name`.
- 6, the Explorer's open questions 1-6 each have competing answers.
- Not 7: there is no user-facing UI or journey. The SPA is deployed, not changed, so no UX step.

## Constraints
- ADR 0031: migrations run from the deploy workflow as EF bundles; the job always removes its runner-IP rule; images live on public GHCR; OIDC only; Staging never runs the startup migration (`backend/src/CocAssistant.Api/Program.cs:35-47` is Development only).
- `specs/deployment/spec.md`:37-42 (Workflows), :43-48 (API config), :56 (where VITE values come from), :57 (manual step: make GHCR public after the first push), :63-71 (Constraints), :91-99 (Guardrails), Scenarios "A green master build is deployed to dev", "A failed CI run is not deployed", "The migrate job closes the firewall after a failed migration".
- The deploy identity's federated subject is `environment:dev` (`infrastructure/terraform/bootstrap/identities.tf:27-32`), so every job that logs in to Azure declares `environment: dev`. Bootstrap stays unchanged.
- The deploy identity is the only SQL Entra admin (`infrastructure/terraform/sql.tf:12-16`). The SQL server has no managed identity (`sql.tf:1-19`), so it cannot do Graph lookups.
- The API connects with `User Id=<api client id>` (`infrastructure/terraform/main.tf:20`). The client id, not the principal id, is the identity the database user must map to.
- Container App image is in `ignore_changes` (`infrastructure/terraform/container-app.tf:130-133`), and the app has no registry block, so it can pull only a public image.
- No cross-context foreign keys: every `principalTable` referenced by a migration belongs to its own context. So the order Identity, CampaignPlay, ScenarioPreparation is convention. It mirrors `Program.cs:40-45` and is kept.
- Bundles must resolve each context through the API host, so they keep the custom history tables and `DatabaseRetryPolicy.Apply` (`Program.cs:15-17`, about 71 s of retries per the ADR 0031 DEP-002 amendment). No design-time factory exists in `backend/src`.
- Existing patterns: OIDC env block, setup-terraform and backend init (`.github/workflows/terraform-plan.yml:31-44`), actions pinned by SHA with a version comment, per-job `permissions`, `.github/actions/setup-dotnet`, setup-node with `.nvmrc` (`.github/workflows/ci.yml:359-363`).
- CLAUDE.md: complexity 10 or less (not applicable to YAML), ASCII (the new .yml and .sql files are scanned), no secrets, and unit tests for new logic (see D1 for the exception).
- No `-target` in workflows (`docs/infrastructure/dev-environment-setup.md:110-111`).

## Decisions

### D1: How the workflow logic is tested
| Metric | A: committed SQL file plus inline shell, documented exception | B: new `tools/deploy-dev` TypeScript CLI with vitest |
| --- | --- | --- |
| Consistency | + reuses the YAML-plus-shell style of terraform-plan.yml | 0 matches the tools/ascii-check and tools/backlog pattern, but needs a new CI job and a CI spec amendment |
| Modifiability | 0 logic is spread across YAML steps | + logic lives in one module |
| Testability | - only the live verification runs prove it | + the SID byte order and SQL text are unit tested, but nothing proves Azure accepts them |
| Simplicity | + one .sql file, a few short shell blocks | - new package, CLI, tests, CI job, ci-success wiring |
| Reversibility | + trivial | 0 removing the tool and the CI job is easy |
| Security and correctness | + the GUID-to-SID conversion is done by SQL Server itself (`CAST(CAST(id AS uniqueidentifier) AS varbinary(16))`), not hand-written byte swapping | 0 a hand-written conversion is a new risk that the tests then have to cover |

- **Chosen:** A, decided by Simplicity and Correctness. The only non-trivial logic, the SID conversion, is handed to SQL Server instead of being written and then tested. The SQL uses Azure-only syntax (`TYPE = E`), so it cannot run against the CI SQL Server container. Giving up: offline tests. Exception, stated in writing: the T-SQL is database security setup treated like a migration, and the shell blocks are trivial wiring. The PBI Verification items (a live green run, the forced-failure run) are the tests. The Terraform output change keeps a unit test (terraform test).
- **Rejected:** B - it tests our string building, not Azure behavior, and costs a new tool plus a CI job. The Developer must not reintroduce it.

### D2: Creating the API identity's database user without Graph
| Metric | A: `CREATE USER ... WITH SID = <client id as binary>, TYPE = E` | B: `CREATE USER ... FROM EXTERNAL PROVIDER` |
| --- | --- | --- |
| Consistency | + matches ADR 0031 D8 ("without Graph") | - needs a server identity with Directory Readers |
| Modifiability | + identity recreation is handled by the SID check below | 0 no difference |
| Testability | 0 live run only | 0 live run only |
| Simplicity | + one script | - Terraform server identity plus an Entra admin consent the owner cannot give (403 per ADR 0031 D8) |
| Reversibility | + nothing outside the database | - adds a directory role |
| Security and correctness | + least privilege, no Graph | - broadens directory permissions |

- **Chosen:** A. Idempotent script `infrastructure/database/ensure-api-database-user.sql`, using sqlcmd variables `ApiIdentityName` and `ApiIdentityClientId` and run with `-b`:
  1. Compute `@sid` from the client id.
  2. If a user with that name exists with a different SID (the identity was recreated, as in DEP-007), drop it.
  3. If no user exists, run `CREATE USER [name] WITH SID = <@sid as 0x literal>, TYPE = E` through dynamic SQL with `QUOTENAME`.
  4. Add the user to `db_datareader` and to `db_datawriter`, each only when `IS_ROLEMEMBER` returns 0.

  This closes the DEP-003 follow-up (`docs/deployment/issues/03-provision-the-dev-environment-stack.md:42`). The manual T-SQL fallback stays documented there.
- **Rejected:** B, and also `FROM EXTERNAL PROVIDER WITH OBJECT_ID`, which still does a Graph lookup. Also rejected: "try B then fall back to A", which is two paths and one of them is known to fail. Also rejected: creating the user in an EF migration. That would run in local dev and CI, where `TYPE = E` is invalid, and it would mix environment security into a bounded context's schema. The Developer must not reintroduce any of them.

### D3: SQL client for the script
| Metric | A: go-sqlcmd, pinned release tarball with a sha256 check, `--authentication-method ActiveDirectoryDefault` | B: whatever sqlcmd the ubuntu-latest image has |
| --- | --- | --- |
| Consistency | + pinned like the actions; same credential chain as the bundles (`Active Directory Default` picks up the az login) | - unpinned image contents |
| Simplicity | 0 one download step | + nothing to install |
| Reversibility | + easy to swap | + easy to swap |
| Security and correctness | + checksum verified, Entra token through az CLI, no password | - availability on ubuntu-24.04 is not verified, and ODBC sqlcmd has no ActiveDirectoryDefault mode |

- **Chosen:** A, decided by Correctness and Consistency - giving up one install step. The Developer looks up the latest go-sqlcmd release and its sha256 and pins both in the workflow, with a comment.
- **Rejected:** B. Also rejected: a Node `tedious` or PowerShell `Invoke-Sqlcmd` client, each a heavier new dependency for one script. The Developer must not reintroduce them.

### D4: Reading and using the Static Web Apps token
| Metric | A: `az staticwebapp secrets list --query properties.apiKey -o tsv`, then `::add-mask::`, then the official `Azure/static-web-apps-deploy` action with `skip_app_build: true` | B: new sensitive Terraform output read with `terraform output -raw` in the SPA job | C: GitHub secret |
| --- | --- | --- | --- |
| Consistency | + spec:42 says "reading its deployment token with the deploy identity at run time" | 0 reads at run time, but through Terraform | - contradicts spec:42 |
| Simplicity | + two steps | - terraform init in the SPA job, plus an output change | + nothing to read |
| Security and correctness | + masked before any other use; stays in one job (never a job output) | 0 exposes the key as an output | - a stored secret that drifts when rotated |

- **Chosen:** A. Mask the token on the line right after reading it. Pass it only through a step output of the same job. Deploy from `frontend/dist` with `api_location: ''` and `output_location: ''`. `staticwebapp.config.json` gets there through Vite's public dir.
- **Rejected:** B and C. Also rejected: SWA CLI through `npx`, which adds an unpinned npm download when an official pinned action does the same job. The Developer must not reintroduce them.

### D5: Runner-IP firewall rule and its cleanup
| Metric | A: per-run rule `gh-deploy-<run_id>-<run_attempt>`, a start-of-job sweep of stale `gh-deploy-*` rules, an `if: always()` remove step that then asserts none remain | B: one fixed rule name, upserted, removed with `if: always()` |
| --- | --- | --- |
| Testability | + the assert step self-checks the guardrail on every run | 0 no self-check |
| Simplicity | 0 two extra small steps | + fewest steps |
| Security and correctness | + also cleans up after a lost runner (where `always()` never runs); traceable to a run | - a crash leaves the rule open until the next run, unnoticed |

- **Chosen:** A. The workflow-level `concurrency: { group: deploy-dev, cancel-in-progress: false }` serializes runs, so the sweep can never delete a live run's rule. `cancel-in-progress` is false because cancelling a run mid-apply or mid-migrate is unsafe. GitHub keeps one pending run and the newest wins. The IP comes from `curl -fsS https://api.ipify.org`, validated as dotted IPv4 before use. That is an accepted external service with no Azure equivalent.
- **Rejected:** B. Also rejected: a wide or permanent IP range, which violates spec:67. The Developer must not reintroduce them.

### D6: Job graph
| Metric | A: strict linear chain in spec order | B: dependency graph |
| --- | --- | --- |
| Consistency | + spec:37 literally says "in order" | 0 needs a spec wording change |
| Performance | - the image build waits for the apply | + saves the image build time on every deploy |
| Security and correctness | + keeps every ordering | + keeps every ordering the scenarios check: migrate before rollout, rollout before SPA |

- **Chosen:** B.
  - `terraform-apply` and `image` run in parallel.
  - `migrate` needs `terraform-apply`.
  - `rollout` needs `image` and `migrate`.
  - `spa` needs `rollout` and `terraform-apply`.

  A migrate failure leaves `rollout` and `spa` skipped. The image can be pushed early: an unreferenced tag is harmless. Giving up: spec:37 wording, amended to "in dependency order".
- **Rejected:** A - it costs time for no correctness gain. The Developer must not reintroduce it.

### D7: First GHCR push (the package starts private)
| Metric | A: anonymous-pull preflight in `rollout`, before the update, that fails with an error pointing at the manual step | B: let `az containerapp update` fail | C: registry credentials (PAT) on the Container App |
| --- | --- | --- | --- |
| Consistency | + ADR 0031 public package, spec:57 manual step | 0 no new behavior | - contradicts ADR 0031 and adds a stored secret |
| Security and correctness | + the app is never pointed at an image it cannot pull | - leaves a failed revision | - a stored PAT |

- **Chosen:** A.
  1. Request an anonymous token: `curl https://ghcr.io/token?scope=repository:kamilpitula/coc-assistant-api:pull`.
  2. Send a manifest request for `:<sha>` with OCI and Docker v2 Accept headers.
  3. If it fails, write `::error::` with the fix and exit 1.

  So the first run after merge pushes the image and then stops at the preflight. The owner makes the package public (spec:57) and re-runs the failed jobs. `GITHUB_TOKEN` cannot change package visibility, so this cannot be automated.
- **Rejected:** B and C. The Developer must not reintroduce them.

### D8: How the forced migration failure is verified
| Metric | A: `workflow_dispatch` boolean input `simulate_migration_failure` (default false); the migrate job fails after the rule is added, before the database user is ensured and before the first bundle | B: the owner pushes a broken migration to master |
| --- | --- | --- |
| Testability | + repeatable proof of the guardrail "always removes its firewall rule" | 0 one-off |
| Security and correctness | + reachable only by manual dispatch on master | - a broken migration on master |

- **Chosen:** A - giving up: a test hook in a deploy workflow, kept to one `if:` step.
- **Rejected:** B. Also rejected: cancelling a run by hand, which is not repeatable. The Developer must not reintroduce them.

### Single-option decisions
- Trigger: `workflow_run: { workflows: [CI], types: [completed], branches: [master] }` plus `workflow_dispatch`. Every job is gated, through the first jobs and `needs`, on `github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/master'` OR `workflow_run.conclusion == 'success' && head_branch == 'master' && workflow_run.event == 'push'`. The `event == 'push'` check stops a fork PR whose branch is named `master`.
- SHA: `env DEPLOY_SHA: ${{ github.event.workflow_run.head_sha || github.sha }}`. Every checkout uses `ref: DEPLOY_SHA`. On `workflow_run`, `github.sha` is the latest default-branch commit, not the commit CI tested, so it must not be used there.
- Dispatch deploys master HEAD without re-checking CI: it is the owner's deliberate redeploy.
- Not done: skipping an older SHA when CI runs finish out of order. This is a single-owner repo, migrations are additive so far, and the newest run wins. Recorded as a Follow-up.
- Azure CLI login: `azure/login`, pinned by SHA, with `client-id: vars.AZURE_DEPLOY_CLIENT_ID`, `tenant-id`, `subscription-id`. Terraform keeps the `ARM_USE_OIDC` env block from `terraform-plan.yml:31-37`, with the deploy client id.
- Apply: `terraform apply -input=false -auto-approve -lock-timeout=5m -var-file=environments/dev.tfvars`. The lock timeout covers a concurrent PR plan. No `-target`, no saved plan file.
- Outputs to later jobs: setup-terraform with `terraform_wrapper: false`, then `terraform output -raw <name>` into `$GITHUB_OUTPUT`. None of the outputs is sensitive.
- New Terraform output `sql_server_name`, because the firewall commands need the server name. Also fix the `api_identity_principal_id` description (`infrastructure/terraform/outputs.tf:52`): the user is created from the client id.
- Image: plain docker CLI with `docker login ghcr.io` (GITHUB_TOKEN on stdin). Build with `-f backend/Dockerfile`, repo root as context, the label `org.opencontainers.image.source=https://github.com/<repo>`, and only the tag `:<sha>`. Permissions are `contents: read, packages: write`. This job has no environment and no OIDC.
- Bundles: built before the firewall rule is opened, which keeps the open window short. The pinned `dotnet tool restore` comes after `.github/actions/setup-dotnet`. One `dotnet ef migrations bundle` per context: `--project` is that context's Infrastructure csproj, `--startup-project backend/src/CocAssistant.Api`, `--context <X>DbContext`, `--configuration Release`, `--force`. Run each with `--connection "Server=tcp:<fqdn>,1433;Database=<db>;Authentication=Active Directory Default;Encrypt=True;Connect Timeout=60;"`.
- Free-offer resume: the ensure-user step retries go-sqlcmd (login timeout 30 s) up to 10 attempts, 15 s apart, about 4-5 minutes in total. This covers both the database resume (about a minute) and firewall-rule propagation, and it wakes the database before the bundles, which also retry about 71 s. Step timeouts: ensure-user 8 min, each bundle 5 min. Migrate job `timeout-minutes: 30`. Step timeouts sum to less than the job timeout, so a hang fails a step and the `always()` cleanup still runs.
- Rollout: run `az containerapp update -n <container_app_name> -g <rg> --image ghcr.io/kamilpitula/coc-assistant-api:<sha>`, after `az extension add --name containerapp --upgrade --yes`. Then fail unless the template image equals the expected tag. Read the revision from `properties.latestRevisionName` (a top-level `latestRevisionName` path is empty), fail if it is empty, then poll `az containerapp revision show` up to about 5 minutes until `properties.provisioningState` reaches `Provisioned` (fail on `Failed` or on timeout). Revision `runningState`/`healthState` are intentionally not asserted: at scale 0 they are not meaningful. (Follow-up fix on `origin/master cacb447`: the first version queried a top-level `latestRevisionName` and expected `Succeeded`, which is not a revision provisioning state.)
- SPA: setup-node with `.nvmrc`, `npm ci`, then `npm run build` in `frontend`, with:
  - `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`, `VITE_API_SCOPE` from the `dev` environment vars;
  - `VITE_ENTRA_REDIRECT_URI` set to the `static_web_app_url` output;
  - `VITE_API_BASE_URL` set to the `api_url` output (spec:56).
- Stray plan file: `infrastructure/terraform/dev.plan` exists on disk but is not tracked. `git ls-files` shows no `*.plan`, and `.gitignore` has `infrastructure/terraform/**/*.plan`. Nothing to fix; the owner may delete it locally.

## Patterns
- **Used:** none. The force of "cleanup on every exit path" is met by GitHub's `if: always()`, not by a code pattern.
- **Rejected:** Template Method or Strategy over the jobs - one environment; nothing switches on a variant.
- **Rejected:** reusable workflow or composite action for the Azure login - a single workflow uses it; extract only when a second deploy workflow appears.
- **Rejected:** Chain of Responsibility for the retry - a shell loop is enough.

## Invariants
- Nothing runs, including terraform, when CI did not succeed for a master push.
- Every checkout and the image tag use `DEPLOY_SHA`.
- No secret is stored in GitHub. The SWA token is masked right after it is read and never leaves its job.
- The firewall rule exists only between its add step and the `always()` remove step, and the run fails if any `gh-deploy-*` rule remains.
- Migrations run in the order Identity, CampaignPlay, ScenarioPreparation and stop at the first failure. `rollout` and `spa` run only when `migrate` succeeds.
- The API database user has exactly `db_datareader` and `db_datawriter`, and its SID comes from the API identity's client id.
- No `-target`, no Graph permission, no change to `infrastructure/terraform/bootstrap/`.
- Bundles resolve the contexts through the API startup project. If that fails, escalate rather than add a design-time factory.

## Implementation plan
1. `infrastructure/terraform/outputs.tf`: add `sql_server_name`, fix the principal id description. Update `infrastructure/terraform/tests/environment.tftest.hcl` `run "outputs"` with a check that `output.sql_server_name == "sql-cocassistant-dev-swedencentral"`. Test first.
2. Locally, check that `dotnet ef migrations bundle` builds for all three contexts with the API startup project. Escalate if it does not.
3. `infrastructure/database/ensure-api-database-user.sql` (D2).
4. `.github/workflows/deploy-dev.yml`. First line `# Spec: specs/deployment/spec.md`. Top-level `permissions: contents: read`, plus the concurrency group. Jobs:
   - `terraform-apply`: `environment: dev`, `contents: read, id-token: write`.
   - `image`: `contents: read, packages: write`.
   - `migrate`: `environment: dev`, `id-token: write`.
   - `rollout`: `environment: dev`, `id-token: write`.
   - `spa`: `environment: dev`, `id-token: write`.

   Also add the dispatch input from D8. Every new action is pinned by full SHA with a version comment.
5. `specs/deployment/spec.md`:
   - Workflows (:37-42): dependency order, concurrency, SHA source and gating, dispatch input, `WITH SID ... TYPE = E` with the client id via go-sqlcmd, per-run rule with sweep and assert, GHCR preflight.
   - Outputs (:29): add the server name.
   - Manual steps (:57): note that the first run stops at the preflight until the package is public.
6. ADR 0031: add `## Amendment (YYYY-MM-DD, PBI-DEP-005)` summarizing D1-D8 and linking this record.
7. `docs/infrastructure/dev-environment-setup.md` section 9: one bullet on making the GHCR package public after the first run stops at the preflight, then "Re-run failed jobs".
8. Run `node tools/ascii-check/src/cli.ts`, `node tools/backlog/src/cli.ts --check`, `terraform fmt -check -recursive`, `terraform validate`, `terraform test`.

## Reuse
- Using: the `terraform-plan.yml:31-44` OIDC env, setup-terraform and init block; `.github/actions/setup-dotnet`; the setup-node pattern from ci.yml; the existing action SHAs (checkout v7.0.1, setup-terraform v4.0.1, setup-node v7.1.0).
- Not using: the plan job-summary writer (`terraform-plan.yml:49-68`) - the apply log is enough.
- Not using: `ci-success` as a job - only the `workflow_run` conclusion is visible from here.

## TDD units
- terraform test: the `sql_server_name` output equals the server name.
- Live, as the D1 exception (PBI Verification):
  - a green push runs to completion and the active revision runs the image with that SHA;
  - a failed CI run shows every job skipped;
  - a dispatch with `simulate_migration_failure=true` leaves no `gh-deploy-*` rule and skips `rollout` and `spa`;
  - the API reads data, which proves the user and SID mapping;
  - a re-run is idempotent: the user and roles are unchanged, with no error.

## E2E coverage
- Exception: no app UI or behavior changes. Spec Scenarios "A green master build is deployed to dev", "A failed CI run is not deployed", and "The migrate job closes the firewall after a failed migration" are checked by the live runs above, not by Playwright. The existing E2E suite stays as it is.

## ADR
- None new: the decisions refine ADR 0031 and are recorded as its DEP-005 amendment (refinement protocol).

## Human decisions
- 2026-11-10, approved as written. Human answer, verbatim: "D1 accept D8 ok 3 ok 4 ok 5 ok".
  1. D1 testing exception: accepted (no `tools/deploy-dev` CLI).
  2. D8 `simulate_migration_failure` dispatch input: accepted.
  3. DEP-006 boundary: DEP-005 adds the section 9 bullet in `docs/infrastructure/dev-environment-setup.md` now, and the owner makes the GHCR package public during DEP-005 verification.
  4. D6 dependency graph: accepted; spec:37 is amended from "in order" to dependency order.
  5. D3 pinned go-sqlcmd download: accepted.
- Unverified assumptions, to be confirmed on the first real run and escalated if wrong:
  - `WITH SID ... TYPE = E` is accepted for this identity.
  - go-sqlcmd `ActiveDirectoryDefault` works after `azure/login`.
  - The revision provisioning check behaves as expected at 0 replicas.
  - Bundles build through the API host.

## Revisions

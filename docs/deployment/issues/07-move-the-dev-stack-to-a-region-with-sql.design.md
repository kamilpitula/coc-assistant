# Design: PBI-DEP-007: Move the dev stack out of westeurope to a region where SQL can be provisioned

This revises the PBI-DEP-003 design (`03-provision-the-dev-environment-stack.design.md`). D1-D9 there stay in force, except as changed under "Changes to earlier decisions".

## Triggers
- 4 ADR-level: ADR 0031 gets an amendment for the region and the split between the resource group's region and the resources' region.
- 6 Open questions with competing answers: where the region comes from, which region, how to prove it, and how to move the partly applied resources.
- 7 UX: does not apply (no UI).

## Constraints
- The owner's first real apply failed: creating `azurerm_mssql_server.dev` (sql.tf:1, `sql-cocassistant-dev`) returned `ProvisioningDisabled`: "Provisioning is restricted in this region. Please choose a different region." in `westeurope`. The human chose to move the whole environment stack to one region (not SQL alone, not a support request).
- Every environment resource takes the resource group's location: `location = data.azurerm_resource_group.dev.location` at container-app.tf:4, identity.tf:7, logs.tf:4, signalr.tf:4, sql.tf:4 and :34, static-web-app.tf:4, storage.tf:7. `var.location` only feeds outputs.tf:1-3. The owner's second attempt confirmed this (see Human decisions).
- bootstrap creates `rg-cocassistant-dev` and `rg-cocassistant-tfstate` with `var.location`, default `westeurope` (bootstrap/main.tf:25, :31; bootstrap/variables.tf:19). The identities and the state account live in `rg-cocassistant-tfstate` (identities.tf:8, :15; state.tf:4). The plan and deploy identities' roles are scoped to `rg-cocassistant-dev` (identities.tf:35-54). The budget is subscription-wide (budget.tf:3).
- Static Web Apps accept only a few regions, and `westeurope` is the European one. The service is global; the region holds metadata only.
- Tests that name `westeurope`: tests/environment.tftest.hcl:76 (a mock FQDN, cosmetic) and :455 (`output.location == "westeurope"`).
- Docs that name the region: specs/deployment/spec.md:11; docs/infrastructure/costs.md:7 and :39; ADR 0031:22; docs/infrastructure/dev-environment-setup.md:26-27; bootstrap/terraform.tfvars.example:4.
- No document can prove that SQL is unrestricted in a region for this subscription. Only a create proves it.

## Decisions

### D10: Where the region comes from
| Metric | A: RG stays, resources use var.location | B: move the RG | C: new RG per region |
| --- | --- | --- | --- |
| Consistency | 0 spec.md:11 needs rewording; the RG still holds every resource | + one region for everything | - a new name and new RBAC; spec.md:26 says the stack reads one RG |
| Modifiability | + the next move is one line in `dev.tfvars` | - each move rebuilds bootstrap | - each move adds bootstrap resources |
| Testability | + a mock test asserts every resource's location | 0 | 0 |
| Simplicity | + one variable change and one new variable; no bootstrap change | - azurerm refuses to delete a non-empty RG (default `prevent_deletion_if_contains_resources`); needs a manual teardown of resources in another stack's state | - more resources |
| Reversibility | + one line | - destructive | - leaves an orphan RG |
| Security and correctness | + role assignments on the RG untouched (identities.tf:35-54); the RG region is metadata only | - the identities briefly lose their roles, and state drifts | 0 new role assignments to review |

- **Chosen:** A, because of simplicity, reversibility, and untouched RBAC - giving up "one region for everything": the RG metadata and the Static Web App stay in `westeurope`.
- **Rejected:** B and C. The Developer must not change bootstrap's `location`.
- Details:
  - `var.location` loses its default; `dev.tfvars` sets it. Switching regions is one line there, and no environment silently falls back to `westeurope`.
  - New `static_web_app_location`, validated against the allowed Static Web App regions (confirm the list with `az provider show -n Microsoft.Web --query "resourceTypes[?resourceType=='staticSites'].locations"` or the Microsoft docs). `dev.tfvars` sets it to `"westeurope"`.
  - Every other resource (identity, Log Analytics, Container Apps environment and app, SQL server and database, storage, SignalR) uses `var.location`.
  - bootstrap: no resource change. Reword the `location` description at bootstrap/variables.tf:17 ("Duplicated from the environment stack on purpose") to say the environment stack's resources may live in another region.

### D11: Region
Owner location assumed central Europe (not confirmed). The SQL row is general availability; the only proof for this subscription is D12.

| Metric | Sweden Central (`swedencentral`) | Germany West Central (`germanywestcentral`) | North Europe (`northeurope`) |
| --- | --- | --- | --- |
| SQL free offer and serverless GP | + newer region with spare capacity; usually unrestricted for this kind of subscription (verify in D12) | 0 available; capacity restrictions reported sometimes | - busy region, often restricted for this kind of subscription |
| Container Apps Consumption | + available (verify with `az provider show -n Microsoft.App`) | + available (verify) | + available |
| SignalR Free | + available (verify with `az provider show -n Microsoft.SignalRService`) | + available (verify) | + available |
| Static Web App | N/A, stays in `westeurope` (D10) | N/A | N/A |
| Latency from central Europe (assumed) | 0 roughly 20-35 ms | + roughly 10-20 ms | 0 roughly 30-40 ms |
| Pricing against costs.md | 0 usually equal to `westeurope` or lower; re-check in the Retail Prices API | 0 often a few percent above; re-check | 0 about the same; re-check |
| Data residency | + EU | + EU | + EU |

- **Chosen:** Sweden Central primary, Germany West Central fallback, because of SQL availability - giving up a few milliseconds of latency.
- **Rejected:** North Europe - most likely to repeat the restriction. Poland Central - SignalR availability not confirmed, and a region needing a second probe gains nothing.

### D12: Prove the region before moving everything
Single sane option:
1. Quick signal, read-only: `az sql db list-editions -l <region> --edition GeneralPurpose -o table` (the subscription-level capabilities show a restricted region as unavailable; a signal, not proof), and `az provider show` for `Microsoft.App`, `Microsoft.SignalRService`, and `Microsoft.Web`.
2. Proof: with this PBI's code and `location` set in `dev.tfvars`, run `terraform apply -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev`. It creates only the free SQL server (no meter, costs.md:18) in the new region. On `ProvisioningDisabled`, switch to the fallback region and repeat; nothing else has moved yet. On success, run the full `plan` and `apply`.
- `-target` is for this probe only and is documented as such. Workflows must not use it.
- The probe only works after the D10 code change: with the current code the server follows the resource group into `westeurope` whatever `location` says.

### D13: Moving the resources already created in westeurope
Single sane option.
- Expected plan (Terraform destroys and then creates, because the names are fixed):
  - Replace: `azurerm_user_assigned_identity.api` (new client and principal ids; unused so far, because the DEP-005 database user does not exist), `azurerm_log_analytics_workspace`, `azurerm_storage_account` with its `handout-files` container (no data yet), `azurerm_signalr_service`, and `azurerm_container_app_environment` if it was created.
  - Create: the SQL server (unless the D12 probe created it), the firewall rule, the free-offer database, and the Container App.
  - No change: the Static Web App and the resource group.
  - Anything else in the plan, or the Static Web App being replaced, means stop.
- Manual handling and settings:
  - Log Analytics: a deleted workspace stays soft-deleted for 14 days, and the same name then fails in another region. Add `log_analytics_workspace { permanently_delete_on_destroy = true }` to the azurerm `features` block in this change, before the apply.
  - Storage account: global name; deletion frees it, sometimes only after a few minutes. On `StorageAccountAlreadyTaken`, wait and re-run apply. Nothing is lost.
  - SignalR: the global name is freed on delete. The Free tier allows one Free unit per subscription and region, and the westeurope one is deleted first.
  - Container Apps environment: deletion can take about 10 minutes; apply waits.
  - SQL server: the westeurope create failed, so nothing exists and the global name is free.
- Cost or collision risk: none expected. Every replaced resource is free or nearly free and empty, and no two copies exist at the same time.

## Changes to earlier decisions
- D1-D9 of the PBI-DEP-003 design: unchanged. Its "every resource uses its location" line (resource group) is superseded by D10.
- bootstrap: no resource change (D5 and D9 stand).

## Patterns
- **Used:** none.
- **Rejected:** a per-resource location map or `for_each` over regions - only the Static Web App differs, and one extra variable is clearer.

## Invariants
- Every environment resource except the Static Web App uses `var.location`; the Static Web App uses `var.static_web_app_location`.
- `var.location` has no default; the resource group stays in bootstrap's region; bootstrap's `location` is not changed.
- Log Analytics is permanently deleted on destroy.
- All PBI-DEP-003 invariants stand.

## Implementation plan
1. `infrastructure/terraform/variables.tf`: `location` without a default; add `static_web_app_location` with validation.
2. `infrastructure/terraform/versions.tf`: `log_analytics_workspace { permanently_delete_on_destroy = true }` in the azurerm `features` block.
3. `container-app.tf`, `identity.tf`, `logs.tf`, `signalr.tf`, `sql.tf` (server and database), `storage.tf`: `location = var.location`. `static-web-app.tf`: `location = var.static_web_app_location`.
4. `environments/dev.tfvars`: `location = "swedencentral"` and `static_web_app_location = "westeurope"`.
5. `tests/environment.tftest.hcl`: per the TDD units.
6. `bootstrap/variables.tf:17`: description only.
7. Docs:
   - `specs/deployment/spec.md:11`: the region, plus "the resource group and the Static Web App stay in `westeurope`".
   - ADR 0031: a dated "Amendment (2026-11-10, PBI-DEP-007)" covering D10-D13 with the reason (`ProvisioningDisabled`) and what is given up; re-check the :22 price or label it West Europe.
   - `docs/infrastructure/costs.md`: :7 region; every unit price re-queried for the new region with the date; :39 re-checked; a note that the Static Web App stays in `westeurope`. Below a $0.10 monthly total no per-price approval is needed (Q9).
   - `docs/infrastructure/dev-environment-setup.md`: the D12 probe and the D13 plan expectations and handling; the `location` note at :26-27 says it is bootstrap only.
   - `bootstrap/terraform.tfvars.example:4`: say the bootstrap default does not set the environment stack's region.

## Reuse
- Using: the existing variable validation style and the mock-test location overrides.
- Not using: a bootstrap change.

## TDD units
- With `location = "swedencentral"`, every non-Static-Web-App resource, including the azapi database, has that location; the Static Web App has `static_web_app_location`.
- Validation rejects a `static_web_app_location` outside the allowed list; a missing `location` fails.
- tests/environment.tftest.hcl:455 checks the location output against the test variable instead of `westeurope`; :76 updates the mock FQDN.
- `permanently_delete_on_destroy` cannot be asserted with mocks; the owner's real apply verifies it.

## E2E coverage
- Exception: infrastructure only, no user-visible change. The owner's real D12 probe and D13 apply are the verification.

## ADR
- None new; ADR 0031 amendment (step 7).

## Human decisions
- 2026-11-10: the first real apply failed with SQL `ProvisioningDisabled` in `westeurope`. The human chose B: move the whole environment stack to one region where SQL can be provisioned (not SQL alone, not a support request).
- 2026-11-10: the owner re-ran the `-target` apply with the resources still resolving to `westeurope` and got the same `ProvisioningDisabled`. This confirms the resource group, not `var.location`, sets the region today (D10).
- 2026-11-10, owner: "Q7 yes, Q8 yes, Q9 yes, approve D10-D13".
  - Q7: Sweden Central primary, Germany West Central fallback (D11).
  - Q8: tracked as the new PBI-DEP-007, blocked by PBI-DEP-003; PBI-DEP-005's `blocked_by` gains PBI-DEP-007; PBI-DEP-003 gets a Follow-up "-> PBI-DEP-007". PBI-DEP-003 is not reopened.
  - Q9: the Developer may apply new regional prices while the expected `dev` total stays under $0.10 per month, with no per-price approval below that.
  - D10-D13 approved as written. Q10 (the env-stack `terraform state list`) was not answered; the plan shows the replaced resources.

## Revisions

### 2026-11-10: rename the SQL server around a stale westeurope record (changed decision, approved)

**Escalation.** The owner's D12 probe in `swedencentral` failed with 409: "InvalidResourceLocation: The resource 'sql-cocassistant-dev' already exists in location 'westeurope' in resource group 'rg-cocassistant-dev'. A resource with the same name cannot be created in location 'swedencentral'. Please select a new resource name." `az sql server show -g rg-cocassistant-dev -n sql-cocassistant-dev` returns ResourceNotFound, and `az resource list -g rg-cocassistant-dev` lists only the Static Web App, storage account, SignalR, API identity, Log Analytics workspace, and Container Apps environment. The failed first create (`ProvisioningDisabled`) left a stale record that still reserves the name in this resource group, invisible to the normal APIs. A different region does not help: the conflict is the name in this resource group.

**D13 correction.** The D13 line "SQL server: the westeurope create failed, so nothing exists and the global name is free" is wrong. The failed create left a stale record that blocks the name in `rg-cocassistant-dev`, so the server is renamed (D14). The same correction goes into `docs/infrastructure/dev-environment-setup.md` (steps 4-5) and the ADR 0031 D12/D13 amendment line (:42).

**Where the old name is hard-coded** (`git grep` on master 43b3027): `infrastructure/terraform/main.tf:12` (`local.names.sql_server`); `tests/environment.tftest.hcl:35-36` (mock id and FQDN), `:156-157` (name assertion), `:451` (FQDN output assertion); `specs/deployment/spec.md:18` and `:34`; `docs/infrastructure/costs.md:18`. Already derived, no change: the three connection strings (main.tf:20, from `fully_qualified_domain_name`), the `sql_server_fqdn` output (outputs.tf:33), the database `parent_id` (sql.tf:33), and the firewall rule `server_id` (sql.tf:23). Unaffected: the database name `sqldb-cocassistant-dev` (scoped to its server) and `azuread_administrator`.

#### D14: The SQL server's name
| Metric | A: region in the name | B: fixed `-01` suffix | C: random suffix |
| --- | --- | --- | --- |
| Consistency | 0 keeps `<type>-cocassistant-<env>` and adds a region token on one resource, a common Azure naming pattern | + closest to the current names | - unreadable; breaks `infrastructure/CLAUDE.md` "explicit and reviewable" |
| Modifiability | + any later region change, including the fallback to `germanywestcentral`, gets a fresh name automatically | - a failed create in a new region can leave another stale record; the next move needs another manual bump | + always fresh |
| Testability | + asserted exactly in tests | + | 0 needs an override in mocks |
| Simplicity | + one interpolation, no lookup table | + | - a new provider and resource |
| Reversibility | + a one-line local | + | - |
| Security and correctness | + valid while `location` is lowercase letters and digits; validation added | + | + |

- **Chosen:** A, `sql_server = "sql-cocassistant-${var.environment}-${var.location}"` (`sql-cocassistant-dev-swedencentral`, 34 characters), because of modifiability: a stale record only comes from a failed create, which is exactly what can happen when the D12 probe falls back to another region, and a region-specific name cannot collide with it. Giving up uniformity (only the SQL server carries a region token) and a shorter FQDN.
- **Rejected:** B (the next region move can collide again, which is the failure that just happened); C (a new dependency and an unreadable name); D, a region token in every resource name (only the SQL server has a stale record; renaming everything replaces six resources and changes every documented name for no benefit); short region codes such as `sdc` (a hand-kept lookup table for no gain). The Developer must not reintroduce them.
- `var.location` gets validation `^[a-z0-9]{1,30}$`, keeping the server name lowercase, within 63 characters, and free of characters SQL server names do not allow.
- The westeurope stale record stays. Nothing references it. A DEP-007 Follow-up records that it may surface if the resource group is ever deleted; a support request is optional and the owner's call.

#### D15: Where to track it
| Metric | A: new branch on DEP-007 | B: new PBI-DEP-008 |
| --- | --- | --- |
| Consistency | + DEP-007 is still `todo`, its Directive ("so `terraform apply` completes") is not met, and its deferred lines 30-31 are what this fixes | 0 standard for new scope, but this is not new scope |
| Modifiability | + one PBI owns the move to completion | - DEP-007 cannot pass its owner checks before DEP-008, so the dependency order is backwards |
| Testability | + the same Verification lines apply | 0 duplicates them |
| Simplicity | + no new file | - a PBI file, blocker edits, DEP-005 re-pointed |
| Reversibility | + | + |
| Security and correctness | N/A | N/A |

- **Chosen:** A, branch `feature/dep-007-rename-the-sql-server`, because the work is inside DEP-007's Directive - giving up a separate item for the stale-record incident (the Follow-up covers it).
- Backlog effect: the unmerged branch marks DEP-007 in progress; the report's warning that a merged branch's PBI is not `done` is informational and clears when the owner's checks pass and DEP-007 is set to `done`; `--check` keeps passing because the unticked lines carry `Deferred:`; DEP-005 stays blocked by DEP-007 with no edit.
- **Rejected:** B.

#### D12 probe after the rename (owner)
1. `terraform plan -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev`: expect exactly one addition, `azurerm_mssql_server.dev` named `sql-cocassistant-dev-swedencentral` in `swedencentral`. Anything else means stop.
2. `terraform apply` with the same `-target`.
3. On `ProvisioningDisabled`, set `location = "germanywestcentral"`; the name becomes `sql-cocassistant-dev-germanywestcentral` automatically, so a stale Sweden Central record cannot block it. Repeat.
4. The full plan is unchanged from D13; the SQL server is created under the new name unless the probe created it.
- The fallback region stays Germany West Central; D14 removes the main risk of using it.

#### Invariants (added)
- Only the SQL server's name carries the region token; every other name keeps `<type>-cocassistant-<env>`.
- Nothing hard-codes the SQL server name or FQDN; everything derives from the resource.
- `var.location` is lowercase letters and digits.

#### Files the Developer touches
- `infrastructure/terraform/main.tf:12`: the D14 name.
- `infrastructure/terraform/variables.tf:1-4`: `location` validation.
- `infrastructure/terraform/tests/environment.tftest.hcl`: `:35-36` mock id and FQDN with the new name; `:156-157` name assertion; `:451` FQDN output; a new run where `location = "germanywestcentral"` gives `sql-cocassistant-dev-germanywestcentral`; an `expect_failures` run for an invalid `location` such as `"Sweden Central"`.
- `specs/deployment/spec.md:18` and `:34`: the new name and why the region is in it.
- `docs/infrastructure/costs.md:18`: the name.
- ADR 0031: a dated amendment line for the stale record and D14; correct `:42`.
- `docs/infrastructure/dev-environment-setup.md` steps 4-5: the one-addition probe plan, the automatic fallback name, and the D13 correction.
- `docs/deployment/issues/07-move-the-dev-stack-to-a-region-with-sql.md`: line 30 names the new server; Follow-ups gain the stale-record note; remove the obsolete Follow-up about the local `dev.tfvars` edit (master's working tree is clean).

#### TDD units
- With `environment = "dev"` and `location = "swedencentral"`, the SQL server is `sql-cocassistant-dev-swedencentral`; with `location = "germanywestcentral"`, it is `sql-cocassistant-dev-germanywestcentral`.
- The database stays `sqldb-cocassistant-dev`; every other resource name is unchanged.
- `output.sql_server_fqdn` and all three connection strings use the server's FQDN, with no literal name.
- `location` validation rejects uppercase letters and spaces.

#### E2E coverage
- Exception, unchanged: infrastructure only.

#### Human decisions
- 2026-11-10, owner: "lets change the resource name" - rename instead of waiting for the stale record to clear or opening a support request.
- 2026-11-10, owner: "Q11 A Q12 second brannch".
  - Q11: D14 option A, `sql-cocassistant-${var.environment}-${var.location}` (`sql-cocassistant-dev-swedencentral`), with `var.location` validated `^[a-z0-9]{1,30}$`.
  - Q12: D15 option A, a second branch on PBI-DEP-007, `feature/dep-007-rename-the-sql-server`; no new PBI.
- 2026-11-10, record: PR #57 (`feature/dep-007-move-the-dev-stack-to-a-region-with-sql`, c1bc138) turned out to be already merged (master 43b3027), so this fix goes on the second branch rather than PR #57. The D13 claim "nothing exists" is corrected above.

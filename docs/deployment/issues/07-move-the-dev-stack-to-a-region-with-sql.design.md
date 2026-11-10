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

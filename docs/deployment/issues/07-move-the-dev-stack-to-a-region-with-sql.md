---
id: PBI-DEP-007
status: done
blocked_by: [PBI-DEP-003]
---

# PBI-DEP-007: Move the Dev Stack to a Region with SQL

## Directive
Move every `dev` environment resource to one region where this subscription can provision Azure SQL, so `terraform apply` completes, keeping the resource group and the Static Web App in `westeurope`.

**Scope:**
- **Stack:** `infrastructure/terraform/`: every resource except the Static Web App uses `var.location` (no default) instead of the resource group's location; the Static Web App uses a validated `static_web_app_location`; the azurerm `features` block permanently deletes Log Analytics workspaces on destroy.
- **Environment file:** `environments/dev.tfvars` sets `location = "swedencentral"` (fallback `germanywestcentral`) and `static_web_app_location = "westeurope"`.
- **Tests and docs:** environment-stack tests, `specs/deployment/spec.md`, ADR 0031, `docs/infrastructure/costs.md`, `docs/infrastructure/dev-environment-setup.md`, the bootstrap `location` description.
- **Out of scope:** moving `rg-cocassistant-dev`, `rg-cocassistant-tfstate`, or any other bootstrap resource; workflows (PBI-DEP-004, PBI-DEP-005).

## Dependencies
- Blocked by: PBI-DEP-003 (the environment stack being moved)
- Must merge before: PBI-DEP-005 (deploys need an apply that completes)

## Context
Read: `docs/deployment/issues/07-move-the-dev-stack-to-a-region-with-sql.design.md`, `docs/deployment/issues/03-provision-the-dev-environment-stack.design.md`, `specs/deployment/spec.md` (Topology), ADR 0031, `docs/infrastructure/costs.md`
- The first real apply failed with SQL `ProvisioningDisabled` in `westeurope` for this subscription; only an apply proves a region works.
- New regional prices may be applied without per-price approval while the expected `dev` total stays under $0.10 per month; above that, the owner approves first.

## Verification
- [x] `terraform fmt -check -recursive`, `terraform validate`, and `terraform test` pass for both stacks.
- [x] Tests show every environment resource except the Static Web App in `var.location`, the Static Web App in `static_web_app_location`, and validation rejecting a missing `location` and a Static Web App region outside the allowed list.
- [x] Owner: the targeted probe `terraform apply -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev` creates the SQL server `sql-cocassistant-dev-swedencentral` in the chosen region (fallback region if it is refused).
- [x] Owner: the full `dev` plan replaces only the API identity, Log Analytics workspace, storage account and container, SignalR, and Container Apps environment (where they exist), creates the SQL server, firewall rule, database, and Container App, and leaves the Static Web App and resource group unchanged; the apply completes.
- [x] `costs.md` lists prices for the new region with the date checked, and the expected total stays under $0.10 per month.

## Refinement Protocol
Change `specs/deployment/spec.md`, ADR 0031, `docs/infrastructure/costs.md`, and `docs/infrastructure/dev-environment-setup.md` together with the stack.

## Follow-ups
- Owner D12 probe: run `terraform plan -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev` (expect exactly one addition, `azurerm_mssql_server.dev` named `sql-cocassistant-dev-swedencentral` in `swedencentral`), then `terraform apply` with the same `-target`; on `ProvisioningDisabled` set `location = "germanywestcentral"` in `dev.tfvars` and repeat (the name becomes `sql-cocassistant-dev-germanywestcentral` automatically).
- Owner D13 apply: run the full `dev` plan and apply, checking the plan matches the expected replace/create/no-change sets in the design record; the apply completes.
- Stale record: the failed `westeurope` create left a stale record reserving `sql-cocassistant-dev` in `rg-cocassistant-dev` (invisible to `az sql server show` and `az resource list`); nothing references it. It may surface if the resource group is ever deleted; a support request to clear it is optional and the owner's call.
- Free-offer database body (failed owner apply, fixed on this branch, D16): the first full apply in `swedencentral` failed on `azapi_resource.database` with `ProvisioningDisabled`, "Only default value for auto pause delay is allowed for Free Limit database with auto pause exhaustion behavior". The body now matches Microsoft's free-offer azapi example (no `autoPauseDelay`, no `minCapacity`; `requestedBackupStorageRedundancy = "Local"`, `createMode = "Default"`). The failed create left nothing behind; re-apply normally and verify with the post-apply `az sql db show` check in `docs/infrastructure/dev-environment-setup.md`.
- Blocked Log Analytics and environment names (failed owner apply, fixed on this branch, D18): the same apply failed with 409 `InvalidResourceLocation` for `log-cocassistant-dev`, deleted in `westeurope` but still blocked in `swedencentral`. Both names now carry the region (`log-cocassistant-dev-swedencentral`, `cae-cocassistant-dev-swedencentral`). Expected plan is exactly four creates: workspace, environment, database, Container App; anything else means stop. Any other moved resource returning 409 gets the same region token (storage excepted, escalate).
- Owner apply result (2026-11-10): the apply created exactly those four resources (Log Analytics workspace, Container Apps environment, database, Container App) with exit "4 added, 0 changed, 0 destroyed". `az containerapp show` for the API reports `properties.template.scale` as `{"cooldownPeriod": 3600, "maxReplicas": 1, "minReplicas": null, "pollingInterval": 30, "rules": null}`: `minReplicas` null is Azure's unset default of 0, and the follow-up plan showed no scale diff, so config `min_replicas = 0` agrees with Azure. The revision `ca-cocassistant-api-dev--3ahtcd7` is Active and Provisioned with health None: the placeholder image, scaled to zero.
- Auto-pause delay, documented vs reported (2026-11-10): the owner's `az sql db show` returned `{"free": true, "exhaustion": "AutoPause", "pause": 60, "backup": "Local"}` while Microsoft's free-offer page says the free tier pauses after 15 minutes of inactivity and the delay is fixed ([free offer](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql), checked 2026-11-10). Recorded without claiming which is real: documented 15 minutes, API reported 60, actual behavior unconfirmed; we send no `autoPauseDelay`, so no stack change. Follow-up: observe when the database actually pauses after idling and reconcile ADR 0031 (:49, :55), `costs.md`, and this file.
- Consumption workload profile plan drift (owner plan after the successful apply, fixed on branch `feature/dep-007-consumption-workload-profile`, no new PBI): the follow-up `terraform plan` showed 2 in-place updates and nothing else - `azurerm_container_app.api` with `- workload_profile_name = "Consumption" -> null`, and `azurerm_container_app_environment.dev` with the `workload_profile` block (`maximum_count = 0`, `minimum_count = 0`, `name = "Consumption"`, `workload_profile_type = "Consumption"`) removed. Azure automatically adds a Consumption profile to every environment, so the config now declares the bare `workload_profile { name = "Consumption" workload_profile_type = "Consumption" }` block and `workload_profile_name = "Consumption"` to match. No cost change (serverless, no dedicated capacity), no renames, still Consumption. Expected owner plan is clean; if it shows a replace on the environment or app, stop and escalate. If the workload diff persists, the fallback is `lifecycle { ignore_changes }` for those attributes. Resolved 2026-11-10: the post-merge `terraform plan` shows "No changes".

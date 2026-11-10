---
id: PBI-DEP-007
status: todo
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
- [ ] Owner: the targeted probe `terraform apply -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev` creates the SQL server `sql-cocassistant-dev-swedencentral` in the chosen region (fallback region if it is refused). Deferred: see Follow-ups.
- [ ] Owner: the full `dev` plan replaces only the API identity, Log Analytics workspace, storage account and container, SignalR, and Container Apps environment (where they exist), creates the SQL server, firewall rule, database, and Container App, and leaves the Static Web App and resource group unchanged; the apply completes. Deferred: see Follow-ups.
- [x] `costs.md` lists prices for the new region with the date checked, and the expected total stays under $0.10 per month.

## Refinement Protocol
Change `specs/deployment/spec.md`, ADR 0031, `docs/infrastructure/costs.md`, and `docs/infrastructure/dev-environment-setup.md` together with the stack.

## Follow-ups
- Owner D12 probe: run `terraform plan -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev` (expect exactly one addition, `azurerm_mssql_server.dev` named `sql-cocassistant-dev-swedencentral` in `swedencentral`), then `terraform apply` with the same `-target`; on `ProvisioningDisabled` set `location = "germanywestcentral"` in `dev.tfvars` and repeat (the name becomes `sql-cocassistant-dev-germanywestcentral` automatically).
- Owner D13 apply: run the full `dev` plan and apply, checking the plan matches the expected replace/create/no-change sets in the design record; the apply completes.
- Stale record: the failed `westeurope` create left a stale record reserving `sql-cocassistant-dev` in `rg-cocassistant-dev` (invisible to `az sql server show` and `az resource list`); nothing references it. It may surface if the resource group is ever deleted; a support request to clear it is optional and the owner's call.
- Free-offer database body (failed owner apply, fixed on this branch, D16): the first full apply in `swedencentral` failed on `azapi_resource.database` with `ProvisioningDisabled`, "Only default value for auto pause delay is allowed for Free Limit database with auto pause exhaustion behavior". The body now matches Microsoft's free-offer azapi example (no `autoPauseDelay`, no `minCapacity`; `requestedBackupStorageRedundancy = "Local"`, `createMode = "Default"`). The failed create left nothing behind; re-apply normally and verify with the post-apply `az sql db show` check in `docs/infrastructure/dev-environment-setup.md`.
- Blocked Log Analytics and environment names (failed owner apply, fixed on this branch, D18): the same apply failed with 409 `InvalidResourceLocation` for `log-cocassistant-dev`, deleted in `westeurope` but still blocked in `swedencentral`. Both names now carry the region (`log-cocassistant-dev-swedencentral`, `cae-cocassistant-dev-swedencentral`). Expected plan is exactly four creates: workspace, environment, database, Container App; anything else means stop. Any other moved resource returning 409 gets the same region token (storage excepted, escalate).

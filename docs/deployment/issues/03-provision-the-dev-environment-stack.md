---
id: PBI-DEP-003
status: done
blocked_by: [PBI-DEP-001]
---

# PBI-DEP-003: Provision the Dev Environment Stack

## Directive
Define every `dev` resource in the environment stack so one `terraform apply` produces a ready, near-zero-cost environment for the deploy workflow.

**Scope:**
- **Stack:** `infrastructure/terraform/` with the topology table from the spec: Log Analytics (0.15 GB daily cap, 30 days), Container Apps environment, Container App (0.25 vCPU / 0.5 GiB, min 0, max 1, cooldown 3600 s, `/health` probes, image in `ignore_changes`, placeholder image until the first deploy), API identity, SQL server (Entra-only, deploy identity as Entra admin, Azure services firewall rule), free-offer database through `azapi`, storage account and private container, SignalR Free in Default mode, Static Web App Free; tags and outputs.
- **Environment files:** `environments/dev.tfvars` and `environments/dev.backend.hcl`.
- **Out of scope:** workflows (PBI-DEP-004, PBI-DEP-005); the database user for the API identity (created by the deploy workflow).

## Dependencies
- Blocked by: PBI-DEP-001 (resource group, state backend, deploy identity)
- Must merge before: PBI-DEP-004 and PBI-DEP-005

## Context
Read: `specs/deployment/spec.md` (Topology, Terraform layout, API configuration in `dev`), ADR 0031, ADR 0009, ADR 0010, `docs/infrastructure/costs.md`
- Before applying SignalR Free, confirm from an official Microsoft page that the Free tier supports Default mode, and record the source in `costs.md`.
- If `azurerm` cannot set the cooldown, use `azapi` for it and say so in the spec.
- Any resource or setting not priced in `costs.md` needs the owner's approval first.

## Verification
- [x] `terraform fmt -check` and `terraform validate` pass.
- [ ] A `plan` for `dev` creates exactly the resources in the spec's topology table, each with the three tags. Deferred: see Follow-ups.
- [ ] The SQL database reports the free offer with AutoPause on exhaustion. Deferred: see Follow-ups.
- [ ] The Container App shows min replicas 0, max replicas 1, and a 3600-second cooldown. Deferred: see Follow-ups.
- [x] `costs.md` records the SignalR Free Default-mode source.

## Refinement Protocol
Change `specs/deployment/spec.md`, ADR 0031, and `docs/infrastructure/costs.md` together with the stack.

## Follow-ups

- Owner runs the Azure-dependent Verification items after the first real apply: the `dev` plan creates exactly the spec topology resources with the three tags; the SQL database reports the free offer with AutoPause; the Container App shows min 0, max 1, cooldown 3600. Deferred: no Azure credentials were available in this environment, so no plan or apply was run. The D9 bootstrap re-apply (exactly one addition: `owner_state_container`) is the owner's too.
- Reader may not be enough for the plan's refresh of resources whose attributes need list-keys or list-secrets actions (SignalR, storage, Container App secrets, Static Web App key, Log Analytics shared keys) -> PBI-DEP-004.
- DEP-005 verifies the no-Graph database user creation (`CREATE USER ... FROM EXTERNAL PROVIDER`, else `WITH SID`); the manual T-SQL step through a self-added firewall rule stays as the fallback.

---
id: PBI-DEP-003
status: todo
blocked_by: [PBI-DEP-001]
---

# PBI-DEP-003: Provision the Dev Environment Stack

## Directive
Define every `dev` resource in the environment stack so one `terraform apply` produces a ready, near-zero-cost environment for the deploy workflow.

**Scope:**
- **Stack:** `infrastructure/terraform/` with the topology table from the spec: Log Analytics (0.15 GB daily cap, 30 days), Container Apps environment, Container App (0.25 vCPU / 0.5 GiB, min 0, max 1, cooldown 3600 s, `/health` probes, image in `ignore_changes`, placeholder image until the first deploy), API identity, SQL server (Entra-only, admin group, Azure services firewall rule), free-offer database through `azapi`, storage account and private container, SignalR Free in Default mode, Static Web App Free; tags and outputs.
- **Environment files:** `environments/dev.tfvars` and `environments/dev.backend.hcl`.
- **Out of scope:** workflows (PBI-DEP-004, PBI-DEP-005); the database user for the API identity (created by the deploy workflow).

## Dependencies
- Blocked by: PBI-DEP-001 (resource group, state backend, SQL admin group)
- Must merge before: PBI-DEP-004 and PBI-DEP-005

## Context
Read: `specs/deployment/spec.md` (Topology, Terraform layout, API configuration in `dev`), ADR 0031, ADR 0009, ADR 0010, `docs/infrastructure/costs.md`
- Before applying SignalR Free, confirm from an official Microsoft page that the Free tier supports Default mode, and record the source in `costs.md`.
- If `azurerm` cannot set the cooldown, use `azapi` for it and say so in the spec.
- Any resource or setting not priced in `costs.md` needs the owner's approval first.

## Verification
- [ ] `terraform fmt -check` and `terraform validate` pass.
- [ ] A `plan` for `dev` creates exactly the resources in the spec's topology table, each with the three tags.
- [ ] The SQL database reports the free offer with AutoPause on exhaustion.
- [ ] The Container App shows min replicas 0, max replicas 1, and a 3600-second cooldown.
- [ ] `costs.md` records the SignalR Free Default-mode source.

## Refinement Protocol
Change `specs/deployment/spec.md`, ADR 0031, and `docs/infrastructure/costs.md` together with the stack.

## Follow-ups

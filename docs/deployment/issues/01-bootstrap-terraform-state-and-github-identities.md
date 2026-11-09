---
id: PBI-DEP-001
status: todo
blocked_by: []
---

# PBI-DEP-001: Bootstrap Terraform State and GitHub Identities

## Directive
Give the repository owner a one-time, locally run Terraform stack that creates everything the `dev` environment stack and the GitHub workflows need before they can run: remote state, the `dev` resource group, OIDC identities, the SQL admin group, and the budget.

**Scope:**
- **Bootstrap stack:** `infrastructure/terraform/bootstrap/` with `rg-cocassistant-tfstate`, the state storage account (Standard LRS, versioning and soft delete, Entra-authorized access), `rg-cocassistant-dev`, `id-cocassistant-github-plan` and `id-cocassistant-github-deploy` with their federated credentials and role assignments, the group `sg-cocassistant-dev-sql-admins` (deploy identity and the repository owner), and the EUR 5 subscription budget with alerts at 20% actual, 80% forecast, and 100% forecast.
- **CI:** the `terraform` job in `.github/workflows/ci.yml` also runs `init -backend=false` and `validate` for `bootstrap/`.
- **Docs:** start `docs/infrastructure/dev-environment-setup.md` with the bootstrap run and the GitHub Environment `dev` setup.
- **Out of scope:** the environment stack's resources (PBI-DEP-003) and workflows (PBI-DEP-004, PBI-DEP-005).

## Dependencies
- Blocked by: None
- Must merge before: PBI-DEP-003 (reads the resource group and uses the state backend), PBI-DEP-004 and PBI-DEP-005 (use the identities)

## Context
Read: `specs/deployment/spec.md` (Terraform layout, GitHub to Azure authentication), `docs/adr/0031-dev-environment-on-container-apps-static-web-apps-and-free-sql.md`, `docs/infrastructure/costs.md`, `infrastructure/CLAUDE.md`
- The state storage account is an approved cost; re-verify the managed identity source row in `costs.md`.
- The bootstrap state stays local and must be gitignored.

## Verification
- [ ] `terraform fmt -check` and `terraform validate` pass for `bootstrap/`, and CI validates it.
- [ ] After a local apply, the plan identity has only Reader on `rg-cocassistant-dev` and Storage Blob Data Contributor on the state container.
- [ ] The deploy identity has Contributor on `rg-cocassistant-dev`, Storage Blob Data Contributor on the state container, and membership in `sg-cocassistant-dev-sql-admins`.
- [ ] The budget exists with the three alerts.
- [ ] `dev-environment-setup.md` lets the owner reproduce the bootstrap from a clean subscription.

## Refinement Protocol
Change `specs/deployment/spec.md`, ADR 0031, `docs/infrastructure/costs.md`, and the setup doc together with the stack.

## Follow-ups

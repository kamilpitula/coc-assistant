# Design: PBI-DEP-004 follow-up: let the plan identity refresh resources whose reads need list-keys or list-secrets

Lands on the PBI-DEP-005 branch `feature/dep-005-deploy-every-green-master-build-to-dev` (PR #63) with the human's explicit approval.

Problem: run 42855115060 of `Terraform plan (dev)` logged in as `id-cocassistant-github-plan` but failed refresh with 403 AuthorizationFailed on `Microsoft.SignalRService/signalR/listKeys/action` (`sigr-cocassistant-dev`) and `Microsoft.Web/staticSites/listSecrets/action` (`stapp-cocassistant-dev`). The identity has only Reader on `rg-cocassistant-dev` (`infrastructure/terraform/bootstrap/identities.tf:35-40`).

## Findings (azurerm v4.81.0 source, the locked version)
1. Static Web App read calls `ListStaticSiteSecrets` then `ListStaticSiteAppSettings` (`internal/services/appservice/static_web_app_resource.go:338,348`), so `listAppSettings` fails next. `azurerm_container_app.api` was never refreshed in the failing run (it depends on the failed resources); its read calls `ListSecrets` with no fallback (`internal/services/containerapps/container_app_resource.go:302`).
2. The storage account read swallows a 403 on `listKeys` (`internal/services/storage/storage_account_resource.go:2322-2328`), so its connection string refreshes without the key. That value feeds the Container App secret (`infrastructure/terraform/container-app.tf:50-52`), which would show a false in-place update on every PR plan.
3. Log Analytics only logs a failed shared-keys read (`internal/services/loganalytics/log_analytics_workspace_resource.go:667-669`); the stack references no shared key, and the Container Apps environment reads it only on create and update (`container_app_environment_resource.go:307,534`).
4. Every affected value is provider-sensitive: `api_key` (`static_web_app_resource.go:151-155`), SignalR keys and connection strings (`signalr_service_resource.go:1052-1062`), the Container App secret block (`containerapps/helpers/container_apps.go:2858,2888`). `terraform show -no-color tfplan` (`.github/workflows/terraform-plan.yml:52`) prints them as `(sensitive value)`. The `tfplan` file holds them in plain text but stays on the ephemeral runner and is never uploaded.
5. The plan identity already has Storage Blob Data Contributor on the state container (`bootstrap/identities.tf:42-47`); the state blob holds these values in plain text after the deploy identity's apply. The new list actions do not widen what the identity can effectively read.
6. Fork pull requests are skipped (`terraform-plan.yml:23`), and the federated credential trusts only this repository's `pull_request` subject (`bootstrap/main.tf:13-17`).

## Triggers
- 2 (shared interface or data model): the plan identity's role set, described in `specs/deployment/spec.md:33` and ADR 0031.
- 3 (new cross-layer pattern): the first custom RBAC role in the repository; until now only built-in roles (`bootstrap/identities.tf:35-70`).
- 4 (ADR): amendment to ADR 0031.
- 6 (open question): DEP-001 and DEP-004 Follow-ups left "Reader may not be enough" open.

## Constraints
- `specs/deployment/spec.md` Constraints: only the deploy identity can change Azure resources; pull request workflows can only read (line 66). DoD: the plan identity has no write role on `rg-cocassistant-dev` (line 78). Scenario "An infrastructure pull request shows a plan" (lines 118-122). Guardrail: no workflow stores an Azure client secret (line 96).
- ADR 0031: a read-only plan identity (Decision); the immutable-subject amendment (bootstrap re-applied locally by the owner).
- DEP-004 Follow-up: a bootstrap role change goes through the Architect, not the workflow.
- Both GitHub identities live in `rg-cocassistant-tfstate` (`bootstrap/identities.tf:1-3`).
- Bootstrap test mocks must produce well-formed ids (`bootstrap/tests/bootstrap.tftest.hcl:25-26`).
- Cyclomatic complexity 10: not applicable (HCL only). No game rules or `CONTEXT.md` terms involved.

## Decisions
### D1: How the plan's refresh gets past the list-keys and list-secrets reads
Options: A, a custom role at `rg-cocassistant-dev` with only the list actions, assigned beside Reader. B, built-in roles: checked with `az role definition list` on 2026-11-10, "SignalR/Web PubSub Contributor" grants `Microsoft.SignalRService/*`, "Container Apps Contributor" grants `containerApps/*/write` and `*/delete`, no built-in role reads `staticSites` secrets read-only, and only "Reader and Data Access" (storage only) is read-only. C, `terraform plan -refresh=false` in `terraform-plan.yml`. Changing the stack itself cannot remove these reads: SignalR (`signalr_service_resource.go:202`), Static Web Apps (`:338`, `:348`), and the Container App (`:302`) call them on every read with no provider switch; `lifecycle` does not skip refresh; azapi rewrites would replace the stack.

| Metric | A: custom list-only role | B: built-in roles | C: `-refresh=false` |
| --- | --- | --- | --- |
| Consistency | 0 first custom role, but keeps "Reader plus narrow additions" and the anticipated follow-up | - Contributor-class roles break spec lines 66 and 78 | 0 no new pattern, but the PR plan diverges from the refreshing deploy apply |
| Modifiability | + a new provider list read is one line in one place | - per-service, over-broad roles | 0 nothing to maintain; drift hidden |
| Testability | + `terraform test` asserts the exact action set and scope; live proof on PR #63 | 0 tests would assert broad roles | + nothing to unit test; same live proof |
| Simplicity | 0 two bootstrap resources, one test run, one re-apply | 0 several assignments, one re-apply | + one flag, no re-apply |
| Reversibility | 0 removal needs another bootstrap apply | 0 same | + drop the flag |
| Security and correctness | + no write, delete, or regenerate action; no ARM change possible; values already readable from state (finding 5); faithful plan with drift visible and no false storage diff | - grants ARM write on SignalR and the Container App | 0 grants nothing new, but the reviewed plan can differ from the master apply (for example the ADR 0031 D8 break-glass reset would not show) |

- **Chosen:** A, because security and correctness decided it: the plan reviewers see is the plan `deploy-dev.yml` computes, with no ARM write granted, and it is the fix DEP-001 and DEP-004 anticipated - giving up simplicity and cheap reversal (one owner bootstrap re-apply, a first custom role definition).
- **Rejected:** B - breaks the read-only invariant. The Developer must not reintroduce it.
- **Rejected:** C - hides drift and makes the PR plan differ from the apply. Must not be added alongside A either (it would hide drift for no gain).

### D2: Which actions the custom role holds
| Metric | Option A: the five actions the refresh needs | Option B: only the three from the failing run |
| --- | --- | --- |
| Consistency | + covers every read path (findings 1 and 2) | - fails on the next run (`listAppSettings`, Container App `listSecrets`) |
| Modifiability | 0 | 0 |
| Testability | + exact-set assertion | + same |
| Simplicity | 0 two more lines | 0 |
| Reversibility | 0 | 0 |
| Security and correctness | 0 adds the storage key, already in state; no false storage diff | - false Container App secret diff on every PR (finding 2) |

- **Chosen:** A, exactly these five, each verified to exist with `az provider operation show`:
  - `Microsoft.SignalRService/signalR/listKeys/action`
  - `Microsoft.Web/staticSites/listSecrets/action`
  - `Microsoft.Web/staticSites/listAppSettings/action`
  - `Microsoft.App/containerApps/listSecrets/action`
  - `Microsoft.Storage/storageAccounts/listKeys/action`

  Giving up: the identity now holds the handout storage key directly, as well as through state.
- **Rejected:** B - broken or misleading plan.
- **Rejected:** `Microsoft.OperationalInsights/workspaces/sharedKeys/action` - not needed (finding 3).
- **Rejected:** any wildcard such as `*/listKeys/action`.

### D3: Where the role definition lives
| Metric | Option A: bootstrap, scope and assignable scope `rg-cocassistant-dev` only | Option B: subscription scope |
| --- | --- | --- |
| Consistency | + bootstrap owns every role assignment (`spec.md:25`) | 0 |
| Modifiability | + another environment gets its own definition | - one shared tenant-wide name |
| Testability | + scope assertion | + |
| Simplicity | + | 0 |
| Reversibility | + | 0 |
| Security and correctness | + narrowest assignable scope | - wider than needed |

- **Chosen:** A. **Rejected:** B - wider than needed.

### Single-option decisions
- Keep `azurerm_role_assignment.plan_reader_dev` (Reader) unchanged; the custom role is added, not substituted.
- Role name `CoC Assistant dev plan secret reader` (definition names are tenant-unique, so explicit); `role_definition_id` is left to the provider.
- The role description says it holds list actions only and no write.
- No change to the job summary writer (finding 4), `deploy-dev.yml`, the deploy identity, or the environment stack.

## Patterns
- **Used:** none. Declarative HCL with no conditional or behavioral force.
- **Rejected:** a Terraform module wrapping the role and its assignment (Facade) - one use site, a speculative layer.
- **Rejected:** one role per resource type (Strategy-like split) - one identity and one scope; nothing switches on kind.

## Invariants
- The custom role's `actions` are exactly the five in D2; `not_actions`, `data_actions`, and `not_data_actions` are empty; no wildcard and no `write`, `delete`, or `regenerate` action.
- Its `assignable_scopes` and the assignment's `scope` are exactly `azurerm_resource_group.dev.id`.
- The plan identity's assignments are exactly: Reader on the dev RG, the custom role on the dev RG, Storage Blob Data Contributor on the `tfstate` container.
- `tfplan` and state are never uploaded as artifacts; the summary goes only through `terraform show` (sensitive values masked); the fork skip at `terraform-plan.yml:23` stays.
- Nothing outside `bootstrap/identities.tf`, the bootstrap tests, and the docs below changes; anything else is an escalation.

## Implementation plan
1. `infrastructure/terraform/bootstrap/identities.tf`: add `azurerm_role_definition.plan_secret_reader_dev` (name above; `scope = azurerm_resource_group.dev.id`; `permissions { actions = [the five]; not_actions = [] }`; `assignable_scopes = [azurerm_resource_group.dev.id]`) and `azurerm_role_assignment.plan_secret_reader_dev` (`scope = azurerm_resource_group.dev.id`; `role_definition_id = azurerm_role_definition.plan_secret_reader_dev.role_definition_resource_id`; plan identity `principal_id`; `principal_type = "ServicePrincipal"`). Short comment: the provider reads these on refresh, and the same values are already in the state this identity reads.
2. `infrastructure/terraform/bootstrap/tests/bootstrap.tftest.hcl`: `override_resource` for `azurerm_role_definition.plan_secret_reader_dev` with a well-formed `role_definition_resource_id` (for example `/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.Authorization/roleDefinitions/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee`); new run `plan_identity_secret_reader_role` (TDD units). Leave `plan_identity_roles` as is.
3. `terraform fmt -check -recursive`, `terraform validate`, and `terraform test` for both stacks. The environment stack is unchanged, so its tests need no change.
4. `docs/infrastructure/dev-environment-setup.md`: a section 4 subsection "Re-applying after the plan secret-reader role (2026-11-10)" - expected plan exactly 2 to add (definition, assignment), 0 to change, 0 to destroy, anything else means stop; apply; if the assignment fails with RoleDefinitionDoesNotExist (propagation), re-run apply; then re-run the `Terraform plan (dev)` check on PR #63. Section 6: the plan identity has three roles; add `az role definition list --custom-role-only true --name "CoC Assistant dev plan secret reader"` showing the five actions.
5. `specs/deployment/spec.md`: identity row (line 33) becomes "Reader and the custom role `CoC Assistant dev plan secret reader` (list-keys and list-secrets actions only, no write) on `rg-cocassistant-dev`; Storage Blob Data Contributor on the state container". Constraint at line 66 gains: pull request workflows may read resource keys and secrets through list actions, values the state already holds, but cannot change any resource. DoD line 78 stays.
6. `docs/deployment/issues/04-plan-infrastructure-changes-on-pull-requests.md` Follow-ups: mark the authorization-error item as addressed by this record; add "owner re-applies the bootstrap, then confirms the check is green on PR #63". In `docs/deployment/issues/01-bootstrap-terraform-state-and-github-identities.md` Follow-ups (line 39), point to this record. Statuses unchanged in both.

## Reuse
- Using: the `azurerm_role_assignment` shape at `bootstrap/identities.tf:35-40`; the override-mock pattern at `bootstrap.tftest.hcl:25-71`; the re-apply subsection format at `dev-environment-setup.md:53-76`.
- Not using: a built-in role (D1 B); a separate secret-reading identity (another federated credential and login for the same trust).

## TDD units
- The role definition's `permissions[0].actions` equals the five actions as a set (length 5).
- `not_actions`, `data_actions`, and `not_data_actions` are empty or null.
- No action contains `*`, `/write`, `/delete`, or `regenerate` (separate assert with its own message).
- `assignable_scopes == [azurerm_resource_group.dev.id]` and the definition `scope == azurerm_resource_group.dev.id`.
- The assignment: `scope == azurerm_resource_group.dev.id`, `principal_id == azurerm_user_assigned_identity.plan.principal_id`, `principal_type == "ServicePrincipal"`, `role_definition_id == azurerm_role_definition.plan_secret_reader_dev.role_definition_resource_id`.
- Existing `plan_identity_roles` still passes (Reader unchanged).

## E2E coverage
- Exception: internal CI and infrastructure, no product UI, so no Playwright test.
- Live proof for spec Scenario "An infrastructure pull request shows a plan" (`specs/deployment/spec.md:118-122`): after the owner's bootstrap re-apply, PR #63's `Terraform plan (dev)` check (PR #63 touches `infrastructure/**`) is green, the job summary shows the dev plan, and it shows no false update to `azurerm_container_app.api` secrets.
- DEP-004 Verification item 3 (denied-write probe) stays a Follow-up.

## ADR
- ADR 0031 "Amendment (2026-11-10, plan identity secret reads)", written by the Architect in the design commit. No new ADR: this refines ADR 0031's read-only plan identity rather than replacing a decision.

## Human decisions
- 2026-11-10, verbatim: "approve A, all five actions, Architect writes the ADR". D1 Option A approved (Option C not chosen); D2 all five actions approved, including `Microsoft.Storage/storageAccounts/listKeys/action`; D3 approved as written; the Architect writes the ADR 0031 amendment.
- Noted (coordinator, read-only check): the owner holds Owner at subscription scope, so they can create the custom role definition.

## Revisions

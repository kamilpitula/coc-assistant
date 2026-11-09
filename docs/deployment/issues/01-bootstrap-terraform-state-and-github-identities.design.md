# Design: PBI-DEP-001: One-time local Terraform bootstrap for state, dev RG, GitHub OIDC identities, SQL admin group, and budget

## Triggers
- 1 New dependency: the `hashicorp/azuread` provider (for the Entra group), plus new Azure infrastructure (state storage, identities, budget).
- 2/3 Shared interface and cross-layer pattern: the state backend, the OIDC identities, and the GitHub variable names become the contract that PBI-DEP-003/004/005 consume.
- 6 Open questions with competing answers: identity placement, storage auth, owner lookup, budget recipients, naming, tests, CI shape.
- 7 UX: does not apply (no UI, no user journey).

## Constraints
- `specs/deployment/spec.md`:
  - :25: bootstrap contents and local state.
  - :23: the three tags on every resource.
  - :26: the environment stack reads `rg-cocassistant-dev` and uses `environments/dev.backend.hcl`.
  - :27: providers pinned in `versions.tf`.
  - :30-34: OIDC, no client secrets, and the identity/subject/role table. Storage Blob Data Contributor is scoped to the state *container*.
  - :36: plan only for pull requests from this repository's branches.
  - :57: manual steps go in `dev-environment-setup.md`.
  - :65: only the deploy identity, through Environment `dev`, can change Azure.
  - :71: actions are pinned by SHA.
  - :76 and :89: definition of done.
- ADR 0031:
  - line 16: GitHub Actions authenticates with OIDC.
  - line 25: HCP Terraform state and Key Vault were rejected.
- `docs/infrastructure/costs.md`:
  - :5-6: Visual Studio subscription and the EUR 5 budget.
  - :21: state storage approved.
  - :23: identity row.
  - :33: GitHub Actions row.
  - :49: open check to re-verify rows :23 and :33 in this PBI.
- `infrastructure/CLAUDE.md`:4-6: pinned versions in foundation files, environment values in variables, explicit and reviewable names and tags.
- Existing patterns:
  - `versions.tf` pins `required_version >= 1.9.0` and `azurerm ~> 4.0`.
  - `infrastructure/terraform/.terraform.lock.hcl` is tracked (`git ls-files`; azurerm 4.81.0).
  - The CI terraform job is at `.github/workflows/ci.yml`:319-337: TF 1.16.3, `fmt -check -recursive`, `init -backend=false -input=false`, `validate`.
- `.gitignore`:22-26 already ignores `**/.terraform/`, `*.tfstate`, `*.tfstate.*`, `*.tfvars`, and `*.tfvars.json`.
  - Checked with `git check-ignore`: `bootstrap/terraform.tfvars` and `bootstrap/terraform.tfstate.backup` are ignored; `bootstrap/terraform.tfvars.example` is not.
  - No `.gitignore` change is needed.
- The cyclomatic complexity limit (10) does not apply to HCL.

## Decisions
### D1: Resource group for the plan and deploy identities
| Metric | A: rg-cocassistant-tfstate | B: rg-cocassistant-dev | C: new rg-cocassistant-github |
| --- | --- | --- | --- |
| Consistency | 0 The RG name says "tfstate" but it holds bootstrap-owned shared resources | + Identities sit next to what they act on | - Adds a resource the spec does not list |
| Modifiability | + Bootstrap-owned resources stay outside the environment stack's RG | - The environment-stack RG holds resources it does not manage | + Clean |
| Testability | + | + | + |
| Simplicity | + No new RG | + | - Extra RG |
| Reversibility | 0 Moving means new identities and new client ids | 0 Same | 0 Same |
| Security and correctness | + Outside the deploy identity's Contributor scope | - Contributor on the RG can write federatedIdentityCredentials on the deploy identity itself, so a workflow could mint a subject for any branch and bypass Environment `dev` (spec.md:65) | + |

- **Chosen:** A, because of security and simplicity. We give up a slightly less accurate RG name. `spec.md`:25 is updated to say the identities live there.
- **Rejected:** B is a privilege-escalation path. The Developer must not reintroduce it.
- **Rejected:** C adds an unlisted resource for naming only.

### D2: How Terraform manages a state account with shared-key access disabled
| Metric | A: control plane only | B: data plane with Entra auth |
| --- | --- | --- |
| Consistency | + Plain ARM resources | 0 |
| Modifiability | + | 0 |
| Testability | + Mockable | 0 |
| Simplicity | + No extra role or wait | - Needs a role for the owner and a wait for role propagation (new `time` provider) |
| Reversibility | + | + |
| Security and correctness | + `shared_access_key_enabled = false`; the owner gets no data-plane role | - Widens access to the state |

- Option A: the azurerm provider in bootstrap sets `features { storage { data_plane_available = false } }`.
  - The container is created with `storage_account_id`, through ARM.
  - Versioning and soft delete are set through `blob_properties`, also through ARM.
- Option B: `storage_use_azuread = true`, and the owner is granted Storage Blob Data Owner before the container is created.
- **Chosen:** A, because of simplicity and security. The owner cannot read the state blobs without granting themselves a role. DEP-003 can grant one if a local plan is needed.
- **Rejected:** B, because of the extra provider and the apply-ordering race. Leaving shared keys enabled is also rejected: it contradicts "Entra-authorized access" in the PBI. The Developer must not use it as a fallback.
- **Must verify:** `data_plane_available` and the container `storage_account_id` argument, against the azurerm docs for the version in the lock file. If either is missing, escalate.
- **Later backend (DEP-003/004/005):** `use_azuread_auth = true`. The workflows use OIDC (`use_oidc`).

### D3: How the repository owner is identified for the SQL admin group
| Metric | A: lookup of the signed-in user | B: object-id variable |
| --- | --- | --- |
| Consistency | 0 | + Matches "explicit and reviewable" |
| Testability | + mock_data | + |
| Simplicity | + No manual lookup | - Manual step |
| Reversibility | + | + |
| Security and correctness | + With the tenant precondition, it cannot pick the wrong tenant | - The owner also has an External ID (CIAM) tenant (`docs/entra-external-id-setup.md`), so copying the wrong object id is plausible |

- Option A: `data "azuread_client_config" "current"`, plus a lifecycle precondition on the group: `azuread_client_config.tenant_id == azurerm_client_config.tenant_id`.
- **Chosen:** A, because of correctness and simplicity. The object id is output so it can be reviewed in the plan. Whoever runs `apply` becomes the member; the spec says the owner runs it (spec.md:25).
- **Rejected:** B, because of the wrong-tenant risk. Lookup by UPN is also rejected: it is unreliable for accounts backed by a Microsoft account.
- **Entra permissions:** the owner needs Owner on the subscription and the right to create security groups (Global Administrator, Groups Administrator, or the default "users can create security groups" setting). Auth is through Azure CLI.

### D4: Budget alert recipients
| Metric | A: `budget_alert_emails` variable | B: `contact_roles = ["Owner"]` |
| --- | --- | --- |
| Consistency | + Matches infrastructure/CLAUDE.md:5 | 0 |
| Testability | + The validation is testable | 0 |
| Simplicity | 0 One tfvars entry | + No input |
| Security and correctness | + The delivery target is explicit | - No official source confirms delivery to a subscription Owner backed by a Microsoft account |

- Option A: `list(string)`, required, validated as non-empty with each entry containing `@`. It is set in the gitignored `terraform.tfvars`.
- **Chosen:** A, because of correctness. It costs one manual input.
- **Rejected:** B. Do not combine the two either.

### D5: State storage account name
| Metric | A: literal `stcocassistanttfstate` | B: random suffix |
| --- | --- | --- |
| Consistency | + The spec uses literal names (`stcocassistantdev`, spec.md:20) | - |
| Simplicity | + | - Adds the `random` provider |
| Reversibility | 0 If the name is taken, the apply fails and the owner renames it in code and spec | 0 |
| Security and correctness | + Reviewable; DEP-003's backend file can name it | 0 The name only exists after apply |

- **Chosen:** A (21 characters). The container is `tfstate`.
- **Rejected:** B.

### D6: Tags on bootstrap resources
- **Chosen:** Option A. Both RGs, the storage account, and both identities get all three tags with `environment=dev`, following spec.md:23. Only dev exists, and tags are trivially reversible.
- **Rejected:** Option B, `environment=shared` on the state RG and account. The spec does not state that deviation. Revisit when a second environment arrives.
- The container, federated credentials, role assignments, group, and budget take no tags.

### D7: Tests for the stack
| Metric | A: `terraform test` with mock providers in CI | B: declarative exception plus post-apply CLI checks only |
| --- | --- | --- |
| Consistency | - First Terraform test in the repository | + |
| Testability | + Asserts subjects, role names and scopes, storage settings, and budget thresholds without credentials | - Manual checks only |
| Simplicity | 0 One test file and one CI step | + |
| Security and correctness | + Catches a widened role or a wrong subject before apply | - |

- **Chosen:** A, because of security and testability. The CLAUDE.md declarative exception arguably applies, but the role scoping is security-critical. We give up a small new pattern and add to the CI scope the PBI states.
- **Rejected:** B as the only check. The post-apply CLI checks still go into the setup doc for the PBI's Verification.

### D8: CI step shape
| Metric | A: extra steps in the existing job | B: matrix over directories |
| --- | --- | --- |
| Consistency | + Keeps the job's name and shape (ci.yml:319-337) | - Check names change and `fmt` is duplicated |
| Simplicity | + Three steps | 0 |
| Reversibility | + | 0 |

- Option A adds steps with `working-directory: infrastructure/terraform/bootstrap`:
  - `terraform init -backend=false -input=false`
  - `terraform validate`
  - `terraform test`
- The existing `fmt -check -recursive` already covers `bootstrap/`.
- **Chosen:** A.
- **Rejected:** B.

### Single-option decisions
- **State container role scope:** the container's ARM id, per spec.md:33-34. Account scope would contradict the spec.
- **Federated credentials** (`azurerm_federated_identity_credential`):
  - Issuer `https://token.actions.githubusercontent.com`; audience `api://AzureADTokenExchange`.
  - `github-pull-request`: subject `repo:kamilpitula/coc-assistant:pull_request`.
  - `github-environment-dev`: subject `repo:kamilpitula/coc-assistant:environment:dev`.
  - The setup doc checks that the repository uses the default OIDC subject template: `gh api repos/kamilpitula/coc-assistant/actions/oidc/customization/sub`.
  - Fork pull requests get no OIDC token, which fits spec.md:36.
- **Role assignments:** `principal_type = "ServicePrincipal"`, which avoids replication-delay failures.
- **Storage account:**
  - StorageV2, Standard, LRS, Hot.
  - `https_traffic_only_enabled`, `min_tls_version = "TLS1_2"`, `allow_nested_items_to_be_public = false`.
  - `shared_access_key_enabled = false`, `default_to_oauth_authentication = true`.
  - Versioning on; blob and container delete retention of 7 days.
  - Public network access stays on, because GitHub runner IPs are dynamic.
  - `lifecycle { prevent_destroy = true }`.
- **Container:** `tfstate`, with `container_access_type = "private"`.
- **Group:** `azuread_group` `sg-cocassistant-dev-sql-admins`, with `security_enabled = true`, `mail_enabled = false`, and `prevent_duplicate_names = true`.
  - Inline `members`: the deploy identity's principal id and the owner's object id.
  - Do not mix inline members with `azuread_group_member`.
- **Budget:** `azurerm_consumption_budget_subscription`, monthly, amount 5 in the billing currency.
  - Scope: `data.azurerm_subscription.current.id`.
  - Start date: `formatdate("YYYY-MM-01'T'00:00:00Z", plantimestamp())`, with `ignore_changes = [time_period]`.
  - Notifications, all `GreaterThanOrEqualTo`: 20 Actual, 80 Forecasted, 100 Forecasted.
- **Providers:**
  - azurerm `~> 4.0` (same as spec.md:27); azuread `~> 3.0`.
  - azurerm sets `subscription_id = var.subscription_id`, which is required in azurerm 4.x.
  - Commit `bootstrap/.terraform.lock.hcl`, as the environment stack does.
- **Explicit resources per identity:** no `for_each` and no module. There are only two identities, with different role sets, and infrastructure/CLAUDE.md:6 asks for explicit, reviewable resources.
- **Location:** a `location` variable with default `westeurope`, duplicated from the environment stack. This is a deliberate DRY exception, because the two are separate root modules.
- **GitHub variables:** plain variables, not secrets (they are ids, not credentials).
  - Repository variables: `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_PLAN_CLIENT_ID`. The plan workflow uses no environment.
  - Environment `dev` variable: `AZURE_DEPLOY_CLIENT_ID`.
  - Environment `dev` deployment branches are limited to `master`, with no required reviewers. The branch limit is what keeps spec.md:65 true; spec.md:78 needs deploys without manual steps.
- **Outputs:**
  - tenant id and subscription id
  - dev RG name and state RG name
  - state storage account name and state container name
  - plan client id and deploy client id
  - SQL admin group object id and display name
  - owner object id

## Patterns
- **Used:** none. The HCL resources have no conditional, lifecycle-state, or construction variants, so no GoF force applies.
- **Rejected:** a module or a Factory-style `for_each` over the identities. Two explicit identities give no variant force, and either would make role review harder.

## Invariants
- The plan identity's only role assignments are Reader on `rg-cocassistant-dev` and Storage Blob Data Contributor on the `tfstate` container's ARM id.
- The deploy identity's only role assignments are Contributor on `rg-cocassistant-dev` and Storage Blob Data Contributor on the container.
- Neither identity has a subscription-scope role.
- Both identities live in `rg-cocassistant-tfstate`, never in `rg-cocassistant-dev`.
- `shared_access_key_enabled = false`. No client secrets, keys, or SAS tokens anywhere, and no data-plane role for the owner.
- The group is created only when the azuread and azurerm tenant ids match (precondition).
- Bootstrap state is never committed. `terraform.tfvars` stays local; only `terraform.tfvars.example` is committed.
- The federated subjects match spec.md:33-34 exactly.

## Implementation plan
1. `infrastructure/terraform/bootstrap/versions.tf`: `required_version >= 1.9.0`; azurerm `~> 4.0` and azuread `~> 3.0`; provider blocks with the D2 features and `subscription_id`.
2. `bootstrap/variables.tf`: `subscription_id`, `budget_alert_emails` (with validation), `location`.
3. `bootstrap/main.tf`:
   - locals: tags, repository, subjects
   - data sources: `azurerm_client_config`, `azurerm_subscription`, `azuread_client_config`
   - both RGs
4. `bootstrap/state.tf`: the storage account and the container.
5. `bootstrap/identities.tf`: two identities, two federated credentials, four role assignments.
6. `bootstrap/sql-admins.tf`: the group with its precondition.
7. `bootstrap/budget.tf`: the budget.
8. `bootstrap/outputs.tf`.
9. `bootstrap/terraform.tfvars.example`, with placeholders only.
10. `bootstrap/tests/bootstrap.tftest.hcl`, using mock providers. See TDD units.
11. Run `terraform init`, then commit `bootstrap/.terraform.lock.hcl`.
12. `.github/workflows/ci.yml` terraform job: add the D8 steps.
13. New `docs/infrastructure/dev-environment-setup.md`, with numbered sections in the style of `docs/entra-external-id-setup.md`:
    - prerequisites: Terraform, Azure CLI, the Owner role, the group-creation right, and the OIDC subject template check
    - `az login --tenant <subscription tenant>` and `az account set`
    - creating `terraform.tfvars` from the example
    - init, plan, and apply
    - backing up the local state outside the repository; it is sensitive because it holds the storage keys
    - post-apply checks: `az role assignment list --assignee <client id> --all`, `az ad group member list`, `az consumption budget list`
    - the GitHub repository variables
    - Environment `dev`: deployment branches limited to `master`, and `AZURE_DEPLOY_CLIENT_ID`
    - a placeholder heading for the later manual steps from spec.md:57
14. `specs/deployment/spec.md`:
    - :25: the account name, the container name, the identity RG, and that shared-key access is off
    - :27: azuread is used only in bootstrap
    - :56-57: the GitHub variables and the `master` branch rule
15. `docs/infrastructure/costs.md`:
    - Re-verify rows :23 and :33: fetch the sources and update the date. If a source does not state that there is no charge, escalate.
    - Name `stcocassistanttfstate` in row :21.
    - Add an "Outside Azure resources" row for the Entra security group: Entra ID Free, $0, with the verified official pricing page.
    - Resolve the open check at :49.
16. PBI-DEP-001 `## Follow-ups`, one entry each:
    - Reader may not be enough for the plan's refresh of resources whose attributes need list-keys or list-secrets actions (DEP-004).
    - DEP-003 must take the group object id as input, because the deploy identity has no Graph permission to look it up.
    - `.gitignore`:25 conflicts with spec.md:26 (`dev.tfvars`) (DEP-003).
    - The owner has no data role on the state, which a local plan needs (DEP-003).

## Reuse
- Using: the existing CI terraform job, the pinned setup-terraform action, the `.gitignore` Terraform patterns, the lock-file convention, and the style of `docs/entra-external-id-setup.md`.
- Not using: the environment stack's `variables.tf`. A separate root module cannot share it.

## TDD units
All run with `terraform test`, mock providers, and `command = apply`.
- The plan federated credential has the pull_request subject, the GitHub issuer, and audience `api://AzureADTokenExchange`.
- The deploy federated credential has the `environment:dev` subject.
- The plan identity's role assignments are Reader scoped to the dev RG id and Storage Blob Data Contributor scoped to the container id.
- The deploy identity's role assignments are Contributor on the dev RG and Storage Blob Data Contributor on the container.
- Both identities are in `rg-cocassistant-tfstate`.
- The storage account has shared keys off, versioning on, 7-day blob and container retention, LRS, TLS 1.2, and no public nested items.
- The group's members are exactly {deploy principal id, owner object id}.
- Mismatched tenant ids fail the group precondition (`expect_failures`).
- The budget is 5 per month, with notifications 20/Actual, 80/Forecasted, and 100/Forecasted.
- An empty or malformed `budget_alert_emails` fails validation.
- Every taggable resource carries the three tags.

## E2E coverage
- Exception: this is an infrastructure-only change with no user-visible application behavior.
- Coverage is CI `validate` and `test`, plus the post-apply CLI checks in `dev-environment-setup.md` for the PBI's Verification.
- No existing UX acceptance criteria are touched.

## ADR
- None. The identity placement and the azuread provider are confined to one locally run stack and are cheap to reverse. They are recorded in `spec.md` and in this record. ADR 0031 line 16 still holds as written.

## Human decisions
- 2026-11-09: the coordinator relayed the human's approval of this record as written, with no changes (reply: "approve").
- The base-branch question was not separately answered, so the proposed default applies: branch `feature/dep-001-bootstrap-terraform-state-and-github-identities` from `docs/deployment-spec`. The PBI and spec exist only there (commit 5dd850b is not on master).

## Revisions

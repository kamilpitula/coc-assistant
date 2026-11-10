# Design: PBI-DEP-003: Provision the dev environment stack in one terraform apply

## Triggers
- 1 New dependency: `Azure/azapi`, and every topology resource. Separately, the `azuread` provider is removed from bootstrap.
- 2 Shared interface: the stack's outputs and the Container App configuration feed DEP-004, DEP-005 and DEP-006. The bootstrap outputs change.
- 4 ADR-level: ADR 0031 gets an amendment (azapi database, deploy identity as SQL admin, no security group).
- 5 Crosses areas: the bootstrap stack and DEP-001 artifacts change alongside the environment stack.
- 6 Open questions with competing answers: the database resource shape, gitignore, the subscription id, the placeholder image, owner access to state, and the SQL admin without a group.
- 7 UX: does not apply (no UI, no user journey).

## Constraints
- `specs/deployment/spec.md`:
  - :11-23 topology, names, SKUs, and the three tags (`project=coc-assistant`, `environment=dev`, `managed-by=terraform`; bootstrap/main.tf:3-5 matches).
  - :26 the stack reads the resource group as a data source and uses `environments/dev.tfvars` and `environments/dev.backend.hcl`.
  - :27 azurerm `~> 4.0`; azapi only for the database free-offer properties.
  - :28 image in `ignore_changes`. :29 outputs.
  - :43-48 API configuration. :50 `/health` never touches the database.
  - :66 the API database user has only `db_datareader` and `db_datawriter`. :67 SQL firewall. :69 nothing applied without its `costs.md` entry.
- ADR 0031: :9 scale settings; :10 SignalR Free in Default mode with the cooldown; :11 Entra-only SQL with a user-assigned identity; :14 Container Apps secrets, no Key Vault; :15 log cap; :28 database pauses after 15 idle minutes; amendment :35 the CORS array key.
- ADR 0010: max replicas 1. ADR 0009: SignalR Default mode.
- `infrastructure/CLAUDE.md`: pinned versions, no hard-coded secrets, explicit names and tags, fmt and validate.
- Existing code and config:
  - The API listens on 8080 (backend/Dockerfile:34-35) and serves `/health` (backend/src/CocAssistant.Api/Program.cs:56).
  - SignalR key `Azure:SignalR:ConnectionString` (backend/src/CocAssistant.Api/LiveTransportRegistration.cs:10).
  - Storage only through a connection string (HandoutFileStoreRegistration.cs:71-74); blob container `handout-files` (AzureBlobHandoutFileStore.cs:10), created lazily by the API (:70).
  - Entra External ID values already committed in backend/src/CocAssistant.Api/appsettings.Development.json:17-19.
  - Storage data plane off in the provider features block (bootstrap/versions.tf:19-23); bootstrap tests use mock providers (bootstrap/tests/bootstrap.tftest.hcl).
  - The CI terraform job (.github/workflows/ci.yml:319-346) tests only bootstrap today.
  - DEP-001 decided `use_azuread_auth = true` with OIDC in the workflows and said DEP-003 may grant the owner a state role (01-bootstrap-terraform-state-and-github-identities.design.md:69,72). Its Follow-ups (01-...md:39-42) hand this PBI the gitignore conflict, the owner's state access, and the admin id as an input.
- Provider schema checked in the local azurerm 4.81.0: `azurerm_mssql_database` has no free-limit attribute; `azurerm_container_app` has `template.cooldown_period_in_seconds` and `ingress.fqdn`.
- Owner report (2026-11-10): the owner cannot create Entra security groups. `azuread_group.sql_admins` (bootstrap/sql-admins.tf:1) failed with 403 Authorization_RequestDenied. The owner cannot get Groups or Global Administrator and cannot move tenants. So the SQL server cannot use a Microsoft Graph lookup either (no Directory Readers or Graph application permissions for a server identity).
- Observed with `terraform state list`: the local bootstrap state holds every bootstrap resource except `azuread_group.sql_admins`.
- Azure SQL allows exactly one Entra admin per server.
- Things that depend on the group: bootstrap/sql-admins.tf:1-18 (including the tenant-match precondition :12-17); bootstrap/outputs.tf:41-49; bootstrap tests (runs `sql_admin_group_members`, `sql_admin_group_rejects_tenant_mismatch`, azuread mock :3 and override :12-18); bootstrap/versions.tf:9-12 and :27; bootstrap/main.tf:23; spec.md:18, :25, :27, :34; costs.md:34; dev-environment-setup.md:12-13, :37, :55-56; the DEP-001 PBI (:13, :30, :40); the DEP-003 PBI (:13, :18).
- Neither the plan nor the deploy identity has any role on `rg-cocassistant-tfstate` (bootstrap/identities.tf:35-54), so the environment stack cannot read the deploy identity through a data source.
- Cyclomatic complexity 10 does not apply to HCL; no new code is involved.

## Decisions

### D1: Free-offer database resource
| Metric | A: one azapi_resource | B: azurerm database + azapi patch |
| --- | --- | --- |
| Consistency | + spec.md:27 limits azapi to the free-offer properties; one resource owns them | 0 more azurerm, but two resources manage one database |
| Modifiability | + one owner, no fights between providers | - azurerm can drift against the patched SKU and auto-pause values |
| Testability | + the body is a plain map a mock test can assert on | 0 two resources to assert on |
| Simplicity | + one block | - two blocks and an ordering dependency |
| Reversibility | + replacing it later means a state move or import | + same |
| Security and correctness | + free-offer from creation, never billed | - exists as a normal serverless database before the patch; may bill, and the conversion may be refused |

- **Chosen:** A, because of correctness and simplicity - giving up azurerm's typed schema for this resource.
- **Rejected:** B - billing window and drift risk. The Developer must not reintroduce it.
- Details: `type = "Microsoft.Sql/servers/databases@<version>"`, the newest non-preview API version whose azapi schema accepts `useFreeLimit` and `freeLimitExhaustionBehavior` (try `2023-08-01` first; `terraform validate` must pass; escalate if only a preview version works). `parent_id` is the SQL server; `location` and `tags` set. Body: SKU `GP_S_Gen5_2`, tier `GeneralPurpose`, family `Gen5`, capacity 2; properties `useFreeLimit = true`, `freeLimitExhaustionBehavior = "AutoPause"`, `autoPauseDelay = 15` (keeps ADR 0031:28 true), `minCapacity = 0.5`, `maxSizeBytes = 34359738368` (32 GB). Provider `Azure/azapi ~> 2.0` in `versions.tf`; update the lock file.

### D2: The gitignored dev.tfvars (.gitignore:25 versus spec.md:26)
| Metric | A: gitignore exception | B: GitHub variables |
| --- | --- | --- |
| Consistency | + matches spec.md:26 and :46 as written | - contradicts the spec; values live outside the repo |
| Modifiability | + an environment is a pair of files | - each new value needs workflow and setup-doc edits |
| Testability | + reviewable in pull requests, readable by a local plan | - a local plan needs every value by hand |
| Simplicity | + one gitignore line | - more plumbing |
| Reversibility | + one line | + easy |
| Security and correctness | 0 ids only, never secrets; the Entra ids are already public | + nothing in the repo |

- **Chosen:** A, because of consistency - giving up a blanket "no tfvars in git" rule. A comment in `dev.tfvars` forbids secrets.
- **Rejected:** B.
- `.gitignore` gets `!infrastructure/terraform/environments/*.tfvars` after line 26, and `infrastructure/terraform/**/*.plan` so saved plans (such as the stray `bootstrap/bootstrap.plan`) are never committed.

### D3: Where the subscription id comes from
| Metric | A: ARM_SUBSCRIPTION_ID | B: committed in tfvars | C: TF_VAR |
| --- | --- | --- | --- |
| Consistency | 0 bootstrap uses a variable (bootstrap/versions.tf:17) but is local-only; A is the standard azurerm OIDC setup (`ARM_CLIENT_ID`, `ARM_TENANT_ID`, `ARM_USE_OIDC`) | + same as bootstrap | + same as bootstrap |
| Modifiability | + the backend uses the same environment variable | 0 | 0 |
| Testability | + mock tests need nothing | + | + |
| Simplicity | + no variable | + | 0 variable plus environment variable |
| Reversibility | + | - a published id cannot be unpublished | + |
| Security and correctness | + keeps the subscription id out of a public repo (spec.md:56 holds it as `AZURE_SUBSCRIPTION_ID`) | - publishes it | + |

- **Chosen:** A, because of simplicity and OIDC alignment - giving up mirroring bootstrap.
- **Rejected:** B (publishes the id); C (redundant variable).
- `dev.backend.hcl`: `resource_group_name = "rg-cocassistant-tfstate"`, `storage_account_name = "stcocassistanttfstate"`, `container_name = "tfstate"`, `key = "dev.tfstate"`, `use_azuread_auth = true`. No `use_oidc`: workflows set `ARM_USE_OIDC`; a local run uses the Azure CLI. `versions.tf` declares an empty `backend "azurerm" {}`. Check each attribute name against the Terraform azurerm backend docs.

### D4: Resource names
| Metric | A: derived from var.environment | B: literal names |
| --- | --- | --- |
| Consistency | + spec.md:26: another environment is a new pair of files | 0 matches bootstrap, which is single-use |
| Modifiability | + no code change for a new environment | - every name changes |
| Testability | + the test asserts the exact `-dev` names | + |
| Simplicity | 0 one locals map | + |
| Reversibility | + | + |
| Security and correctness | + validation `^[a-z0-9]{1,10}$` keeps the storage name within 24 characters | + |

- **Chosen:** A, because it is what spec.md:26 says - giving up a little readability.
- **Rejected:** B.
- `var.environment` has no default; `dev.tfvars` sets `environment = "dev"`. Tags in locals: `project = "coc-assistant"`, `environment = var.environment`, `managed-by = "terraform"`.

### D5: Owner access to state for a local plan
| Metric | A: role in bootstrap | B: manual az command |
| --- | --- | --- |
| Consistency | + every other state role is in bootstrap/identities.tf; DEP-001 design :69 anticipated it | - an Azure role outside Terraform |
| Modifiability | + reviewable, in state | - invisible drift |
| Testability | + covered by a bootstrap mock-test run | - none |
| Simplicity | 0 one resource, needs a bootstrap re-apply | + one command |
| Reversibility | + | + |
| Security and correctness | + container scope, same as the identities | 0 same scope if typed correctly |

- **Chosen:** A, because of consistency and testability - giving up a bootstrap re-apply.
- **Rejected:** B; also Storage Blob Data Owner and account-wide scope.
- Resource `azurerm_role_assignment.owner_state_container`: Storage Blob Data Contributor on `azurerm_storage_container.tfstate.id` for `data.azurerm_client_config.current.object_id` (not azuread; see D9).

### D6: Placeholder image until the first deploy
| Metric | A: mcr.microsoft.com/dotnet/samples:aspnetapp | B: mcr.microsoft.com/k8se/quickstart:latest |
| --- | --- | --- |
| Consistency | + listens on 8080, matching ingress and Dockerfile:34 | 0 the Container Apps portal default |
| Modifiability | + `api_placeholder_image` variable with a default | + |
| Testability | + checkable locally with docker run and curl | + |
| Simplicity | + | + |
| Reversibility | + only used at creation (`ignore_changes`) | + |
| Security and correctness | 0 `/health` may return 404 until rollout, so probes fail briefly | - listens on 80; ingress and probes on 8080 both fail |

- **Chosen:** A, because the port is right - giving up a guaranteed-healthy first revision.
- **Rejected:** B (wrong port); the real GHCR image at creation (does not exist before DEP-005's first push, and is private until the spec.md:57 step).
- Accepted risk (owner, Q3): if the first real apply fails with "Failed to provision revision", escalate; the fallback is a temporary TCP liveness probe on 8080 until the first rollout. The Developer records what the image actually returns for `/health` under Revisions.

### D7: SignalR Free in Default mode
- Single option: confirm from an official Microsoft page (learn.microsoft.com or azure.microsoft.com, fetched with curl); record a quote, URL, and date in `costs.md`; remove the Open check at costs.md:49. If no official page confirms it, stop and escalate. Do not apply SignalR, and do not substitute Serverless mode (ADR 0009).

### D8: The SQL server's Entra admin and creating the API database user, without a group
- **A: deploy identity as admin.** `azuread_administrator { login_username = var.sql_entra_admin_login, object_id = var.sql_entra_admin_object_id, azuread_authentication_only = true }`, with `dev.tfvars` setting the login to `id-cocassistant-github-deploy` and the object id to the deploy identity's principal id.
  - Who administers: only the deploy workflow (GitHub Environment `dev`, `master` only). The owner has no standing database access. Break-glass: the owner, as subscription Owner, temporarily sets themselves as admin through ARM; the next apply resets it.
  - API user creation (DEP-005): the migrate job runs as the admin and creates `id-cocassistant-api-dev` without Graph, using `CREATE USER [id-cocassistant-api-dev] FROM EXTERNAL PROVIDER WITH OBJECT_ID = '<id>'`. If that still needs Graph, the fallback is `CREATE USER [id-cocassistant-api-dev] WITH SID = <client id as binary(16)>, TYPE = E`. Then grant `db_datareader` and `db_datawriter`. DEP-005 checks which id each form needs; the stack outputs `api_identity_client_id` and `api_identity_principal_id`.
- **B: owner user as admin.** The owner is the only admin; before the first deploy the owner runs T-SQL by hand (through a self-added firewall rule) to create the deploy identity's user as `db_owner` and the API identity's user with read and write. DEP-005 no longer creates users (spec.md:40 changes). The manual steps repeat whenever the database is recreated.
- **C (not viable):** a SQL server system identity with Directory Readers (the owner cannot assign the role or consent); two Entra admins (Azure SQL allows one); the API identity as admin (breaks spec.md:66).

| Metric | A: deploy identity admin | B: owner admin + manual T-SQL |
| --- | --- | --- |
| Consistency | + keeps spec.md:40 and :65; the deploy identity was an admin through the group before | - manual T-SQL; changes spec.md:40 |
| Modifiability | + a new identity or recreated database is handled by the workflow | - each needs the owner again |
| Testability | + mock test asserts the admin block; DEP-005 checks user creation | - only by hand |
| Simplicity | + no manual SQL, one input | 0 no code, but manual procedure and firewall steps |
| Reversibility | + one attribute; can switch to B later | + same |
| Security and correctness | 0 no privilege gain over the group design; the owner loses standing access (break-glass exists); no-Graph user creation not yet verified | 0 human admin and database-scoped deploy user; but the owner's object id goes into a public repo, and a forgotten manual step blocks the deploy |

- **Chosen:** A, because of consistency with the automated deploy and modifiability - giving up the owner's standing database access, and accepting that no-Graph user creation is still unverified.
- **Rejected:** B (manual T-SQL per database). Its manual step stays only as the fallback for creating the API user if neither no-Graph form works. C as above. The Developer must not reintroduce a security group or the azuread provider.
- Variables: `sql_admin_group_object_id` (from the earlier draft) is replaced by `sql_entra_admin_object_id` (UUID validation; the all-zero UUID is rejected) and `sql_entra_admin_login`.
- The admin object id must never come from `azurerm_client_config` (it follows whoever runs the plan, so the owner's local plan would show the admin changing) or from a data source in `rg-cocassistant-tfstate` (neither identity can read it).

### D9: Removing the group from bootstrap, and moving the partial state on
- Single sane option: delete the group and the azuread provider from bootstrap code. The owner then runs `terraform state rm 'data.azuread_client_config.current'` so the state no longer needs azuread, then `terraform init` (the lock file loses azuread), `terraform plan`, and `terraform apply`. The expected plan is exactly one addition: `azurerm_role_assignment.owner_state_container`. Any other change means stop. The group was never created, so nothing is orphaned.
- **Rejected:** keeping azuread only for `owner_object_id` (`azurerm_client_config.object_id` gives the same value without a second provider); `terraform import` or a `removed` block for the group (it is not in state).

### Single-option decisions
- Cooldown: native `template.cooldown_period_in_seconds = 3600`, because azurerm 4.81.0 supports it; spec.md:27 gets a clarifying line that azapi is still only for the database.
- Storage auth: `shared_access_key_enabled = true` on the Handout account, because the API only accepts a connection string (HandoutFileStoreRegistration.cs:71-74). Also `allow_nested_items_to_be_public = false`, TLS 1.2, HTTPS only. Identity-based storage is rejected: it needs an app change outside this PBI.
- Storage container: `handout-files`, private, created through `storage_account_id` (AzureBlobHandoutFileStore.cs:10; spec "one private container").
- Provider features: `storage { data_plane_available = false }`, as in bootstrap/versions.tf:19-23.
- API identity roles: none (SQL via a database user in DEP-005; SignalR and storage via connection strings; GHCR public).
- SQL server: version `12.0`, minimum TLS `1.2`, public network access on (needed for the Azure-services and runner rules), the D8 `azuread_administrator` (tenant from the provider), no server identity, firewall rule `AllowAzureServices` 0.0.0.0 to 0.0.0.0.
- Container App: revision mode `Single`; user-assigned identity `id-cocassistant-api-dev`; no registry block; ingress external, target port 8080, `allow_insecure_connections = false`; 0.25 vCPU / `0.5Gi`; min 0, max 1, default HTTP scaler; liveness and readiness HTTP `/health` on 8080; `lifecycle { ignore_changes = [template[0].container[0].image] }`.
  - Plain environment variables: `ASPNETCORE_ENVIRONMENT=Staging`; the three `ConnectionStrings__*`, each `Server=tcp:<fqdn>,1433;Database=<db>;Authentication=Active Directory Managed Identity;User Id=<api client id>;Encrypt=True;` (one local, used three times); `EntraId__Instance`, `EntraId__TenantId`, `EntraId__ClientId` from variables; `Cors__AllowedOrigins__0 = "https://${default_host_name}"` of the Static Web App.
  - Secrets `signalr-connection-string` and `storage-connection-string` from the resources' `primary_connection_string`, exposed as `Azure__SignalR__ConnectionString` and `Azure__Storage__ConnectionString` through `secret_name`.
- Log Analytics: `PerGB2018`, `daily_quota_gb = 0.15`, `retention_in_days = 30`. Container Apps environment: Consumption, `log_analytics_workspace_id` set.
- SignalR: `Free_F1`, capacity 1, `service_mode = "Default"`, CORS left at the provider default (client tokens are validated anyway).
- Static Web App: `sku_tier` and `sku_size` `Free`, no repository settings.
- Resource group: `data "azurerm_resource_group"` named `rg-cocassistant-${var.environment}`; every resource uses its location.
- Variables: `location` (existing), `environment`, `sql_entra_admin_object_id`, `sql_entra_admin_login`, `entra_instance`, `entra_tenant_id`, `entra_api_client_id` (values from appsettings.Development.json:17-19), `api_placeholder_image` (default per D6).
- Environment stack outputs: `api_url` (`https://` + `ingress[0].fqdn`, not `latest_revision_fqdn`), `static_web_app_url`, `static_web_app_name`, `container_app_name`, `sql_server_fqdn`, `sql_database_name`, `api_identity_name`, `api_identity_client_id`, plus `resource_group_name` and `api_identity_principal_id` (for DEP-005); keep the existing `location`.
- Bootstrap outputs: remove `sql_admin_group_object_id` and `sql_admin_group_display_name`; add `deploy_principal_id`; `owner_object_id` now from `azurerm_client_config`.
- File layout: one file per area, as bootstrap does: `main.tf` (locals, data), `logs.tf`, `container-app.tf`, `identity.tf`, `sql.tf`, `storage.tf`, `signalr.tf`, `static-web-app.tf`.

## Patterns
- **Used:** none. Declarative HCL has no conditional or variant a GoF pattern would resolve.
- **Rejected:** a reusable per-environment module (Facade/Composite shape) - one environment only, and spec.md:26 makes an environment a pair of files. `for_each` or `dynamic` blocks for environment variables or connection strings - the explicit list stays reviewable; one local holds the shared connection string. Do not add either.

## Invariants
- Max replicas 1 (ADR 0010); min replicas 0; cooldown 3600.
- No secret in committed files or plain environment variables; only the two connection strings are secrets, held as Container Apps secrets. `dev.tfvars` holds ids and names only.
- Every taggable resource has exactly the three tags. The plan creates only the topology resources plus the firewall rule and the storage container.
- The database is free-offer with `AutoPause`, created through azapi only.
- The image stays in `ignore_changes`. `ASPNETCORE_ENVIRONMENT` is never `Development`. Probes use only `/health`.
- No `azuread` provider and no Entra security group in either stack.
- The SQL Entra admin is the deploy identity, entered as an input; never derived from the caller or from `rg-cocassistant-tfstate`.
- The bootstrap re-apply adds only `owner_state_container`.

## Implementation plan
1. `infrastructure/terraform/versions.tf`: azapi `~> 2.0`, empty `backend "azurerm" {}`, features block with the storage data plane off; `terraform init -backend=false` to update `.terraform.lock.hcl`.
2. `variables.tf` and `main.tf`: variables, locals (names, tags, connection string), resource-group data source.
3. Area files: `logs.tf`, `identity.tf`, `sql.tf` (server, D8 admin, firewall, D1 database), `storage.tf`, `signalr.tf`, `static-web-app.tf`, `container-app.tf` (environment and app); then `outputs.tf`.
4. `environments/dev.tfvars` (`environment = "dev"`, `sql_entra_admin_login = "id-cocassistant-github-deploy"`, `sql_entra_admin_object_id = "759da402-f5ba-4fc0-a727-5260f838e49f"`, the Entra values) and `environments/dev.backend.hcl`. `.gitignore` lines from D2; check with `git check-ignore` that `bootstrap/terraform.tfvars` stays ignored and `environments/dev.tfvars` is not.
5. `tests/environment.tftest.hcl` with mock azurerm and azapi and id overrides as in bootstrap. Add environment-stack `terraform test` to ci.yml's terraform job.
6. Bootstrap (D5, D9): delete `sql-admins.tf`; remove azuread from `versions.tf` and `main.tf:23`; update `outputs.tf`; add `owner_state_container` to `identities.tf`; `terraform init` to update the lock file; tests: remove `mock_provider "azuread"`, the azuread override, and both `sql_admin_group_*` runs, give `azurerm_client_config` an `object_id` override, add the owner-role and `deploy_principal_id` runs.
7. Documentation (Refinement Protocol):
   - `specs/deployment/spec.md`: :18 Entra admin is the deploy identity; :20 container `handout-files`; :25 group replaced by the owner state role; :26-29 `ARM_SUBSCRIPTION_ID`, committed tfvars, placeholder image, native cooldown, extra outputs; :27 no azuread; :34 the deploy identity is "Entra admin of `sql-cocassistant-dev`"; :40 the API user is created without Graph (D8).
   - ADR 0031: dated amendment "Amendment (2026-11-10, PBI-DEP-003)" covering D1-D9, with the consequence "no standing owner database access; break-glass through ARM".
   - `docs/infrastructure/costs.md`: remove row :34; record the SignalR Default-mode source (D7); mark HTTPS on the default hostname approved 2026-11-10; update Open checks.
   - `docs/infrastructure/dev-environment-setup.md`: remove the group prerequisite (:12-13), the group sentence (:37), and the group check (:55-56); add the D9 migration steps, the owner-role check, and a local `dev` plan (`az login`, `ARM_SUBSCRIPTION_ID`, `terraform init -backend-config=environments/dev.backend.hcl`, `terraform plan -var-file=environments/dev.tfvars`); tell the owner to delete the stray `bootstrap.plan`.
8. PBIs:
   - DEP-003 :13 "SQL server (Entra-only, deploy identity as Entra admin, Azure services firewall rule)" and :18 "(resource group, state backend, deploy identity)".
   - DEP-001 stays `done`; :30 stays deferred. Add a Follow-up: "SQL admin group not creatable (403); replaced by the deploy identity as SQL Entra admin -> PBI-DEP-003". It supersedes the :40 Follow-up.
   - DEP-003 Follow-ups on completion: the Reader refresh risk for DEP-004 (list-keys or list-secrets on SignalR, storage, Container App secrets, Static Web App key, Log Analytics shared keys); DEP-005 verifies the no-Graph user creation, with B's manual step as the fallback.
   - No new PBI.

## Reuse
- Using: the bootstrap mock-test structure and id overrides, the bootstrap features block, the tag map, the CI terraform job, `azurerm_client_config` (bootstrap/main.tf:19).
- Not using: azuread (D8, D9), Key Vault (ADR 0031:25), modules (see Patterns).

## TDD units
`terraform test` with mock providers.
- Every resource is named exactly as in spec.md:14-22 for `environment = "dev"`.
- Every taggable resource, including the azapi database, has exactly the three tags.
- Container App: CPU 0.25, memory `0.5Gi`, min 0, max 1, cooldown 3600; ingress external on 8080; both probes `/health` on 8080; user-assigned identity attached.
- Container App configuration: `ASPNETCORE_ENVIRONMENT` is `Staging`; the two secret-backed variables use `secret_name`, not `value`; `Cors__AllowedOrigins__0` is the Static Web App `https://` URL; all three connection strings contain `Active Directory Managed Identity` and the API client id, and no `Password`.
- SQL server: `azuread_administrator.object_id == var.sql_entra_admin_object_id`, `login_username == var.sql_entra_admin_login`, `azuread_authentication_only == true`; Azure-services rule 0.0.0.0/0.0.0.0.
- Database body: free limit, AutoPause, serverless GP SKU, auto-pause delay 15, 32 GB maximum.
- SignalR `Free_F1` in Default mode; Static Web App Free; Log Analytics 0.15 GB and 30 days.
- Storage: no public nested items; private container `handout-files`.
- Validation rejects a non-UUID or all-zero `sql_entra_admin_object_id` and an invalid `environment` (`expect_failures`).
- Outputs: `api_url` and `static_web_app_url` start with `https://`; every output in spec.md:29 exists.
- Bootstrap: the owner role is Storage Blob Data Contributor on the `tfstate` container for `azurerm_client_config.object_id`; `deploy_principal_id` equals the deploy identity's `principal_id`; existing role, credential, storage, budget, and tag runs still pass.

## E2E coverage
- Exception: infrastructure only, no user-visible change; nothing is deployed until DEP-005. The spec scenarios ("A green master build is deployed", "A cold start succeeds", "Health probes do not wake the database") are covered by DEP-005 and DEP-006.
- The owner runs the real plan and apply checks (PBI Verification :29-31) and the D9 bootstrap re-apply. The Developer must not claim them.

## ADR
- None new. ADR 0031 gets an amendment recording D1-D9; azapi was already chosen in spec.md:27.

## Human decisions
- 2026-11-10, Q1: HTTPS on the default `*.azurecontainerapps.io` hostname is approved as $0.
- 2026-11-10, Q3: the first-apply probe risk and the D6 fallback are accepted.
- 2026-11-10, Q4: the owner state role in bootstrap is approved, including the bootstrap re-apply.
- 2026-11-10, owner constraint: no Entra security group can be created (403 Authorization_RequestDenied); the owner cannot get Groups or Global Administrator or move tenants. This produced D8 and D9.
- 2026-11-10, Q5: "(a) use the deploy identity as SQL admin" - D8 option A, plus the DEP-003 scope line 13 wording change.
- 2026-11-10, Q6 and approval: "approve, id: 759da402-f5ba-4fc0-a727-5260f838e49f" - the record is approved as written (D1-D9 and invariants unchanged); the deploy identity's principal id `759da402-f5ba-4fc0-a727-5260f838e49f` goes into `dev.tfvars` as `sql_entra_admin_object_id`.

## Revisions

- 2026-11-10 (Developer, PBI-DEP-003): checked the D6 placeholder image
  `mcr.microsoft.com/dotnet/samples:aspnetapp` locally with `docker run`:
  port 8080 serves `/` with 200 and `/health` with 404. The first revision
  is therefore created (provisioning does not depend on probe success) but
  stays unhealthy until DEP-005 rolls out the real image, which is the Q3
  accepted risk. No fallback probe change was needed.

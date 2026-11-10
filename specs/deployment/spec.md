# Feature: Deployment

## Blueprint

### Context
The application has no hosted environment: `infrastructure/terraform/main.tf` defines no resources, and `.github/workflows/ci.yml` only verifies changes. Deployment provisions a `dev` environment on Azure with Terraform and deploys every successful `master` build to it from GitHub Actions, so the Keeper and a few test Players can use the app outside a local machine.

The environment is built for near-zero cost. It runs in a Visual Studio subscription with a monthly EUR 40 credit and the default spending limit, and uses always-free tiers wherever they exist. Every resource that costs money, or could, is listed with its official price source in `docs/infrastructure/costs.md`, and a new cost-bearing resource is introduced only after the repository owner approves it there. The Terraform is structured for more environments, but only `dev` is built.

### Architecture
- **Topology** (one resource group `rg-cocassistant-dev` in `westeurope`; every other resource in `swedencentral` from `var.location`, except the Static Web App, which stays in `westeurope`):
  | Resource | Name | SKU / setting |
  |---|---|---|
  | Static Web App (SPA) | `stapp-cocassistant-dev` | Free; stays in `westeurope` (the service accepts only a few regions); default `*.azurestaticapps.net` hostname |
  | Container Apps environment | `cae-cocassistant-dev-swedencentral` | Consumption; logs to `log-cocassistant-dev-swedencentral`. The region is part of the name (PBI-DEP-007): the `westeurope` workspace and environment were deleted by the move, but Azure still blocks the plain names in this resource group, so both names follow `var.location` like the SQL server |
  | Container App (API) | `ca-cocassistant-api-dev` | 0.25 vCPU / 0.5 GiB; min replicas 0, max replicas 1 (ADR 0010); scale-down cooldown 3600 s; external HTTPS ingress on the default `*.azurecontainerapps.io` hostname, target port 8080 |
  | User-assigned identity (API) | `id-cocassistant-api-dev` | Used by the API to sign in to Azure SQL |
  | Azure SQL logical server | `sql-cocassistant-dev-swedencentral` | Entra-only authentication; Entra admin is the deploy identity `id-cocassistant-github-deploy`; firewall allows Azure services. The region is part of the name (PBI-DEP-007): a failed `westeurope` create left a stale record reserving `sql-cocassistant-dev` in this resource group, so the name follows `var.location` and a region move gets a fresh name automatically |
  | Azure SQL database | `sqldb-cocassistant-dev` | Free offer: serverless General Purpose, `useFreeLimit = true`, `freeLimitExhaustionBehavior = AutoPause`; one database shared by the Identity, CampaignPlay, and ScenarioPreparation contexts |
  | Storage account (Handout files) | `stcocassistantdev` | StorageV2, Standard LRS, Hot; one private container `handout-files`; no public blob access |
  | Azure SignalR Service | `sigr-cocassistant-dev` | Free, Default service mode (ADR 0009) |
  | Log Analytics workspace | `log-cocassistant-dev-swedencentral` | Pay-as-you-go, daily cap 0.15 GB, retention 30 days |
  - Every resource carries the tags `project=coc-assistant`, `environment=dev`, `managed-by=terraform`.
- **Terraform layout:**
  - `infrastructure/terraform/bootstrap/`: run once, locally, by the repository owner. Creates `rg-cocassistant-tfstate` with the state storage account `stcocassistanttfstate` (versioning and soft delete on, shared-key access off so access is Entra-only) and container `tfstate`, `rg-cocassistant-dev`, the plan and deploy identities (in `rg-cocassistant-tfstate`) with their federated credentials and role assignments, the owner's Storage Blob Data Contributor role on the `tfstate` container for local plans, and a subscription budget of EUR 5 per month with email alerts at 20% actual, 80% forecast, and 100% forecast. Its own state stays local and is not committed.
  - `infrastructure/terraform/` (the environment stack): the resources in the topology table except the resource group, which it reads as a data source. Environment values live in the committed `infrastructure/terraform/environments/dev.tfvars` (ids and names only, never secrets) and backend settings in `infrastructure/terraform/environments/dev.backend.hcl`; the subscription id comes from `ARM_SUBSCRIPTION_ID`, never from a committed file. Another environment is a new pair of files plus its own bootstrap entries.
  - Providers: `azurerm ~> 4.0`; `azapi ~> 2.0` only for the SQL database free-offer properties, which `azurerm` does not expose. There is no `azuread` provider anywhere: the environment stack takes the SQL Entra admin as an input, and bootstrap reads the owner from the `azurerm` provider. Versions are pinned in `versions.tf` per `infrastructure/CLAUDE.md`.
  - The Container App is created with the placeholder image `mcr.microsoft.com/dotnet/samples:aspnetapp`, which listens on 8080; its image is in `lifecycle.ignore_changes`, so Terraform creates the app and the deploy workflow rolls out images. Scale-down cooldown uses the native `cooldown_period_in_seconds = 3600`.
  - Outputs include the API URL, the Static Web App URL and name, the Container App name, the SQL server name and FQDN and database name, the API identity's name, client id, and principal id, and the resource group name.
- **GitHub to Azure authentication:** OpenID Connect federated credentials, no client secrets.
  | Identity | Federated subject | Azure roles |
  |---|---|---|
  | `id-cocassistant-github-plan` | `repo:kamilpitula@9087774/coc-assistant@1380052287:pull_request` | Reader and the custom role `CoC Assistant dev plan secret reader` (list-keys and list-secrets actions only, no write) on `rg-cocassistant-dev`; Storage Blob Data Contributor on the state container |
  | `id-cocassistant-github-deploy` | `repo:kamilpitula@9087774/coc-assistant@1380052287:environment:dev` | Contributor on `rg-cocassistant-dev`; Storage Blob Data Contributor on the state container; Entra admin of `sql-cocassistant-dev-swedencentral` |
- **Workflows** (separate from `.github/workflows/ci.yml`):
  - `.github/workflows/terraform-plan.yml`: on `pull_request` to `master` touching `infrastructure/**`, from branches of this repository only. Runs `terraform plan` for `dev` as the plan identity and writes the plan to the job summary.
  - `.github/workflows/deploy-dev.yml`: on `workflow_run` of `CI` completing successfully on `master`, plus `workflow_dispatch`. Uses the GitHub Environment `dev` and the deploy identity. Jobs run in dependency order:
    1. `terraform apply` for `dev`; exposes the Terraform outputs to later jobs.
    2. Build the API image from `backend/Dockerfile` (multi-stage, repository root as build context because game-rule catalogs are embedded from `docs/game-rules/`) and push `ghcr.io/kamilpitula/coc-assistant-api:<commit sha>`; runs in parallel with the apply.
    3. Migrate the database: build one EF Core migration bundle per DbContext with the pinned `dotnet-ef` tool (`.config/dotnet-tools.json`) before opening the firewall, sweep stale `gh-deploy-*` runner rules, add a SQL firewall rule for the runner's public IP, ensure the API identity's database user exists with `db_datareader` and `db_datawriter` (created without Graph by the migrate job, which runs as the SQL Entra admin, with `CREATE USER ... WITH SID = <client id as binary>, TYPE = E` through go-sqlcmd), run the bundles in the order Identity, CampaignPlay, ScenarioPreparation with `Authentication=Active Directory Default`, and remove the firewall rule in a step that runs on success and on failure once Azure login succeeded (no rule can exist before login) and fails the run when any `gh-deploy-*` rule remains.
    4. Roll out the image with `az containerapp update --image`, after an anonymous-pull preflight proves the image is publicly pullable, then verify the template image and the latest revision state.
    5. Build the SPA with the `VITE_*` values below and deploy it to the Static Web App, reading its deployment token with the deploy identity at run time.
    6. Runs serialize on a `deploy-dev` concurrency group that never cancels in progress. Every checkout and the image tag use the tested commit (`workflow_run.head_sha`, falling back to `github.sha` for manual dispatch). Nothing runs unless a master push passed CI, or the owner dispatched on `master`; a `simulate_migration_failure` dispatch input fails the migrate job after the rule is added, to verify the cleanup.
- **API configuration in `dev`** (Container App environment variables and secrets):
  - `ASPNETCORE_ENVIRONMENT=Staging`; `backend/src/CocAssistant.Api/appsettings.Staging.json` holds non-secret Staging values. OpenAPI and startup migrations stay limited to `Development` (`backend/src/CocAssistant.Api/Program.cs`).
  - `ConnectionStrings__IdentityDb`, `ConnectionStrings__CampaignPlayDb`, `ConnectionStrings__ScenarioPreparationDb`: the same database, `Authentication=Active Directory Managed Identity` with the API identity's client id. No password.
  - `EntraId__Instance`, `EntraId__TenantId`, `EntraId__ClientId`: the existing Entra External ID tenant (`docs/entra-external-id-setup.md`), from `dev.tfvars`.
  - Secrets: `Azure__SignalR__ConnectionString` (`backend/src/CocAssistant.Api/LiveTransportRegistration.cs`) and `Azure__Storage__ConnectionString` (`backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Infrastructure/HandoutFileStoreRegistration.cs`), held as Container Apps secrets. No Key Vault.
  - `Cors__AllowedOrigins__0`: the Static Web App URL.
- **Application changes:**
  - `GET /health`: anonymous, returns 200 when the process is up, and does not open a database connection, so probes never keep the database awake. Used by the Container App's liveness and readiness probes.
  - CORS policy in the API: allows the origins in `Cors:AllowedOrigins` with credentials, for `/api/**` and the SignalR hub including negotiate. With no origins configured, no cross-origin request is allowed.
  - The API honours `X-Forwarded-Proto` and `X-Forwarded-For` from the Container Apps ingress, which terminates TLS.
  - All three DbContexts use `EnableRetryOnFailure` with a retry window of at least 60 seconds, covering a free-offer database resume. Code that opens its own transaction (`backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Infrastructure/EfSceneRepository.cs`) runs it inside the context's execution strategy as a single attempt, never replayed (ADR 0025).
  - Frontend: `VITE_API_BASE_URL` prefixes every `/api` request and the SignalR hub URL. When it is unset or empty, URLs stay relative, so local development and the E2E harness keep using the Vite proxy unchanged.
  - `frontend/public/staticwebapp.config.json`: navigation fallback to `index.html` for client-side routes.
- **GitHub variables in `dev`:** repository variables `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_PLAN_CLIENT_ID` (the plan workflow uses no environment); Environment `dev` variables `AZURE_DEPLOY_CLIENT_ID` plus `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`, `VITE_API_SCOPE`; `VITE_ENTRA_REDIRECT_URI` and `VITE_API_BASE_URL` come from the Terraform outputs in the same run.
- **Manual one-time steps** (documented in `docs/infrastructure/dev-environment-setup.md`): run the bootstrap stack; create the GitHub Environment `dev` and its variables with deployment branches limited to `master` and no required reviewers; add the Static Web App URL as a single-page application redirect URI on the SPA registration in Entra External ID; make the GHCR package `coc-assistant-api` public after its first push (the first deploy stops at the anonymous-pull preflight in the rollout job until the package is public; then Re-run failed jobs).
- **Dependencies:**
  - Depends on: an Azure subscription; the Entra External ID tenant and its app registrations (`docs/entra-external-id-setup.md`); GitHub Actions and GHCR; the `CI` workflow (`specs/continuous-integration/spec.md`), whose success on `master` triggers deployment.
  - Depended on by: nothing in the repository yet.
- **Decision records:** `docs/adr/0031-dev-environment-on-container-apps-static-web-apps-and-free-sql.md`; ADR 0009 (live transport), ADR 0010 (single replica). Costs: `docs/infrastructure/costs.md`.

### Constraints
- The API runs at most one replica, as ADR 0010 requires.
- Only the deploy identity, through the GitHub Environment `dev`, can change Azure resources from GitHub Actions. Pull request workflows can only read. Pull request workflows may read resource keys and secrets through list actions, values the state already holds, but cannot change any resource.
- The API signs in to Azure SQL with its managed identity, and its database user has only `db_datareader` and `db_datawriter`. Schema changes run only from the deploy workflow.
- The SQL server accepts connections from Azure services and, only while a migrate job runs, from that job's runner IP.
- The free-offer database pauses when its monthly allowance is spent instead of billing.
- Every resource with a price above zero, or a usage-based price, has an entry in `docs/infrastructure/costs.md` approved by the repository owner before it is applied.
- The API image contains no secrets or environment-specific configuration; every such value is injected by the Container App.
- Third-party actions are referenced by full commit SHA, and workflows declare least-privilege token permissions, as in `ci.yml`.

## Contract

### Definition of Done
- [ ] `terraform fmt -check -recursive` and `terraform validate` pass for both `infrastructure/terraform/` and `infrastructure/terraform/bootstrap/`, and the CI `terraform` job validates both.
- [ ] A pull request touching `infrastructure/**` shows a `dev` plan in its job summary, and the plan identity has no write role on `rg-cocassistant-dev`.
- [ ] A push to `master` that passes CI runs `deploy-dev.yml` to completion without manual steps, and the deployed Container App revision runs the image tagged with that commit's SHA.
- [ ] After a deploy, the SPA at the Static Web App URL signs a user in through Entra External ID and loads the campaign list from the API.
- [ ] `GET <api url>/health` returns 200.
- [ ] Each deploy's migrate job leaves no runner-IP firewall rule on the SQL server, including when the migration fails.
- [ ] The Container App's configuration shows min replicas 0, max replicas 1, and a 3600-second cooldown.
- [ ] The SQL database reports the free offer with AutoPause on exhaustion.
- [ ] Unit tests cover the health endpoint, the CORS policy (configured origin allowed, other origin refused, no origins configured), the retry configuration of each DbContext, the scene transaction inside the execution strategy, and the frontend API base URL (set and unset).
- [ ] The existing E2E suite passes unchanged with `VITE_API_BASE_URL` unset.
- [ ] Soak check: a play session left with no user input for 10 minutes still receives live updates and shows Presence correctly afterwards.
- [ ] Cold-start check: with the Container App at zero replicas and the database paused, the first sign-in and campaign list load succeed without a user-visible error.
- [ ] `docs/infrastructure/costs.md` lists every resource with its price, official source URL, and the date checked, and the Azure SignalR Free tier's support for Default mode is confirmed there from an official source.
- [ ] ADR 0031, `docs/infrastructure/dev-environment-setup.md`, and the dev redirect URI step in `docs/entra-external-id-setup.md` exist.

### Regression Guardrails
- Max replicas stays at 1 while the Presence tracker is in memory (ADR 0010).
- The deployed app never runs with `ASPNETCORE_ENVIRONMENT=Development`.
- `/health` never touches the database.
- No workflow stores an Azure client secret or a SQL password.
- The migrate job always removes its firewall rule.
- With `VITE_API_BASE_URL` unset, the frontend uses relative URLs exactly as before.
- `ci.yml` keeps running without repository secrets.
- No resource is applied without its `costs.md` entry.

### Scenarios
```gherkin
Scenario: A green master build is deployed to dev
  Given the CI workflow succeeds for a commit on master
  When deploy-dev.yml runs
  Then terraform apply completes for dev
  And the image ghcr.io/kamilpitula/coc-assistant-api tagged with the commit SHA is pushed
  And the database migrations of all three contexts are applied
  And the Container App's active revision runs that image
  And the Static Web App serves the SPA built from that commit

Scenario: A failed CI run is not deployed
  Given the CI workflow fails for a commit on master
  When the workflow_run event fires
  Then deploy-dev.yml does not deploy anything

Scenario: An infrastructure pull request shows a plan
  Given a pull request from a branch of this repository that changes infrastructure/**
  When terraform-plan.yml runs
  Then the job summary contains the terraform plan for dev
  And no Azure resource changes

Scenario: The migrate job closes the firewall after a failed migration
  Given a deploy whose migration bundle fails
  When the migrate job finishes
  Then the SQL server has no firewall rule for the runner's IP
  And the deploy run fails before the image rollout

Scenario: The SPA calls the API across origins
  Given VITE_API_BASE_URL is the API URL and Cors:AllowedOrigins is the Static Web App URL
  When a signed-in Account opens the campaign list
  Then the request to /api on the API URL succeeds
  And the SignalR connection to the campaign hub is established

Scenario: The API refuses an unknown origin
  Given Cors:AllowedOrigins is the Static Web App URL
  When a browser request from another origin calls /api
  Then the response carries no Access-Control-Allow-Origin header for that origin

Scenario: Local development keeps relative URLs
  Given VITE_API_BASE_URL is unset
  When the SPA requests /api/account/me
  Then the request URL is relative to the SPA origin

Scenario: A cold start succeeds
  Given the Container App has zero replicas and the database is paused
  When an Account signs in and opens the campaign list
  Then the campaign list loads
  And no error is shown to the user

Scenario: An idle play session keeps live updates
  Given two Campaign Members connected to the same Campaign
  And no HTTP request is made for 10 minutes
  When the Keeper creates a Public Wall Entry
  Then the Player sees the Wall Entry without reloading
  And both Campaign Members show as Connected in Presence

Scenario: Health probes do not wake the database
  Given the database is paused
  When the Container App probes GET /health
  Then the response is 200
  And the database stays paused
```

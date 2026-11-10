# Host the dev environment on Container Apps, Static Web Apps Free, and the Azure SQL free offer

Status: Accepted

The application needs a hosted `dev` environment ([specs/deployment/spec.md](../../specs/deployment/spec.md)) at close to zero cost, in a Visual Studio subscription with a EUR 40 monthly credit. Every cost-bearing choice is priced in [docs/infrastructure/costs.md](../infrastructure/costs.md).

## Decision
- **SPA on Static Web Apps Free; API on its own Container App.** The SPA calls the API across origins: `VITE_API_BASE_URL` prefixes API and hub URLs, and the API allows the SPA origin through a CORS policy. Static Web Apps Standard ($9/month) would add a linked-backend proxy, but that proxy does not carry WebSockets, so SignalR would cross origins anyway.
- **Container Apps Consumption, min replicas 0, max replicas 1, 3600-second scale-down cooldown, 0.25 vCPU / 0.5 GiB.** Scale-to-zero keeps compute inside the monthly free grant. Max replicas 1 follows [ADR 0010](0010-in-memory-presence-tracker-with-single-api-replica.md).
- **Azure SignalR Service Free in Default mode,** as [ADR 0009](0009-live-updates-through-campaign-hub-with-invalidation-topics.md) names. Client connections terminate at the service, so they do not count as in-flight requests for the Container Apps HTTP scaler. The long cooldown keeps a quiet play session from scaling the API to zero, which would drop the API's server connections and disconnect every client.
- **One Azure SQL free-offer database** (serverless General Purpose, AutoPause when the monthly allowance is spent) shared by the three DbContexts, which already keep separate migration history tables. **Entra-only authentication:** the API signs in with a user-assigned managed identity; no SQL passwords exist.
- **Migrations run from the deploy workflow** as EF Core migration bundles, through a firewall rule for the runner's IP that the job always removes. The deployed app runs as `Staging`, so the `Development`-only startup migration in `Program.cs` never runs in Azure.
- **Images on GHCR as a public package** (free) instead of Azure Container Registry.
- **Secrets as Container Apps secrets,** no Key Vault. Only the SignalR and storage connection strings are secret.
- **Logs in Log Analytics with a 0.15 GB daily cap,** which keeps a month under the 5 GB free allowance.
- **GitHub Actions authenticates with OIDC:** a read-only plan identity for pull requests and a deploy identity bound to the GitHub Environment `dev`. A bootstrap Terraform stack, run once locally, creates them along with the state storage and the budget.

## Considered Options
- App Service Free F1. Rejected: 5 concurrent WebSockets, 60 CPU minutes per day.
- Serving the SPA from the API container. Rejected by the repository owner in favour of Static Web Apps Free.
- In-process SignalR in the Container App. Rejected: the repository owner chose to keep ADR 0009's Azure SignalR Service; its scaling interplay is handled by the cooldown.
- Min replicas 1 (about $5.8/month idle in Sweden Central, re-checked 2026-11-10 for PBI-DEP-007; was about $5.6/month in West Europe). Rejected for now; it is the fallback if the cooldown does not keep idle sessions connected.
- Migrating at startup in every environment. Rejected by the repository owner in favour of pipeline migrations.
- A Container Apps Job for migrations. Rejected: a second image and job for a one-minute firewall opening.
- SQL logins with passwords; Key Vault; HCP Terraform state. Rejected: secrets to manage, or a non-Azure dependency, with no gain at this size.

## Amendment (2026-11-10, PBI-DEP-003)
How the decision is built ([design record](../deployment/issues/03-provision-the-dev-environment-stack.design.md)):
- **Free-offer database through `azapi` (D1):** the whole `sqldb-cocassistant-dev` resource is one `azapi_resource` on the stable API version `2023-08-01` (`useFreeLimit = true`, `freeLimitExhaustionBehavior = AutoPause`), because `azurerm` exposes no free-limit property. Free from creation, so there is no billed window.
- **Committed `dev.tfvars` (D2):** environment values live in the committed `infrastructure/terraform/environments/dev.tfvars` (ids and names only, never secrets); the subscription id stays out of the repo and comes from `ARM_SUBSCRIPTION_ID` (D3).
- **Derived names (D4):** every resource name derives from `var.environment`; tags are `project = "coc-assistant"`, `environment = var.environment`, `managed-by = "terraform"`.
- **Owner state role (D5):** bootstrap grants the owner Storage Blob Data Contributor on the `tfstate` container, so a local `dev` plan can read the backend state.
- **Placeholder image (D6):** the Container App is created with `mcr.microsoft.com/dotnet/samples:aspnetapp` (listens on 8080); the image stays in `ignore_changes` and the deploy workflow rolls out the real image.
- **SignalR Free in Default mode (D7):** confirmed from the official quickstart ([costs.md](../infrastructure/costs.md)), as ADR 0009 names.
- **Deploy identity as SQL Entra admin (D8):** Azure SQL allows one Entra admin and the owner cannot create security groups (403), so `azuread_administrator` on the server names the deploy identity directly (`sql_entra_admin_object_id` input, never derived from the caller). Only the deploy workflow administers the database; the owner has no standing access. Break-glass is a temporary self-admin change through ARM, reset by the next apply. The migrate job creates the API identity's database user without Graph.
- **No group, no `azuread` (D9):** bootstrap drops `azuread_group.sql_admins` and the `azuread` provider; the owner removes the data source from local state and re-applies (the only change is the owner state role). Nothing was ever created, so nothing is orphaned.

## Amendment (2026-11-10, PBI-DEP-007)
Why the decision moved ([design record](../deployment/issues/07-move-the-dev-stack-to-a-region-with-sql.md)): the first real apply failed with SQL `ProvisioningDisabled` in `westeurope` for this subscription, and a second targeted attempt confirmed every environment resource follows the resource group into `westeurope` whatever `location` says. Only a create proves a region works for this subscription.
- **Region from `var.location`, resource group stays (D10):** every environment resource except the Static Web App takes `var.location` (no default, so no stack silently falls back); the Static Web App takes a validated `static_web_app_location`. Bootstrap and both resource groups stay in `westeurope`; role assignments are untouched. Given up: one region for everything (the resource group region is metadata only).
- **Sweden Central primary, Germany West Central fallback (D11):** chosen for SQL availability, giving up a few milliseconds of latency. Static Web Apps accept only a few regions, so the Static Web App stays in `westeurope`.
- **Probe before moving (D12):** apply only `azurerm_mssql_server.dev` with the new `location` to prove the region; on `ProvisioningDisabled` switch to the fallback. The full plan then replaces the already-created regional resources (identity, Log Analytics, storage, SignalR, Container Apps environment), creates the SQL server under its renamed region-specific name (D14), the firewall rule, the free-offer database, and the Container App, and leaves the Static Web App and the resource group unchanged (D13).
- **Log Analytics is permanently deleted on destroy:** a deleted workspace name stays reserved for 14 days, which would block recreating it in the new region, so the provider now sets `permanently_delete_on_destroy`.

## Amendment (2026-11-10, PBI-DEP-007, SQL server rename)
The owner's D12 probe failed with 409: the failed `westeurope` create left a stale record reserving `sql-cocassistant-dev` in `rg-cocassistant-dev` (invisible to `az sql server show` and `az resource list`), so the D13 claim that nothing exists was wrong. The SQL server is renamed to `sql-cocassistant-dev-swedencentral` (D14, [design record](../deployment/issues/07-move-the-dev-stack-to-a-region-with-sql.md)): only its name carries the region token, so a fallback to `germanywestcentral` gets a fresh name automatically; `var.location` is validated `^[a-z0-9]{1,30}$`. The stale record stays; a PBI-DEP-007 Follow-up records that it may surface if the resource group is ever deleted, and that a support request is optional.

## Amendment (2026-11-10, PBI-DEP-007, free-offer database body)
The owner's full apply in `swedencentral` failed on `azapi_resource.database` with `ProvisioningDisabled`: "Only default value for auto pause delay is allowed for Free Limit database with auto pause exhaustion behavior". The SQL server was created, so the region and the rename (D14) worked. The database body now matches Microsoft's free-offer azapi example exactly (D16, [design record](../deployment/issues/07-move-the-dev-stack-to-a-region-with-sql.md)): `sku` GP_S_Gen5/GeneralPurpose/Gen5/2, `createMode = "Default"`, `maxSizeBytes = 34359738368`, `requestedBackupStorageRedundancy = "Local"`, `useFreeLimit = true`, `freeLimitExhaustionBehavior = AutoPause` - never `autoPauseDelay` (the free tier fixes the pause at 15 minutes and rejects any value) or `minCapacity`. The failed create left nothing behind, so the owner re-applies normally; after apply, `az sql db show` confirms `useFreeLimit`, `AutoPause`, the platform's pause value, and `Local` backups.

## Amendment (2026-11-10, PBI-DEP-007, blocked Log Analytics and environment names)
The same apply failed on Log Analytics with 409 `InvalidResourceLocation`: the `westeurope` workspace was deleted, yet Azure still blocks `log-cocassistant-dev` in `rg-cocassistant-dev` (as with the SQL server, D14). Both the workspace and the Container Apps environment (deleted in `westeurope`, not yet recreated) now carry the region token (D18): `log-cocassistant-dev-swedencentral` and `cae-cocassistant-dev-swedencentral`, the same scheme as the SQL server. Every other name is unchanged: the identity, storage, and SignalR were already recreated in `swedencentral` under their old names. Rule: any other moved resource that returns 409 `InvalidResourceLocation` gets the same region token without another design round, as long as its name rules allow the length; the storage account (24-character limit) is excepted and escalates. Expected plan is now exactly four creates: the Log Analytics workspace, the Container Apps environment, the database, and the Container App - nothing else changes.

## Consequences
- The first request after an idle period waits for a cold start and, after 15 idle minutes, for the database to resume. The 15-minute pause is fixed by the free tier and is not configurable ([free offer](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql), checked 2026-11-10). The DbContexts retry on transient failures for at least 60 seconds, and `/health` does not touch the database so probes do not keep it awake.
- If the free database allowance runs out, the database is offline until the next calendar month. This cannot be switched to billing and back.
- The owner has no standing database access; database work goes through the deploy workflow, with ARM break-glass resetting on the next apply.
- **Revisit when** idle sessions lose live updates despite the cooldown (move to min replicas 1), when more than 20 concurrent connections are needed (SignalR Standard, about $49/month), or when a production environment is planned.

## Amendment (2026-11-09, PBI-DEP-002)
How the application side of this decision is built ([design record](../deployment/issues/02-prepare-the-api-and-spa-for-hosting.design.md)):
- **API URL:** the SPA sends every API request through a shared `apiFetch`, and builds the hub URL with `apiUrl`. Both prefix `VITE_API_BASE_URL` and stay relative when it is unset. An ESLint rule forbids calling the global `fetch` anywhere else.
- **CORS:** one named policy with the origins in the `Cors:AllowedOrigins` array (`Cors__AllowedOrigins__0` in the Container App), with credentials. It is attached to the controllers and the Campaign hub only. With no origins configured, no cross-origin request is allowed.
- **Forwarded headers:** `X-Forwarded-For` and `X-Forwarded-Proto` are trusted from any proxy, because the Container Apps ingress is the only path to the API. No code may base an authorization decision on the client IP or the scheme.
- **Retry:** the API host gives all three DbContexts `EnableRetryOnFailure` with 8 retries and a 15-second maximum delay, at least about 71 seconds of waiting in total.
- **The finish-then-start transaction** ([ADR 0025](0025-one-active-scene-per-campaign-through-a-filtered-index-and-a-scene-version.md)) runs inside the execution strategy as a single attempt and is never replayed. A replay would repeat an in-memory start after the finish was already accepted. A transient failure inside it fails the request, and the Keeper starts the Scene again.

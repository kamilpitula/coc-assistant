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
- Min replicas 1 (about $5.6/month in West Europe). Rejected for now; it is the fallback if the cooldown does not keep idle sessions connected.
- Migrating at startup in every environment. Rejected by the repository owner in favour of pipeline migrations.
- A Container Apps Job for migrations. Rejected: a second image and job for a one-minute firewall opening.
- SQL logins with passwords; Key Vault; HCP Terraform state. Rejected: secrets to manage, or a non-Azure dependency, with no gain at this size.

## Consequences
- The first request after an idle period waits for a cold start and, after 15 idle minutes, for the database to resume. The DbContexts retry on transient failures for at least 60 seconds, and `/health` does not touch the database so probes do not keep it awake.
- If the free database allowance runs out, the database is offline until the next calendar month. This cannot be switched to billing and back.
- **Revisit when** idle sessions lose live updates despite the cooldown (move to min replicas 1), when more than 20 concurrent connections are needed (SignalR Standard, about $49/month), or when a production environment is planned.

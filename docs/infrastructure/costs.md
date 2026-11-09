# Infrastructure Costs

Every Azure resource the Terraform in `infrastructure/terraform/` creates, with its price and official source. A resource with a price above zero, or a usage-based price, is added here and approved by the repository owner before it is applied ([specs/deployment/spec.md](../../specs/deployment/spec.md), Constraints).

- **Subscription:** Visual Studio subscription with a EUR 40 monthly credit and the default spending limit (services are disabled, not billed, when the credit runs out).
- **Budget:** EUR 5 per month on the subscription, alerts at 20% actual, 80% forecast, and 100% forecast. Budgets only alert; they do not stop spending.
- **Prices:** USD list prices for `westeurope`, checked 2026-11-09. Unit prices come from the official Azure Retail Prices API (`https://prices.azure.com/api/retail/prices`, filtered by `serviceName` and `armRegionName`), because the pricing pages render their numbers with JavaScript; free allowances come from the linked Microsoft pages. EUR is shown where the API publishes it.
- **Expected total for `dev`:** about $0.06 per month, all of it from storage.

## Resources

| Resource | Tier | Free allowance | Price beyond it | Expected monthly cost | Approved | Source |
|---|---|---|---|---|---|---|
| Container App `ca-cocassistant-api-dev` (Consumption) | 0.25 vCPU / 0.5 GiB, min 0, max 1 replica | 180,000 vCPU-s, 360,000 GiB-s, 2M requests per subscription per month; no charge at zero replicas | Active vCPU $0.000034/s, idle vCPU $0.000004/s, memory $0.000004/GiB-s, requests $0.56 per 1M | $0 (the grant covers about 200 replica-hours) | Free tier | https://learn.microsoft.com/en-us/azure/container-apps/billing |
| Container Apps environment `cae-cocassistant-dev` | Consumption only | No charge without Dedicated profiles, private endpoints, or planned maintenance | Environment management $0.10/hour for those features (not used) | $0 | Free tier | https://learn.microsoft.com/en-us/azure/container-apps/billing |
| Static Web App `stapp-cocassistant-dev` | Free | 100 GB bandwidth per month; no overage possible | n/a | $0 | Free tier | https://learn.microsoft.com/en-us/azure/static-web-apps/plans |
| Azure SQL database `sqldb-cocassistant-dev` | Free offer, serverless GP, AutoPause on exhaustion | 100,000 vCore-s, 32 GB data, 32 GB backup per database per month; up to 10 per subscription | None: the database pauses until the next month | $0 | Free tier | https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer |
| Azure SQL logical server `sql-cocassistant-dev` | n/a | No charge for the server itself | n/a | $0 | Free tier | https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer |
| Azure SignalR Service `sigr-cocassistant-dev` | Free, 1 unit | 20 concurrent connections, 20,000 messages per day, no SLA | No overage; Standard is $1.61 per unit per day (about $49/month) | $0 | Free tier | https://azure.microsoft.com/en-us/pricing/details/signalr-service/ |
| Storage account `stcocassistantdev` (Handout files) | StorageV2, Standard LRS, Hot | None | Data $0.0196/GB-month; writes and lists $0.054 per 10K; reads and other $0.0043 per 10K; deletes free | Under $0.05 | Approved 2026-11-09 | https://azure.microsoft.com/en-us/pricing/details/storage/blobs/ |
| Storage account `stcocassistanttfstate` for Terraform state (`rg-cocassistant-tfstate`, container `tfstate`) | StorageV2, Standard LRS, Hot, versioning and soft delete | None | As above | About $0.01 | Approved 2026-11-09 | https://azure.microsoft.com/en-us/pricing/details/storage/blobs/ |
| Log Analytics workspace `log-cocassistant-dev` | Pay-as-you-go, daily cap 0.15 GB, 30-day retention | First 5 GB per billing account per month; 31 days retention | $2.99/GB ingestion; $0.13/GB-month retention beyond 31 days | $0 (cap keeps a month under 5 GB) | Free tier | https://azure.microsoft.com/en-us/pricing/details/monitor/ |
| User-assigned identities (API, plan, deploy) | n/a | No charge | n/a | $0 | Free tier | https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview |
| Budget and cost alerts | Cost Management | Listed as always free | n/a | $0 | Free tier | https://azure.microsoft.com/en-us/free/ |
| Outbound data transfer | n/a | First 100 GB per month | $0.087/GB from Europe | $0 | Free tier | https://azure.microsoft.com/en-us/pricing/details/bandwidth/ |

## Outside Azure resources

| Service | Tier | Price | Source |
|---|---|---|---|
| Entra External ID (existing tenant) | Free under 50,000 monthly active users. Avoid SMS phone authentication and M2M (client credentials) add-ons, which are charged per transaction. | $0 | https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing |
| GitHub Container Registry, public package | Storage and bandwidth free | $0 | https://docs.github.com/en/billing/concepts/product-billing/github-packages |
| GitHub Actions on a public repository | Standard hosted runners free | $0 | https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| Entra security group `sg-cocassistant-dev-sql-admins` | Entra ID Free, included with the Azure subscription | $0 | https://learn.microsoft.com/en-us/entra/fundamentals/licensing |

## Rejected paid options

| Option | Price | Why rejected |
|---|---|---|
| Container App with min replicas 1 | About $5.6/month (idle, West Europe) | Scale-to-zero with a 3600-second cooldown instead; fallback if idle sessions disconnect (ADR 0031) |
| Static Web Apps Standard | $9 per app per month | The linked backend does not carry WebSockets, so it buys nothing here |
| Azure SignalR Service Standard | $1.61 per unit per day (about $49/month) | Free tier covers 20 connections |
| Azure Container Registry Basic | $0.1666/day (about $5.07/month) | GHCR public packages are free |
| Azure SQL Basic (DTU) | $0.161/day (about $4.90/month) per database | Free offer covers the dev load |
| App Service Basic B1 (Linux) | $0.018/hour (about $13.1/month) | Container Apps is free at this load |

## Open checks

- Whether Azure SignalR Service Free supports Default service mode is not yet confirmed from an official page. PBI-DEP-003 confirms it before the resource is applied.
- That HTTPS on the default `*.azurecontainerapps.io` hostname carries no charge is implied by the absence of any meter, not stated on a page.

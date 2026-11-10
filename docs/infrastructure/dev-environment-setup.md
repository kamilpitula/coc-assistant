# Dev environment setup: bootstrap and GitHub configuration

One-time manual steps to create everything the `dev` environment stack and the
GitHub workflows need before they can run. The Terraform bootstrap stack is run
locally by the repository owner; its state stays local and is not committed.

## 1. Prerequisites

- Terraform `>= 1.9.0` (the CI `terraform` job uses 1.16.3).
- Azure CLI, signed in to the subscription tenant (see step 2).
- The Owner role on the subscription.
- The repository must use the default OIDC subject template. Check it before
  creating the identities:
  `gh api repos/kamilpitula/coc-assistant/actions/oidc/customization/sub`

## 2. Sign in and select the subscription

1. `az login --tenant <subscription tenant id>`
2. `az account set --subscription <subscription id>`

## 3. Create terraform.tfvars

1. Copy `infrastructure/terraform/bootstrap/terraform.tfvars.example` to
   `infrastructure/terraform/bootstrap/terraform.tfvars` (gitignored, never
   committed).
2. Set `subscription_id` and `budget_alert_emails`. `location` defaults to
   `westeurope` and sets only the bootstrap resources and
   `rg-cocassistant-dev`; the environment stack's own region comes from
   `infrastructure/terraform/environments/dev.tfvars`.

## 4. Run the bootstrap stack

From `infrastructure/terraform/bootstrap/`:

1. `terraform init -backend=false -input=false`
2. `terraform plan -out bootstrap.plan` and review it.
3. `terraform apply bootstrap.plan`
4. Delete the saved plan file (`bootstrap.plan`): saved plans are gitignored
   and must never be committed.

Migrating from the pre-DEP-003 stack (which still references the removed
Entra group and `azuread` provider):

1. `terraform state rm 'data.azuread_client_config.current'` so the state no
   longer needs the removed provider.
2. `terraform init`, then `terraform plan` and review it. The expected plan
   is exactly one addition: `azurerm_role_assignment.owner_state_container`.
   Any other change means stop.
3. `terraform apply`.

## 5. Back up the local state outside the repository

Copy `terraform.tfstate` and `terraform.tfstate.backup` to a private location
outside the repository. The state is sensitive because it holds the storage
keys, and it is gitignored so a fresh clone cannot recover it.

## 6. Verify the apply

- `az role assignment list --assignee <plan client id> --all`: only Reader on
  `rg-cocassistant-dev` and Storage Blob Data Contributor on the `tfstate`
  container.
- `az role assignment list --assignee <deploy client id> --all`: only
  Contributor on `rg-cocassistant-dev` and Storage Blob Data Contributor on
  the `tfstate` container.
- `az role assignment list --assignee <owner object id> --all`: Storage Blob
  Data Contributor on the `tfstate` container, for local plans.
- `az consumption budget list --subscription <subscription id>`: the EUR 5
  monthly budget with the 20% actual, 80% forecast, and 100% forecast alerts.

## 7. Set the GitHub repository variables

Repository settings > Secrets and variables > Actions > Variables:

- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_PLAN_CLIENT_ID` (the `plan_client_id` bootstrap output)

The plan workflow uses no environment. Variable values are ids, not secrets.

## 8. Create the GitHub Environment dev

1. Repository settings > Environments > New environment > `dev`.
2. Deployment branches: limit to `master` only, with no required reviewers.
   The branch limit is what keeps pull request workflows read-only.
3. Environment variables:
   - `AZURE_DEPLOY_CLIENT_ID` (the `deploy_client_id` bootstrap output)

## 9. Later manual steps (PBI-DEP-003 and later)

- Placeholder for the remaining one-time steps from
  `specs/deployment/spec.md`: the Static Web App redirect URI, the database
  firewall rule for local plans, and the first GHCR image push.

## 10. Run a local plan for the dev stack

The owner runs this after the bootstrap apply, to review the environment
stack before the deploy workflow applies it.

1. `az login --tenant <subscription tenant id>`
2. Set `ARM_SUBSCRIPTION_ID` to the subscription id.
3. From `infrastructure/terraform/`:
   `terraform init -backend-config=environments/dev.backend.hcl -input=false`
4. Prove the region first (PBI-DEP-007): only a create proves SQL can be
   provisioned in a region for this subscription. Plan first:
   `terraform plan -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev`
   must show exactly one addition, `azurerm_mssql_server.dev` named
   `sql-cocassistant-dev-swedencentral` in `swedencentral`. Anything else
   means stop. Then
   `terraform apply -var-file=environments/dev.tfvars -target=azurerm_mssql_server.dev`
   creates only the free SQL server (no meter). `-target` is for this probe only and must
   not appear in workflows. On `ProvisioningDisabled`, set `location` to the
   fallback `germanywestcentral` in `dev.tfvars` and repeat: the server name
   becomes `sql-cocassistant-dev-germanywestcentral` automatically, so a stale
   Sweden Central record cannot block it. Nothing else has moved yet.
5. `terraform plan -var-file=environments/dev.tfvars` and review it. The
   expected plan replaces only the API identity, the Log Analytics workspace,
   the storage account with its `handout-files` container, SignalR, and the
   Container Apps environment (where they were created); creates the SQL
   server under its region-specific name (unless the probe created it), the firewall rule, the free-offer
   database, and the Container App; and leaves the Static Web App and the
   resource group unchanged. Anything else in the plan, or the Static Web App
   being replaced, means stop. Handling:
   - The SQL server carries the region in its name (PBI-DEP-007, D14): the
     failed `westeurope` create left a stale record reserving
     `sql-cocassistant-dev` in the resource group, so the earlier "nothing
     exists" claim was wrong. The stale record stays and is referenced by
     nothing.
   - Log Analytics is permanently deleted on destroy (provider setting), so
     the same name can be recreated in the new region at once.
   - The storage account name is global: deletion frees it, sometimes only
     after a few minutes. On `StorageAccountAlreadyTaken`, wait and re-run
     apply. Nothing is lost.
   - SignalR frees its global name on delete; the Free tier allows one Free
     unit per subscription and region, and the old-region one is deleted
     first.
   - The Container Apps environment deletion can take about 10 minutes;
     apply waits.
6. `terraform apply -var-file=environments/dev.tfvars` and confirm it
   completes.

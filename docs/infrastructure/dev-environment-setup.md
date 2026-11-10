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
   `westeurope`.

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
4. `terraform plan -var-file=environments/dev.tfvars` and review it. It
   creates exactly the resources in the spec topology table, each with the
   three tags.

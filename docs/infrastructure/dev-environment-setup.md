# Dev environment setup: bootstrap and GitHub configuration

One-time manual steps to create everything the `dev` environment stack and the
GitHub workflows need before they can run. The Terraform bootstrap stack is run
locally by the repository owner; its state stays local and is not committed.

## 1. Prerequisites

- Terraform `>= 1.9.0` (the CI `terraform` job uses 1.16.3).
- Azure CLI, signed in to the subscription tenant (see step 2).
- The Owner role on the subscription.
- The repository uses the immutable OIDC subject template
  (`use_immutable_subject: true`). Check it before creating the identities:
  `gh api repos/kamilpitula/coc-assistant/actions/oidc/customization/sub`
  must show the prefix `repo:kamilpitula@9087774/coc-assistant@1380052287`,
  which the bootstrap subjects are built from.

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

### Re-applying after the immutable-subject change (2026-11-10)

The bootstrap subjects changed from the classic form
(`repo:kamilpitula/coc-assistant:...`) to the immutable form
(`repo:kamilpitula@9087774/coc-assistant@1380052287:...`). The owner must
re-apply the bootstrap locally so both federated credentials are updated:

From `infrastructure/terraform/bootstrap/`:

1. `terraform init -input=false`
2. `terraform plan` and review it. The expected plan updates only the two
   federated credentials
   (`azurerm_federated_identity_credential.plan_pull_request` and
   `azurerm_federated_identity_credential.deploy_environment_dev`).
   Any other change means stop.
3. `terraform apply`.

Then verify both identities show the immutable subjects:

- `az identity federated-credential list -g rg-cocassistant-tfstate --identity-name id-cocassistant-github-plan`
- `az identity federated-credential list -g rg-cocassistant-tfstate --identity-name id-cocassistant-github-deploy`

Finally confirm the `Terraform plan (dev)` check goes green on a pull
request that touches `infrastructure/**`.

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
- After the first deploy run stops at the anonymous-pull preflight in the
  rollout job, make the GHCR package `coc-assistant-api` public (package
  settings; `GITHUB_TOKEN` cannot do this), then Re-run failed jobs from the
  failed run.

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
   expected plan creates exactly four resources: the Log Analytics workspace
   (`log-cocassistant-dev-swedencentral`), the Container Apps environment
   (`cae-cocassistant-dev-swedencentral`), the free-offer database, and the
   Container App. Nothing else changes; anything else in the plan means stop.
   Handling:
   - `InvalidResourceLocation` ("a resource with the same name cannot be
     created in <new region>") means Azure still holds a record of the
     old-region resource with that name in this resource group, even when
     `az resource list` no longer shows it (as with the SQL server, D14, and
     Log Analytics, D18). The D18 rule: any other moved resource that returns
     409 gets the same region token without another design round, as long as
     its name rules allow the length. The storage account is excepted
     (24-character limit): escalate instead.
   - The SQL server and the Log Analytics workspace carry the region in their
     names for this reason (PBI-DEP-007, D14 and D18): the failed `westeurope`
     creates left stale records reserving the plain names in the resource
     group. The stale records stay and are referenced by nothing.
   - The Container Apps environment deletion can take about 10 minutes;
     apply waits.
6. `terraform apply -var-file=environments/dev.tfvars` and confirm it
   completes. Then check the database the apply created:
   `az sql db show -g rg-cocassistant-dev -s sql-cocassistant-dev-swedencentral -n sqldb-cocassistant-dev --query "{free:useFreeLimit, exhaustion:freeLimitExhaustionBehavior, pause:autoPauseDelay, backup:requestedBackupStorageRedundancy}"`.
   Expect `true`, `AutoPause`, the platform's pause value, and `Local`. This
   is the evidence for `spec.md:83` and the PBI-DEP-007 owner check.

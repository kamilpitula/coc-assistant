# Both GitHub identities live in rg-cocassistant-tfstate, never in rg-cocassistant-dev:
# Contributor on the dev RG could otherwise mint federated credentials on the
# deploy identity itself and bypass GitHub Environment "dev".

resource "azurerm_user_assigned_identity" "plan" {
  name                = "id-cocassistant-github-plan"
  resource_group_name = azurerm_resource_group.tfstate.name
  location            = azurerm_resource_group.tfstate.location
  tags                = local.tags
}

resource "azurerm_user_assigned_identity" "deploy" {
  name                = "id-cocassistant-github-deploy"
  resource_group_name = azurerm_resource_group.tfstate.name
  location            = azurerm_resource_group.tfstate.location
  tags                = local.tags
}

resource "azurerm_federated_identity_credential" "plan_pull_request" {
  name                      = "github-pull-request"
  user_assigned_identity_id = azurerm_user_assigned_identity.plan.id
  issuer                    = local.github_oidc_issuer
  audience                  = [local.github_oidc_audience]
  subject                   = local.subjects.pull_request
}

resource "azurerm_federated_identity_credential" "deploy_environment_dev" {
  name                      = "github-environment-dev"
  user_assigned_identity_id = azurerm_user_assigned_identity.deploy.id
  issuer                    = local.github_oidc_issuer
  audience                  = [local.github_oidc_audience]
  subject                   = local.subjects.environment_dev
}

resource "azurerm_role_assignment" "plan_reader_dev" {
  scope                = azurerm_resource_group.dev.id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.plan.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "plan_state_container" {
  scope                = azurerm_storage_container.tfstate.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.plan.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "deploy_contributor_dev" {
  scope                = azurerm_resource_group.dev.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.deploy.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "deploy_state_container" {
  scope                = azurerm_storage_container.tfstate.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.deploy.principal_id
  principal_type       = "ServicePrincipal"
}

# Lets the owner run a local plan for the environment stack, which reads
# its backend state through this container. Same container scope as the
# GitHub identities, granted by the bootstrap re-apply.
resource "azurerm_role_assignment" "owner_state_container" {
  scope                = azurerm_storage_container.tfstate.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

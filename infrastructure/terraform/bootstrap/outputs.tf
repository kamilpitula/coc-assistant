output "tenant_id" {
  description = "Tenant id both providers are signed in to."
  value       = data.azurerm_client_config.current.tenant_id
}

output "subscription_id" {
  description = "Subscription id the bootstrap resources live in."
  value       = data.azurerm_subscription.current.subscription_id
}

output "dev_resource_group_name" {
  description = "Name of the dev environment resource group."
  value       = azurerm_resource_group.dev.name
}

output "state_resource_group_name" {
  description = "Name of the resource group holding the state backend and the GitHub identities."
  value       = azurerm_resource_group.tfstate.name
}

output "state_storage_account_name" {
  description = "Name of the Terraform state storage account."
  value       = azurerm_storage_account.tfstate.name
}

output "state_container_name" {
  description = "Name of the Terraform state container."
  value       = azurerm_storage_container.tfstate.name
}

output "plan_client_id" {
  description = "Client id of the GitHub plan identity (repository variable AZURE_PLAN_CLIENT_ID)."
  value       = azurerm_user_assigned_identity.plan.client_id
}

output "deploy_client_id" {
  description = "Client id of the GitHub deploy identity (Environment dev variable AZURE_DEPLOY_CLIENT_ID)."
  value       = azurerm_user_assigned_identity.deploy.client_id
}

output "sql_admin_group_object_id" {
  description = "Object id of the SQL admin group, for the environment stack to reference."
  value       = azuread_group.sql_admins.object_id
}

output "sql_admin_group_display_name" {
  description = "Display name of the SQL admin group."
  value       = azuread_group.sql_admins.display_name
}

output "owner_object_id" {
  description = "Object id of the signed-in user that ran apply (the repository owner)."
  value       = data.azuread_client_config.current.object_id
}

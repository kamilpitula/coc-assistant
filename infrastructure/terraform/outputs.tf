output "location" {
  description = "Configured Azure region."
  value       = var.location
}

output "resource_group_name" {
  description = "Name of the dev environment resource group."
  value       = data.azurerm_resource_group.dev.name
}

output "api_url" {
  description = "HTTPS URL of the API on the Container App default hostname."
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "static_web_app_url" {
  description = "HTTPS URL of the Static Web App."
  value       = "https://${azurerm_static_web_app.dev.default_host_name}"
}

output "static_web_app_name" {
  description = "Name of the Static Web App, for the deploy workflow."
  value       = azurerm_static_web_app.dev.name
}

output "container_app_name" {
  description = "Name of the API Container App, for the deploy workflow."
  value       = azurerm_container_app.api.name
}

output "sql_server_name" {
  description = "Name of the SQL server, for the deploy workflow firewall commands."
  value       = azurerm_mssql_server.dev.name
}

output "sql_server_fqdn" {
  description = "Fully qualified domain name of the SQL server."
  value       = azurerm_mssql_server.dev.fully_qualified_domain_name
}

output "sql_database_name" {
  description = "Name of the free-offer SQL database."
  value       = azapi_resource.database.name
}

output "api_identity_name" {
  description = "Name of the API user-assigned identity."
  value       = azurerm_user_assigned_identity.api.name
}

output "api_identity_client_id" {
  description = "Client id of the API identity, used as the User Id in the Active Directory Managed Identity connection strings."
  value       = azurerm_user_assigned_identity.api.client_id
}

output "api_identity_principal_id" {
  description = "Principal id of the API identity, for reference only: the DEP-005 database user maps the client id, not the principal id."
  value       = azurerm_user_assigned_identity.api.principal_id
}

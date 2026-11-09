resource "azuread_group" "sql_admins" {
  display_name            = "sg-cocassistant-dev-sql-admins"
  security_enabled        = true
  mail_enabled            = false
  prevent_duplicate_names = true

  members = [
    azurerm_user_assigned_identity.deploy.principal_id,
    data.azuread_client_config.current.object_id,
  ]

  lifecycle {
    precondition {
      condition     = data.azuread_client_config.current.tenant_id == data.azurerm_client_config.current.tenant_id
      error_message = "The azuread and azurerm providers are signed in to different tenants. Sign both in to the subscription tenant before creating the SQL admin group."
    }
  }
}

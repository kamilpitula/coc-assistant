# The API signs in to Azure SQL with this identity (DEP-005 creates the
# database user). It holds no Azure role: SignalR and storage are reached
# through connection strings held as Container Apps secrets.
resource "azurerm_user_assigned_identity" "api" {
  name                = local.names.api_identity
  resource_group_name = data.azurerm_resource_group.dev.name
  location            = var.location
  tags                = local.tags
}

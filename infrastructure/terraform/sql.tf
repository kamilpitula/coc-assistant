resource "azurerm_mssql_server" "dev" {
  name                          = local.names.sql_server
  resource_group_name           = data.azurerm_resource_group.dev.name
  location                      = var.location
  version                       = "12.0"
  minimum_tls_version           = "1.2"
  public_network_access_enabled = true

  # The deploy workflow is the only Entra admin (D8). The owner has no
  # standing database access; break-glass is a temporary admin change
  # through ARM, reset by the next apply.
  azuread_administrator {
    login_username              = var.sql_entra_admin_login
    object_id                   = var.sql_entra_admin_object_id
    azuread_authentication_only = true
  }

  tags = local.tags
}

resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.dev.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Free-offer database: azapi (D1). Free from creation, AutoPause on exhaustion.
# The body matches Microsoft's free-offer azapi example: the free tier fixes
# the 15-minute pause and rejects any autoPauseDelay value, so neither it nor
# minCapacity is sent.
# https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql
resource "azapi_resource" "database" {
  type      = "Microsoft.Sql/servers/databases@2023-08-01"
  name      = local.names.sql_database
  parent_id = azurerm_mssql_server.dev.id
  location  = var.location

  tags = local.tags

  schema_validation_enabled = true

  body = {
    sku = {
      name     = "GP_S_Gen5"
      tier     = "GeneralPurpose"
      family   = "Gen5"
      capacity = 2
    }
    properties = {
      createMode                       = "Default"
      useFreeLimit                     = true
      freeLimitExhaustionBehavior      = "AutoPause"
      maxSizeBytes                     = 34359738368
      requestedBackupStorageRedundancy = "Local"
    }
  }
}

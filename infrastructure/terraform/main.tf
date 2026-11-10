locals {
  tags = {
    project     = "coc-assistant"
    environment = var.environment
    managed-by  = "terraform"
  }

  names = {
    container_app              = "ca-cocassistant-api-${var.environment}"
    container_apps_environment = "cae-cocassistant-${var.environment}-${var.location}"
    api_identity               = "id-cocassistant-api-${var.environment}"
    sql_server                 = "sql-cocassistant-${var.environment}-${var.location}"
    sql_database               = "sqldb-cocassistant-${var.environment}"
    storage_account            = "stcocassistant${var.environment}"
    signalr                    = "sigr-cocassistant-${var.environment}"
    static_web_app             = "stapp-cocassistant-${var.environment}"
    log_analytics              = "log-cocassistant-${var.environment}-${var.location}"
  }

  api_connection_string = "Server=tcp:${azurerm_mssql_server.dev.fully_qualified_domain_name},1433;Database=${azapi_resource.database.name};Authentication=Active Directory Managed Identity;User Id=${azurerm_user_assigned_identity.api.client_id};Encrypt=True;"
}

data "azurerm_resource_group" "dev" {
  name = "rg-cocassistant-${var.environment}"
}

resource "azurerm_log_analytics_workspace" "dev" {
  name                = local.names.log_analytics
  resource_group_name = data.azurerm_resource_group.dev.name
  location            = data.azurerm_resource_group.dev.location
  sku                 = "PerGB2018"
  daily_quota_gb      = 0.15
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_signalr_service" "dev" {
  name                = local.names.signalr
  resource_group_name = data.azurerm_resource_group.dev.name
  location            = data.azurerm_resource_group.dev.location

  sku {
    name     = "Free_F1"
    capacity = 1
  }

  service_mode = "Default"

  tags = local.tags
}

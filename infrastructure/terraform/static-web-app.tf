resource "azurerm_static_web_app" "dev" {
  name                = local.names.static_web_app
  resource_group_name = data.azurerm_resource_group.dev.name
  location            = data.azurerm_resource_group.dev.location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = local.tags
}

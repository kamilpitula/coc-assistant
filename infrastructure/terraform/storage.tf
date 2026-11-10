# The API only accepts a connection string (HandoutFileStoreRegistration),
# so shared-key access stays on. Identity-based storage would need an app
# change outside this PBI.
resource "azurerm_storage_account" "handout" {
  name                            = local.names.storage_account
  resource_group_name             = data.azurerm_resource_group.dev.name
  location                        = var.location
  account_kind                    = "StorageV2"
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  access_tier                     = "Hot"
  https_traffic_only_enabled      = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  tags = local.tags
}

resource "azurerm_storage_container" "handout_files" {
  name                  = "handout-files"
  storage_account_id    = azurerm_storage_account.handout.id
  container_access_type = "private"
}

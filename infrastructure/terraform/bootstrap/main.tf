locals {
  tags = {
    project     = "coc-assistant"
    environment = "dev"
    managed-by  = "terraform"
  }

  repository = "kamilpitula/coc-assistant"

  subjects = {
    pull_request    = "repo:${local.repository}:pull_request"
    environment_dev = "repo:${local.repository}:environment:dev"
  }

  github_oidc_issuer   = "https://token.actions.githubusercontent.com"
  github_oidc_audience = "api://AzureADTokenExchange"
}

data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "tfstate" {
  name     = "rg-cocassistant-tfstate"
  location = var.location
  tags     = local.tags
}

resource "azurerm_resource_group" "dev" {
  name     = "rg-cocassistant-dev"
  location = var.location
  tags     = local.tags
}

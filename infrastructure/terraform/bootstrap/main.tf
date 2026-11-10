locals {
  tags = {
    project     = "coc-assistant"
    environment = "dev"
    managed-by  = "terraform"
  }

  repository = "kamilpitula/coc-assistant"

  # The repo uses the immutable OIDC subject template (use_immutable_subject).
  # Source of the numeric ids:
  # gh api repos/kamilpitula/coc-assistant/actions/oidc/customization/sub
  github_subject_prefix = "repo:kamilpitula@9087774/coc-assistant@1380052287"

  subjects = {
    pull_request    = "${local.github_subject_prefix}:pull_request"
    environment_dev = "${local.github_subject_prefix}:environment:dev"
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

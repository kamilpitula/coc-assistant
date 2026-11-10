terraform {
  required_version = ">= 1.9.0"

  backend "azurerm" {}

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {
    log_analytics_workspace {
      # Moving regions replaces the workspace; a deleted name stays reserved
      # for 14 days unless it is permanently deleted on destroy.
      permanently_delete_on_destroy = true
    }
    storage {
      # ARM only: the handout blobs are read through connection strings, and
      # the state blobs are never read through this provider.
      data_plane_available = false
    }
  }
}

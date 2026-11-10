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
    storage {
      # ARM only: the handout blobs are read through connection strings, and
      # the state blobs are never read through this provider.
      data_plane_available = false
    }
  }
}

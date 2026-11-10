# Backend settings for the dev stack. The subscription comes from
# ARM_SUBSCRIPTION_ID (workflows set ARM_USE_OIDC; a local run uses the
# Azure CLI), never from a committed file.
resource_group_name  = "rg-cocassistant-tfstate"
storage_account_name = "stcocassistanttfstate"
container_name       = "tfstate"
key                  = "dev.tfstate"
use_azuread_auth     = true

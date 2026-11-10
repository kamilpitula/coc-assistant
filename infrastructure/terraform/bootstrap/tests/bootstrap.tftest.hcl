mock_provider "azurerm" {}

variables {
  subscription_id     = "00000000-0000-0000-0000-000000000000"
  budget_alert_emails = ["owner@example.com"]
}

override_data {
  target = data.azurerm_client_config.current
  values = {
    object_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    tenant_id = "00000000-0000-0000-0000-000000000000"
  }
}

# The budget parses the subscription id, so the mock must produce a real id.
override_data {
  target = data.azurerm_subscription.current
  values = {
    id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
    subscription_id = "00000000-0000-0000-0000-000000000000"
  }
}

# The provider parses resource ids (identity, account, and role scope), so the
# mocks must produce well-formed ones instead of generated strings.
override_resource {
  target = azurerm_resource_group.tfstate
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-tfstate"
  }
}

override_resource {
  target = azurerm_resource_group.dev
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev"
  }
}

override_resource {
  target = azurerm_storage_account.tfstate
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-tfstate/providers/Microsoft.Storage/storageAccounts/stcocassistanttfstate"
  }
}

override_resource {
  target = azurerm_storage_container.tfstate
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-tfstate/providers/Microsoft.Storage/storageAccounts/stcocassistanttfstate/blobServices/default/containers/tfstate"
  }
}

override_resource {
  target = azurerm_user_assigned_identity.plan
  values = {
    id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-tfstate/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-cocassistant-github-plan"
    principal_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    client_id    = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
  }
}

override_resource {
  target = azurerm_user_assigned_identity.deploy
  values = {
    id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-tfstate/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-cocassistant-github-deploy"
    principal_id = "cccccccc-cccc-cccc-cccc-cccccccccccc"
    client_id    = "dddddddd-dddd-dddd-dddd-dddddddddddd"
  }
}

# Federated credentials

run "plan_credential_uses_pull_request_subject" {
  command = apply

  assert {
    condition     = azurerm_federated_identity_credential.plan_pull_request.subject == "repo:kamilpitula@9087774/coc-assistant@1380052287:pull_request"
    error_message = "The plan credential must use the pull_request subject."
  }

  assert {
    condition     = azurerm_federated_identity_credential.plan_pull_request.issuer == "https://token.actions.githubusercontent.com"
    error_message = "The plan credential must use the GitHub OIDC issuer."
  }

  assert {
    condition     = length(azurerm_federated_identity_credential.plan_pull_request.audience) == 1 && contains(azurerm_federated_identity_credential.plan_pull_request.audience, "api://AzureADTokenExchange")
    error_message = "The plan credential must use the AzureADTokenExchange audience."
  }
}

run "deploy_credential_uses_environment_subject" {
  command = apply

  assert {
    condition     = azurerm_federated_identity_credential.deploy_environment_dev.subject == "repo:kamilpitula@9087774/coc-assistant@1380052287:environment:dev"
    error_message = "The deploy credential must use the environment:dev subject."
  }

  assert {
    condition     = azurerm_federated_identity_credential.deploy_environment_dev.issuer == "https://token.actions.githubusercontent.com"
    error_message = "The deploy credential must use the GitHub OIDC issuer."
  }

  assert {
    condition     = length(azurerm_federated_identity_credential.deploy_environment_dev.audience) == 1 && contains(azurerm_federated_identity_credential.deploy_environment_dev.audience, "api://AzureADTokenExchange")
    error_message = "The deploy credential must use the AzureADTokenExchange audience."
  }
}

# Role scoping (the security-critical invariants)

run "plan_identity_roles" {
  command = apply

  assert {
    condition     = azurerm_role_assignment.plan_reader_dev.role_definition_name == "Reader"
    error_message = "The plan identity must have the Reader role on the dev resource group."
  }

  assert {
    condition     = azurerm_role_assignment.plan_reader_dev.scope == azurerm_resource_group.dev.id
    error_message = "The plan Reader assignment must be scoped to the dev resource group."
  }

  assert {
    condition     = azurerm_role_assignment.plan_state_container.role_definition_name == "Storage Blob Data Contributor"
    error_message = "The plan identity must have Storage Blob Data Contributor on the state container."
  }

  assert {
    condition     = azurerm_role_assignment.plan_state_container.scope == azurerm_storage_container.tfstate.id
    error_message = "The plan storage assignment must be scoped to the state container, not the account."
  }
}

run "deploy_identity_roles" {
  command = apply

  assert {
    condition     = azurerm_role_assignment.deploy_contributor_dev.role_definition_name == "Contributor"
    error_message = "The deploy identity must have the Contributor role on the dev resource group."
  }

  assert {
    condition     = azurerm_role_assignment.deploy_contributor_dev.scope == azurerm_resource_group.dev.id
    error_message = "The deploy Contributor assignment must be scoped to the dev resource group."
  }

  assert {
    condition     = azurerm_role_assignment.deploy_state_container.role_definition_name == "Storage Blob Data Contributor"
    error_message = "The deploy identity must have Storage Blob Data Contributor on the state container."
  }

  assert {
    condition     = azurerm_role_assignment.deploy_state_container.scope == azurerm_storage_container.tfstate.id
    error_message = "The deploy storage assignment must be scoped to the state container, not the account."
  }
}

run "identities_live_in_state_resource_group" {
  command = apply

  assert {
    condition     = azurerm_user_assigned_identity.plan.resource_group_name == azurerm_resource_group.tfstate.name
    error_message = "The plan identity must live in rg-cocassistant-tfstate."
  }

  assert {
    condition     = azurerm_user_assigned_identity.deploy.resource_group_name == azurerm_resource_group.tfstate.name
    error_message = "The deploy identity must live in rg-cocassistant-tfstate."
  }
}

# Storage account

run "state_storage_settings" {
  command = apply

  assert {
    condition     = azurerm_storage_account.tfstate.shared_access_key_enabled == false
    error_message = "Shared-key access must stay off: state access is Entra-only."
  }

  assert {
    condition     = azurerm_storage_account.tfstate.blob_properties[0].versioning_enabled == true
    error_message = "State blob versioning must be on."
  }

  assert {
    condition     = azurerm_storage_account.tfstate.blob_properties[0].delete_retention_policy[0].days == 7
    error_message = "Blob soft-delete retention must be 7 days."
  }

  assert {
    condition     = azurerm_storage_account.tfstate.blob_properties[0].container_delete_retention_policy[0].days == 7
    error_message = "Container soft-delete retention must be 7 days."
  }

  assert {
    condition     = azurerm_storage_account.tfstate.account_replication_type == "LRS"
    error_message = "The state account must be LRS."
  }

  assert {
    condition     = azurerm_storage_account.tfstate.min_tls_version == "TLS1_2"
    error_message = "The state account must require TLS 1.2."
  }

  assert {
    condition     = azurerm_storage_account.tfstate.allow_nested_items_to_be_public == false
    error_message = "The state account must not allow public nested items."
  }

  assert {
    condition     = azurerm_storage_container.tfstate.container_access_type == "private"
    error_message = "The state container must be private."
  }
}

# Owner state access and deploy principal output

run "owner_state_container_role" {
  command = apply

  assert {
    condition     = azurerm_role_assignment.owner_state_container.role_definition_name == "Storage Blob Data Contributor"
    error_message = "The owner must have Storage Blob Data Contributor on the state container for a local plan."
  }

  assert {
    condition     = azurerm_role_assignment.owner_state_container.scope == azurerm_storage_container.tfstate.id
    error_message = "The owner storage assignment must be scoped to the state container, not the account."
  }

  assert {
    condition     = azurerm_role_assignment.owner_state_container.principal_id == data.azurerm_client_config.current.object_id
    error_message = "The owner storage assignment must target whoever runs the apply, without a second provider."
  }
}

run "deploy_principal_id_output" {
  command = apply

  assert {
    condition     = output.deploy_principal_id == azurerm_user_assigned_identity.deploy.principal_id
    error_message = "deploy_principal_id must equal the deploy identity principal id, for the SQL Entra admin input."
  }
}

run "owner_object_id_from_azurerm" {
  command = apply

  assert {
    condition     = output.owner_object_id == data.azurerm_client_config.current.object_id
    error_message = "owner_object_id must come from the azurerm provider."
  }
}

# Budget

run "budget_thresholds" {
  command = apply

  assert {
    condition     = azurerm_consumption_budget_subscription.dev.amount == 5
    error_message = "The budget amount must be 5."
  }

  assert {
    condition     = azurerm_consumption_budget_subscription.dev.time_grain == "Monthly"
    error_message = "The budget must be monthly."
  }

  assert {
    condition     = length([for n in azurerm_consumption_budget_subscription.dev.notification : n if n.threshold == 20 && n.threshold_type == "Actual"]) == 1
    error_message = "The budget must notify at 20% actual."
  }

  assert {
    condition     = length([for n in azurerm_consumption_budget_subscription.dev.notification : n if n.threshold == 80 && n.threshold_type == "Forecasted"]) == 1
    error_message = "The budget must notify at 80% forecasted."
  }

  assert {
    condition     = length([for n in azurerm_consumption_budget_subscription.dev.notification : n if n.threshold == 100 && n.threshold_type == "Forecasted"]) == 1
    error_message = "The budget must notify at 100% forecasted."
  }
}

run "budget_rejects_empty_emails" {
  command = plan

  variables {
    budget_alert_emails = []
  }

  expect_failures = [
    var.budget_alert_emails,
  ]
}

run "budget_rejects_malformed_emails" {
  command = plan

  variables {
    budget_alert_emails = ["not-an-email"]
  }

  expect_failures = [
    var.budget_alert_emails,
  ]
}

# Tags

run "every_taggable_resource_carries_the_three_tags" {
  command = apply

  assert {
    condition = alltrue([
      for tags in [
        azurerm_resource_group.tfstate.tags,
        azurerm_resource_group.dev.tags,
        azurerm_storage_account.tfstate.tags,
        azurerm_user_assigned_identity.plan.tags,
        azurerm_user_assigned_identity.deploy.tags,
      ] : tags["project"] == "coc-assistant" && tags["environment"] == "dev" && tags["managed-by"] == "terraform"
    ])
    error_message = "Every taggable bootstrap resource must carry the three spec tags."
  }
}

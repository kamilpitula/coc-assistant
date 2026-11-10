mock_provider "azurerm" {}

mock_provider "azapi" {}

variables {
  environment               = "dev"
  location                  = "swedencentral"
  static_web_app_location   = "westeurope"
  sql_entra_admin_login     = "id-cocassistant-github-deploy"
  sql_entra_admin_object_id = "759da402-f5ba-4fc0-a727-5260f838e49f"
  entra_instance            = "https://cocassistant.ciamlogin.com/"
  entra_tenant_id           = "160b5032-e56b-445f-a139-f9bf7867dc19"
  entra_api_client_id       = "404d5b0c-c1a2-4ea7-be51-92bc4e1564f0"
}

# The provider parses resource ids, so the mocks must produce well-formed
# ones instead of generated strings.
override_resource {
  target = azurerm_log_analytics_workspace.dev
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.OperationalInsights/workspaces/log-cocassistant-dev-swedencentral"
  }
}

override_resource {
  target = azurerm_container_app_environment.dev
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.App/managedEnvironments/cae-cocassistant-dev-swedencentral"
  }
}

override_resource {
  target = azurerm_mssql_server.dev
  values = {
    id                          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.Sql/servers/sql-cocassistant-dev-swedencentral"
    fully_qualified_domain_name = "sql-cocassistant-dev-swedencentral.database.windows.net"
  }
}

override_resource {
  target = azurerm_user_assigned_identity.api
  values = {
    id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-cocassistant-api-dev"
    principal_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    client_id    = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
  }
}

override_resource {
  target = azurerm_signalr_service.dev
  values = {
    id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.SignalRService/signalR/sigr-cocassistant-dev"
    primary_connection_string = "Endpoint=https://sigr-cocassistant-dev.service.signalr.net;AccessKey=mock;Version=1.0;"
  }
}

override_resource {
  target = azurerm_storage_account.handout
  values = {
    id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.Storage/storageAccounts/stcocassistantdev"
    primary_connection_string = "DefaultEndpointsProtocol=https;AccountName=stcocassistantdev;AccountKey=mock;"
  }
}

override_resource {
  target = azurerm_static_web_app.dev
  values = {
    id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.Web/staticSites/stapp-cocassistant-dev"
    default_host_name = "stapp-cocassistant-dev.azurestaticapps.net"
  }
}

override_resource {
  target = azurerm_container_app.api
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cocassistant-dev/providers/Microsoft.App/containerApps/ca-cocassistant-api-dev"
    ingress = {
      fqdn = "ca-cocassistant-api-dev.swedencentral.azurecontainerapps.io"
    }
  }
}

# Locations

run "resource_locations_follow_variables" {
  command = apply

  assert {
    condition = alltrue([
      azurerm_log_analytics_workspace.dev.location == var.location,
      azurerm_container_app_environment.dev.location == var.location,
      azurerm_user_assigned_identity.api.location == var.location,
      azurerm_mssql_server.dev.location == var.location,
      azapi_resource.database.location == var.location,
      azurerm_storage_account.handout.location == var.location,
      azurerm_signalr_service.dev.location == var.location,
    ])
    error_message = "Every environment resource except the Static Web App must use var.location."
  }

  assert {
    condition     = azurerm_static_web_app.dev.location == var.static_web_app_location
    error_message = "The Static Web App must use var.static_web_app_location."
  }
}

# Tags

run "every_taggable_resource_carries_the_three_tags" {
  command = apply

  assert {
    condition = alltrue([
      for tags in [
        azurerm_log_analytics_workspace.dev.tags,
        azurerm_container_app_environment.dev.tags,
        azurerm_container_app.api.tags,
        azurerm_user_assigned_identity.api.tags,
        azurerm_mssql_server.dev.tags,
        azapi_resource.database.tags,
        azurerm_storage_account.handout.tags,
        azurerm_signalr_service.dev.tags,
        azurerm_static_web_app.dev.tags,
      ] : tags["project"] == "coc-assistant" && tags["environment"] == "dev" && tags["managed-by"] == "terraform"
    ])
    error_message = "Every taggable environment resource must carry the three spec tags."
  }
}

# Resource names

run "resource_names_match_spec_topology" {
  command = apply

  assert {
    condition     = azurerm_log_analytics_workspace.dev.name == "log-cocassistant-dev-swedencentral"
    error_message = "The Log Analytics workspace must be named log-cocassistant-dev-swedencentral."
  }

  assert {
    condition     = azurerm_container_app_environment.dev.name == "cae-cocassistant-dev-swedencentral"
    error_message = "The Container Apps environment must be named cae-cocassistant-dev-swedencentral."
  }

  assert {
    condition     = azurerm_container_app.api.name == "ca-cocassistant-api-dev"
    error_message = "The Container App must be named ca-cocassistant-api-dev."
  }

  assert {
    condition     = azurerm_user_assigned_identity.api.name == "id-cocassistant-api-dev"
    error_message = "The API identity must be named id-cocassistant-api-dev."
  }

  assert {
    condition     = azurerm_mssql_server.dev.name == "sql-cocassistant-dev-swedencentral"
    error_message = "The SQL server must be named sql-cocassistant-dev-swedencentral."
  }

  assert {
    condition     = azapi_resource.database.name == "sqldb-cocassistant-dev"
    error_message = "The SQL database must be named sqldb-cocassistant-dev."
  }

  assert {
    condition     = azurerm_storage_account.handout.name == "stcocassistantdev"
    error_message = "The Handout storage account must be named stcocassistantdev."
  }

  assert {
    condition     = azurerm_signalr_service.dev.name == "sigr-cocassistant-dev"
    error_message = "The SignalR service must be named sigr-cocassistant-dev."
  }

  assert {
    condition     = azurerm_static_web_app.dev.name == "stapp-cocassistant-dev"
    error_message = "The Static Web App must be named stapp-cocassistant-dev."
  }

  assert {
    condition     = azurerm_container_app_environment.dev.log_analytics_workspace_id == azurerm_log_analytics_workspace.dev.id
    error_message = "The Container Apps environment must log to the renamed workspace."
  }
}

run "sql_server_name_follows_fallback_region" {
  command = apply

  variables {
    location = "germanywestcentral"
  }

  assert {
    condition     = azurerm_mssql_server.dev.name == "sql-cocassistant-dev-germanywestcentral"
    error_message = "The SQL server must be named sql-cocassistant-dev-germanywestcentral in the fallback region."
  }

  assert {
    condition     = azapi_resource.database.name == "sqldb-cocassistant-dev"
    error_message = "The SQL database must stay named sqldb-cocassistant-dev in the fallback region."
  }

  assert {
    condition     = azurerm_log_analytics_workspace.dev.name == "log-cocassistant-dev-germanywestcentral"
    error_message = "The Log Analytics workspace must be named log-cocassistant-dev-germanywestcentral in the fallback region."
  }

  assert {
    condition     = azurerm_container_app_environment.dev.name == "cae-cocassistant-dev-germanywestcentral"
    error_message = "The Container Apps environment must be named cae-cocassistant-dev-germanywestcentral in the fallback region."
  }
}

# Container App scale and probes

run "container_app_scale_and_probes" {
  command = apply

  assert {
    condition     = azurerm_container_app.api.template[0].min_replicas == 0
    error_message = "The Container App must scale to zero."
  }

  assert {
    condition     = azurerm_container_app.api.template[0].max_replicas == 1
    error_message = "The Container App must run at most one replica (ADR 0010)."
  }

  assert {
    condition     = azurerm_container_app.api.template[0].cooldown_period_in_seconds == 3600
    error_message = "The Container App scale-down cooldown must be 3600 seconds."
  }

  assert {
    condition     = azurerm_container_app.api.template[0].container[0].cpu == 0.25
    error_message = "The API container must use 0.25 vCPU."
  }

  assert {
    condition     = azurerm_container_app.api.template[0].container[0].memory == "0.5Gi"
    error_message = "The API container must use 0.5Gi of memory."
  }

  assert {
    condition     = azurerm_container_app.api.ingress[0].external_enabled == true
    error_message = "The Container App ingress must be external."
  }

  assert {
    condition     = azurerm_container_app.api.ingress[0].target_port == 8080
    error_message = "The Container App ingress must target port 8080."
  }

  assert {
    condition     = azurerm_container_app.api.ingress[0].allow_insecure_connections == false
    error_message = "The Container App ingress must not allow insecure connections."
  }

  assert {
    condition     = azurerm_container_app.api.template[0].container[0].liveness_probe[0].port == 8080 && azurerm_container_app.api.template[0].container[0].liveness_probe[0].path == "/health"
    error_message = "The liveness probe must check /health on port 8080."
  }

  assert {
    condition     = azurerm_container_app.api.template[0].container[0].readiness_probe[0].port == 8080 && azurerm_container_app.api.template[0].container[0].readiness_probe[0].path == "/health"
    error_message = "The readiness probe must check /health on port 8080."
  }

  assert {
    condition     = azurerm_container_app.api.identity[0].type == "UserAssigned" && contains(azurerm_container_app.api.identity[0].identity_ids, azurerm_user_assigned_identity.api.id)
    error_message = "The Container App must run as the API user-assigned identity."
  }
}

# Container App configuration

run "container_app_configuration" {
  command = apply

  assert {
    condition     = [for e in azurerm_container_app.api.template[0].container[0].env : e.value if e.name == "ASPNETCORE_ENVIRONMENT"][0] == "Staging"
    error_message = "ASPNETCORE_ENVIRONMENT must be Staging, never Development."
  }

  assert {
    condition = alltrue([
      for key in ["ConnectionStrings__IdentityDb", "ConnectionStrings__CampaignPlayDb", "ConnectionStrings__ScenarioPreparationDb"] :
      strcontains([for e in azurerm_container_app.api.template[0].container[0].env : e.value if e.name == key][0], "Active Directory Managed Identity")
    ])
    error_message = "Every connection string must use Active Directory Managed Identity."
  }

  assert {
    condition = alltrue([
      for key in ["ConnectionStrings__IdentityDb", "ConnectionStrings__CampaignPlayDb", "ConnectionStrings__ScenarioPreparationDb"] :
      strcontains([for e in azurerm_container_app.api.template[0].container[0].env : e.value if e.name == key][0], azurerm_user_assigned_identity.api.client_id)
    ])
    error_message = "Every connection string must carry the API identity client id as the User Id."
  }

  assert {
    condition = alltrue([
      for key in ["ConnectionStrings__IdentityDb", "ConnectionStrings__CampaignPlayDb", "ConnectionStrings__ScenarioPreparationDb"] :
      !strcontains(lower([for e in azurerm_container_app.api.template[0].container[0].env : e.value if e.name == key][0]), "password")
    ])
    error_message = "No connection string may contain a password."
  }

  assert {
    condition     = [for e in azurerm_container_app.api.template[0].container[0].env : e.value if e.name == "Cors__AllowedOrigins__0"][0] == "https://${azurerm_static_web_app.dev.default_host_name}"
    error_message = "The CORS origin must be the Static Web App https URL."
  }

  assert {
    condition     = [for e in azurerm_container_app.api.template[0].container[0].env : e.secret_name if e.name == "Azure__SignalR__ConnectionString"][0] == "signalr-connection-string"
    error_message = "The SignalR connection string must come from the Container Apps secret, not a plain value."
  }

  assert {
    condition     = [for e in azurerm_container_app.api.template[0].container[0].env : e.secret_name if e.name == "Azure__Storage__ConnectionString"][0] == "storage-connection-string"
    error_message = "The storage connection string must come from the Container Apps secret, not a plain value."
  }
}

# SQL server and free-offer database

run "sql_server_entra_admin" {
  command = apply

  assert {
    condition     = azurerm_mssql_server.dev.azuread_administrator[0].object_id == var.sql_entra_admin_object_id
    error_message = "The SQL Entra admin must be the deploy identity passed in as a variable."
  }

  assert {
    condition     = azurerm_mssql_server.dev.azuread_administrator[0].login_username == var.sql_entra_admin_login
    error_message = "The SQL Entra admin login must match the variable."
  }

  assert {
    condition     = azurerm_mssql_server.dev.azuread_administrator[0].azuread_authentication_only == true
    error_message = "The SQL server must be Entra-only."
  }

  assert {
    condition     = azurerm_mssql_firewall_rule.azure_services.start_ip_address == "0.0.0.0" && azurerm_mssql_firewall_rule.azure_services.end_ip_address == "0.0.0.0"
    error_message = "The Azure-services firewall rule must cover 0.0.0.0 to 0.0.0.0."
  }
}

run "sql_database_free_offer" {
  command = apply

  assert {
    condition     = azapi_resource.database.type == "Microsoft.Sql/servers/databases@2023-08-01"
    error_message = "The database must use the stable 2023-08-01 API version."
  }

  assert {
    condition     = azapi_resource.database.body.properties.useFreeLimit == true
    error_message = "The database must have the free limit on."
  }

  assert {
    condition     = azapi_resource.database.body.properties.freeLimitExhaustionBehavior == "AutoPause"
    error_message = "The database must pause when the free allowance is spent, never bill."
  }

  assert {
    condition     = azapi_resource.database.body.sku.tier == "GeneralPurpose" && azapi_resource.database.body.sku.name == "GP_S_Gen5" && azapi_resource.database.body.sku.family == "Gen5" && azapi_resource.database.body.sku.capacity == 2
    error_message = "The database must be serverless General Purpose GP_S_Gen5 with capacity 2."
  }

  assert {
    condition     = azapi_resource.database.body.properties.maxSizeBytes == 34359738368
    error_message = "The database maximum size must be 32 GB."
  }

  assert {
    condition     = azapi_resource.database.body.properties.requestedBackupStorageRedundancy == "Local"
    error_message = "The database backup storage redundancy must be Local."
  }

  assert {
    condition     = azapi_resource.database.body.properties.createMode == "Default"
    error_message = "The database create mode must be Default."
  }

  assert {
    condition     = !contains(keys(azapi_resource.database.body.properties), "autoPauseDelay")
    error_message = "The database body must not set autoPauseDelay: the free tier fixes the 15-minute pause and rejects any value."
  }

  assert {
    condition     = !contains(keys(azapi_resource.database.body.properties), "minCapacity")
    error_message = "The database body must not set minCapacity: it is not in the free-offer example."
  }
}

# Free-tier services and storage

run "signalr_free_default_mode" {
  command = apply

  assert {
    condition     = azurerm_signalr_service.dev.sku[0].name == "Free_F1"
    error_message = "SignalR must use the Free tier."
  }

  assert {
    condition     = azurerm_signalr_service.dev.sku[0].capacity == 1
    error_message = "SignalR Free must use 1 unit."
  }

  assert {
    condition     = azurerm_signalr_service.dev.service_mode == "Default"
    error_message = "SignalR must run in Default mode (ADR 0009)."
  }
}

run "static_web_app_free" {
  command = apply

  assert {
    condition     = azurerm_static_web_app.dev.sku_tier == "Free" && azurerm_static_web_app.dev.sku_size == "Free"
    error_message = "The Static Web App must use the Free tier."
  }
}

run "log_analytics_cap" {
  command = apply

  assert {
    condition     = azurerm_log_analytics_workspace.dev.sku == "PerGB2018"
    error_message = "Log Analytics must be pay-as-you-go."
  }

  assert {
    condition     = azurerm_log_analytics_workspace.dev.daily_quota_gb == 0.15
    error_message = "The Log Analytics daily cap must be 0.15 GB."
  }

  assert {
    condition     = azurerm_log_analytics_workspace.dev.retention_in_days == 30
    error_message = "Log Analytics retention must be 30 days."
  }
}

run "storage_private_container" {
  command = apply

  assert {
    condition     = azurerm_storage_account.handout.allow_nested_items_to_be_public == false
    error_message = "The Handout storage account must not allow public nested items."
  }

  assert {
    condition     = azurerm_storage_account.handout.shared_access_key_enabled == true
    error_message = "The Handout storage account keeps shared-key access on: the API only accepts a connection string."
  }

  assert {
    condition     = azurerm_storage_container.handout_files.name == "handout-files"
    error_message = "The Handout container must be named handout-files."
  }

  assert {
    condition     = azurerm_storage_container.handout_files.container_access_type == "private"
    error_message = "The Handout container must be private."
  }
}

# Outputs

run "outputs" {
  command = apply

  assert {
    condition     = startswith(output.api_url, "https://")
    error_message = "api_url must start with https://."
  }

  assert {
    condition     = startswith(output.static_web_app_url, "https://")
    error_message = "static_web_app_url must start with https://."
  }

  assert {
    condition     = output.static_web_app_name == "stapp-cocassistant-dev"
    error_message = "The Static Web App name output must match the resource."
  }

  assert {
    condition     = output.container_app_name == "ca-cocassistant-api-dev"
    error_message = "The Container App name output must match the resource."
  }

  assert {
    condition     = output.sql_server_fqdn == "sql-cocassistant-dev-swedencentral.database.windows.net"
    error_message = "The SQL server FQDN output must match the mock."
  }

  assert {
    condition     = output.sql_database_name == "sqldb-cocassistant-dev"
    error_message = "The SQL database name output must match the resource."
  }

  assert {
    condition     = output.api_identity_name == "id-cocassistant-api-dev"
    error_message = "The API identity name output must match the resource."
  }

  assert {
    condition     = output.api_identity_client_id == "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    error_message = "The API identity client id output must match the mock."
  }

  assert {
    condition     = output.resource_group_name == "rg-cocassistant-dev"
    error_message = "The resource group name output must match the data source."
  }

  assert {
    condition     = output.api_identity_principal_id == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    error_message = "The API identity principal id output must match the mock."
  }

  assert {
    condition     = output.location == var.location
    error_message = "The location output must match the variable."
  }
}

# Validation

run "environment_rejects_invalid_name" {
  command = plan

  variables {
    environment = "Dev_Too_Long!"
  }

  expect_failures = [
    var.environment,
  ]
}

run "sql_admin_rejects_non_uuid" {
  command = plan

  variables {
    sql_entra_admin_object_id = "not-a-uuid"
  }

  expect_failures = [
    var.sql_entra_admin_object_id,
  ]
}

run "sql_admin_rejects_zero_uuid" {
  command = plan

  variables {
    sql_entra_admin_object_id = "00000000-0000-0000-0000-000000000000"
  }

  expect_failures = [
    var.sql_entra_admin_object_id,
  ]
}

run "static_web_app_location_rejects_unknown_region" {
  command = plan

  variables {
    static_web_app_location = "swedencentral"
  }

  expect_failures = [
    var.static_web_app_location,
  ]
}

run "location_rejects_uppercase_and_spaces" {
  command = plan

  variables {
    location = "Sweden Central"
  }

  expect_failures = [
    var.location,
  ]
}

resource "azurerm_container_app_environment" "dev" {
  name                       = local.names.container_apps_environment
  resource_group_name        = data.azurerm_resource_group.dev.name
  location                   = var.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.dev.id

  tags = local.tags
}

resource "azurerm_container_app" "api" {
  name                         = local.names.container_app
  container_app_environment_id = azurerm_container_app_environment.dev.id
  resource_group_name          = data.azurerm_resource_group.dev.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  ingress {
    external_enabled           = true
    target_port                = 8080
    allow_insecure_connections = false

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  secret {
    name  = "signalr-connection-string"
    value = azurerm_signalr_service.dev.primary_connection_string
  }

  secret {
    name  = "storage-connection-string"
    value = azurerm_storage_account.handout.primary_connection_string
  }

  template {
    min_replicas               = 0
    max_replicas               = 1
    cooldown_period_in_seconds = 3600

    container {
      name   = "api"
      image  = var.api_placeholder_image
      cpu    = 0.25
      memory = "0.5Gi"

      liveness_probe {
        port      = 8080
        path      = "/health"
        transport = "HTTP"
      }

      readiness_probe {
        port      = 8080
        path      = "/health"
        transport = "HTTP"
      }

      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Staging"
      }

      env {
        name  = "ConnectionStrings__IdentityDb"
        value = local.api_connection_string
      }

      env {
        name  = "ConnectionStrings__CampaignPlayDb"
        value = local.api_connection_string
      }

      env {
        name  = "ConnectionStrings__ScenarioPreparationDb"
        value = local.api_connection_string
      }

      env {
        name  = "EntraId__Instance"
        value = var.entra_instance
      }

      env {
        name  = "EntraId__TenantId"
        value = var.entra_tenant_id
      }

      env {
        name  = "EntraId__ClientId"
        value = var.entra_api_client_id
      }

      env {
        name  = "Cors__AllowedOrigins__0"
        value = "https://${azurerm_static_web_app.dev.default_host_name}"
      }

      env {
        name        = "Azure__SignalR__ConnectionString"
        secret_name = "signalr-connection-string"
      }

      env {
        name        = "Azure__Storage__ConnectionString"
        secret_name = "storage-connection-string"
      }
    }
  }

  lifecycle {
    # The deploy workflow rolls out images; Terraform only creates the app.
    ignore_changes = [template[0].container[0].image]
  }

  tags = local.tags
}

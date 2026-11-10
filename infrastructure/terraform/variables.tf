variable "location" {
  description = "Azure region for the environment resources. No default: every environment sets it explicitly, so no stack silently falls back to another region."
  type        = string
}

variable "static_web_app_location" {
  description = "Azure region for the Static Web App metadata. Static Web Apps accept only a few regions; the resource group and the other resources may live in another region."
  type        = string

  validation {
    condition     = contains(["centralus", "eastus2", "westeurope", "westus2", "eastasia"], lower(var.static_web_app_location))
    error_message = "static_web_app_location must be one of the regions Static Web Apps accepts: centralus, eastus2, westeurope, westus2, eastasia."
  }
}

variable "environment" {
  description = "Environment name. Derives every resource name and the tag set; another environment is a new pair of files."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{1,10}$", var.environment))
    error_message = "environment must be 1 to 10 lowercase letters or digits, so the storage account name stays within 24 characters."
  }
}

variable "sql_entra_admin_object_id" {
  description = "Object id of the Entra identity that becomes the SQL server's only Entra admin (the GitHub deploy identity). Never derived from the caller: whoever runs the plan would otherwise become the admin."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", var.sql_entra_admin_object_id)) && var.sql_entra_admin_object_id != "00000000-0000-0000-0000-000000000000"
    error_message = "sql_entra_admin_object_id must be a non-zero UUID."
  }
}

variable "sql_entra_admin_login" {
  description = "Login name of the SQL server's Entra admin, for review in access audits."
  type        = string
}

variable "entra_instance" {
  description = "Entra External ID instance URL the API signs clients in against."
  type        = string
}

variable "entra_tenant_id" {
  description = "Entra External ID tenant id the API signs clients in against."
  type        = string
}

variable "entra_api_client_id" {
  description = "Client id of the SPA registration the API accepts audiences for."
  type        = string
}

variable "api_placeholder_image" {
  description = "Placeholder image the Container App is created with. Never rolled out: template.container.image stays in ignore_changes and the deploy workflow sets the real image."
  type        = string
  default     = "mcr.microsoft.com/dotnet/samples:aspnetapp"
}

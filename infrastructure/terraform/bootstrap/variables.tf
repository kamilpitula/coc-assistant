variable "subscription_id" {
  description = "Azure subscription id the bootstrap resources are created in. Required by azurerm 4.x."
  type        = string
}

variable "budget_alert_emails" {
  description = "Email recipients for the EUR 5 subscription budget alerts. Kept in the local terraform.tfvars."
  type        = list(string)

  validation {
    condition     = length(var.budget_alert_emails) > 0 && alltrue([for email in var.budget_alert_emails : strcontains(email, "@")])
    error_message = "budget_alert_emails must contain at least one email address (each containing '@')."
  }
}

variable "location" {
  description = "Azure region for the bootstrap resources. Only the resource group and the Static Web App stay in this region: the other environment stack resources take their own region from its location variable."
  type        = string
  default     = "westeurope"
}

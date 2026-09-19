---
applyTo: "infrastructure/**/*"
---

# Infrastructure Conventions

- Use Terraform for Azure infrastructure.
- Keep the Terraform and AzureRM provider constraints pinned in the foundation files.
- Keep environment-specific values in variables or environment configuration, never hardcoded secrets.
- Make resource names and tags explicit and reviewable.
- Run `terraform fmt` and `terraform validate` before committing infrastructure changes.

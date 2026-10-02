# PBI-CI-001: Make the SQL Server Connection Configurable

## Directive
Let the backend integration tests and the authenticated E2E harness target any SQL Server through one environment variable, `COC_SQLSERVER_CONNECTION`, while keeping LocalDB as the default when it is unset.

**Scope:**
- Integration test connection strings and the E2E harness connection string (Playwright config and global setup).
- A .NET connection-string helper with unit tests; a TypeScript helper for the E2E harness, documented as exempt test infrastructure.
- Harness documentation for the new variable.
- Do not touch production code, application configuration, or the workflow.

## Dependencies
- Blocked by: None
- Must merge before: PBI-CI-004, PBI-CI-005

## Context
Read: `specs/continuous-integration/spec.md`
- Blueprint: SQL Server connection configuration.
- Contract: Regression Guardrails on LocalDB fallback and per-consumer database names.

## Verification
- [ ] With the variable unset, integration tests and the E2E suite pass locally against LocalDB exactly as before.
- [ ] With the variable set to a SQL Server container, the integration tests pass.
- [ ] Each consumer keeps its own database name.
- [ ] xUnit tests cover the unset, whitespace, configured, and database-override cases.

## Refinement Protocol
If a consumer needs connection settings beyond server, credentials, and database, update the Blueprint's connection configuration section in the same commit.

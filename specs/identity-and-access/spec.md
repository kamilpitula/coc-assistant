# Feature: Identity and Access

## Blueprint

### Context

Every Keeper and Player needs a single authenticated Account before they can create or join a Campaign. This feature establishes that Account through Microsoft Entra External ID (CIAM), federating Google and Microsoft sign-in, and wires the homepage Sign In / Sign Up actions to it so the rest of the application can rely on a consistent, externally-issued identity rather than each feature handling credentials itself.

### Architecture

- **API contracts:**
  - `GET /api/account/me` (`[Authorize]`) — [backend/src/Identity/CocAssistant.Identity.Controllers/AccountController.cs](../../backend/src/Identity/CocAssistant.Identity.Controllers/AccountController.cs). Upserts the caller's Account from JWT claims (Entra object ID, display name, email) and returns it. This is the only endpoint requiring authentication; it exists to JIT-provision the Account and prove the auth pipeline end-to-end. All other endpoints remain unauthenticated.
- **Data models:** [backend/src/Identity/CocAssistant.Identity.Domain/Account.cs](../../backend/src/Identity/CocAssistant.Identity.Domain/Account.cs) (`Id` GUID PK, `EntraObjectId` unique, `DisplayName`, `Email`, `CreatedAt`, `LastSignedInAt`), persisted via a dedicated `IdentityDbContext` in [backend/src/Identity/CocAssistant.Identity.Infrastructure/](../../backend/src/Identity/CocAssistant.Identity.Infrastructure/), scoped to this bounded context and kept separate from a future Campaign Play DbContext even though both target the same physical Azure SQL Database. See [docs/adr/0001-persist-account-entity.md](../../docs/adr/0001-persist-account-entity.md).

  **[DEPRECATED 2026-09-20]**
  ~~None introduced. An Account is the Entra-issued identity itself (tenant ID + object ID + claims); this feature does not persist a separate Account record.~~
  Replaced by: the Account data model above. Reason: Campaign Play and future features need a stable, queryable Account identifier independent of any single Campaign (e.g. searching/inviting by email, and a future cross-Campaign "my Campaigns" view), which a pure token-passthrough design cannot support.

- **Frontend:** `@azure/msal-browser` + `@azure/msal-react`, authorization-code redirect flow, token cache in `sessionStorage`. Wired into [frontend/src/main.tsx](../../frontend/src/main.tsx) (`MsalProvider`), [frontend/src/shared/services/msalConfig.ts](../../frontend/src/shared/services/msalConfig.ts), [frontend/src/shared/hooks/useAccountSync.ts](../../frontend/src/shared/hooks/useAccountSync.ts), and [frontend/src/shared/components/Header.tsx](../../frontend/src/shared/components/Header.tsx) (Sign In, Sign Up, Sign Out actions). Immediately after the redirect completes, the Header calls `GET /api/account/me` to trigger provisioning.
- **Backend:** `Microsoft.Identity.Web` JWT bearer authentication registered in [backend/src/CocAssistant.Api/Program.cs](../../backend/src/CocAssistant.Api/Program.cs), configured from tenant/client placeholders in `appsettings`/environment variables. EF Core with the SQL Server provider persists the Account table; local development and integration tests use SQL Server LocalDB, unit tests use the EF Core SQLite in-memory provider. Setup runbook: [docs/entra-external-id-setup.md](../../docs/entra-external-id-setup.md).
- **Dependencies:**
  - Depends on: a Microsoft Entra External ID (CIAM) tenant and app registration, and a Google Cloud OAuth client federated into it as an identity provider. Both are provisioned manually (outside this repo's Terraform, per current scope) and consumed here only as configuration placeholders.
  - Depended on by: Campaign Play (an Account becomes a Keeper by creating a Campaign, or a Player by joining one — see [specs/campaign-play/spec.md](../campaign-play/spec.md)).
- **Constraints:**
  - Authentication is federated entirely through Microsoft Entra External ID; this application never handles Google or Microsoft credentials directly.
  - The MSAL token cache location is `sessionStorage`.
  - No Entra or Google client secret is committed to the repository; tenant/client identifiers are supplied via configuration placeholders only.
  - The Account table has no soft-delete/erasure column; right-to-erasure handling is future work, to be added together with its enforcement rather than as unused schema now.

## Contract

### Definition of Done

- [ ] Clicking Sign In or Sign Up on the homepage starts an MSAL redirect to the Entra External ID authorize endpoint.
- [ ] After a successful redirect return, the Header displays the Account's name and a Sign Out action instead of Sign In/Sign Up.
- [ ] Clicking Sign Out clears the session cache and reverts the Header to Sign In/Sign Up.
- [ ] The API has JWT bearer authentication configured against the Entra External ID tenant/client configuration.
- [ ] The first authenticated call to `GET /api/account/me` for a given Entra object ID creates an Account row; subsequent calls update its `DisplayName` and `LastSignedInAt` rather than creating a duplicate.
- [ ] `GET /api/account/me` rejects a request without a valid Entra-issued bearer token.

### Regression Guardrails

- No Entra or Google client secret is ever committed to the repository.
- Any endpoint later decorated with `[Authorize]` rejects requests without a valid Entra-issued bearer token.
- The Header never shows both the signed-out (Sign In/Sign Up) and signed-in (name/Sign Out) states at the same time.
- Sign Out fully clears the cached account from `sessionStorage`; a later Sign In cannot silently reuse a stale session.
- An `EntraObjectId` never maps to more than one Account row.
- No endpoint other than `GET /api/account/me` requires authentication as part of this feature.

### Scenarios

```gherkin
Scenario: Sign In initiates the Entra redirect
  Given an unauthenticated visitor is on the homepage
  When the visitor clicks Sign In
  Then the browser is redirected to the Entra External ID authorize endpoint

Scenario: Sign Up initiates the Entra redirect
  Given an unauthenticated visitor is on the homepage
  When the visitor clicks Sign Up
  Then the browser is redirected to the Entra External ID authorize endpoint

Scenario: Header reflects a signed-in Account after redirect return
  Given the Entra redirect has completed for an authenticated Account
  When the homepage finishes processing the redirect response
  Then the Header shows the Account's name and a Sign Out action
  And the Sign In and Sign Up actions are no longer shown

Scenario: Sign Out returns the Header to its signed-out state
  Given the Header shows a signed-in Account
  When the Account clicks Sign Out
  Then the session cache no longer contains the Account
  And the Header shows Sign In and Sign Up again

Scenario: First sign-in provisions the Account
  Given no Account exists for an Entra object ID
  When the Header calls GET /api/account/me with a valid bearer token for that Entra object ID
  Then an Account row is created with that Entra object ID, display name, and email

Scenario: Later sign-in updates the existing Account
  Given an Account already exists for an Entra object ID
  When the Header calls GET /api/account/me with a valid bearer token for that Entra object ID and a changed display name
  Then the existing Account row's display name and last-signed-in timestamp are updated
  And no second Account row is created for that Entra object ID

Scenario: Unauthenticated request to account/me is rejected
  Given a request to GET /api/account/me carries no bearer token
  When the API processes the request
  Then the API responds with an unauthorized status
  And no Account row is created or modified
```

Note: the full external login round-trip (actual Google/Microsoft credential entry) is outside this contract's verifiable scope — E2E coverage verifies only that Sign In/Sign Up initiate the correct redirect, per the documented exception for external identity provider pages.

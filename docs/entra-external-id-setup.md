# Entra External ID (CIAM) setup

Manual steps to provision the identity resources this repo consumes only via configuration
placeholders. Nothing below can be automated by tooling in this repo.

## 1. Create the tenant
Azure Portal > Entra External ID > Create a tenant > choose the CIAM tenant type. Requires an
Azure subscription. Note the tenant ID and default domain (`<tenant>.onmicrosoft.com` /
`<tenant>.ciamlogin.com`).

## 2. Register the API
Create an app registration (e.g. `CocAssistant.Api`) and expose a scope, e.g. `access_as_user`
under App ID URI `api://<api-client-id>`.

## 3. Register the SPA
Create an app registration (e.g. `CocAssistant.Web`): platform = Single-page application,
redirect URIs = `http://localhost:5173` (Vite dev default) plus the production URL once known.
Grant it API permission for the API app's `access_as_user` scope.

## 4. Add Google as an identity provider
Create a Google Cloud OAuth 2.0 Client ID (Google Cloud Console > APIs & Services >
Credentials) for a Web application. The authorized redirect URI must be copied exactly from
the Entra portal's "add Google identity provider" screen (do not guess it) - typically
`https://<tenant>.ciamlogin.com/<tenant-id>/federation/oauth2`. Add Google as an identity
provider in Entra External ID > External Identities > All identity providers using that
Client ID/secret.

## 5. Create the user flow
Create (or edit) a "Sign up and sign in" user flow, attach the SPA app registration, and
enable both Microsoft and Google as sign-in options.

## 6. Record the values
- Tenant subdomain: `<tenant>.ciamlogin.com`
- Tenant ID
- SPA client ID
- API client ID / App ID URI + scope name
- Redirect URIs

## 7. Paste the values into local config
- Frontend: copy [`frontend/.env.example`](../frontend/.env.example) to `frontend/.env.local`
  (gitignored) and fill in `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`,
  `VITE_ENTRA_REDIRECT_URI`, `VITE_API_SCOPE`.
- Backend: set the `EntraId:Instance`/`EntraId:TenantId`/`EntraId:ClientId` values in
  `backend/src/CocAssistant.Api/appsettings.Development.json` (gitignored) or user-secrets,
  never in `appsettings.json`.

No secret ever needs to be stored in this repo: the SPA is a public client (PKCE), the API
validates tokens against Entra's public signing keys, and the only secret (Google's OAuth
client secret) lives solely in the Entra portal.

## Local database (LocalDB)
Backend persistence (the `Account` table) uses SQL Server LocalDB for local development and
integration tests. Install it via the "SQL Server Express LocalDB" component of SQL Server
Express, or via Visual Studio's SQL Server Data Tools workload. Verify with `sqllocaldb info`.
The default connection string is already set in `appsettings.Development.json`
(`(localdb)\mssqllocaldb`, database `CocAssistantIdentity`); migrations apply automatically
via `dbContext.Database.MigrateAsync()` calls used by the integration test factory, or run
`dotnet ef database update --project src/Identity/CocAssistant.Identity.Infrastructure --startup-project src/CocAssistant.Api`
manually for the dev database.

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
the Entra portal's Google federation setup (do not guess it). In Entra External ID, open
External Identities > All identity providers, select the Google provider, enter the Google
Client ID and secret, and save it.

## 5. Add Microsoft personal accounts as an OIDC identity provider
Microsoft personal accounts are not shown on the initial user-flow creation screen. Create
the user flow first with Email Accounts, then add Microsoft account as a provider.

1. Create an app registration in any Entra tenant. Under Supported account types, select
  `Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)
  and personal Microsoft accounts`.
2. Add a **Web** redirect URI using the exact federation URI for this external tenant:
  `https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/federation/oauth2`
3. Create a client secret for that application and copy its **Value** immediately.
4. In the external tenant, open External Identities > All identity providers.
5. Select the Custom tab, then Add new > OpenID Connect.
6. Enter these values:
  - Display name: `Microsoft account`
  - Well-known endpoint: `https://login.microsoftonline.com/consumers/v2.0/.well-known/openid-configuration`
  - OpenID Issuer URI: `https://login.live.com`
  - Client ID: the Microsoft account application's **Application (client) ID**
  - Client secret: the Microsoft account application's secret **Value**
  - Client authentication: `client_secret`
  - Scope: `openid profile email`
  - Response type: `code`
7. Select Review + create. Claims mapping can remain at its defaults initially.

Do not use the `CocAssistant.Web` SPA client ID or the `CocAssistant.Api` client ID in these
two fields. Do not put the Microsoft account application secret in this repository.

## 6. Add the providers to the user flow
If you have not created the flow yet, create a "Sign up and sign in" flow with Email Accounts
and attach the SPA app registration. Then:

1. Go to External Identities > User flows.
2. Select the flow.
3. Under Settings, select Identity providers.
4. Under Other identity providers, select Google and Microsoft account.
5. Select Save.

## 7. Collect a display name and put it in the API token
The API takes the Account's display name and email from the **access token** (see
`EntraIdentity` in `backend/src/Identity/CocAssistant.Identity.Application/`). If the sign-up
user flow does not collect a display name, Entra External ID sets every new user's
`displayName` to `unknown`. The API ignores that placeholder, so these users have no name.

1. External Identities > User flows > select the flow > User attributes. Select
   **Display Name** (and optionally Given Name and Surname), then Save. New sign-ups are now
   asked for a name.
2. App registrations > `CocAssistant.Api` > Token configuration > Add optional claim >
   token type **Access**. Add `email` (and `given_name`, `family_name` if you collected them).
   Accept the prompt to add the Microsoft Graph `email` / `profile` permissions.
3. Users created before step 1 keep `unknown`. Users > select the user > Edit properties, and
   set **Display name**. The Account picks up the new name the next time that person signs in.

## 8. Record the values
- Tenant subdomain: `<tenant>.ciamlogin.com`
- Tenant ID
- SPA client ID
- API client ID / App ID URI + scope name
- Redirect URIs

## 9. Paste the values into local config
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

# Authenticated E2E harness

This document explains how to run the authenticated Playwright suite, which exercises Campaign
Invite management and the Player join workflow through the real SPA + MSAL + API +
`Microsoft.Identity.Web` stack.

See also `docs/adr/0002-authenticated-e2e-uses-local-mock-oidc-issuer.md` for the design
rationale, and `docs/e2e/issues/01-authenticated-e2e-coverage-for-campaign-invites-and-joining.md`
for the ticket that produced this harness.

## Prerequisites

Install once per workstation:

- **Docker Desktop** (for `mock-oauth2-server`).
- **ASP.NET dev certificate**: `dotnet dev-certs https --trust`. The browser, the API's
  Kestrel endpoint, and the mock OIDC issuer all serve the same cert over `localhost`.
- **SQL Server LocalDB** (`(localdb)\mssqllocaldb`). The harness uses a dedicated
  `CocAssistantE2E` database that is never dropped. To use another SQL Server instead, see
  "Using a non-LocalDB SQL Server" below.
- **.NET 10 SDK and Node 20+** (same versions the rest of the repo uses).

## One-time setup

### 1. Export the dev certificate to the gitignored PFX

The PFX password MUST match the keystore password committed in
`e2e/docker/mock-oauth2-config.json` (fields `keyPassword` and `keystorePassword`). The
committed value is `CocE2eDevCertP@ss1!` and the export command therefore is exactly:

```powershell
# From the repo root
dotnet dev-certs https --export-path e2e/.certs/dev-cert.pfx --password "CocE2eDevCertP@ss1!" --format Pfx
```

A different password will prevent the mock container from loading the keystore (see the
Troubleshooting entry below) because mock-oauth2-server reads the password from its JSON
config, not from any environment variable.

The API's Kestrel endpoint and the EF migrations in `globalSetup.ts` also need the same
password. Both `e2e/globalSetup.ts` and `e2e/playwright.config.ts` resolve it from, in order:

1. the `COC_E2E_CERT_PASSWORD` environment variable, trimmed, if non-empty; otherwise
2. the contents of `e2e/.certs/dev-cert.password` (gitignored), trimmed.

Pick one of those. Writing the password file is usually simpler:

```powershell
"CocE2eDevCertP@ss1!" | Out-File -NoNewline -Encoding ascii e2e/.certs/dev-cert.password
```

Or export the env var in your shell before running `npm test`:

```powershell
$env:COC_E2E_CERT_PASSWORD = "CocE2eDevCertP@ss1!"
```

If both are set, the env var wins. `playwright.config.ts` captures the resolved value at
config-load time and forwards it to the API's `ASPNETCORE_Kestrel__Certificates__Default__Password`.

### 2. Install Node dependencies and the pinned `dotnet-ef`

```powershell
cd e2e
npm install

# From the repo root (idempotent)
dotnet tool restore
```

The repo pins `dotnet-ef 10.0.2` in `.config/dotnet-tools.json` so migrations apply
deterministically regardless of the globally installed EF tooling.

## Running

```powershell
cd e2e
npm test
```

Playwright's `webServer` config starts three servers for you:

| Server         | Port                                  | Owner             |
|----------------|---------------------------------------|-------------------|
| Mock OIDC      | 8443 (HTTPS)                          | Docker container  |
| API            | 5059 (HTTPS, dev cert)                | `dotnet run`      |
| Vite dev UI    | 5174 (HTTP, `--mode e2e`)             | `vite`            |

`globalSetup.ts` applies both EF Core migrations against the `CocAssistantE2E` LocalDB
before Playwright launches the suite, and reads `e2e/.certs/dev-cert.password` so the mock
container and the API's Kestrel endpoint both use the trusted dev cert.

`playwright.config.ts` sets `use.ignoreHTTPSErrors: true` and the Vite proxy sets
`secure: false` for the API target so the dev cert is accepted by Node's HTTP agent (the
browser trusts it anyway after `dotnet dev-certs https --trust`).

## Using a non-LocalDB SQL Server

Set `COC_SQLSERVER_CONNECTION` to the server part of a connection string, without a database:

```powershell
$env:COC_SQLSERVER_CONNECTION = "Server=localhost,1433;User Id=sa;Password=<password>;TrustServerCertificate=True"
```

`e2e/sqlServerConnection.ts` appends `Database=CocAssistantE2E`; when the variable is unset it
falls back to LocalDB. The backend integration tests honor the same variable through
`SqlServerTestConnection`, each with its own database name.

## Running in CI

The `e2e` job in `.github/workflows/ci.yml` runs the same suite on `ubuntu-latest`
(see `specs/continuous-integration/spec.md`):

- SQL Server runs as a `mcr.microsoft.com/mssql/server:2022-latest` service container and
  `COC_SQLSERVER_CONNECTION` points the harness at it.
- The dev certificate is exported per run with the committed password above and added to the
  runner's OpenSSL trust store, so the API can fetch the mock issuer's OIDC metadata over
  HTTPS. The browser relies on `ignoreHTTPSErrors`.
- Under `CI`, Playwright starts every server itself (`reuseExistingServer` is off), retries
  failed tests twice, and writes both the line and HTML reporters.
- When the job fails, the HTML report, traces, the Playwright console log (including API and
  Vite output), and the mock issuer's container log are uploaded as the `e2e-diagnostics`
  artifact for 7 days.

## Adding new Accounts

Fixtures live in `e2e/fixtures/`:

```ts
import { test, expect } from '@playwright/test'
import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi } from '../fixtures/campaigns'

test('a Keeper creates a Campaign and a Player joins it', async ({ page, browser }) => {
  const keeper = newAccount('Keeper')
  await signIn(page, keeper)

  const campaignId = await createCampaignViaUi(page, 'Dunwich')

  const player = newAccount('Player')
  const session = await signInNewContext(browser, player)
  await session.page.goto(`/campaigns/${campaignId}`)
  await session.context.close()
})
```

`newAccount()` builds a fresh `oid`, `name`, `email` triple. `signIn(page, account)` drives
the real MSAL redirect through the mock login page, filling the `username` field with the
Account's `oid` and the `claims` textarea with the Account's `name` and `email`. The Keeper
or Player distinction is set entirely through subsequent UI actions (whoever creates a
Campaign becomes its Keeper; whoever follows an Invite becomes a Player).

Multiple Accounts in one test must each live in their own browser context so MSAL's
sessionStorage cache does not collide: use `signInNewContext(browser, account)` for every
Account past the first, and close its `context` when done.

## Scenarios

All eight scenarios from PBI-E2E-001 are covered, each traced to `specs/campaign-play/spec.md`:

| Scenario | File                                             |
|----------|--------------------------------------------------|
| 1-4      | `tests/invite-management.spec.ts`                |
| 5, 6, 8  | `tests/player-join.spec.ts`                      |
| 7        | `tests/player-cannot-manage-invite.spec.ts`      |

`tests/home.spec.ts` additionally verifies the Sign In / Sign Up buttons redirect to the
mock authorize endpoint. `tests/smoke.spec.ts` is a frontend-only sanity check kept from
before the harness.

## Troubleshooting

### `Dev certificate PFX not found` on startup

The `globalSetup.ts` guard failed. Follow the one-time setup above.

### Mock container keeps restarting / port 8443 refuses TLS

mock-oauth2-server reads the keystore password from its JSON config
(`e2e/docker/mock-oauth2-config.json`, fields `keyPassword` and `keystorePassword`), not
from any environment variable. The committed value is `CocE2eDevCertP@ss1!`. If the PFX at
`e2e/.certs/dev-cert.pfx` was exported with any other password, the container fails to open
the keystore and exits in a crash loop. Re-run `dotnet dev-certs https --export-path ...`
with the exact password shown in the one-time setup above.

### `IDX10208: Unable to validate audience`

The API's `appsettings.E2E.json` is missing the `EntraId:Audience` entry. MIW 4.14.2 does
not auto-populate `TokenValidationParameters.ValidAudiences` from `ClientId` alone, so the
E2E config sets `Audience` explicitly.

### `IDW10201: Neither scope nor roles claim was found`

The mock's `tokenCallbacks` static `claims` must include `scp` (or `roles`). Confirm
`e2e/docker/mock-oauth2-config.json` still has `"scp": "access_as_user"`.

### `/api/account/me` returns 401 even when sign-in appears to succeed

Under .NET 10's JwtBearer defaults, the inbound `oid` claim is remapped away from the raw
`oid` name. `AccountController` falls back to `NameIdentifier` (populated from `sub`), so
the `username` field in the mock login form must carry the Account's identifier. The
`signIn` fixture already does this.

### Troubleshooting: slow first request after navigation

**Symptom.** On LocalDB, the first API call after a `page.goto` takes about 25 s and EF Core logs
`Executed DbCommand (25,032ms)` for ordinary queries. Specs fail waiting for data, or pass only
with a long local timeout.

**Cause.** On a machine low on free RAM, LocalDB trims itself to a memory-grant target of about
7 MB, so queries wait on `RESOURCE_SEMAPHORE`. Check it while a slow request is running:

```sql
-- Waiting requests show wait_type = RESOURCE_SEMAPHORE
SELECT r.session_id, r.wait_type, r.wait_time, g.requested_memory_kb, g.granted_memory_kb
FROM sys.dm_exec_requests r
LEFT JOIN sys.dm_exec_query_memory_grants g ON g.session_id = r.session_id
WHERE r.session_id > 50;

-- A target_memory_kb of a few thousand KB confirms the starvation
SELECT pool_id, target_memory_kb, available_memory_kb, grantee_count, waiter_count
FROM sys.dm_exec_query_resource_semaphores;
```

**What global setup does.** When the E2E connection string targets LocalDB, `globalSetup.ts`
raises `min server memory (MB)` to `LOCALDB_MIN_SERVER_MEMORY_MB` (900, in
`e2e/localDbMemory.ts`) through `sqlcmd`. It only raises the value, so reruns change nothing, and
it skips any other server (for example `COC_SQLSERVER_CONNECTION` in CI). If `sqlcmd` is missing
or the call fails, it logs a warning and the run continues. With 900 MB the grant target rose to
about 539 MB and the first call took 5 ms.

**Revert manually.**

```sql
EXEC sp_configure 'min server memory (MB)', 0; RECONFIGURE;
```

## Decisions and exemptions

- The LocalDB helpers in `e2e/localDbMemory.ts` are unit-tested (`npm run test:unit`); the
  `sqlcmd` call in `globalSetup.ts` is test infrastructure and is not.
- Fixtures in `e2e/fixtures/` are test code. They are intentionally not unit-tested per
  PBI-E2E-001's exemption.
- `backend/src/CocAssistant.Api/appsettings.E2E.json` is declarative configuration with no
  secrets; per the repo's testing policy, declarative config is exempt from unit testing.
- No `TestAuthHandler` or header bypass runs in the E2E API process. The real
  `Microsoft.Identity.Web` JWT validation pipeline is exercised against tokens minted by
  the local mock OIDC issuer.
- The frontend MSAL config is extracted into `buildMsalConfig(env)` for unit testing;
  `knownAuthorities` is always derived from the configured authority's host and is therefore
  environment-neutral.
- The keystore password `CocE2eDevCertP@ss1!` is committed in
  `e2e/docker/mock-oauth2-config.json` as a documented exception to the repo's "do not
  commit secrets" rule. It only protects a gitignored local dev certificate that is never
  used in production, and mock-oauth2-server's JSON config was not found to support
  environment-variable substitution for the keystore fields - the `SERVER_SSL_*` env vars
  the compose file originally tried were silently ignored by the standalone image. Pinning
  the value in the committed config keeps the mock, PFX, and password file aligned on a
  single known value instead of relying on each developer to configure a matching secret.

## Out of scope

- A configurable Campaign Player limit (hard-coded at 8 in the Domain).
- Presence assertions, member-list API, and other authenticated Campaign Play features that
  do not yet exist.
- A real-tenant smoke test. The ADR explicitly defers this to a possible future ticket.

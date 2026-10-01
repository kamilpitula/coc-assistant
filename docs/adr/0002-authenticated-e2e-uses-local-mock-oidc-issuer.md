# Authenticated E2E uses a local mock OIDC issuer

Authenticated Playwright tests sign in against a local mock OIDC issuer (`mock-oauth2-server` in Docker, served over HTTPS on `localhost:8443` with the trusted ASP.NET dev certificate) instead of the real Microsoft Entra External ID tenant. The real MSAL `loginRedirect` flow in the frontend and the real `Microsoft.Identity.Web` JWT validation in the API both run unchanged; only configuration differs. The API's `E2E` environment (`appsettings.E2E.json`) and the frontend's `e2e` Vite mode point `EntraId` / `VITE_ENTRA_*` at the mock, which mimics the Entra issuer format (`https://localhost:8443/<tenantId>/v2.0`, `tid` claim, `aud` = API client ID). The over-limit scenario alone needs nine Player Accounts plus a Keeper per test, and tests must run in parallel with isolated data, which a fixed set of real tenant accounts cannot support deterministically.

## Considered Options
- Real Entra External ID test tenant with email/password test users driven through the hosted sign-in page. Rejected: needs internet, secrets, 10+ shared accounts, and is exposed to hosted-UI, MFA, and captcha changes.
- Hybrid (mock issuer for coverage plus a real-tenant smoke test). Rejected for now; may be revisited if tenant configuration drift becomes a real risk.
- Injecting tokens into the MSAL cache or mocking the API with `page.route`. Rejected: skips the sign-in path, so it is not end-to-end.
- Reusing the header-based `TestAuthHandler` in the running API. Rejected: it is an authentication bypass.
- Mock issuer, configuration-only seam (chosen).

## Consequences
- No backend code is added for the seam. The frontend always sets `knownAuthorities` to its authority host, which is neutral across environments.
- If `Microsoft.Identity.Web` cannot accept the mock issuer through configuration alone, implementation stops and the seam is re-decided; there is no silent fallback to a code-level auth scheme.
- Real tenant configuration (user flow, Google and Microsoft federation, claim shapes) is not covered by E2E and remains a manual or future-smoke concern.
- Local prerequisites: Docker and a trusted ASP.NET dev certificate.

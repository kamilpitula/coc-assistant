---
id: PBI-E2E-001
status: done
blocked_by: []
---

# PBI-E2E-001: Authenticated E2E Coverage for Campaign Invites and Joining

## Directive
Establish an authenticated end-to-end test harness so business-critical authenticated workflows can be verified through the real UI and authentication stack, then cover the Campaign Invite management and Player join workflows that PBI-CP-002 left unverified end-to-end.

**Scope:**
- Add an authenticated Playwright harness consistent with this repository's Entra ID-based auth architecture (e.g., a test-only Entra ID test tenant/account, a mocked or stubbed MSAL auth provider usable by Playwright, or an equivalent approach). Do not introduce an insecure production auth bypass.
- Extend `e2e/tests/campaign-play.spec.ts` (or add new specs) to cover the authenticated Campaign Invite management and Player join workflows end-to-end, including authorization checks and over-limit rejection.
- Do not touch backend domain, application, or infrastructure code beyond a test-only auth seam needed to support the harness, if any. This issue enables E2E coverage broadly; it does not re-implement Campaign Play logic.

**Decided approach** (see `docs/adr/0002-authenticated-e2e-uses-local-mock-oidc-issuer.md`):
- Identity provider: `mock-oauth2-server` (Docker) over HTTPS on `localhost:8443`, using the trusted ASP.NET dev certificate exported to a gitignored PFX. No real-tenant smoke test.
- Backend seam is configuration only: committed `appsettings.E2E.json` points `EntraId` at the mock, which mimics the Entra issuer format (`.../<tenantId>/v2.0`, `tid` claim, `aud` = API client ID). If `Microsoft.Identity.Web` rejects it, stop and re-decide; no silent fallback.
- Frontend: always set MSAL `knownAuthorities` to the authority host; make the Vite `/api` proxy target env-configurable (default `http://localhost:5058`); both with unit tests. Committed `frontend/.env.e2e` holds mock values only.
- Playwright `webServer` starts the mock, the API (`ASPNETCORE_ENVIRONMENT=E2E`, own port, connection string via env var) and Vite (`--mode e2e`, own port). CI-ready, local-first.
- Separate E2E LocalDB database; `globalSetup` runs `dotnet ef database update` with dotnet-ef pinned in `.config/dotnet-tools.json`. Never dropped; tests use unique data.
- Fixtures (`e2e/fixtures/auth.ts`): `newAccount()` creates a unique Account identity per test; `signIn(page, account)` drives the real `loginRedirect` through the mock login page once per browser context. Keeper and Player relationships are established through the UI.
- Replace the placeholder tests in `campaign-play.spec.ts`; migrate `home.spec.ts` from the `ciamlogin` route stub to asserting the redirect to the mock.
- Document the harness in `docs/e2e/authenticated-harness.md` (prerequisites: Docker, trusted dev cert). Fixtures are test code and are exempt from unit tests.
- Out of scope: configurable Player limit, the Presence assertion, a member-list API.

## Dependencies
- Blocked by: None directly; informed by the gap found during PBI-CP-002 verification
- Must unblock: PBI-CP-002, PBI-CP-003 through PBI-CP-006, and any future authenticated-flow work

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Identity and access.
- Contract: Invite management and Player joining.

PBI-CP-002's ticket required that unit, integration, and E2E tests cover authorization, concurrency-sensitive limit enforcement, and the join workflow. However, `e2e/tests/campaign-play.spec.ts` only exercises unauthenticated, client-side-observable UI (for example, create-Campaign form validation and the Invite-management page structure) because this repository has no authenticated Playwright harness and no way to drive a real or simulated Entra ID sign-in from a Playwright test.

As a result, the business-critical workflows - a Keeper issuing, revoking, or replacing a Campaign Invite, and a Player joining through one, including authorization and over-limit rejection - are currently verified only by backend integration tests (`CampaignMembershipApiTests.cs` using header-based fake auth), not truly end-to-end through the real UI and authentication stack. This gap will recur for every future authenticated-flow ticket in Campaign Play (Investigators, Wall Entries, Presence, live updates), which is why it is tracked as its own cross-cutting issue rather than folded into the Campaign Play backlog.

## Verification
- [x] An authenticated Playwright harness can drive a signed-in Keeper and a signed-in Player without an insecure production auth bypass.
- [x] E2E tests cover a Keeper issuing, revoking, and replacing a Campaign Invite through the real UI.
- [x] E2E tests cover a Player joining through an active Invite, including authorization checks and over-limit rejection.
- [x] Scenarios covered, each traced to `specs/campaign-play/spec.md`:
  1. Keeper creates a persistent Campaign (signed in).
  2. Keeper issues an Invite and sees a shareable link.
  3. Keeper revokes the Invite; a new Account following the old link is not admitted.
  4. Keeper replaces the Invite; the old link is rejected and the new link admits a Player.
  5. Player joins through an active Invite (Presence line excluded).
  6. Eight Players join; the ninth sees "Campaign is full" (409 `LimitReached`).
  7. A Player cannot manage the Keeper's Invite: asserted in the UI and by a `page.request` call with the Player's real token expecting 404.
  8. The Keeper following their own Invite is refused (`KeeperCannotJoin`).
- [x] The harness is reusable for future authenticated-flow Campaign Play tickets.

## Refinement Protocol
If the authentication architecture changes, update the test harness to match the real Entra ID sign-in path before extending coverage. Keep the harness aligned with server-side authorization and never substitute an insecure bypass for the real auth stack.

## Follow-ups
- Refresh the stale Out of scope bullets in `docs/e2e/authenticated-harness.md`; Presence assertions and the member-list API now exist.

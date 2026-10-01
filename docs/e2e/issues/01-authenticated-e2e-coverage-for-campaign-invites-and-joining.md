# PBI-E2E-001: Authenticated E2E Coverage for Campaign Invites and Joining

## Directive
Establish an authenticated end-to-end test harness so business-critical authenticated workflows can be verified through the real UI and authentication stack, then cover the Campaign Invite management and Player join workflows that PBI-CP-002 left unverified end-to-end.

**Scope:**
- Add an authenticated Playwright harness consistent with this repository's Entra ID-based auth architecture (e.g., a test-only Entra ID test tenant/account, a mocked or stubbed MSAL auth provider usable by Playwright, or an equivalent approach). Do not introduce an insecure production auth bypass.
- Extend `e2e/tests/campaign-play.spec.ts` (or add new specs) to cover the authenticated Campaign Invite management and Player join workflows end-to-end, including authorization checks and over-limit rejection.
- Do not touch backend domain, application, or infrastructure code beyond a test-only auth seam needed to support the harness, if any. This issue enables E2E coverage broadly; it does not re-implement Campaign Play logic.

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
- [ ] An authenticated Playwright harness can drive a signed-in Keeper and a signed-in Player without an insecure production auth bypass.
- [ ] E2E tests cover a Keeper issuing, revoking, and replacing a Campaign Invite through the real UI.
- [ ] E2E tests cover a Player joining through an active Invite, including authorization checks and over-limit rejection.
- [ ] The harness is reusable for future authenticated-flow Campaign Play tickets.

## Refinement Protocol
If the authentication architecture changes, update the test harness to match the real Entra ID sign-in path before extending coverage. Keep the harness aligned with server-side authorization and never substitute an insecure bypass for the real auth stack.

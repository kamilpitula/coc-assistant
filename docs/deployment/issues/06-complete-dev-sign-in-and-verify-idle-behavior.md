---
id: PBI-DEP-006
status: todo
blocked_by: [PBI-DEP-005]
---

# PBI-DEP-006: Complete Dev Sign-in and Verify Idle Behavior

## Directive
Finish the one-time manual setup so Accounts can sign in to `dev`, and prove that the environment survives cold starts and idle play sessions.

**Scope:**
- **Docs:** add the dev Static Web App URL as a single-page application redirect URI step to `docs/entra-external-id-setup.md`; add the GHCR package visibility step and a cost re-check step to `docs/infrastructure/dev-environment-setup.md`.
- **Checks:** cold start (Container App at zero replicas, database paused) and a 10-minute idle play session, run in `dev` and recorded in this PBI.
- **Out of scope:** min replicas 1 or SignalR Standard; if a check fails, raise a follow-up with its cost for the owner's approval.

## Dependencies
- Blocked by: PBI-DEP-005 (a deployed environment)
- Must merge before: None

## Context
Read: `specs/deployment/spec.md` (Definition of Done, Scenarios "A cold start succeeds" and "An idle play session keeps live updates"), ADR 0031 (Revisit when), `docs/entra-external-id-setup.md`

## Verification
- [ ] An Account signs in on the dev Static Web App URL and the campaign list loads from the API.
- [ ] Cold start: the first sign-in and campaign list load succeed without a user-visible error.
- [ ] Idle session: after 10 minutes without HTTP requests, a Public Wall Entry reaches the Player without reloading and both Campaign Members show as Connected.
- [ ] The Azure cost analysis for the month so far matches `docs/infrastructure/costs.md`.

## Refinement Protocol
Update ADR 0031 and `docs/infrastructure/costs.md` if a check leads to a configuration or cost change.

## Follow-ups

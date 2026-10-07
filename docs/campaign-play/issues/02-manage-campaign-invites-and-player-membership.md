---
id: PBI-CP-002
status: done
blocked_by: [PBI-CP-001]
---

# PBI-CP-002: Manage Campaign Invites and Player Membership

## Directive
Build the end-to-end ability for a Keeper to manage the active Campaign Invite and for an authenticated Account to join as a Player. Enforce invite state and the configured Player limit atomically at the membership boundary.

**Scope:**
- Campaign Invite and Player membership domain behavior, Azure SQL persistence, API, Keeper and Player experiences, and focused unit, integration, and E2E coverage.
- Issue, revoke, replace, join, limit enforcement, and Campaign-scoped authorization.
- Do not implement Investigators, Wall Entries, Presence, or live updates.

## Dependencies
- Blocked by: PBI-CP-001: Create a Campaign and Establish Keeper Membership
- Must merge before: PBI-CP-003, PBI-CP-004, PBI-CP-005

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Campaign Structure, Identity and access, and Persistence.
- Constraints: Campaign Invite lifecycle and Player limit.
- Contract: Invite management and Player joining.
- Regression Guardrails: A revoked or replaced Invite cannot admit new Players.

## Verification
- [x] The Keeper can issue, revoke, and replace a Campaign Invite.
- [x] An Account can join through an active Invite until the configured Player limit is reached.
- [x] Revoked, replaced, invalid, and over-limit Invites cannot change membership.
- [x] Unit, integration, and E2E tests cover authorization, concurrency-sensitive limit enforcement, and the join workflow.

## Refinement Protocol
If the Campaign limit or Invite lifecycle changes, update the membership state rules and all related acceptance scenarios before implementation. Preserve the invariant that a Player belongs only to the Campaign joined through the active Invite.

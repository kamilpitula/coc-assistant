# PBI-CP-004: Author and Protect Campaign Wall Entries

## Directive
Build the end-to-end ability to create and read Campaign Wall Entries with Public or Keeper-only visibility. Enforce the visibility boundary in both ordinary responses and all Player-authorized operations.

**Scope:**
- Wall Entry domain behavior, Azure SQL persistence, API authorization and projections, Keeper and Player Campaign views, and focused unit, integration, and E2E coverage.
- Keeper authoring, permitted Player Public entries, Public and Keeper-only visibility, and Campaign scoping.
- The Campaign Wall page (`/campaigns/$campaignId/wall`), its "Wall" link in the Campaign navigation, and the overview's Wall preview ([specs/campaign-overview/ux.md](../../../specs/campaign-overview/ux.md) section 7, CO-UX-14).
- Do not implement SignalR delivery or Presence.

## Dependencies
- Blocked by: PBI-CP-001: Create a Campaign and Establish Keeper Membership; PBI-CP-002: Manage Campaign Invites and Player Membership
- Must merge before: PBI-CP-006

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Play Record, Identity and access, and Persistence.
- Constraints: Wall Entry authorship and visibility.
- Contract: Wall Entry authoring and Keeper-only protection.
- Regression Guardrails: Keeper-only Wall Entries never appear in Player-visible data.

## Verification
- [ ] The Keeper can create Public and Keeper-only Wall Entries.
- [ ] A Player can create only permitted Public Wall Entries for the Player's Campaign.
- [ ] A Player cannot read or infer Keeper-only Wall Entries through any response or authorized operation.
- [ ] Unit, integration, and E2E tests cover authoring, visibility, Campaign scoping, and authorization.

## Refinement Protocol
If Wall Entry visibility or author permissions change, update the authorization policy and every Player-facing projection together. Treat Keeper-only data protection as a hard invariant for future live delivery.

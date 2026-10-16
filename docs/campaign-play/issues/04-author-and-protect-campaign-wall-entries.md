---
id: PBI-CP-004
status: done
blocked_by: [PBI-CP-001, PBI-CP-002]
pr: 17
---

# PBI-CP-004: Author and Protect Campaign Wall Entries

## Directive
Build the end-to-end ability to create, read, and (for the Keeper) remove Campaign Wall Entries with Public or Keeper-only visibility. Enforce the visibility boundary in both ordinary responses and all Player-authorized operations.

**Scope:**
- Wall Entry domain behavior, Azure SQL persistence, API authorization and projections, Keeper and Player Campaign views, and focused unit, integration, and E2E coverage.
- Keeper authoring, permitted Player Public entries, Public and Keeper-only visibility, and Campaign scoping.
- Keeper removal of any Wall Entry as a hard delete. Wall Entries are not edited, and a Player cannot edit or remove any entry.
- The Campaign Wall page (`/campaigns/$campaignId/wall`), its "Wall" link in the Campaign navigation, and the overview's Wall preview ([specs/campaign-overview/ux.md](../../../specs/campaign-overview/ux.md) section 7, CO-UX-14).
- Do not implement SignalR delivery or Presence. The Play Session link on a Wall Entry is deferred.

## Dependencies
- Blocked by: PBI-CP-001: Create a Campaign and Establish Keeper Membership; PBI-CP-002: Manage Campaign Invites and Player Membership
- Must merge before: PBI-CP-006

## Context
Read: `specs/campaign-play/spec.md`; UX: `specs/campaign-wall/ux.md`
- Blueprint: Play Record, Identity and access, and Persistence.
- Constraints: Wall Entry authorship and visibility.
- Contract: Wall Entry authoring, removal, and Keeper-only protection.
- Regression Guardrails: Keeper-only Wall Entries never appear in Player-visible data.

## Verification
- [x] The Keeper can create Public and Keeper-only Wall Entries.
- [x] A Player can create only permitted Public Wall Entries for the Player's Campaign.
- [x] A Player cannot read or infer Keeper-only Wall Entries through any response or authorized operation.
- [x] The Keeper can remove any Wall Entry (a hard delete), and a Player cannot remove any entry.
- [x] Unit, integration, and E2E tests cover authoring, removal, visibility, Campaign scoping, and authorization.

## Refinement Protocol
If Wall Entry visibility or author permissions change, update the authorization policy and every Player-facing projection together. Treat Keeper-only data protection as a hard invariant for future live delivery.

## Follow-ups
- Play Session link or grouping on a Wall Entry: deferred by decision until Play Sessions exist; no field or placeholder was added.
- Live delivery of Wall Entries, the `wallEntries` topic, and the preview's "New Wall Entry from {author}." announcement are PBI-CP-006 (already planned); until then other members' entries appear after a reload.
- Align the vocabulary in `CONTEXT.md` with the spec and UI: "Keeper-Only Wall Entry" there versus "Keeper only" in the spec and UI, and "note" listed under Avoid for Wall Entry while the Constraints say "actions or notes". No edit was made to `CONTEXT.md`.
- The status line on the Wall page ("Wall Entry added.", "Wall Entry removed.") stays until the next add or remove; specs/campaign-wall/ux.md section 4.2 says it clears after the next edit.
- Editing a Wall Entry and a Player removing their own entry were left out on purpose; revisit only with a visibility-safe design for the live feature.
- Automated accessibility checks (axe in Storybook, 320px and 200% zoom runs) were not run for the new Wall components.

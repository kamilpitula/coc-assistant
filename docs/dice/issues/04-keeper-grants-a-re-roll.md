---
id: PBI-DICE-004
status: done
blocked_by: [PBI-DICE-003]
---

# PBI-DICE-004: Keeper grants a re-roll

## Directive
Let the Keeper, when returning a Submitted Investigator with a Change Request, allow the Player to roll Characteristics, Luck, or EDU checks again, while every earlier Roll Record stays visible to the Keeper.

**Scope:**
- **Change Request:** the Keeper picks the groups to grant when requesting changes.
- **Sheet:** granting marks the group's Roll Records as replaced and lifts the matching locks; the Player sees which groups they may roll again and rolls them with the existing actions.
- **Keeper review:** replaced Roll Records are shown as replaced; the Player's view leaves them out.
- **UI:** follows the ux.md recorded in PBI-DICE-002.
- **Out of scope:** re-rolls outside a Change Request.

## Dependencies
- Blocked by: PBI-DICE-003 (every roll group and lock exists).
- Must merge before: None.

## Context
Read: [character-sheet spec](../../../specs/character-sheet/spec.md), Re-roll grant and Creation locks; [campaign-play spec](../../../specs/campaign-play/spec.md), `request-changes`.
- A Roll Record is never changed except to mark it replaced, and never deleted.

## Verification
- [x] Requesting changes with a grant marks that group's Roll Records as replaced and lifts its locks; a grant for a group with no Roll Record returns 400.
- [x] After rolling the group again, the new Roll Records give the values and the group is locked again.
- [x] The Keeper sees replaced Roll Records; the Player does not.
- [x] Unit tests cover granting, rolling again, and the views; Playwright E2E covers the character-sheet scenario "Keeper grants a characteristics re-roll".

## Refinement Protocol
A change to re-roll grants updates the character-sheet and campaign-play specs, the character-sheet ux.md, and tests together.

## Follow-ups

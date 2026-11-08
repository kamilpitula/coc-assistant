---
id: PBI-DICE-007
status: todo
blocked_by: [PBI-DICE-005]
---

# PBI-DICE-007: Cancel waiting rolls

## Directive
Let the Keeper cancel a waiting Requested Roll, and cancel waiting rolls automatically when the Scene finishes or an Investigator leaves it, so no request is left hanging.

**Scope:**
- **Cancel:** the Keeper cancels a Waiting Requested Roll.
- **Scene lifecycle:** finishing the Active Scene, or removing an Investigator present, cancels the affected waiting rolls in the same transaction; the Keeper's finish confirmation shows how many will be cancelled.
- **UI:** cancelled rolls stay on the card as Cancelled and leave the Player's panel and badge; follows the roll-requests ux.md.
- **Out of scope:** declining a push on finish (PBI-DICE-009 adds it with the push states).

## Dependencies
- Blocked by: PBI-DICE-005 (Roll Requests).
- Must merge before: None.

## Context
Read: [roll-requests spec](../../../specs/roll-requests/spec.md), Lifecycle with the Scene; [scene-play spec](../../../specs/scene-play/spec.md), Constraints and the finish and present-investigators contracts.

## Verification
- [ ] The Keeper cancels a Waiting Requested Roll; cancelling any other status returns 409.
- [ ] Finishing the Scene and removing an Investigator present cancel the affected waiting rolls in one transaction.
- [ ] The finish confirmation names the number of waiting rolls.
- [ ] Unit tests cover cancellation and the Scene transitions; Playwright E2E covers the roll-requests scenarios "Keeper cancels a waiting roll", "Finishing the Scene cancels waiting rolls", and "Removing an Investigator present cancels their waiting rolls".

## Refinement Protocol
A change to cancellation updates the roll-requests and scene-play specs, the roll-requests ux.md, and tests together.

## Follow-ups

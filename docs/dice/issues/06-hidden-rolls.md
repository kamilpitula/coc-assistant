---
id: PBI-DICE-006
status: todo
blocked_by: [PBI-DICE-005]
---

# PBI-DICE-006: Hidden rolls

## Directive
Let the Keeper make a Keeper-only Roll Request that the server rolls at once, so the Keeper can roll in secret for an Investigator without any Player seeing it.

**Scope:**
- **Roll Requests:** the `KeeperOnly` visibility; all Requested Rolls are rolled at creation with the Keeper as roller.
- **Visibility:** the card, the results, and live signals go only to the Keeper; Players get 404 for the Roll Request and no panel entry or badge.
- **UI:** follows the roll-requests ux.md.
- **Out of scope:** pushing a hidden roll, which is not possible.

## Dependencies
- Blocked by: PBI-DICE-005 (Roll Requests and the Wall card).
- Must merge before: None.

## Context
Read: [roll-requests spec](../../../specs/roll-requests/spec.md), Hidden roll, Visibility of results, and Live updates; [campaign-play spec](../../../specs/campaign-play/spec.md), Wall Entry visibility.

## Verification
- [ ] A Keeper-only Roll Request is Rolled at creation with the Keeper as roller.
- [ ] No Player receives the card, its results, a panel entry, a badge, or a live signal for it.
- [ ] Unit tests cover the use case and the publication audience; Playwright E2E covers the roll-requests scenarios "A hidden roll is rolled at once and stays Keeper-only" and "A Player cannot read a hidden Roll Request".

## Refinement Protocol
A change to hidden rolls updates the roll-requests spec and ux.md and tests together.

## Follow-ups

---
id: PBI-DICE-009
status: todo
blocked_by: [PBI-DICE-005]
---

# PBI-DICE-009: Push a roll

## Directive
Let a Player ask to push a failed roll with a justification, and let the Keeper approve or decline it, so a pushed roll is played and recorded as the rules describe.

**Scope:**
- **Roll Requests:** the `PushAsked` and `Pushed` statuses, asking with a justification, approving, declining, and rolling the pushed roll as a second Roll Record.
- **Rules:** only failed, not yet pushed, pushable rolls of Public Roll Requests can be pushed.
- **Scene lifecycle:** finishing the Scene or removing an Investigator present cancels `Pushed` rolls and declines `PushAsked` ones.
- **UI:** the push states on the panel and the card follow the roll-requests ux.md.
- **Out of scope:** consequences of a failed pushed roll beyond recording it.

## Dependencies
- Blocked by: PBI-DICE-005 (Roll Requests). The pushing rules come from PBI-DICE-001, which PBI-DICE-005 already requires.
- Must merge before: None.

## Context
Read: [roll-requests spec](../../../specs/roll-requests/spec.md), Requested Roll status, Lifecycle with the Scene, and the push API; the skill rolls document, Pushing a roll.

## Verification
- [ ] A Player asks to push a pushable failed roll; any other roll returns 409, and a missing or too long justification returns 400.
- [ ] The Keeper approves or declines; after approval the Player rolls once more and the card shows the justification and both results.
- [ ] Finishing the Scene or removing an Investigator present cancels `Pushed` rolls and declines `PushAsked` ones.
- [ ] Unit tests cover each transition and its rule section; Playwright E2E covers the roll-requests scenarios "A Player asks to push a failed roll and the Keeper approves" and "The Keeper declines a push".

## Refinement Protocol
A change to pushing updates the roll-requests spec and ux.md, the skill rolls document reference, and tests together.

## Follow-ups

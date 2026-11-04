---
id: PBI-SPL-007
status: todo
blocked_by: [PBI-SPL-006]
---

# PBI-SPL-007: Wall on the Active Scene

## Directive
Let the Keeper and Players read the latest Campaign Wall Entries and post to the Wall from the Active Scene, so recording what happens never means leaving the scene.

**Scope:**
- **Region:** `active-scene-wall` on Run, above Investigators present for the Keeper and in the right column for Players (including a Player whose Investigator is not present), reusing `wall-preview` and the Wall page's compose form.
- **Reuse:** extract the compose form from the Wall page so both places use one component; no copy.
- **Tests:** unit, Storybook, and E2E.
- **Out of scope:** Remove and older entries on the Active Scene; Wall Entries tied to a Scene.

## Dependencies
- Blocked by: PBI-SPL-006 (the Run layout).
- Must merge before: None.

## Context
Read: [scene-play ux](../../../specs/scene-play/ux.md) sections 21.3 and 21.8; [campaign-wall ux](../../../specs/campaign-wall/ux.md) sections 4.2, 4.5, and 7; the Wall Entry API in [campaign-play spec](../../../specs/campaign-play/spec.md); the reference prototype [specs/navigation/prototype/active-scene.html](../../../specs/navigation/prototype/active-scene.html) (Keeper and Player).
- The prototype uses a "Keeper only" checkbox for brevity; the spec keeps the Wall page's "Who can read this?" radio group.
- A Player must never receive a Keeper-only entry; the preview's query already guarantees this.

## Verification
- [ ] SPL-UX-49 and SPL-UX-50 hold, and the campaign-wall criteria for compose and live updates hold in the new place.
- [ ] Unit tests cover the region for Keeper, present Player, and absent Player.
- [ ] Storybook stories for the region in each role.
- [ ] Playwright E2E covers the scene-play spec scenarios "The Keeper posts to the Wall from the Active Scene" and "A Player never sees a Keeper-only Wall Entry on the Active Scene".
- [ ] Screenshots of Run (Keeper) and the Player view match the prototype's Wall placement.

## Refinement Protocol
A change to the region updates scene-play ux section 21.8, the note in campaign-wall ux section 7, the shared compose component, and tests together.

## Follow-ups
- Wall Entries tied to a Scene, so the Active Scene could show only this Scene's entries (needs a domain term in CONTEXT.md and a decision).

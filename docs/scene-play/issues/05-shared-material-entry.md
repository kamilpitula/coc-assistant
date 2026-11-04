---
id: PBI-SPL-005
status: todo
blocked_by: [PBI-NAV-002]
---

# PBI-SPL-005: Shared Material Entry

## Directive
Show a Scene's Handouts, Non-Player Entity links, and Items through one material entry on the Scene page and the Active Scene, so material looks and opens the same before and during play.

**Scope:**
- **Component:** `scenario-preparation/components/material-entry` with a title button that opens the `handout` or `entity` side panel, the second line by subject, and status and action slots.
- **Scene page:** sections 32, 41, and 64.1 render their lists with it; move controls, "Edit", and "Unlink" move into the action slot unchanged; the Non-Player Entity description moves into the `entity` panel.
- **Active Scene:** the existing Handout and Non-Player Entity lists use it until PBI-SPL-006 regroups them.
- **Tests:** unit, Storybook stories for each subject and context, and E2E.
- **Out of scope:** the Active Scene grouping (PBI-SPL-006); an `item` panel (PBI-SPL-003).

## Dependencies
- Blocked by: PBI-NAV-002 (the side panel and the `handout` and `entity` panel types).
- Must merge before: PBI-SPL-006 (its lists are built from this entry).

## Context
Read: [scenario-preparation ux](../../../specs/scenario-preparation/ux.md) sections 32, 41, 64.1, and 72; [navigation ux](../../../specs/navigation/ux.md) section 3; the "Scene page" view of the reference prototype [specs/navigation/prototype/active-scene.html](../../../specs/navigation/prototype/active-scene.html).
- Keep every existing accessible name, focus target, and status message of the Scene page.
- The prototype shows Edit and Delete on Handouts for illustration only; section 72 keeps the existing move controls.

## Verification
- [ ] SP-UX-107 to SP-UX-109 and SP-A11Y-60 hold; the existing Scene page criteria for move, link, unlink, and status messages still pass.
- [ ] Unit tests cover the second line per subject, slot rendering, and the title opening the right panel.
- [ ] Storybook stories for Handout, Non-Player Entity, and Item in both contexts.
- [ ] Playwright E2E covers opening a Handout and a Non-Player Entity panel from the Scene page and "Open full page"; existing Scene page E2E specs are updated where the title no longer navigates.
- [ ] Screenshots of the Scene page match the prototype's "Scene page" entry structure.

## Refinement Protocol
A change to the entry updates scenario-preparation ux section 72, scene-play ux section 21.4 and 21.5, the component, its stories, and its tests together.

## Follow-ups

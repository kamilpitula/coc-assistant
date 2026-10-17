---
id: PBI-SP-008
status: todo
blocked_by: [PBI-SP-002, PBI-SP-005]
---

# PBI-SP-008: Prepare Campaign Items

## Directive
Build the end-to-end ability for a Keeper to create and edit Campaign-scoped Items, give them rich-text Handouts, and link them to the Scenes where they matter.

**Scope:**
- **Domain and persistence:** Item with name, Player-facing description, Keeper notes, optional Handouts, a holder (always no one until PBI-SPL-003), and Scene links; deletion refused while an Item is held or linked to an Active or Finished Scene.
- **API and UI:** an Items list for the Campaign, an Item page, and linking on the Scene page, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** giving and taking back Items (PBI-SPL-003), revealing Items (PBI-SPL-002).

## Dependencies
- Blocked by: PBI-SP-002 (Scenes to link to); PBI-SP-005 (Handouts on Items).
- Must merge before: PBI-SP-006; PBI-SPL-003.

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Domain relationships (Items).
- Constraints: Item fields; Campaign scoping; deletion rules.
- Scenarios: Keeper prepares an Item; a held Item cannot be deleted; Campaign isolation.
Read: `CONTEXT.md` (Item; Gear is a different concept).

## Verification
- [ ] A Keeper can create, edit, and delete Items and link and unlink them on a Prepared or Active Scene.
- [ ] Items of another Campaign are unavailable and rejected by the API.
- [ ] Deleting an Item linked to an Active or Finished Scene is refused.
- [ ] Unit, integration, and E2E tests cover validation, linking, and authorization.

## Refinement Protocol
If Item fields or holder rules change, update the spec Constraints and the Scene Play spec together.

## Follow-ups

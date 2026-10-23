---
id: PBI-SP-008
status: done
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
- [x] A Keeper can create, edit, and delete Items and link and unlink them on a Prepared or Active Scene.
- [x] Items of another Campaign are unavailable and rejected by the API.
- [x] Deleting an Item linked to an Active or Finished Scene is refused.
- [x] Unit, integration, and E2E tests cover validation, linking, and authorization.

## Refinement Protocol
If Item fields or holder rules change, update the spec Constraints and the Scene Play spec together.

## Follow-ups
- PBI-SPL-003: register a Scene Play `IItemHolders` adapter in place of `NoItemHolders`, and make a give that races a delete of the same Item fail safely (ADR 0022). Until then "a held Item cannot be deleted" is covered only by `ItemService` unit tests with a fake holder port.
- PBI-SPL-002: count "has a Reveal" as in play through a port before an Item or an Item's Handout can be revealed, because unlinking an Item from an Active Scene is allowed (ADR 0022).
- PBI-SPL-001: re-check the race between a delete's usage check and a Scene start for Items (ADR 0019, ADR 0022), and add E2E coverage for the Active and Finished Item cases (delete refused, Finished link refused, Handout delete hidden), which integration and component tests cover today.
- E2E: on a workstation under memory pressure LocalDB shrinks its query-memory-grant target (about 7 MB) and queries that ask for more wait about 25 s on RESOURCE_SEMAPHORE, so first requests after a deep link stall and the specs need 20 s timeouts (`scene-links.spec.ts` and `scene-file-handouts.spec.ts` already have them). The suite should set a LocalDB `min server memory` in global setup, or the Item list query should ask for a smaller grant.

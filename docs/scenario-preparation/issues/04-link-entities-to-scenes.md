---
id: PBI-SP-004
status: done
blocked_by: [PBI-SP-002, PBI-SP-003, PBI-SP-009]
---

# PBI-SP-004: Link Non-Player Entities to Scenes

## Directive
Build the end-to-end ability for a Keeper to link Human NPCs and Mythos Creatures from the same Campaign to a Scene, each link with a Player-facing name and rich-text description, and manage those links. A linked entity remains its original profile type and data.

**Scope:**
- **Domain and persistence:** Scene-to-Non-Player Entity link with its Player-facing name and description; link validation against the owning Campaign; links are read-only on a Finished Scene; a Non-Player Entity linked to an Active or Finished Scene cannot be deleted.
- **API and UI:** link, edit, and unlink on the Scene page, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** revealing a Non-Player Entity to Investigators (PBI-SPL-002), Handouts, source-document extraction.

## Dependencies
- Blocked by: PBI-SP-002 (Scenes); PBI-SP-003 (Human NPC profiles); PBI-SP-009 (Mythos Creature profiles).
- Must merge before: PBI-SP-006; PBI-SPL-002 (Reveals of Non-Player Entities use the Player-facing description).

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Scene and Non-Player Entity relationships, Rich text.
- Constraints: Player-facing name and description on the link; deletion of material referred to by an Active or Finished Scene.
- Scenarios: linking a Mythos Creature, deletion refusal, Campaign isolation.
Read: `docs/adr/0015-store-rich-text-as-validated-lexical-json.md`.

## Verification
- [x] A Keeper can link, edit, and unlink Human NPCs and Mythos Creatures on a Prepared or Active Scene, with a Player-facing name and description.
- [x] Entities from another Campaign are unavailable and rejected by the API.
- [x] Linked Mythos Creatures retain attacks, armor, special abilities, and sanity loss in Scene results.
- [x] Deleting a Non-Player Entity linked to an Active or Finished Scene is refused.
- [x] Duplicating a Non-Player Entity linked to a Scene creates a copy with no Scene links (spec scenario "Keeper duplicates a profile"; deferred from PBI-SP-010).

## Refinement Protocol
If relationship cardinality or deletion behavior is unclear, clarify the Blueprint before implementation. Keep Non-Player Entities scoped to one Campaign and reusable across Scenes only within that Campaign. The profile never becomes Player-visible.

## Follow-ups
- Add a glossary entry "Non-Player Entity link" to `CONTEXT.md`; both specs already use the phrase (spec.md Constraints, scene-play spec) and the design record D7 relies on it.
- PBI-SPL-001 must re-check, when it adds starting a Scene, the race between a profile delete (usage check, then delete) and a Scene being started in between; the cascade could then remove a link of a Scene that is already Active (design record, accepted limitation).
- PBI-SPL-001 adds the end-to-end coverage that needs Active and Finished Scenes: the link actions hidden on a Finished Scene (SP-UX-57), "Material a played Scene refers to cannot be deleted" and the refused delete dialog (SP-UX-58); today they are covered by seeded integration tests and component tests.
- PBI-SPL-002 must not let a Reveal block unlinking or the profile-delete cascade; the Reveal snapshot keeps the Player-facing content (scene-play spec line 39).
- Show on a profile page which Scenes link it, and link from a profile page (ux.md section 39, deferred).
- Reorder a Scene's links (ux.md section 39, deferred; links are shown in the order linked).
- Decide whether a radio list with search is enough for Campaigns with many Non-Player Entities or a combobox is needed (ux.md section 39 research gap).
- Run the Storybook accessibility checks on the new Scene link stories (320px reflow, SP-A11Y-36): the stories were written and type-checked but Storybook was not run in this pass.
- When a link write targets a Finished Scene with an entity outside the Campaign, the API answers 400 `nonPlayerEntity` rather than 409, because the entity check runs before the Scene's Finished check; swap the order if a stricter contract is wanted.

---
id: PBI-SP-004
status: todo
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
- [ ] A Keeper can link, edit, and unlink Human NPCs and Mythos Creatures on a Prepared or Active Scene, with a Player-facing name and description.
- [ ] Entities from another Campaign are unavailable and rejected by the API.
- [ ] Linked Mythos Creatures retain attacks, armor, special abilities, and sanity loss in Scene results.
- [ ] Deleting a Non-Player Entity linked to an Active or Finished Scene is refused.
- [ ] Duplicating a Non-Player Entity linked to a Scene creates a copy with no Scene links (spec scenario "Keeper duplicates a profile"; deferred from PBI-SP-010).

## Refinement Protocol
If relationship cardinality or deletion behavior is unclear, clarify the Blueprint before implementation. Keep Non-Player Entities scoped to one Campaign and reusable across Scenes only within that Campaign. The profile never becomes Player-visible.

## Follow-ups

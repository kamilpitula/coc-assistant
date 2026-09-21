# PBI-SP-004: Link Non-Player Entities to Scenes

## Directive
Build the end-to-end ability for a Keeper to link Human NPCs and Mythos Creatures from the same Campaign to a Scene and manage those links. A linked entity remains its original profile type and data.

**Scope:**
- Scene-to-Non-Player Entity relationship, persistence, API, preparation UI, and focused unit, integration, and E2E coverage.
- Link validation against the owning Campaign.
- Do not implement Handout storage or source-document extraction.

## Dependencies
- Blocked by: PBI-SP-002: Manage Ordered Scenes; PBI-SP-003: Create Non-Player Entity Profiles
- Must merge before: PBI-SP-006

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Scene and Non-Player Entity relationships.
- Contract: linking Human NPCs and Mythos Creatures to a Scene.
- Scenarios: linking a Mythos Creature and isolating Campaign material.

## Verification
- [ ] A Keeper can link and unlink Human NPCs and Mythos Creatures on a Scene.
- [ ] Entities from another Campaign are unavailable and rejected by the API.
- [ ] Linked Mythos Creatures retain attacks, armor, special abilities, and sanity loss in Scene results.

## Refinement Protocol
If relationship cardinality or deletion behavior is unclear, clarify the Blueprint before implementation. Keep Non-Player Entities scoped to one Campaign and reusable across Scenes only within that Campaign.

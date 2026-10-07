---
id: PBI-SP-003
status: todo
blocked_by: [PBI-SP-001]
---

# PBI-SP-003: Create Non-Player Entity Profiles

## Directive
Build the end-to-end ability for a Keeper to create and edit campaign-scoped Human NPC and Mythos Creature profiles. Keep the two profile shapes distinct so Mythos Creature information remains independently representable.

**Scope:**
- Human NPC and Mythos Creature domain behavior, persistence, API, preparation UI, and focused unit, integration, and E2E coverage.
- Campaign scoping and profile-specific validation.
- Do not implement Scene links, Handouts, or source-document extraction.

## Dependencies
- Blocked by: PBI-SP-001: Create and Edit a Campaign Scenario
- Must merge before: PBI-SP-004, PBI-SP-006

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Human NPC and Mythos Creature distinctions.
- Constraints: profile-specific information and Campaign-scoped Non-Player Entities.
- Contract: creation of both profile types.
- Regression Guardrails: Mythos Creatures are not forced into the Human NPC profile shape.

Read: `docs/game-rules/coc7_character_creation_and_development_rules.md`
- Sections 2 and 6: characteristics and skills used by Human NPC profiles.
- Mythos Creature profile rules are not yet in `docs/game-rules/`; add them there before implementing Mythos Creature profiles.

## Verification
- [ ] A Keeper can create and edit a Human NPC with relevant human characteristics, skills, and details.
- [ ] A Keeper can create and edit a Mythos Creature with attacks, armor, special abilities, and sanity loss where applicable.
- [ ] Profiles cannot be read or modified across Campaign boundaries, with unit, integration, and E2E coverage.

## Refinement Protocol
If either profile requires additional Call of Cthulhu 7th Edition fields, add the rule to `docs/game-rules/` first, then update the domain contract and retain separate Human NPC and Mythos Creature concepts.

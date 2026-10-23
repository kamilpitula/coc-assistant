---
id: PBI-SP-009
status: done
blocked_by: [PBI-SP-003]
---

# PBI-SP-009: Create Mythos Creature Profiles

## Directive
Build the end-to-end ability for a Keeper to create, edit, and delete Campaign-scoped Mythos Creatures with a Monster Profile, from mundane beasts to unique entities, without forcing them into the Human NPC shape.

**Scope:**
- **Domain and persistence:** the Mythos Creature aggregate and its Monster Profile (Creature Kind, narrative fields, characteristics, movement modes, attacks per round, Dodge, attacks, armor, immunities, vulnerabilities, skills, spells, powers, sanity loss, defeat outcome), Derived Value Overrides with reasons, and Hit Points not applicable with a defeat outcome.
- **API and UI:** creating, editing, and deleting a Mythos Creature in the Non-Player Entity list, designed through this PBI's editor UX on top of the shared Non-Player Entity UX pass.
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** duplicating (PBI-SP-010), Scene links (PBI-SP-004), published stat blocks and random-inspiration tables, profile groups, AI drafting.

## Dependencies
- Blocked by: PBI-SP-003 (the Non-Player Entity list, shared game-rules kernel, and dice notation).
- Must merge before: PBI-SP-004 (links to Mythos Creatures); PBI-SP-006.

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Non-Player Entity API and profiles.
- Constraints: Monster Profile fields, profile text limits.
- Regression Guardrails: a Mythos Creature is never forced into the Human NPC shape; only Monster Profiles have overrides.
- Scenarios: the Mythos Creature, dice notation, override, and Hit Points not applicable scenarios.
Read: `docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md` section 5 (monster creation procedure and profile checklist).
Read: `docs/game-rules/project_ruleset.md` section 5.
Read: `CONTEXT.md` (Mythos Creature, Monster Profile, Creature Kind, Derived Value Override).
Read: `specs/scenario-preparation/ux.md` sections 21 to 30 (shared Non-Player Entity UX); add the Monster Profile field-level design to section 25.5 first.

## Verification
- [x] A Keeper can create, edit, and delete a Mythos Creature with attacks, armor, immunities, vulnerabilities, spells, powers, and sanity loss where applicable.
- [x] Derived values are computed, and each Derived Value Override is kept with its reason beside the computed value.
- [x] An override without a reason, Hit Points not applicable without a defeat outcome, and malformed dice notation are refused.
- [x] Profiles cannot be read or modified across Campaign boundaries or by Players, with unit, integration, and E2E coverage.

## Refinement Protocol
If the Monster Profile needs another Call of Cthulhu 7th Edition field, add the rule to `docs/game-rules/` first, then update the spec Constraints and the domain contract, keeping Human NPC and Mythos Creature separate.

## Follow-ups
- Run the Storybook accessibility checks on the new Monster Profile stories (320px reflow, SP-A11Y-26); the stories were written but Storybook was not run in this pass.
- Move the campaign-play hooks and fields reused by the editors into `src/shared/` (the PBI-SP-003 D7 follow-up, left out of scope).
- Add `NonPlayerEntityRuleDataAdapterTests` (left out of scope). -> PBI-SP-006

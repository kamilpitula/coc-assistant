---
id: PBI-SP-003
status: todo
blocked_by: [PBI-SP-001]
---

# PBI-SP-003: Create Human NPC Profiles

## Directive
Build the end-to-end ability for a Keeper to create, edit, and delete Campaign-scoped Human NPCs with an NPC Profile that holds only the detail the Scenario needs, and lay the shared Non-Player Entity groundwork that Mythos Creature profiles (PBI-SP-009) build on.

**Scope:**
- **Shared game-rules kernel:** first, a refactor commit with no behavior change that moves the Campaign Play rule calculations into `CocAssistant.GameRules.Domain` per ADR 0017; then the dice notation and difficulty levels there.
- **Domain and persistence:** the Human NPC aggregate and its NPC Profile (narrative core, required name and age, optional Characteristics, Skills, Combat, and Spells sections), Campaign scoping, structural validation, and computed derived values with no overrides.
- **API and UI:** the Non-Player Entity list, creating, editing, and deleting a Human NPC, designed through the shared Non-Player Entity UX pass and this PBI's editor UX.
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** Mythos Creatures (PBI-SP-009), duplicating (PBI-SP-010), Scene links and the delete refusal they bring (PBI-SP-004), profile groups, AI drafting, dice rolling, source-document extraction.

## Dependencies
- Blocked by: PBI-SP-001 (Campaign-scoped Scenario Preparation and Keeper authorization).
- Must merge before: PBI-SP-004 (links need profiles); PBI-SP-009 (reuses the list, kernel, and dice notation); PBI-SP-006.

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Non-Player Entity API and profiles, SignalR exception.
- Constraints: NPC Profile fields, profile text limits.
- Scenarios: the Human NPC scenarios, deleting an unlinked profile, Keeper-only profiles.
Read: `docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md`
- Sections 3 and 4: shared mechanics, difficulty from an Opposing Value, Human NPC creation.
Read: `docs/game-rules/project_ruleset.md` section 5 (ranges, MOV gap, derived values, dice notation, spells, NPC skills and weapons, validation).
Read: `docs/adr/0017-shared-game-rules-kernel-for-derived-values-and-dice-notation.md`.
Read: `CONTEXT.md` (Human NPC, NPC Profile, Opposing Value).
Read: `specs/scenario-preparation/ux.md` sections 21 to 30 (shared Non-Player Entity UX); add the NPC Profile field-level design to section 25.4 first.

## Verification
- [ ] Moving the rule calculations to the shared kernel changes no Campaign Play behavior; the existing tests pass unchanged.
- [ ] A Keeper can create, edit, and delete a Human NPC with only a name and an age, and add or remove the Characteristics, Skills, Combat, and Spells sections.
- [ ] Derived values and MOV are computed per project_ruleset.md sections 5.3 and 5.4, and each skill shows its Investigator difficulty.
- [ ] Out-of-range values, malformed dice notation, and Damage Bonus on a firearm weapon are refused.
- [ ] Profiles cannot be read or modified across Campaign boundaries or by Players, with unit, integration, and E2E coverage.

## Refinement Protocol
If the NPC Profile needs another Call of Cthulhu 7th Edition field, add the rule to `docs/game-rules/` first, then update the spec Constraints and the domain contract, keeping Human NPC and Mythos Creature separate.

## Follow-ups
- AI drafting of NPC and Monster Profiles from a Keeper's concept, reusing the Foundry structured-output setup planned for extraction.
- Profile groups (several similar Human NPCs or Mythos Creatures with shared values and named exceptions).
- Align Investigator Custom Weapons with the section 10.1 weapon shape and the dice notation used by NPC Profile weapons.

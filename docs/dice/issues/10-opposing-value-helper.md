---
id: PBI-DICE-010
status: todo
blocked_by: [PBI-DICE-005]
---

# PBI-DICE-010: Opposing Value helper

## Directive
Let the Keeper set a Requested Roll's Difficulty from a Non-Player Entity's Opposing Value, so acting against an NPC or a Mythos Creature uses the Investigator Difficulty the rules give.

**Scope:**
- **Spec first:** add the helper to the roll-requests spec (how the Keeper picks a Non-Player Entity linked to the Active Scene and one of its values, and how the Difficulty follows) and confirm it with the project owner.
- **UX first:** extend the roll-requests ux.md through the UX designer skill.
- **Roll Requests:** the request form offers the Non-Player Entity's values and fills in the Difficulty; the Keeper can still change it.
- **Out of scope:** opposed rolls, where the Keeper rolls for the Non-Player Entity.

## Dependencies
- Blocked by: PBI-DICE-005 (the request form).
- Must merge before: None.

## Context
Read: [roll-requests spec](../../../specs/roll-requests/spec.md); [NPC ruleset section 3.4](../../game-rules/coc_7e_npc_and_monster_creation_ruleset.md#34-skill-difficulty-for-an-investigator-opposing-an-npc-or-monster); [project_ruleset.md sections 5.7 and 5.9](../../game-rules/project_ruleset.md#57-npc-profile-skills-and-weapons); `CONTEXT.md` Opposing Value and Investigator Difficulty.
- The profile never reaches Players; only the resulting Difficulty is shown to them.

## Verification
- [ ] The roll-requests spec and ux.md describe the helper and are confirmed.
- [ ] Picking a Non-Player Entity's value sets the Difficulty per NPC ruleset section 3.4, and the Keeper can override it.
- [ ] No Player receives the Non-Player Entity's profile values.
- [ ] Unit tests cover the Difficulty mapping, named after its rule section; Playwright E2E covers a Roll Request whose Difficulty comes from an Opposing Value.

## Refinement Protocol
A change to the helper updates the roll-requests spec and ux.md and tests together.

## Follow-ups

---
id: PBI-DICE-002
status: done
blocked_by: []
---

# PBI-DICE-002: Roll characteristics with the app

## Directive
Let a Player using Standard Rolling roll their characteristics with one action that the server rolls, replacing typed-in dice totals, and build the shared Dice module that every later roll uses.

**Scope:**
- **UX first:** run the UX designer skill for all creation rolling (characteristics, Luck, EDU checks, locks, and the re-roll grant of PBI-DICE-003 and PBI-DICE-004), present 2-3 options, and record the chosen one in `specs/character-sheet/ux.md`.
- **Dice module:** the secure dice roller and dice expression rolling, per the dice spec. The percentile roll resolver is not part of this PBI.
- **Roll Records:** the new Roll Record shape with faces, who rolled, and when, in Character Sheet schema version 5; existing `PlayerEntered` records upgrade unchanged.
- **Creation:** the roll characteristics action, the Creation Method lock, and the dice results table showing faces and who rolled.
- **Rules:** rewrite `project_ruleset.md` section 4.3 so the app rolls, server-side, on the Player's action.
- **Out of scope:** Luck and EDU checks (PBI-DICE-003), re-roll grants (PBI-DICE-004), and percentile rolls.

## Dependencies
- Blocked by: None.
- Must merge before: PBI-DICE-003 (reuses the Dice module and the new Roll Record), PBI-DICE-005 (extends the Dice module).

## Context
Read: [dice spec](../../../specs/dice/spec.md); [character-sheet spec](../../../specs/character-sheet/spec.md), Roll Records, Creation rolling, Creation locks, Persistence, and API Contracts; [character rules section 2.1](../../game-rules/coc7_character_creation_and_development_rules.md#21-standard-rolling-method); [project_ruleset.md section 4.3](../../game-rules/project_ruleset.md#43-dice-results-at-creation) and [section 5.5](../../game-rules/project_ruleset.md#55-dice-notation).
- Reuse the existing dice expression and notation types in the game-rules domain.
- Point Buy and Quick Fire are unchanged.

## Verification
- [x] The UX specification is recorded in the character-sheet ux.md and linked from its spec.
- [x] Rolling characteristics stores one Roll Record per characteristic with source Server and faces, and a second roll returns 409.
- [x] Changing the Creation Method after a characteristic roll returns 409.
- [x] A Draft with typed-in characteristic totals from before keeps them.
- [x] No backend code outside the secure roller produces random numbers.
- [x] Unit tests cover the roller, dice expression rolling, the action, and the lock; Playwright E2E covers the character-sheet scenarios "Standard Rolling characteristics are rolled by the server", "Characteristics are rolled only once", and "Rolled characteristics lock the Creation Method".

## Refinement Protocol
A change to dice behavior updates the dice spec; a change to creation rolling updates the character-sheet spec and ux.md, its validation fixtures, and tests together.

## Follow-ups

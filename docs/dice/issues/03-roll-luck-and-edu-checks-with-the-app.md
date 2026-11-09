---
id: PBI-DICE-003
status: todo
blocked_by: [PBI-DICE-002]
---

# PBI-DICE-003: Roll Luck and EDU checks with the app

## Directive
Let a Player roll Luck and each EDU improvement check with the app under every Creation Method, so the creation wizard has no field where a Player types a dice result.

**Scope:**
- **Luck:** one action rolls Luck, and the second roll when the age bracket has two.
- **EDU checks:** one action rolls the next check and, when it improves EDU, its gain.
- **Locks:** the age bracket locks after Luck or any EDU check is rolled; EDU locks after any EDU check is rolled.
- **API:** the Character Sheet save no longer accepts dice totals; a body that carries them is malformed.
- **Validation:** the roll-required messages ask the Player to roll, in both validators and the parity fixtures.
- **UI:** follows the ux.md recorded in PBI-DICE-002.
- **Out of scope:** re-roll grants (PBI-DICE-004).

## Dependencies
- Blocked by: PBI-DICE-002 (the Dice module, Roll Record shape, and UX specification).
- Must merge before: PBI-DICE-004 (grants cover every roll group).

## Context
Read: [character-sheet spec](../../../specs/character-sheet/spec.md), Creation rolling, Creation locks, the `ValidationError` catalog, and API Contracts; [character rules section 3.2](../../game-rules/coc7_character_creation_and_development_rules.md#32-edu-improvement-check), [section 3.1](../../game-rules/coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets), and [section 5.5](../../game-rules/coc7_character_creation_and_development_rules.md#55-luck).
- Typed-in Roll Records from before stay valid and keep counting.

## Verification
- [ ] Luck and EDU checks are rolled by the server, with the gain rolled in the same action exactly when the check improves EDU.
- [ ] Changing the age to another bracket after Luck or an EDU check, or changing EDU after an EDU check, returns 409; changing the age within the bracket is accepted.
- [ ] A save carrying dice totals returns 400.
- [ ] The backend and frontend validators agree on every shared parity fixture with the new messages.
- [ ] Unit tests cover the actions and locks; Playwright E2E covers the character-sheet scenarios "An EDU check rolls its gain in the same action", "A rolled EDU check locks the age bracket and EDU", "A rolled Luck locks the age bracket", "Young Investigator keeps the higher Luck roll", and "Dice results are never accepted from the Player". "Typed-in rolls from before the dice system are kept" is covered by an API integration test instead, because no API can create a Player-entered Roll Record any more (design D7, approved 2026-11-09).

## Refinement Protocol
A change to Luck or EDU rolling or the locks updates the character-sheet spec and ux.md, the parity fixtures, and tests together.

## Follow-ups

---
id: PBI-DICE-001
status: done
blocked_by: []
---

# PBI-DICE-001: Rules document for skill rolls during play

## Directive
Add the skill rolls rules to `docs/game-rules/` and the dice vocabulary to `CONTEXT.md`, so Roll Requests and the percentile roll resolver can reference rules instead of inventing them.

**Scope:**
- **Rules:** a new skill rolls document based on the Keeper Rulebook, Chapter 5: the percentile roll, Regular, Hard, and Extreme Difficulty, Success Levels, Critical and Fumble, Bonus and Penalty Dice (including how they cancel and their limits), and Pushing a roll (including which rolls cannot be pushed). Each section cites its source pages.
- **Project ruleset:** record spending Luck as disabled, and opposed rolls, combined rolls, and Sanity rolls during play as not yet covered.
- **README:** list the new document and update the "Not yet covered" paragraph.
- **Glossary:** in `CONTEXT.md`, add Requested Roll, Success Level, Difficulty, Bonus Die, Penalty Die, hidden roll, creation lock, and re-roll grant, and update Roll Record (any dice result the app produced) and Roll Request (no longer "not yet specified").
- **Out of scope:** the `project_ruleset.md` section 4.3 rewrite (PBI-DICE-002), Sanity rolls, opposed and combined rolls, and any code.

## Dependencies
- Blocked by: None.
- Must merge before: PBI-DICE-005 (the resolver and Roll Requests reference this document).

## Context
Read: [docs/game-rules/README.md](../../game-rules/README.md) (referencing and changing rules); [dice spec](../../../specs/dice/spec.md); [roll-requests spec](../../../specs/roll-requests/spec.md); [character rules section 16.1](../../game-rules/coc7_character_creation_and_development_rules.md#161-skill-experience-tick-during-play) (Bonus Die and experience checks).
- The specs name the document `coc7_skill_rolls_rules.md`; keep that name or update the specs in the same change.
- The project owner verifies the rules before this PBI is done.

## Verification
- [ ] The skill rolls document covers every topic in Scope, with page references, and is verified by the project owner. Deferred: see Follow-ups.
- [x] `project_ruleset.md` records spending Luck as disabled and the deferred roll rules.
- [x] The game-rules README lists the document and no longer lists skill rolls and difficulty levels as not yet covered.
- [x] `CONTEXT.md` defines every term in Scope and no glossary entry restates a rule.
- [x] Every spec link to the skill rolls document points to an existing section anchor.

## Refinement Protocol
A rule change here updates the dice and roll-requests specs' references and every test named after the changed section in the same change.

## Follow-ups
- Add Keeper Rulebook page references to every section of the skill rolls document. The rules themselves were verified by the project owner on 2026-11-08.
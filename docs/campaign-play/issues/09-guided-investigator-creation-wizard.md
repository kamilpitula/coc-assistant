# PBI-CP-009: Guided Investigator Creation Wizard

## Directive
Replace the minimal Character Sheet with the full mechanical creation wizard so a Player can build a rules-valid Investigator with any allowed Creation Method without being overwhelmed.

**Scope:**
- Wizard steps in order: Concept and Identity, Creation Method and Characteristics, Age Effects, Occupation, Occupation Skills, Personal Interests. Progress indicator, return to any completed step, Draft saved on every step transition.
- Standard Rolling with Roll Records through `IRollSource` (`PlayerEntered` source only), Point Buy, and Quick Fire, limited to the Campaign's allowed Creation Methods.
- Age effects and EDU improvement checks; all derived values computed server-side, one domain service per rule section.
- Catalog and custom Occupations, occupation and personal interest allocation, Credit Rating and 1920s wealth.
- Full validator (errors and warnings) per `specs/character-sheet/spec.md`.
- Recompute on changes to earlier steps; clearing characteristics on Creation Method change after confirmation.
- Do not implement narrative sections, weapons, gear, or the shared read-only sheet view (PBI-CP-010), or server-side rolling.

## Dependencies
- Blocked by: PBI-CP-003
- Must merge before: PBI-CP-010

## Context
Read: `specs/character-sheet/spec.md` (whole Blueprint and Contract).

Read: `docs/game-rules/coc7_character_creation_and_development_rules.md` sections 2-9, 11, 14, 15, 18; `docs/game-rules/project_ruleset.md`.

UX: follows `specs/character-sheet/ux.md`.

## Verification
- [ ] A Player can create a valid Investigator with each allowed Creation Method.
- [ ] Every derived value matches its rule section in unit tests named after that section.
- [ ] Standard Rolling stores one `PlayerEntered` Roll Record per dice result.
- [ ] Every error and warning in the spec's Validation list is produced by the validator.
- [ ] Changing an earlier step recomputes values and surfaces now-invalid inputs without discarding them.
- [ ] E2E: one creation flow each for Standard Rolling and Quick Fire, extending the PBI-CP-003 lifecycle flow.

## Refinement Protocol
Missing or conflicting rules are added to `docs/game-rules/` first. A `Server` roll source must plug in through `IRollSource` without changing the Character Sheet shape beyond a schema version bump.

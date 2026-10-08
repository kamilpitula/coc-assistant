---
id: PBI-CP-009
status: done
blocked_by: [PBI-CP-003]
---

# PBI-CP-009: Guided Investigator Creation Wizard

## Directive
Replace the minimal Character Sheet with the full mechanical creation wizard so a Player can build a rules-valid Investigator with any allowed Creation Method without being overwhelmed.

**Scope:**
- Wizard steps in order: Concept and Identity, Creation Method and Characteristics, Age Effects, Occupation, Occupation Skills, Personal Interests. Progress indicator, return to any completed step, Draft saved on every step transition.
- Standard Rolling with characteristic Roll Records through the `IRollSource` introduced by PBI-CP-003 (`PlayerEntered` source only), and Quick Fire, alongside the Point Buy delivered by PBI-CP-003, limited to the Campaign's allowed Creation Methods.
- Age effects, EDU improvement checks, Luck, and the derived values that depend only on characteristics and age were delivered by PBI-CP-003 for Point Buy; extend them to the new Creation Methods and add the remaining derived values (occupation and personal interest budgets, skill post-processing, wealth), one domain service per rule section.
- Catalog and custom Occupations, occupation and personal interest allocation, Credit Rating and 1920s wealth.
- Full validator (errors and warnings) per `specs/character-sheet/spec.md`.
- Recompute on changes to earlier steps; clearing characteristics on Creation Method change after confirmation.
- Do not implement narrative sections, weapons, gear, or the shared read-only sheet view (PBI-CP-010), or server-side rolling.
- UX scope: `specs/character-sheet/ux.md` section 9 (PBI-CP-009 row).

## Dependencies
- Blocked by: PBI-CP-003
- Must merge before: PBI-CP-010

## Context
Read: `specs/character-sheet/spec.md` (whole Blueprint and Contract).

Read: `docs/game-rules/coc7_character_creation_and_development_rules.md` sections 2-9, 11, 14, 15, 18; `docs/game-rules/project_ruleset.md`.

UX: follows `specs/character-sheet/ux.md`.

## Verification
- [x] A Player can create a valid Investigator with each allowed Creation Method.
- [x] Every derived value matches its rule section in unit tests named after that section.
- [x] Standard Rolling stores one `PlayerEntered` Roll Record per dice result.
- [x] Every error and warning in the spec's Validation list is produced by the validator.
- [x] Changing an earlier step recomputes values and surfaces now-invalid inputs without discarding them.
- [x] E2E: one creation flow each for Standard Rolling and Quick Fire, extending the PBI-CP-003 lifecycle flow.

## Refinement Protocol
Missing or conflicting rules are added to `docs/game-rules/` first. A `Server` roll source must plug in through `IRollSource` without changing the Character Sheet shape beyond a schema version bump.

## Follow-ups
- Add more 1920s Occupations to `docs/game-rules/catalogs/occupations.1920s.json`; the catalog has 10, enough for the flows but thin for real play.
- Project owner verification and page references for the new `catalogs/wealth.1920s.json` and `catalogs/skill-specializations.json` (marked awaiting verification).
- Run the dice-entry usability test with one or two first-time Players (`specs/character-sheet/ux.md` section 12) before release.
- Confirm the method-switch dialog sentence "Your skill values will be cleared too." (ux.md section 5.5), added in implementation because Quick fire skill values and points cannot be saved together; it was not in the approved plan.
- "Add another specialization" focuses the skill family Select first, then the specialization field (ux.md section 6.6 says the specialization field); confirm or adjust.
- Remove the now-unreachable "no available creation method" state (UX-19 card state, `CreationMethodsUnavailable` outcome) or keep it for a future method, and reword the campaign-play Scenario "Player cannot create an Investigator without a supported Creation Method".
- Upgrade `System.Security.Cryptography.Xml` 9.0.0 (NU1903 high severity advisory, pre-existing in Infrastructure).
- Local `npm run lint` also lints the git-ignored `storybook-static` build output; add it to the ESLint ignores.

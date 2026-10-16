---
id: PBI-CP-010
status: done
blocked_by: [PBI-CP-009]
---

# PBI-CP-010: Character Sheet View and Narrative Sections

## Directive
Complete the Character Sheet with its narrative and possessions sections and a shared read-only sheet view used by the Player for review and by the Keeper for Character Approval.

**Scope:**
- Sheet view sections: backstory with one Key Connection ([section 12](../../game-rules/coc7_character_creation_and_development_rules.md#12-backstory-fields)), custom weapons, gear, and wealth display.
- Review and Submit from the sheet view, showing errors and warnings.
- The same read-only sheet view on the Keeper's review screen, including warnings. The Keeper's Dice results table (Roll Records) already ships with PBI-CP-003; keep it working with the new sections.
- Do not implement portrait upload, Fellow Investigators editing, a weapon or equipment catalog, or editing after Approval.

## Dependencies
- Blocked by: PBI-CP-009

## Context
Read: `specs/character-sheet/spec.md`
- Blueprint: Content, User journey.
- Scenarios: Unspent personal interest points only warn.

Read: `docs/game-rules/project_ruleset.md` section 4.2; `docs/game-rules/coc7_character_creation_and_development_rules.md` sections 10-13.

UX: follows `specs/character-sheet/ux.md`.

## Verification
- [x] A Player can record backstory with a Key Connection, custom weapons flagged as custom, and gear, then submit from the sheet view.
- [x] The Keeper's review screen shows the full sheet and its warnings read-only, with the Dice results from PBI-CP-003.
- [x] Unit and E2E tests cover the sections, the Key Connection, and the Keeper view.

## Refinement Protocol
When a weapon or equipment catalog is added to `docs/game-rules/`, replace the free-text fields through a schema version bump and update `project_ruleset.md` section 4.2.

## Follow-ups
- Rule gap, for the rules owner: section 12 does not say whether a Key Connection is required, whether an "entry" is a whole Background field or one item inside it, or whether My Story can be one. v1 makes it optional and lets the Player choose one filled-in Background field (`specs/character-sheet/spec.md`, Content); revisit when `docs/game-rules/` settles it.
- Section 15's "weapon stats exactly match the selected weapon definition" cannot be checked until a weapon catalog exists; until then every weapon is a Custom Weapon judged at Character Approval (project_ruleset.md section 4.2).
- The "not yet calculated" em dash markup is repeated in `character-sheet-view` and `sheet-wealth-section`; extract a small shared component if a third use appears.

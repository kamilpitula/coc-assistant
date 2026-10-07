---
id: PBI-CP-003
status: done
blocked_by: [PBI-CP-002, PBI-CP-008]
pr: 3
---

# PBI-CP-003: Submit and Approve Investigator Character Sheets

## Directive
Build the end-to-end Investigator lifecycle: a Player creates a Draft Investigator, submits its Character Sheet, and the Keeper approves it or requests changes. Preserve the rule that an Investigator is not ready for play until explicit Character Approval.

This slice uses a **Point Buy Character Sheet** (identity, Point Buy characteristics, age effects, EDU improvement checks, and Luck, with their validation and the derived values that depend only on characteristics and age) so the lifecycle ships before the full creation wizard (PBI-CP-009) and sheet view (PBI-CP-010). An Approved Investigator therefore meets every [section 15](../../game-rules/coc7_character_creation_and_development_rules.md#15-character-creation-validation-rules) condition that applies to that content.

**Scope:**
- `Investigator` aggregate with Draft, Submitted, Changes Requested, and Approved; versioned JSON Character Sheet column; unique index on (CampaignId, PlayerAccountId). See `docs/adr/0005-investigator-aggregate-with-versioned-json-character-sheet.md`.
- All Investigator endpoints in `specs/campaign-play/spec.md` and the `character-sheet` GET/PUT endpoints in `specs/character-sheet/spec.md`, with server-side authorization and 404 for anything outside the caller's visibility.
- Role-based Campaign page: the Player's read-only Campaign view with the "Your Investigator" card; the Keeper's Investigator list and review screen with Approve and Request changes (comment required).
- Point Buy sheet: identity fields and Point Buy characteristics validated per [section 2.2](../../game-rules/coc7_character_creation_and_development_rules.md#22-point-buy-alternative); age effects per [section 3.1](../../game-rules/coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets), [section 3.3](../../game-rules/coc7_character_creation_and_development_rules.md#33-age-modifier-ordering) and [project_ruleset.md section 4.4](../../game-rules/project_ruleset.md#44-characteristic-floor-after-age-effects); EDU improvement checks per [section 3.2](../../game-rules/coc7_character_creation_and_development_rules.md#32-edu-improvement-check); Luck per [section 5.5](../../game-rules/coc7_character_creation_and_development_rules.md#55-luck), with dice results entered by the Player as Roll Records; Hard and Extreme values and the derived values of [section 5](../../game-rules/coc7_character_creation_and_development_rules.md#5-secondary--derived-attributes) shown in the summary rail and on the Keeper's review screen with its Dice results. Saved on every step change, plus "Start over" for a Draft.
- Do not implement Standard Rolling, Quick Fire, skills, Occupations, narrative sections, Wall Entries, Presence, or live updates.

## Dependencies
- Blocked by: PBI-CP-002; PBI-CP-008
- Must merge before: PBI-CP-006; PBI-CP-009

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Investigator lifecycle, Investigator visibility, Player and Keeper experience, API Contracts.
- Constraints: Investigator Campaign ownership, Character Approval, server-side enforcement.
- Regression Guardrails: Investigators never cross Campaign boundaries; unapproved Investigators are not ready for play; one Investigator per Player per Campaign; Players cannot approve or read others' Investigators.
- Scenarios: every Investigator scenario.

Read: `specs/character-sheet/spec.md`
- Blueprint: Validation, Persistence, API Contracts.

UX: the "Your Investigator" card, the Keeper list and review screen, and the minimal sheet form follow `specs/character-sheet/ux.md` (scope in its section 9).

## Verification
- [x] A Player can create a Draft Investigator, leave, resume, and submit a Character Sheet with no validation errors.
- [x] Submission with validation errors is rejected with structured `ValidationError` items.
- [x] The Keeper can request changes with a comment; the Player sees it, edits, and resubmits.
- [x] The Keeper can approve a Submitted Investigator and it becomes ready for play.
- [x] A submitted Character Sheet meets every section 15 condition that applies to its content, and its derived values match their rule sections in unit tests named after those sections.
- [x] The Keeper sees a Draft only as "In progress".
- [x] Cross-Campaign access, a second Investigator for the same Player, Player approval attempts, and reading another Player's Investigator are rejected.
- [x] Unit, integration, and E2E tests cover submission, request changes, approval, authorization, and readiness state. E2E: one lifecycle flow (create, save, resume, submit, request changes, resubmit, approve) plus the guardrails above.

## Refinement Protocol
If the Character Sheet needs a rule or field not covered by `docs/game-rules/`, add it there first and reference it; do not define it in the spec or code. If the Character Sheet vocabulary or Investigator statuses change, update `CONTEXT.md`, the domain state transitions, and the acceptance scenarios together. Keep Investigator ownership exclusive to one Campaign and one Player.

---
id: PBI-CP-008
status: done
blocked_by: [PBI-CP-007]
pr: 2
---

# PBI-CP-008: Configure Campaign Era and Allowed Creation Methods

## Directive
Give every Campaign an Era and a set of allowed Creation Methods, and make the verified rule data that Character Sheets need loadable at runtime. This is the foundation for Investigator creation.

**Scope:**
- `Campaign.Era` (1920s only) and allowed Creation Methods in the domain, Azure SQL persistence, and API, including migrating existing Campaigns to the 1920s Era with all Creation Methods allowed.
- Collapsed "Rules options" section on the create-campaign form; Keeper-only editing of allowed Creation Methods from the Campaign page. The Era is fixed after creation.
- Era-keyed rule data abstraction in the backend, with the 1920s implementation loading `docs/game-rules/catalogs/occupations.1920s.json` and serving `GET /api/campaigns/{campaignId}/rules/occupations`.
- Move the 1920s skill bases ([section 6.1](../../game-rules/coc7_character_creation_and_development_rules.md#61-standard-1920s-investigator-sheet-skill-base-values)) into a catalog under `docs/game-rules/catalogs/` and link it from that section, so runtime data is not maintained twice.
- Do not implement Investigators or Character Sheets.

## Dependencies
- Blocked by: PBI-CP-007
- Must merge before: PBI-CP-003

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Campaign rules options; API Contracts for `POST /api/campaigns` and `PUT /api/campaigns/{campaignId}/allowed-creation-methods`.
- Scenario: Keeper creates a Campaign with default rules options.

Read: `specs/character-sheet/spec.md`
- Blueprint: Era and Occupation.

Read: `docs/game-rules/project_ruleset.md` sections 1 and 2; `docs/game-rules/coc7_character_creation_and_development_rules.md` section 20.

UX: follows `specs/character-sheet/ux.md` sections 2 and 3.1.

## Verification
- [x] A Keeper creating a Campaign without touching rules options gets the 1920s Era and all three Creation Methods.
- [x] The Keeper can change allowed Creation Methods later; at least one must remain; a Player cannot change them.
- [x] Existing Campaigns migrate to the 1920s Era with all Creation Methods allowed.
- [x] Campaign members can read the 1920s Occupation catalog; non-members get 404.
- [x] Unit, integration, and E2E tests cover the defaults, the edit authorization, the migration, and catalog loading.

## Refinement Protocol
Add an Era only after its data exists in `docs/game-rules/` per `project_ruleset.md` section 1. Keep Era immutable after Campaign creation unless the spec is changed first.

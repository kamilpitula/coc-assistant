# Feature: Character Sheet

## Blueprint

### Context
A Player builds the Character Sheet for their Investigator before the Keeper can grant Character Approval. Call of Cthulhu 7th Edition creation has strict ordering (characteristics, then age, then EDU-derived points, then skills) and many derived values, which overwhelms Players when presented as one form. This feature guides the Player through the mechanical steps, computes everything the rules derive, validates the result against [docs/game-rules](../../docs/game-rules/README.md), and produces one Character Sheet record that both the Player and the Keeper read. The Investigator lifecycle around the sheet (Draft, Submitted, Changes Requested, Approved) and its authorization belong to [specs/campaign-play/spec.md](../campaign-play/spec.md).

### Architecture
- **Content:** The Character Sheet covers the full [investigator data model](../../docs/game-rules/coc7_character_creation_and_development_rules.md#1-investigator-data-model). Fields whose authoritative values require a catalog the project does not yet maintain ([section 20](../../docs/game-rules/coc7_character_creation_and_development_rules.md#20-canonical-data-sources-the-implementation-should-maintain)) are free text or numbers entered by the Player:
  - Weapons are recorded as custom entries with free-text name, skill, damage, attacks, range, ammo, and malfunction. Each is flagged as custom, satisfying the [weapon assignment](../../docs/game-rules/coc7_character_creation_and_development_rules.md#102-weapon-assignment-algorithm) requirement that non-catalog weapons need explicit approval; Character Approval is that approval.
  - Gear and possessions are free text.
  - Skill specializations ([section 6.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#62-common-specialization-base-values)) are free text with the listed specializations offered as suggestions. A specialized skill may appear more than once with different specializations.
  - Portrait is not captured. Fellow Investigators is stored as an empty list and not edited during creation. Conditions and advancement fields exist with their creation defaults ([section 13](../../docs/game-rules/coc7_character_creation_and_development_rules.md#13-conditions-and-tracked-state)) and are not shown in the creator.
- **Creation Methods:** Standard Rolling ([section 2.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#21-standard-rolling-method)), Point Buy ([section 2.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#22-point-buy-alternative)), and Quick Fire ([section 2.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#23-quick-fire-alternative), [section 18](../../docs/game-rules/coc7_character_creation_and_development_rules.md#18-ruleset-separation-standard-vs-quick-fire)). The Player selects one from the Creation Methods the Campaign allows; when only one is allowed, the selection is not shown.
- **Roll Records:** Under Standard Rolling every dice result is stored as a Roll Record with purpose (for example `Characteristic:STR`, `Luck`, `Luck:SecondRoll`, `EduImprovement[1].Check`, `EduImprovement[1].Gain`), dice expression, result, and source. Results enter through an `IRollSource` abstraction; v1 provides only the `PlayerEntered` source, where the Player types results rolled at the table. A `Server` source is added later without changing the Character Sheet shape. Final characteristic, Luck, and EDU values are computed from the Roll Records. Point Buy and Quick Fire store the chosen values directly.
- **Age:** Age is captured with identity. The Player chooses only how the age-bracket physical deduction is distributed ([section 3.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets)); age effects and EDU improvement checks are applied in the order of [section 3.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#33-age-modifier-ordering).
- **Derived values:** Hard and Extreme values ([section 4](../../docs/game-rules/coc7_character_creation_and_development_rules.md#4-characteristic-derived-values)), all [secondary attributes](../../docs/game-rules/coc7_character_creation_and_development_rules.md#5-secondary--derived-attributes), occupation and personal interest point budgets ([section 7.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#71-occupation-skill-points), [section 8](../../docs/game-rules/coc7_character_creation_and_development_rules.md#8-personal-interest-skills)), skill post-processing ([section 9](../../docs/game-rules/coc7_character_creation_and_development_rules.md#9-skill-post-processing)), and wealth ([section 11](../../docs/game-rules/coc7_character_creation_and_development_rules.md#11-finances-gear-and-possessions)) are computed by the system and read-only. Each calculation lives in one domain service per rule section and carries a comment pointing to that section.
- **Era:** The Character Sheet uses its Campaign's Era. Era-dependent rule data (skill catalog, occupation catalog, wealth table) is resolved through an era-keyed abstraction so that adding an Era adds data and an implementation, not branches in existing code. v1 provides the 1920s Era only.
- **Occupation:** The Player selects a catalog Occupation for the Campaign's Era or defines a custom Occupation (name, point formula from [section 7.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#71-occupation-skill-points), occupation skills and choices, Credit Rating range) that the Keeper judges during review. The catalog is a data file under `docs/game-rules/catalogs/` with provenance per [section 20](../../docs/game-rules/coc7_character_creation_and_development_rules.md#20-canonical-data-sources-the-implementation-should-maintain), loaded by the backend at runtime.
- **Validation:** One validator implements [section 15](../../docs/game-rules/coc7_character_creation_and_development_rules.md#15-character-creation-validation-rules) and returns structured `ValidationError` items (code, field, message, expected, actual, severity). The backend validator (C#) is authoritative. The frontend implements the same rules in TypeScript for instant feedback, using the same error codes and messages. A shared set of fixture cases, run against both implementations, keeps them in parity. The server never trusts the client's result.
  - Errors block submission: values not producible by the selected Creation Method, Point Buy total or bounds not met, Quick Fire values not an exact assignment of the pool, age outside the range allowed by [project_ruleset.md section 4.1](../../docs/game-rules/project_ruleset.md#41-investigator-age-at-creation), overspent occupation or personal interest points, occupation points spent outside the allowed occupation skills, Credit Rating outside the Occupation range, any creation points in Cthulhu Mythos, a Creation Method the Campaign no longer allows, and missing required identity fields.
  - Warnings never block submission and are shown to both Player and Keeper: unspent occupation or personal interest points, Point Buy INT or SIZ below the recommendation in [section 2.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#22-point-buy-alternative), and any skill above 90.
  - Optional rules ([section 2.4](../../docs/game-rules/coc7_character_creation_and_development_rules.md#24-optional-height-of-human-potential-rule), starting skill cap in section 9, Cthulhu Mythos at creation in section 8) are disabled per [project_ruleset.md section 3](../../docs/game-rules/project_ruleset.md#3-optional-rules); validation applies the standard rules only.
- **User journey:** A hybrid flow.
  - A step wizard covers the mechanics in this order: Concept and Identity (including age), Creation Method and Characteristics, Age Effects, Occupation, Occupation Skills, Personal Interests. A progress indicator shows completed steps and the Player can return to any completed step.
  - A sheet view then covers narrative sections (backstory with one Key Connection per [section 12](../../docs/game-rules/coc7_character_creation_and_development_rules.md#12-backstory-fields), weapons, gear) and Review and Submit. The same read-only sheet view is used by the Keeper for review.
  - The Draft is saved to the server whenever the Player completes a step or navigates between steps, and the Player can leave and resume.
  - Changing an earlier choice keeps later inputs, recomputes all derived values, and surfaces now-invalid inputs as validation errors on their steps. Changing the Creation Method clears characteristics after the Player confirms.
  - UX specification: [ux.md](ux.md).
- **Persistence:** The Character Sheet is a value object of the `Investigator` aggregate, stored as a JSON column with an explicit schema version so new Eras and roll sources evolve without table migrations.
- **API Contracts:**
  - `GET /api/campaigns/{campaignId}/investigators/mine/character-sheet` - returns the caller's Character Sheet, its computed values, and its `ValidationError` list.
  - `PUT /api/campaigns/{campaignId}/investigators/mine/character-sheet` - replaces the Draft or Changes Requested Character Sheet with the Player's inputs; returns the recomputed sheet and `ValidationError` list. Rejected when the Investigator is Submitted or Approved.
  - `GET /api/campaigns/{campaignId}/rules/occupations` - returns the Occupation catalog for the Campaign's Era to Campaign members.
- **Data Models:**
  - Backend: `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Domain/CharacterSheets/` (Character Sheet value object, Roll Record, `IRollSource`, derived-value services, validator).
  - Frontend: `frontend/src/campaign-play/types/CharacterSheet.ts`.
  - Rule data: `docs/game-rules/catalogs/occupations.1920s.json`.
- **Dependencies:**
  - Depends on: [docs/game-rules](../../docs/game-rules/README.md) and its catalogs; Campaign Era and allowed Creation Methods and the Investigator lifecycle from [specs/campaign-play/spec.md](../campaign-play/spec.md).
  - Depended on by: Character Approval in Campaign Play; future live updates of the connected Player's own Investigator stats.

### Constraints
- Game rules live only in `docs/game-rules/`. This spec, the code, and the tests reference rule sections and do not restate formulas, tables, or value ranges.
- Weapon statistics are never inferred from a weapon name; every weapon on a v1 Character Sheet is a Player-entered custom entry.
- Derived values are always computed from inputs and are never accepted from the client.
- The validator reports invalid input as `ValidationError` items and never silently corrects it.
- Every Roll Record carries its source.

## Contract

### Definition of Done
- [ ] A Player can create a Character Sheet with each of Standard Rolling, Point Buy, and Quick Fire when the Campaign allows that Creation Method.
- [ ] Standard Rolling stores one Roll Record per dice result with source `PlayerEntered`, and final characteristic, Luck, and EDU values are computed from them.
- [ ] Every derived value listed under Architecture is computed by the backend and matches the referenced rule section in unit tests named after that section.
- [ ] A Player can select a catalog Occupation for the Campaign's Era or define a custom Occupation.
- [ ] `PUT .../character-sheet` returns every applicable error and warning listed under Validation, and submission is rejected while any error remains.
- [ ] The backend and frontend validators produce identical error codes for every shared fixture case.
- [ ] The wizard saves the Draft on every step transition, and reopening the Investigator resumes it.
- [ ] Changing an earlier step recomputes derived values and shows now-invalid inputs as errors without discarding them.
- [ ] The Keeper sees the submitted Character Sheet, its warnings, and its Roll Records in the read-only sheet view.

### Regression Guardrails
- A Character Sheet with any validation error cannot be submitted.
- No derived value can be set by the client.
- No creation points are ever accepted on Cthulhu Mythos under the standard rules.
- Rule data used at runtime comes from catalogs under `docs/game-rules/`, not from values hard-coded in more than one place.
- Adding an Era or a roll source does not change the stored shape of existing Character Sheets beyond a schema version upgrade.

### Scenarios
```gherkin
Scenario: Player creates a Point Buy Character Sheet
  Given a Campaign allows the Point Buy Creation Method
  And a Player has a Draft Investigator in that Campaign
  When the Player assigns characteristics that satisfy section 2.2 of the character rules
  Then the Character Sheet has no characteristic validation errors
  And the derived values shown match sections 4 and 5 of the character rules

Scenario: Standard Rolling records every Player-entered roll
  Given a Campaign allows the Standard Rolling Creation Method
  When the Player enters dice results for every characteristic and for Luck
  Then the Character Sheet stores one Roll Record per result with source PlayerEntered
  And each characteristic value is computed from its Roll Record

Scenario: Quick Fire rejects an invalid assignment
  Given a Player is creating a Character Sheet with Quick Fire
  When the Player assigns a value that is not part of the section 2.3 pool
  Then the Character Sheet reports an error on that characteristic
  And the Character Sheet cannot be submitted

Scenario: Young Investigator keeps the higher Luck roll
  Given a Player is creating a Character Sheet with Standard Rolling
  And the Investigator's age is 17
  When the Player enters two Luck Roll Records
  Then the Investigator's Luck is the higher of the two as defined in section 5.5 of the character rules

Scenario: Overspent occupation points block submission
  Given a Player has selected an Occupation
  When the Player allocates more occupation points than the section 7.1 budget
  Then the Character Sheet reports an overspent occupation points error
  And the Character Sheet cannot be submitted

Scenario: Unspent personal interest points only warn
  Given a Player has allocated fewer personal interest points than the section 8 budget
  And the Character Sheet has no errors
  When the Player submits the Character Sheet
  Then the Character Sheet is submitted
  And the Keeper sees an unspent personal interest points warning

Scenario: Cthulhu Mythos cannot receive creation points
  Given a Player is allocating personal interest points
  When the Player allocates points to Cthulhu Mythos
  Then the Character Sheet reports a Cthulhu Mythos allocation error

Scenario: Changing characteristics keeps later allocations
  Given a Player has allocated occupation points
  When the Player returns to Characteristics and lowers EDU
  Then the occupation point budget is recomputed
  And the existing allocations are kept
  And the Occupation Skills step reports an overspent occupation points error

Scenario: Changing the Creation Method clears characteristics after confirmation
  Given a Player has entered characteristics with Point Buy
  When the Player switches to Quick Fire and confirms
  Then the Character Sheet has no characteristic values

Scenario: Draft resumes after leaving the wizard
  Given a Player has completed the Characteristics step
  When the Player leaves and reopens their Investigator
  Then the wizard resumes with the saved characteristics

Scenario: Disallowed Creation Method blocks submission
  Given a Player's Draft uses Quick Fire
  And the Keeper has since disallowed Quick Fire for the Campaign
  When the Player submits the Character Sheet
  Then the submission is rejected with a disallowed Creation Method error
```

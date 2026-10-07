# Feature: Character Sheet

## Blueprint

### Context
A Player builds the Character Sheet for their Investigator before the Keeper can grant Character Approval. Call of Cthulhu 7th Edition creation has strict ordering (characteristics, then age, then EDU-derived points, then skills) and many derived values, which overwhelms Players when presented as one form. This feature guides the Player through the mechanical steps, computes everything the rules derive, validates the result against [docs/game-rules](../../docs/game-rules/README.md), and produces one Character Sheet record that both the Player and the Keeper read. The Investigator lifecycle around the sheet (Draft, Submitted, Changes Requested, Approved) and its authorization belong to [specs/campaign-play/spec.md](../campaign-play/spec.md).

### Architecture
- **Content:** The Character Sheet covers the full [investigator data model](../../docs/game-rules/coc7_character_creation_and_development_rules.md#1-investigator-data-model). Fields whose authoritative values require a catalog the project does not yet maintain ([section 20](../../docs/game-rules/coc7_character_creation_and_development_rules.md#20-canonical-data-sources-the-implementation-should-maintain)) are free text or numbers entered by the Player:
  - Weapons are recorded as custom entries with free-text name, skill, damage, attacks, range, ammo, and malfunction. Each is flagged as custom, satisfying the [weapon assignment](../../docs/game-rules/coc7_character_creation_and_development_rules.md#102-weapon-assignment-algorithm) requirement that non-catalog weapons need explicit approval; Character Approval is that approval.
  - Gear and possessions are free text.
  - Skill specializations ([section 6.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#62-common-specialization-base-values)) follow [project_ruleset.md section 4.2](../../docs/game-rules/project_ruleset.md#42-weapons-gear-and-specializations-without-catalogs): Fighting and Firearms specializations are chosen from the specialization catalog, and the other specialized skills are free text with suggestions. A specialized skill may appear more than once with different specializations.
  - Portrait is not captured. Fellow Investigators is stored as an empty list and not edited during creation. Conditions and advancement fields exist with their creation defaults ([section 13](../../docs/game-rules/coc7_character_creation_and_development_rules.md#13-conditions-and-tracked-state)) and are not shown in the creator.
- **Creation Methods:** Standard Rolling ([section 2.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#21-standard-rolling-method)), Point Buy ([section 2.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#22-point-buy-alternative)), and Quick Fire ([section 2.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#23-quick-fire-alternative), [section 18](../../docs/game-rules/coc7_character_creation_and_development_rules.md#18-ruleset-separation-standard-vs-quick-fire)). The Player selects one from the Creation Methods the Campaign allows; when only one is allowed, the selection is not shown.
- **Roll Records:** Every dice result rolled during creation is stored as a Roll Record ([project_ruleset.md section 4.3](../../docs/game-rules/project_ruleset.md#43-dice-results-at-creation)) with purpose (for example `Characteristic:STR`, `Luck`, `Luck:SecondRoll`, `EduImprovement[1].Check`, `EduImprovement[1].Gain`), dice expression, raw result, and source. Results enter through an `IRollSource` abstraction; v1 provides only the `PlayerEntered` source, where the Player types results rolled at the table. A `Server` source is added later without changing the Character Sheet shape. Final characteristic, Luck, and EDU values are computed from the Roll Records. Point Buy and Quick Fire store the chosen characteristic values directly, but their Luck rolls ([section 5.5](../../docs/game-rules/coc7_character_creation_and_development_rules.md#55-luck)) and EDU improvement checks ([section 3.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#32-edu-improvement-check)) are dice results and are stored as Roll Records under every Creation Method.
- **Age:** Age is captured with identity. The Player chooses only how the age-bracket physical deduction is distributed ([section 3.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets)); age effects and EDU improvement checks are applied in the order of [section 3.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#33-age-modifier-ordering).
- **Derived values:** Hard and Extreme values ([section 4](../../docs/game-rules/coc7_character_creation_and_development_rules.md#4-characteristic-derived-values)), all [secondary attributes](../../docs/game-rules/coc7_character_creation_and_development_rules.md#5-secondary--derived-attributes), occupation and personal interest point budgets ([section 7.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#71-occupation-skill-points), [section 8](../../docs/game-rules/coc7_character_creation_and_development_rules.md#8-personal-interest-skills)), skill post-processing ([section 9](../../docs/game-rules/coc7_character_creation_and_development_rules.md#9-skill-post-processing)), and wealth ([section 11](../../docs/game-rules/coc7_character_creation_and_development_rules.md#11-finances-gear-and-possessions)) are computed by the system and read-only. Each calculation lives in one domain service per rule section and carries a comment pointing to that section.
- **Delivery scope (PBI-CP-003):** The first delivery supports Point Buy only and covers identity, characteristics, age effects ([section 3.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets), [section 3.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#33-age-modifier-ordering), [project_ruleset.md section 4.4](../../docs/game-rules/project_ruleset.md#44-characteristic-floor-after-age-effects)), EDU improvement checks ([section 3.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#32-edu-improvement-check)), and Luck ([section 5.5](../../docs/game-rules/coc7_character_creation_and_development_rules.md#55-luck)).
  - Submission is blocked by every Validation error that applies to that content: missing required identity fields, an age outside the allowed range, a Creation Method the Campaign does not allow, Point Buy total or bounds, a physical deduction that does not match its age bracket, a characteristic below the floor after age effects, a missing or impossible EDU improvement check result, and a missing or impossible Luck roll (including the second roll in the two-roll bracket). The Point Buy INT and SIZ warnings apply.
  - Derived values that depend only on characteristics and age are computed and shown: Hard and Extreme values ([section 4](../../docs/game-rules/coc7_character_creation_and_development_rules.md#4-characteristic-derived-values)) after age effects, Sanity, Magic Points, Hit Points, Luck, Dodge (its base), Movement Rate, Damage Bonus, and Build ([section 5](../../docs/game-rules/coc7_character_creation_and_development_rules.md#5-secondary--derived-attributes)). Idea and Know are shown by the full sheet view (PBI-CP-010).
  - Occupation, skills, occupation and personal interest budgets, Credit Rating, wealth, Standard Rolling, and Quick Fire follow in PBI-CP-009.
- **Delivery scope (PBI-CP-009):** Standard Rolling ([section 2.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#21-standard-rolling-method)) and Quick Fire ([section 2.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#23-quick-fire-alternative), [section 18](../../docs/game-rules/coc7_character_creation_and_development_rules.md#18-ruleset-separation-standard-vs-quick-fire)) join Point Buy; the wizard gains the Occupation, Occupation skills, and Personal interests steps; occupation and personal interest budgets, skill post-processing, Credit Rating, and wealth are computed; and every code in the `ValidationError` catalog below is produced. Wealth is computed and returned in `derived`; its display belongs to PBI-CP-010.
  - Submission requires an Occupation ([section 15](../../docs/game-rules/coc7_character_creation_and_development_rules.md#15-character-creation-validation-rules)), its open skill choices and specializations, and a Credit Rating in range (Standard Rolling and Point Buy) or the Quick Fire Credit Rating value. Unspent occupation or personal interest points, and fewer Quick Fire personal interest skills than required, only warn.
  - Skills come from the Era's skill catalog (`docs/game-rules/catalogs/skills.1920s.json`) and the specialization catalog (`docs/game-rules/catalogs/skill-specializations.json`), served by `GET /api/campaigns/{campaignId}/rules/skills`.
- **Era:** The Character Sheet uses its Campaign's Era. Era-dependent rule data (skill catalog, occupation catalog, wealth table) is resolved through an era-keyed abstraction so that adding an Era adds data and an implementation, not branches in existing code. v1 provides the 1920s Era only.
- **Occupation:** The Player selects a catalog Occupation for the Campaign's Era or defines a custom Occupation (name, point formula from [section 7.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#71-occupation-skill-points), occupation skills and choices, Credit Rating range) that the Keeper judges during review. The catalog is a data file under `docs/game-rules/catalogs/` with provenance per [section 20](../../docs/game-rules/coc7_character_creation_and_development_rules.md#20-canonical-data-sources-the-implementation-should-maintain), loaded by the backend at runtime.
- **Validation:** One validator implements [section 15](../../docs/game-rules/coc7_character_creation_and_development_rules.md#15-character-creation-validation-rules) and returns structured `ValidationError` items (code, field, message, expected, actual, severity). The backend validator (C#) is authoritative. The frontend implements the same rules in TypeScript for instant feedback, using the same error codes and messages. A shared set of fixture cases, run against both implementations, keeps them in parity. The server never trusts the client's result.
  - Errors block submission: values not producible by the selected Creation Method, Point Buy total or bounds not met, Quick Fire values not an exact assignment of the pool, age outside the range allowed by [project_ruleset.md section 4.1](../../docs/game-rules/project_ruleset.md#41-investigator-age-at-creation), overspent occupation or personal interest points, occupation points spent outside the allowed occupation skills, Credit Rating outside the Occupation range, any creation points in Cthulhu Mythos, a Creation Method the Campaign no longer allows, and missing required identity fields.
  - Warnings never block submission and are shown to both Player and Keeper: unspent occupation or personal interest points, Point Buy INT or SIZ below the recommendation in [section 2.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#22-point-buy-alternative), and any skill above 90.
  - Optional rules ([section 2.4](../../docs/game-rules/coc7_character_creation_and_development_rules.md#24-optional-height-of-human-potential-rule), starting skill cap in section 9, Cthulhu Mythos at creation in section 8) are disabled per [project_ruleset.md section 3](../../docs/game-rules/project_ruleset.md#3-optional-rules); validation applies the standard rules only.
  - **`ValidationError` catalog.** This table is the single definition of codes, fields, severities, and message text. The backend implements it authoritatively; the frontend mirrors it. Placeholders in braces are filled from rule data at runtime, so no rule value is written here or hard-coded in the frontend. `{C}` is a characteristic code (`STR`, `CON`, `DEX`, `APP`, `POW`, `SIZ`, `INT`, `EDU`) and `{n}` is a 1-based EDU check number; field paths use 0-based indexes. Scope `shared` checks run in both validators; `server` checks need computed values and run only on the server.

    | Code | Field | Severity | Rule | Message | Scope |
    |---|---|---|---|---|---|
    | `InvestigatorNameRequired` | `identity.name` | Error | [ux.md section 6.1](ux.md#61-identity-identity) | Enter your Investigator's name. | shared |
    | `AgeRequired` | `identity.age` | Error | [section 15](../../docs/game-rules/coc7_character_creation_and_development_rules.md#15-character-creation-validation-rules) | Enter your Investigator's age. | shared |
    | `AgeOutOfRange` | `identity.age` | Error | [project_ruleset.md section 4.1](../../docs/game-rules/project_ruleset.md#41-investigator-age-at-creation) | Age must be between {minimumAge} and {maximumAge}. | shared |
    | `CreationMethodRequired` | `creationMethod` | Error | section 15 | Choose a creation method. | shared |
    | `CreationMethodNotAllowed` | `creationMethod` | Error | [campaign-play Constraints](../campaign-play/spec.md#constraints) | This Campaign no longer allows this creation method. Ask your Keeper. | server |
    | `CharacteristicRequired` | `characteristics.{C}` | Error | section 15 | Enter a value for {C}. | shared |
    | `PointBuyValueOutOfRange` | `characteristics.{C}` | Error | [section 2.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#22-point-buy-alternative) | {C} must be between {minimum} and {maximum}. | shared |
    | `PointBuyTotalMismatch` | `characteristics` | Error | section 2.2 | Your characteristics must add up to {budget}. They add up to {total}. | shared |
    | `PointBuyBelowRecommendation` | `characteristics.INT`, `characteristics.SIZ` | Warning | section 2.2 | {C} is below the recommended {recommended}. Check with your Keeper. | shared |
    | `LuckRollRequired` | `luckRolls[0]` | Error | [section 5.5](../../docs/game-rules/coc7_character_creation_and_development_rules.md#55-luck) | Enter your Luck roll. | shared |
    | `LuckSecondRollRequired` | `luckRolls[1]` | Error | section 5.5 | Enter your second Luck roll. | shared |
    | `LuckSecondRollNotAllowed` | `luckRolls[1]` | Error | section 5.5 | Only one Luck roll is used at this age. | shared |
    | `DiceResultOutOfRange` | the dice field | Error | dice expression | Enter a {dice} result between {minimum} and {maximum}. | shared |
    | `AgeDeductionTotalMismatch` | `ageEffects.deductions` | Error | [section 3.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets) | Deduct exactly {total} points in total. You have deducted {deducted}. | shared |
    | `AgeDeductionNotAllowed` | `ageEffects.deductions.{C}` | Error | section 3.1 | {C} can't take the age deduction at this age. | shared |
    | `AgeDeductionNegative` | `ageEffects.deductions.{C}` | Error | section 3.1 | Enter 0 or more for {C}. | shared |
    | `CharacteristicBelowFloor` | `ageEffects.deductions.{C}` for a deducted characteristic, otherwise `characteristics.{C}` | Error | [project_ruleset.md section 4.4](../../docs/game-rules/project_ruleset.md#44-characteristic-floor-after-age-effects) | {C} can't go below {floor} after age effects. | server |
    | `EduImprovementCheckRequired` | `ageEffects.eduImprovementChecks[n].check` | Error | [section 3.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#32-edu-improvement-check) | Enter the D100 roll for EDU check {n}. | shared |
    | `EduImprovementCheckNotRequired` | `ageEffects.eduImprovementChecks[n]` | Error | section 3.1 | EDU check {n} isn't needed at this age. | shared |
    | `EduImprovementGainRequired` | `ageEffects.eduImprovementChecks[n].gain` | Error | section 3.2 | Enter the 1D10 gain for EDU check {n}. | server |
    | `EduImprovementGainNotAllowed` | `ageEffects.eduImprovementChecks[n].gain` | Error | section 3.2 | EDU check {n} has no gain because the roll isn't above EDU. | server |
    | `CharacteristicRollRequired` | `characteristicRolls.{C}` | Error | [section 2.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#21-standard-rolling-method) | Enter the {dice} total for {C}. | shared |
    | `QuickFireValueNotInPool` | `characteristics.{C}` | Error | [section 2.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#23-quick-fire-alternative) | {C} must be one of the Quick fire values: {values}. | shared |
    | `QuickFireAssignmentMismatch` | `characteristics` | Error | section 2.3 | Use each Quick fire value exactly once: {values}. | shared |
    | `OccupationRequired` | `occupation` | Error | section 15 | Choose an occupation. | shared |
    | `OccupationNotAvailable` | `occupation.catalogId` | Error | section 15 | This occupation isn't available in this Campaign's era. | server |
    | `OccupationFormulaChoiceRequired` | `occupation.formulaCharacteristics[i]` | Error | [section 7.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#71-occupation-skill-points) | Choose which characteristic your occupation points use. | server |
    | `CustomOccupationNameRequired` | `occupation.custom.name` | Error | [section 7](../../docs/game-rules/coc7_character_creation_and_development_rules.md#7-occupation-creation-rules) | Enter a name for your occupation. | shared |
    | `CustomOccupationFormulaNotAllowed` | `occupation.custom.formulaId` | Error | section 7.1 | Choose a point formula from the list. | shared |
    | `CustomOccupationSkillRequired` | `occupation.custom.skills[i]` | Error | [section 18](../../docs/game-rules/coc7_character_creation_and_development_rules.md#18-ruleset-separation-standard-vs-quick-fire) | Choose occupation skill {n}. | shared |
    | `CustomOccupationCreditRatingRangeInvalid` | `occupation.custom.creditRating` | Error | [section 7.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#73-credit-rating) | Enter a Credit Rating range between {minimum} and {maximum}, with the minimum no higher than the maximum. | shared |
    | `OccupationSkillChoiceRequired` | `occupation.skillChoices[s]` | Error | [section 7.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#72-occupation-skill-allocation) | Choose {count} for this part of your occupation. | server |
    | `OccupationSkillChoiceNotAllowed` | `occupation.skillChoices[s][i]` or `occupation.custom.skills[i]` | Error | section 7.2, [project_ruleset.md section 4.5](../../docs/game-rules/project_ruleset.md#45-occupation-skill-choices) | Choose a skill this occupation allows that isn't already one of its skills. | server |
    | `SpecializationRequired` | the skill's `specialization` field | Error | [section 6.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#61-standard-1920s-investigator-sheet-skill-base-values) | Enter a specialization for {skill}. | server |
    | `SpecializationNotAllowed` | the skill's `specialization` field | Error | [project_ruleset.md section 4.2](../../docs/game-rules/project_ruleset.md#42-weapons-gear-and-specializations-without-catalogs) | Choose a {skill} specialization from the list. | server |
    | `UnknownSkill` | `skills[i].skill` | Error | section 6.1 | Choose a skill from the list. | server |
    | `SkillPointsNegative` | `skills[i].occupationPoints` or `skills[i].personalInterestPoints` | Error | section 7.2, [section 8](../../docs/game-rules/coc7_character_creation_and_development_rules.md#8-personal-interest-skills) | Enter 0 or more points for {skill}. | shared |
    | `CreationPointsOnCthulhuMythos` | `skills[i].occupationPoints` or `skills[i].personalInterestPoints` | Error | section 8, section 15 | Cthulhu Mythos can't take points at creation. | shared |
    | `PersonalInterestPointsOnCreditRating` | `skills[i].personalInterestPoints` | Error | [project_ruleset.md section 4.6](../../docs/game-rules/project_ruleset.md#46-credit-rating-takes-occupation-points-only) | Credit Rating can only take occupation points. | shared |
    | `OccupationPointsOutsideOccupationSkills` | `skills[i].occupationPoints` | Error | section 7.2 | {skill} isn't one of your occupation skills. | server |
    | `OccupationPointsOverspent` | `occupationPoints` | Error | section 7.1 | You've spent {spent} occupation points. You have {budget}. | server |
    | `OccupationPointsUnspent` | `occupationPoints` | Warning | section 7.2 | You have {left} occupation points left. Unspent points are lost. | server |
    | `CreditRatingOutOfRange` | `creditRating` | Error | section 7.2, section 7.3 | Credit Rating must be between {minimum} and {maximum}. | server |
    | `PersonalInterestPointsOverspent` | `personalInterestPoints` | Error | section 8 | You've spent {spent} personal interest points. You have {budget}. | server |
    | `PersonalInterestPointsUnspent` | `personalInterestPoints` | Warning | section 8 | You have {left} personal interest points left. Unspent points are lost. | server |
    | `QuickFireSkillValueNotInPool` | `quickFire.values[i].value` | Error | section 18 | Use one of the Quick fire skill values: {values}. | shared |
    | `QuickFireSkillAssignmentMismatch` | `quickFire.values` | Error | section 18 | Use each Quick fire skill value exactly once: {values}. | server |
    | `QuickFireSkillNotOccupationSkill` | `quickFire.values[i].skill` | Error | section 18 | {skill} isn't one of your occupation skills. | server |
    | `QuickFireCreditRatingValue` | `creditRating` | Error | section 18 (project assumption) | Credit Rating must be {expected} for this occupation. | server |
    | `QuickFirePersonalInterestNotAllowed` | `quickFire.personalInterests[i]` | Error | section 18 | Choose a skill that isn't an occupation skill, Credit Rating, Cthulhu Mythos, or already chosen. | server |
    | `QuickFirePersonalInterestsTooMany` | `quickFire.personalInterests` | Error | section 18 | Choose {count} personal interest skills. You have chosen {chosen}. | shared |
    | `QuickFirePersonalInterestsUnchosen` | `quickFire.personalInterests` | Warning | section 18 | Choose {count} personal interest skills. You have chosen {chosen}. | shared |
    | `SkillAboveWarningThreshold` | `skills` | Warning | [ux.md section 12](ux.md#12-open-decisions-and-research-gaps) (app-level advice, not a rule) | {skill} is above {threshold}. Check with your Keeper. | server |

    The `expected` and `actual` values are strings or null. Age-dependent checks are skipped while the age is missing or out of range, because the age error already blocks submission. `PointBuyTotalMismatch` is reported only once all eight values are present. `QuickFireAssignmentMismatch` is reported only once all eight values are present and in the pool. Checks that need the occupation point or personal interest budget are skipped until the budget can be calculated. Occupation point, personal interest, and Credit Rating range checks apply to Standard Rolling and Point Buy; the Quick Fire skill checks apply to Quick Fire only ([section 2.3](../../docs/game-rules/coc7_character_creation_and_development_rules.md#23-quick-fire-alternative)). `{skill}` is the skill's display name: `Skill (Specialization)`, or `Skill: Specialization` when the skill name already ends in parentheses.
  - **Rule parameters reach the frontend from the API.** Point Buy parameters, the Standard Rolling formulas, the Quick Fire values, the occupation point formulas, the Credit Rating bounds, the age range, the characteristic floor, the dice expressions for Luck and EDU checks, the EDU maximum of section 3.2, the Luck multiplier of section 5.5, and the Investigator's age bracket are returned by the character-sheet endpoints (`rules` and `ageEffects.bracket`), so the frontend validator never hard-codes a rule value.
  - **Parity fixtures.** `specs/character-sheet/validation-fixtures.json` lists Character Sheet inputs with their expected `ValidationError` items. The backend validator must produce exactly the expected items for every case; the frontend validator must do the same for every case with scope `shared`.
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
  - `GET /api/campaigns/{campaignId}/rules/skills` - returns the skill catalog for the Campaign's Era and the specialization catalog to Campaign members: `{era, skills: [{skill, specialization, base}], closedFamilies: [{skill, specializations: [{specialization, base}]}], openFamilies: [string], specializationSuggestions: {skill: [string]}}`, where `base` is `{kind: fixed, value}` or `{kind: characteristic, characteristic, divisor}`.
  - Both character-sheet endpoints are for the owning Player only and return 404 to anyone else. `PUT` returns 409 when the Investigator is Submitted or Approved and 400 for a malformed body (for example an unknown Creation Method, or inputs that belong to another Creation Method: `characteristics` under Standard Rolling, `characteristicRolls` under Point Buy or Quick Fire, `quickFire` under Standard Rolling or Point Buy, or `skills` under Quick Fire).
  - `PUT` body (the Player's inputs only; derived values are never accepted): `{identity: {name, age, gender, residence, birthplace}, creationMethod, characteristics: {"STR": int|null, ...}, characteristicRolls: {"STR": int|null, ...}, ageEffects: {deductions: {"STR": int|null, ...}, eduImprovementChecks: [{check: int|null, gain: int|null}]}, luckRolls: [int|null], occupation, skills, quickFire}`. Dice inputs are raw dice totals.
    - `characteristicRolls` (Standard Rolling) are raw dice totals; each becomes a Roll Record with purpose `Characteristic:{C}`.
    - `occupation`: null or `{catalogId, custom, formulaCharacteristics: [code|null], skillChoices: [[skillReference]]}`; `custom` is null or `{name, formulaId, skills: [skillReference|null], creditRatingMin, creditRatingMax}`. `formulaCharacteristics` has one entry per formula term; `skillChoices` has one list per occupation skill slot, holding the Player's picks for that slot. A `skillReference` is `{skill, specialization}`.
    - `skills` (Standard Rolling and Point Buy): `[{skill, specialization, occupationPoints: int|null, personalInterestPoints: int|null}]`.
    - `quickFire` (Quick Fire): `{values: [{skill, specialization, value: int|null}], personalInterests: [skillReference]}`; Credit Rating is one of the `values`.
  - Response: `{investigatorId, status, playerName, changeRequestComment, characterSheet, rules, validationErrors}`.
    - `characterSheet` (the Character Sheet view, also used by the Keeper's review): `{schemaVersion, identity, creationMethod, characteristics, characteristicRolls, ageEffects, luckRolls, occupation, skills, quickFire, derived, rollRecords}`.
      - `characteristics`: `{"STR": {assigned, value, hard, extreme}, ...}` for all eight; `assigned` is the Point Buy or Quick Fire value, or the value computed from the Standard Rolling Roll Record, and `value` the value after age effects.
      - `characteristicRolls`: the raw Standard Rolling totals, `{"STR": int|null, ...}`.
      - `occupation`: null or the inputs plus `{name, creditRatingMin, creditRatingMax, isCustom, formulaId}` resolved from the catalog or the custom definition (each null while unknown), and `quickFireCreditRating: {value, freedValue}`, the Credit Rating a Quick Fire Investigator takes for the occupation and the value it frees (section 18), or null while the Credit Rating minimum is unknown.
      - `skills`: every skill of the Era's catalog plus every added specialization, `[{skill, specialization, base, occupationPoints, personalInterestPoints, value, hard, extreme, isOccupationSkill}]`, computed per [section 9](../../docs/game-rules/coc7_character_creation_and_development_rules.md#9-skill-post-processing); `base` and `value` are null until calculable.
      - `quickFire`: the Quick Fire inputs as sent.
      - `ageEffects`: `{bracket, deductions, eduImprovementChecks}`; `bracket` is `{minimumAge, maximumAge, physicalDeductionTotal, physicalDeductionCharacteristics, appearanceModifier, eduImprovementChecks, luckRolls}` or null while the age is missing or out of range; each EDU check is `{check, gain, eduBefore, eduAfter}`.
      - `derived`: `{luck, hitPoints, magicPoints, sanity: {current, maximum}, dodge, movementRate, damageBonus, build, occupationPoints, personalInterestPoints, creditRating, wealth}`; a value is null until it can be calculated. `occupationPoints` and `personalInterestPoints` are `{budget, spent, left}` (Standard Rolling and Point Buy only). `wealth` is `{currency, spendingLevel, cash, assets}`, each amount `{amount, orMore}`, with `assets` null for none.
      - `rollRecords`: `[{purpose, dice, result, source}]`.
    - `rules`: `{pointBuyBudget, pointBuyMinimum, pointBuyMaximum, pointBuyRecommendedMinimum, minimumAge, maximumAge, characteristicFloor, luckDice, eduImprovementCheckDice, eduImprovementGainDice, eduMaximum, luckMultiplier, standardRolling, quickFireCharacteristicValues, quickFireSkillValues, quickFirePersonalInterestBonus, quickFirePersonalInterestCount, occupationPointFormulas, customOccupationSkillCount, creditRatingMinimum, creditRatingMaximum, skillValueWarningThreshold, creditRatingSkill, cthulhuMythosSkill}`. `standardRolling` is `{"STR": {dice, bonus, multiplier}, ...}` per section 2.1; `occupationPointFormulas` is `[{id, terms: [{characteristics, multiplier}]}]` per section 7.1.
    - `validationErrors`: `ValidationError` items `{code, field, message, expected, actual, severity}` with severity `Error` or `Warning`.
- **Data Models:**
  - Backend: `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Domain/CharacterSheets/` (Character Sheet value object, Roll Record, `IRollSource`, derived-value services, validator).
  - Frontend: `frontend/src/campaign-play/types/CharacterSheet.ts`.
  - Rule data: `docs/game-rules/catalogs/occupations.1920s.json`, `docs/game-rules/catalogs/skills.1920s.json`, `docs/game-rules/catalogs/skill-specializations.json`, `docs/game-rules/catalogs/wealth.1920s.json`, `docs/game-rules/catalogs/age-rules.json`, `docs/game-rules/catalogs/characteristics-rules.json`.
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

Scenario: Point Buy Investigator applies age effects before Hard and Extreme values
  Given a Player is creating a Character Sheet with Point Buy
  And the Investigator's age is in a bracket with a physical deduction and an APP modifier
  When the Player distributes the deduction as section 3.1 of the character rules allows
  Then each characteristic value is the assigned value after the age effects of section 3.3
  And its Hard and Extreme values are calculated from that value

Scenario: Age deduction that does not match the bracket blocks submission
  Given a Player's Investigator is in a bracket with a physical deduction
  When the Player deducts a different total than section 3.1 requires
  Then the Character Sheet reports an age deduction error
  And the Character Sheet cannot be submitted

Scenario: Missing EDU improvement check blocks submission
  Given a Player's Investigator is in a bracket that requires EDU improvement checks
  When the Player submits without entering every check
  Then the submission is rejected with an EDU improvement check error

Scenario: Age effects cannot take a characteristic below the floor
  Given a Player's Investigator has a low APP
  When the age bracket's APP modifier would take it below the project_ruleset section 4.4 floor
  Then the Character Sheet reports an error on APP

Scenario: Young Investigator keeps the higher Luck roll
  Given a Player is creating a Character Sheet with any Creation Method
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

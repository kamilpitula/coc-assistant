# Design: PBI-SP-003: A Keeper creates, edits, and deletes Campaign-scoped Human NPCs with an NPC Profile, on a shared game-rules kernel

## Triggers
- 1 New dependency: the projects `CocAssistant.GameRules.Domain` and `CocAssistant.GameRules.Tests` (ADR 0017).
- 2 Shared model change: Campaign Play rule types move into the kernel; a new Scenario Preparation aggregate and table.
- 3 New cross-layer patterns: a 400 keyed by nested request path with server-owned messages, a list read across aggregates, and a consumer-owned rule-data port.
- 4 ADR: the 400 path scheme will be copied by PBI-SP-009, Items, and Handouts (ADR 0018).
- 5 More than one bounded context: Campaign Play (refactor, read adapter) and Scenario Preparation.
- 6 Explorer open questions 1 to 7 had competing answers (decided below).
- 7 UX: new screens and the NPC Profile field-level design (ux.md section 25.4).

## Constraints
- ADR 0017 (kernel; move with no behavior change; catalog reader location left to this PBI), ADR 0013 (Campaign by id, no foreign key; Keeper port), ADR 0008 (consumer-owned port, adapter in the consumer's Infrastructure), ADR 0006 (catalogs as embedded resources), ADR 0005 and ADR 0007 (schema-versioned JSON value), ADR 0015 (Keeper notes as validated Lexical JSON), ADR 0018 (written with this record).
- Game rules, cited and not restated: `docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md` sections 3.1 to 3.4 and 4; `docs/game-rules/coc7_character_creation_and_development_rules.md` sections 5.3, 5.4, 5.7, 5.8, 10.1, and 10.3; `docs/game-rules/project_ruleset.md` sections 5.1 to 5.8 (5.8 amended in this commit, see Human decisions).
- Spec: `specs/scenario-preparation/spec.md` Blueprint (Non-Player Entity API and profiles, SignalR exception at line 30), Constraints (lines 52, 56, 58, 60), Regression Guardrails (lines 86-89), Scenarios (Human NPC, list, sections, delete, Keeper-only).
- CONTEXT.md: Human NPC, NPC Profile, Opposing Value, Investigator Difficulty (added in this commit), Derived Value Override (NPC Profiles have none), Non-Player Entity (never "NPC" alone in UI copy, ux.md section 21).
- Existing patterns: Scenario Preparation aggregate shape (`backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Domain/Scene.cs:8-79`); Keeper check first, every refusal NotFound (`.../Application/SceneService.cs:3-8`); controller-owned 400 copy (`.../Controllers/ScenesController.cs:141-156`); versioned JSON column (`backend/src/CampaignPlay/CocAssistant.CampaignPlay.Infrastructure/CampaignPlayDbContext.cs:92-99`, `CharacterSheetJsonStorage.cs:10-35`); adapter over Campaign Play (`.../ScenarioPreparation.Infrastructure/CampaignPlayCampaignKeepers.cs:4-15`); case-insensitive error keys (`frontend/src/scenario-preparation/services/validationProblem.ts:5-9`); Scenario Preparation already imports campaign-play hooks (`frontend/src/scenario-preparation/components/scenario-page/scenario-page.tsx:4`).
- Cyclomatic complexity 10 or below (ESLint, CA1502); neither baseline grows.
- Interpretation accepted at the gate: spec.md line 30 "a row with its Campaign id, type, and name" is met by one table per type; the type is the table (D6).

## UX
- Selected option: A, compact rows with progressive disclosure - `specs/scenario-preparation/ux.md` section 25.4 (updated in this commit), with SP-UX-42 to SP-UX-44 and SP-A11Y-27 added.
- Also fixed in ux.md: section 21 route table now points the Monster Profile page to section 25; section 25.1 scopes Derived Value Overrides to Monster Profiles; section 30 marks the PBI-SP-003 field-level design resolved.
- spec.md scenario "A Human NPC's derived values follow the rules" now includes POW and Magic Points (project_ruleset.md section 5.4).

## Decisions

### D1: What moves into `CocAssistant.GameRules.Domain` (Explorer question 1)
Option A (ADR 0017 set): from `CharacterSheets/DerivedValueRules.cs` the types `CharacteristicLevels`, `MagicPoints`, `HitPoints`, `MovementRate`, `DamageBonusAndBuild`, and `RoundDown` (stays internal); `RuleData/CharacteristicsRules.cs` (`DamageBonusAndBuildBand`, `CharacteristicsRules`); `DiceExpression`; and `Characteristic` with `CharacteristicCodes`, which both modules need for the eight codes. Option B: everything in `DerivedValueRules.cs` and `DiceExpression.cs`, including Luck, `AgeBracket`, `CreationDice`, StartingSanity, IdeaAndKnow, DodgeBase.

| Metric | Option A: ADR 0017 set | Option B: whole files |
| --- | --- | --- |
| Consistency | + matches ADR 0017 and "the kernel only grows with rules that more than one module needs" | - puts Investigator-creation-only rules in the kernel |
| Modifiability | + an Investigator-only rule change stays in Campaign Play | - creation changes touch the shared kernel |
| Testability | + Campaign Play test bodies unchanged; kernel tests only for new rules | 0 same |
| Simplicity | 0 needs a file split (CreationDice and Investigator-only rules stay) | + one move per file |
| Reversibility | + small, mechanical | - also drags the AgeRules catalog model |
| Security and correctness | N/A: no authorization or data path | N/A: same |

- **Chosen:** A, because of consistency and modifiability - giving up a whole-file move.
- **Rejected:** B. The Developer must not move `LuckValue`, `AgeBracket`, `CreationDice`, `StartingSanity`, `IdeaAndKnow`, or `DodgeBase`.

### D2: Where Scenario Preparation gets catalog data and the Era (Explorer question 2)
The server needs no Era: custom skill names are allowed (project_ruleset.md section 5.7), so no server rule uses the Era's skill catalog. It needs only the Era-independent `CharacteristicsRules` (`backend/src/CampaignPlay/CocAssistant.CampaignPlay.Application/ICreationRuleData.cs:13`) and the closed Fighting and Firearms specializations (`ICreationRuleData.cs:16`). The client gets Era suggestions from the existing member endpoints `GET /api/campaigns/{id}/rules/skills` and `/rules/occupations` (`CampaignRulesController.cs:17-44`); the Keeper is a member.

Option A: a consumer-owned port `INonPlayerEntityRuleData` in Scenario Preparation Application returning the kernel's `CharacteristicsRules` and a Scenario Preparation domain record `CombatSkillSpecializations`; adapter `CampaignPlayNonPlayerEntityRuleData` in Scenario Preparation Infrastructure maps Campaign Play's singleton `ICreationRuleData` (`CampaignPlayInfrastructureServiceCollectionExtensions.cs:42`). Option B: Scenario Preparation Infrastructure embeds the two catalogs again with its own readers. Option C: a new `CocAssistant.GameRules.Infrastructure` takes over the readers.

| Metric | A: port and adapter | B: second embedding | C: GameRules.Infrastructure |
| --- | --- | --- | --- |
| Consistency | + ADR 0008/0013 adapter shape, as `CampaignPlayCampaignKeepers.cs` | - second reader of one catalog | 0 a new project kind |
| Modifiability | + catalog format changes in one place | - two readers drift | + one reader |
| Testability | + fake port in unit tests; adapter integration test like `CampaignKeepersAdapterTests.cs` | 0 | 0 |
| Simplicity | + about two small files | - duplicate parsing | - moves readers and Campaign Play DI |
| Reversibility | + can become C later | 0 | - hard to undo |
| Security and correctness | + read-only data | 0 | 0 |

- **Chosen:** A, because of consistency, simplicity, and modifiability - giving up independence from Campaign Play Infrastructure for rule data (ADR 0017 allows the reader to stay).
- **Rejected:** B (duplicates catalog reading) and C (premature move). The Developer must not add an Era lookup to `ICampaignKeepers`.

### D3: project_ruleset.md section 5.5 notation versus `DiceExpression` (Explorer question 4)
Option A: a new kernel type `DiceNotation` beside the unchanged `DiceExpression`; it parses section 5.5 into terms, reports whether DB is present, and never rolls (section 5.1). API `TryParse(text, DamageBonusUse allow)`, so PBI-SP-009 adds `SanityLoss` without changing it. Option B: extend `DiceExpression` to the full grammar.

| Metric | A: separate type | B: extend |
| --- | --- | --- |
| Consistency | 0 two dice types, for a stated reason: `DiceExpression` is one roll with Minimum and Maximum used to check entered rolls (`DiceExpression.cs:15-20`); `DiceNotation` is recorded text that is never rolled. ADR 0017 says "beside". | - Count, Sides, Maximum mean nothing for "1D6+1D4+DB" |
| Modifiability | + the grammar changes without touching creation | - every creation caller at risk |
| Testability | + own kernel tests | - Campaign Play tests would change |
| Simplicity | + small recursive-descent parser | - branching inside one type |
| Reversibility | + | - |
| Security and correctness | + Campaign Play behavior provably unchanged | - case-insensitivity widens creation input |

- **Chosen:** A, because of correctness (no Campaign Play change) and modifiability - giving up a single dice type.
- **Rejected:** B. The Developer must not change `DiceExpression`.

### D4: Where the MOV gate for ages 15-89 lives (Explorer question 3)
Option A: Scenario Preparation domain (`NpcProfileCalculator`) calls the unchanged kernel `MovementRate.For` only when the age is 15-89 and STR, DEX, and SIZ are present; with all three present and another age, MOV is "not covered"; with one missing, it is not shown. Option B: a new kernel method `MovementRate.ForCoveredAge`.

| Metric | A: Scenario Preparation domain | B: kernel |
| --- | --- | --- |
| Consistency | + project_ruleset.md section 5.3 states the gate for "a Human NPC"; Campaign Play enforces 15-89 on its own (`CreationRuleParameters.cs:17-23`) | - a one-module rule in the kernel |
| Modifiability | + a future house rule for other ages changes one place | 0 |
| Testability | + calculator unit tests | + |
| Simplicity | + one branch | 0 |
| Reversibility | + | + |
| Security and correctness | + `MovementRate.For` untouched | 0 |

- **Chosen:** A - giving up nothing material.
- **Rejected:** B.

### D5: 400 scheme for nested profile problems (Explorer question 5; ADR 0018)
Option A: `ValidationProblemDetails` keyed by camelCase request JSON path (`skills[2].value`, `combat.weapons[0].damage`, `characteristics.STR`, list-level `skills`), values are server-owned messages; the client matches keys case-insensitively and shows the messages. Option B: Campaign Play's 422 `validationErrors` list (`InvestigatorControllerBase.cs:31-43`). Option C: path keys with client-mapped copy.

| Metric | A: path keys, server messages | B: 422 list | C: path keys, client copy |
| --- | --- | --- | --- |
| Consistency | + the 400 ValidationProblem Scenario Preparation uses (`ScenesController.cs:153-156`); ux.md 25.2 "map each problem to its field by path" | - 422 where spec.md line 51 and ux.md 25.2 say 400 | 0 |
| Modifiability | + new rule, no client change | 0 | - copy on both sides |
| Testability | + integration tests assert keys and messages | + | 0 |
| Simplicity | + | 0 | - client duplicates rule knowledge |
| Reversibility | 0 copied by PBI-SP-009 | 0 | 0 |
| Security and correctness | + | + | 0 |

- **Chosen:** A, because of consistency with spec and UX and modifiability - giving up machine-readable codes.
- **Rejected:** B (wrong status for this functionality) and C (rule knowledge in the client).

### D6: Storage and the list across aggregates (Explorer question 6)
Option A: one table per aggregate (`HumanNpcs` now, `MythosCreatures` in PBI-SP-009) and an Application read port `INonPlayerEntityDirectory.ListForCampaignAsync` implemented by an EF projection to `NonPlayerEntitySummary(Id, NonPlayerEntityType, Name)`; PBI-SP-009 adds a second projection with `Concat`. Option B: one shared table with TPH and an abstract `NonPlayerEntity` base.

| Metric | A: table per aggregate | B: shared TPH |
| --- | --- | --- |
| Consistency | + separate aggregates (spec.md line 30), one table per aggregate as Scenario and Scene | - inheritance across two aggregates |
| Modifiability | + PBI-SP-009 adds a projection, no migration of HumanNpcs | - every Monster column touches the shared table |
| Testability | + | 0 |
| Simplicity | 0 one extra port | + one query |
| Reversibility | + | - |
| Security and correctness | + type can never change (guardrail spec.md line 87) | 0 a discriminator could be changed |

- **Chosen:** A, because of the guardrail and modifiability - giving up a single-table query.
- **Rejected:** B.

### D7: Frontend reuse of rule data and fields across slices
Option A: import from campaign-play `useSkillCatalog` and `useOccupationCatalog` (`frontend/src/campaign-play/hooks/useRuleData.ts:7-26`), `WizardField` (number type, datalist), `WizardSelect`, `fieldId`, and `skillNames`, following the existing `useCampaign` import. Option B: move them to `src/shared/` and rename. Option C: copy them into the slice.

| Metric | A: import | B: move to shared | C: copy |
| --- | --- | --- | --- |
| Consistency | + precedent at `scenario-page.tsx:4` | + frontend/CLAUDE.md puts 2-slice code in shared | - against DRY |
| Modifiability | 0 a Campaign Play change ripples | + | - drift |
| Testability | + | + | 0 |
| Simplicity | + no churn | - touches many Campaign Play files in an unrelated PBI | - |
| Reversibility | + B can follow | 0 | - |
| Security and correctness | N/A: UI only | N/A | N/A |

- **Chosen:** A, because of simplicity and a narrow PBI - giving up the shared placement; add a PBI Follow-up to move them to `src/shared/`.
- **Rejected:** C (duplication). B is deferred to that follow-up, not rejected.

### Single-option decisions
- Kernel at `backend/src/GameRules/CocAssistant.GameRules.Domain`, namespace `CocAssistant.GameRules.Domain`, no references; tests for new rules in `backend/tests/GameRules/CocAssistant.GameRules.Tests`; both in `backend/CocAssistant.slnx`, the test project in the CI unit-test loop (`.github/workflows/ci.yml:94-98`).
- Refactor commit: moved Campaign Play tests stay in `CampaignPlay.Tests`; only their `GlobalUsings.cs` gains `global using CocAssistant.GameRules.Domain;`. No test body changes. Both `GlobalSuppressions.cs` targets name only types that do not move, so they stay unchanged.
- The floor division duplicated in `SkillBase.For` (`RuleData/SkillCatalog.cs:14-17`) is left alone.
- Investigator Difficulty: kernel `enum InvestigatorDifficulty { Regular, Hard, Extreme }` and `InvestigatorDifficulties.ForOpposingValue(int)`, citing NPC ruleset section 3.4 (ADR 0017 puts difficulty in the kernel).
- Row `HumanNpcs`: `Id`, `CampaignId`, `Name`, `CreatedAt`, and a JSON `Profile` column (SchemaVersion 1, ValueComparer, upgrade-on-read, as `CampaignPlayDbContext.cs:92-99`); index on `CampaignId`; no foreign key (ADR 0013). Age and Keeper notes live inside the JSON (spec.md line 30); Keeper notes as a nested JSON element, not an escaped string. Migration `<yyyyMMddHHmmss>_AddHumanNpcs`.
- No concurrency token, as Scene (`ScenarioPreparationDbContext.cs:39-58`); one editor (spec.md line 30).
- API: `POST /api/campaigns/{campaignId}/human-npcs` takes `{name, age}` and returns 201 with the profile; `GET`, `PUT` (whole profile), and `DELETE` (204) on `/human-npcs/{humanNpcId}`. A section is `null` when not added; an added empty section is kept and shown as "None recorded." (same copy as `frontend/src/campaign-play/components/sheet-weapons-section/sheet-weapons-section.tsx:46`).
- Request shape: `name`, `age`, `details {professionOrRole, shortDescription, goal, relationshipToInvestigators, knowledge, secrets, behaviorCue}`, `keeperNotes`, `characteristics` (object keyed by code `STR`..`EDU`, values whole number or null), `skills [{name, specialization, value}]`, `combat {dodge, armorPoints, tacticsAndMorale, weapons [{name, skill {name, specialization}, damage, attacksPerRound, range, ammunition, malfunction, impaling}]}`, `spells [{name, magicPointCost, effect}]`. Requests never carry derived values or difficulty. Range, ammunition, and malfunction are free text (no range in section 5.2).
- Response: the request shape plus `id`; each entered characteristic, skill, and Dodge with its `difficulty`; `characteristics.derived {hitPoints, magicPoints, damageBonus, build, movementRate, movementRateNotCovered}`, each null when it cannot be worked out.
- Weapon skill: referenced by `{name, specialization}`, matched to the profile's skill rows case-insensitively (as `SkillCatalog.cs:51`). The Firearms family is the skill name "Firearms" (section 5.5 names it); DB is refused only there.
- Dice text is stored trimmed exactly as entered, not normalized. Interior whitespace, a count of 0, and 0 sides are refused (Human decisions, F2).
- List `GET /api/campaigns/{campaignId}/non-player-entities` returns `{items: [{id, type, name}]}` ordered by name, then id; wire types `HumanNpc` and `MythosCreature`; the client zod enum accepts both now. Filtering and collation are on the client (ux.md section 23).
- Domain validation returns `IReadOnlyList<NpcProfileProblem>` (path and kind); the controller maps kind to message through a dictionary (complexity stays at 10 or below), as `ScenesController.cs:141-150` owns copy. Messages are in ux.md section 25.4.
- No SignalR (spec.md line 30); the UI invalidates the list, counts, and profile queries.
- Frontend form state: `useReducer` with a handler-map reducer in a pure `services/humanNpcForm.ts`. Numbers use `WizardField type="number"`, which parses with `parseInt` (`wizard-field.tsx:38-41`, existing behavior).

## Patterns
- **Used:** Adapter at `CampaignPlayNonPlayerEntityRuleData` (Scenario Preparation Infrastructure) - force: Campaign Play's `ICreationRuleData` does not match Scenario Preparation's port; same as `CampaignPlayCampaignKeepers.cs`.
- **Used:** Strategy as a handler map in the `humanNpcForm.ts` reducer and in the controller's problem-kind-to-message map - force: conditionals over about 12 action kinds and 20 or more problem kinds that would exceed complexity 10.
- **Used:** Builder for test data, extending `ScenarioPreparationTestBuilder` with Human NPC and NPC Profile builders - force: many-step profile construction in tests.
- **Rejected:** Interpreter for dice - nothing is evaluated (section 5.1, no rolling); a parser returning terms is enough.
- **Rejected:** Composite or Chain of Responsibility for validation - section validators are independent and none stops the others; plain per-section functions, concatenated.
- **Rejected:** Strategy per list source - one projection per table with `Concat` is simpler.
- **Rejected:** Template Method on a shared Human NPC and Mythos Creature base - D6 rejects the base.
- **Rejected:** Observer or SignalR - spec exception (spec.md line 30).
- **Rejected:** State - a Human NPC has no lifecycle.

## Invariants
- The refactor commit changes no Campaign Play behavior: test bodies untouched (only the global using added); `MovementRate.For`, `DiceExpression`, and `CharacteristicLevels` unchanged; neither GlobalSuppressions file changes.
- The kernel has no project references, persistence, or aggregates.
- Scenario Preparation Domain and Application reference only Scenario Preparation projects and GameRules.Domain; only Scenario Preparation Infrastructure touches Campaign Play.
- Every Non-Player Entity operation checks the Keeper first; a non-Keeper, another Campaign, a missing id, or the other type's route ends in 404 before any profile is read or written.
- NPC Profile derived values and difficulty are always computed on the server and never accepted from a request; NPC Profiles have no overrides (spec.md line 88).
- MOV is computed only for ages 15-89 with STR, DEX, and SIZ present.
- DB is refused only in damage of a weapon whose skill is in the Firearms family.
- A refused create or edit stores nothing.
- A Human NPC never becomes a Mythos Creature (separate table).
- The list contract stays `{id, type, name}`, accepting both type values.
- Complexity 10 or below with no baseline growth; ASCII only.

## Implementation plan
1. Kernel project and move (commit 1, refactor): create GameRules.Domain; move the D1 Option A types; `DerivedValueRules.cs` keeps StartingSanity, IdeaAndKnow, DodgeBase, LuckValue; `CreationDice` moves to its own Campaign Play file; Campaign Play Domain references the kernel; add global usings in Campaign Play Domain, Application, Infrastructure, Controllers, and Tests; update the slnx; build and run every Campaign Play test.
2. Kernel additions (commit 2): `DiceNotation`, `DamageBonusUse`, `InvestigatorDifficulty`, `InvestigatorDifficulties`; GameRules.Tests and its CI entry.
3. Scenario Preparation domain (commit 3): `HumanNpc`, `NpcProfile` and section records, `CombatSkillSpecializations`, per-section validators, `NpcProfileProblem`, `NpcProfileCalculator` (derived values, MOV gate, difficulty); reference GameRules.Domain.
4. Persistence (commit 3): `HumanNpcProfileJsonStorage`, DbContext mapping, migration, `EfHumanNpcRepository`, `EfNonPlayerEntityDirectory`, adapter `CampaignPlayNonPlayerEntityRuleData`, DI.
5. Application (commit 4): `HumanNpcService` and `NonPlayerEntityService` (Keeper first), results and views.
6. Controllers (commit 4): `HumanNpcsController`, `NonPlayerEntitiesController`, requests and responses, problem-message map; integration tests.
7. Frontend data (commit 5): types, `nonPlayerEntityApi.ts` with query keys, `useNonPlayerEntities.ts`, `readValidationProblems` in `validationProblem.ts`, `nonPlayerEntityFilter.ts`.
8. Frontend list, create, and summary (commit 5): section components of ux.md section 27, summary section mounted in `campaign-page.tsx`, list and create pages, two routes.
9. Profile page (commit 6): `human-npc-page`, `human-npc-view`, `human-npc-form`, the four section components and their views, `delete-non-player-entity-dialog`, `non-player-entity-not-found`, route; stories and component tests.
10. E2E (commit 7): new spec and fixture.

## Reuse
- Using: kernel formulas for derived values; `RichTextDocument.Validate` for Keeper notes; `ICampaignKeepers`; `ScenarioPreparationControllerBase`; the `SceneService` Keeper-first shape; the `CharacterSheetJsonStorage` pattern; campaign-play `useCampaign`, `useSkillCatalog`, `useOccupationCatalog`, `WizardField`, `WizardSelect`, `fieldId`, `skillNames`; `useUnsavedChangesPrompt`; rich-text editor and view; shadcn `Collapsible`, `Checkbox`, `Select`, `Table`, `AlertDialog`; e2e `openAndCaptureBearer`, `createCampaignViaUi`, `joinAsNewPlayer`.
- Not using: Campaign Play `ValidationErrorSummary` - ux.md section 26 needs "There is 1 problem" copy (new `form-error-summary`). `SkillPicker` - it excludes custom names, Credit Rating, and Cthulhu Mythos (`skill-picker.tsx:9`). `sheet-weapons-section` - its card layout is the rejected UX option.

## TDD units
- Kernel: `DiceNotation` accepts `1D6+1D4+DB`, `2D6-1`, `d6`, `D100`, `0`, `3`; refuses `D`, `1D`, `0D6`, `1D0`, `1D6 + 2`, `DB` where disallowed, `++1`, empty; reports DB presence. `ForOpposingValue` at 0, 49, 50, 89, 90, 100 (NPC ruleset section 3.4).
- Campaign Play: existing suite passes unchanged (refactor proof).
- Domain: `HumanNpc.Create` refuses empty name, name over 200, missing age, ages -1 and 151; accepts 0 and 150 (SP-UX-31). Null sections store none. Each problem kind on its exact path: characteristic 101, unknown code, skill without name or value, Fighting with an unlisted specialization, Dodge 101, armor 2001, weapon without name, skill, damage, or attacks, weapon skill not on the profile, malformed damage, `1D10+DB` on Firearms (Handgun) refused while `1D3+DB` on Fighting (Brawl) accepted, attacks 0 and 100, 101 rows, text of 4,001 and 1,001 characters, invalid Keeper notes. A refused edit leaves the profile unchanged.
- Calculator: the spec "Thug" values give HP, MP, DB, Build, and MOV (SP-UX-36); a missing characteristic hides its value; MOV at ages 14, 15, 89, 90 with 14 and 90 not covered (section 5.3); Spot Hidden 55 is Hard; characteristic and Dodge difficulty (SP-UX-42).
- Storage: round trip and schema-version guard (SQLite fixture).
- Services: Player, other Keeper, missing Campaign, and foreign id give NotFound with no write; the list returns only this Campaign's profiles.
- Frontend: API zod parsing including both types; `readValidationProblems` with mixed-case keys; filter substring, accent and case, type (SP-UX-30); reducer add and remove section and row, 100-row limit, focus targets (SP-UX-33, SP-UX-34, SP-A11Y-22); problem-to-field mapping and Collapsible auto-open (SP-UX-35, SP-UX-43, SP-A11Y-20); weapon Skill options include unsaved skill rows (SP-UX-44); Specialization only for Fighting and Firearms; skill-list failure fallback; view shows difficulty text and no half or fifth values (SP-UX-42, SP-A11Y-25); MOV "Not covered" text (SP-UX-36); busy buttons disabled (SP-UX-40); Player sees not found without a request (SP-UX-39); summary counts singular and plural (SP-UX-28); row groups named (SP-A11Y-27); 320px reflow in stories (SP-A11Y-26).
- Integration (`HumanNpcApiTests`, `NonPlayerEntityListApiTests`, `NonPlayerEntityRuleDataAdapterTests`; migration via `ScenarioPreparationMigrationTests`): 201, 200, 204, 404, and 400 with exact path keys and messages; Player and other-Keeper 404 on all six endpoints; another Campaign's id gives 404.

## E2E coverage
New `e2e/tests/non-player-entities.spec.ts` and `e2e/fixtures/non-player-entities.ts`; the docblock cites spec Scenarios and SP-UX ids.
- "Keeper creates a narrative Human NPC", "A Human NPC needs a name and an age", "Keeper finds a profile in the list" (Human NPC part) -> "Keeper creates a Human NPC and finds it in the list" (SP-UX-28, 29, 30, 31, 32, 41).
- "A Human NPC's derived values follow the rules", "MOV is not computed outside the covered ages", "An Opposing Value shows the Investigator's difficulty", "Keeper adds and removes optional sections" -> "Keeper adds sections and sees worked-out values and difficulty" (SP-UX-33, 36, 42).
- "A firearm weapon cannot add Damage Bonus" -> "Keeper is told a firearm can't add Damage Bonus" (SP-UX-35, SP-A11Y-20).
- "Keeper deletes an unlinked profile" -> "Keeper deletes a Human NPC" (SP-UX-37).
- "Non-Player Entity profiles are the Keeper's alone" -> "Players and other Keepers can't see Human NPCs", UI not found and API 404 with the Player's bearer (SP-UX-28 Player part, SP-UX-39).
- Exceptions: Mythos Creature parts of the list and Keeper-only scenarios and SP-UX-38 belong to PBI-SP-009 and PBI-SP-010; SP-UX-34 (100 rows) and SP-UX-40 (double activation) are covered by component tests, where E2E would only repeat slowly.

## ADR
- ADR 0018: Scenario Preparation reports validation problems keyed by request path (`docs/adr/0018-scenario-preparation-validation-problems-keyed-by-request-path.md`), written with this record.
- None for D2 (follows ADR 0008) or D6 (recorded here; ADR 0013 governs tables).

## Phases
- Phase 1: kernel move; checkpoint: `refactor(game-rules): move shared rule calculations into the GameRules kernel (PBI-SP-003)`
- Phase 2: kernel dice notation and difficulty; checkpoint: `feat(game-rules): add dice notation and Investigator Difficulty (PBI-SP-003)`
- Phase 3: domain and persistence; checkpoint: `feat(scenario-preparation): add the Human NPC aggregate and storage (PBI-SP-003)`
- Phase 4: application, API, integration tests; checkpoint: `feat(scenario-preparation): add the Non-Player Entity and Human NPC API (PBI-SP-003)`
- Phase 5: frontend list, create, summary; checkpoint: `feat(frontend): add the Non-Player Entity list and create page (PBI-SP-003)`
- Phase 6: profile page; checkpoint: `feat(frontend): add the Human NPC profile view and editor (PBI-SP-003)`
- Phase 7: E2E; checkpoint: `test(e2e): cover Human NPC profiles (PBI-SP-003)`

## Human decisions
- 2026-10-17, UX gate: Q1 "A: Compact rows (Recommended)"; Q2 "Yes, characteristics too (Recommended)", Investigator difficulty shown for characteristics as well as skills; Q3 "No (Recommended)", no half or fifth values for Human NPCs; "Yes, add Magic Points (Recommended)" to the spec scenario "A Human NPC's derived values follow the rules". Thrown-weapon DB is the existing gap in project_ruleset.md section 5.5, not a new one; Dodge is a skill, covered by section 5.7. The ux.md section 25.1 and section 21 fixes are approved; narrative labels follow spec.md line 56.
- 2026-10-17, plan gate: "approve with all recommendations, Architect adds both edits". Accepted:
  - F1: besides section 5.8's list, an unlisted Fighting or Firearms specialization, an empty skill, weapon, or spell name, a skill with no value, and a weapon with no name or no attacks per round block a save; recorded in project_ruleset.md section 5.8 in this commit.
  - F2: dice notation is trimmed at the ends; interior whitespace, a count of 0, and 0 sides are refused.
  - F3: weapon attacks per round is a whole number 1-99 per section 5.2.
  - F4: the 1,000-character limit of spec.md line 58 applies to each text field of a row.
  - F5: labels "What the Human NPC knows" and "What the Human NPC hides" (ux.md section 21 forbids "NPC" alone).
  - The type of a profile is its table (spec.md line 30 reading, D6).
  - CONTEXT.md gains "Investigator Difficulty" in this commit.

## Revisions

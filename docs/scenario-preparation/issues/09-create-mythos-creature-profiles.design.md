# Design: PBI-SP-009: A Keeper creates, edits, and deletes Campaign-scoped Mythos Creatures with a Monster Profile

## Triggers
- 2 Shared data model: a new aggregate `MythosCreature`, table `MythosCreatures`, a Monster Profile JSON document, and a second projection in the Non-Player Entity list.
- 6 Open questions with competing answers: create payload, override shape, problem vocabulary, frontend reuse (D1 to D6).
- 7 UX: the Monster Profile page, editor, and a section index (ux.md section 25.5, Option B).
- Rule gaps RG1 to RG4 (Human decisions), recorded in project_ruleset.md section 5 before the spec.

## Constraints
- ADR 0013 (Campaign by id, Keeper port, every refusal 404), ADR 0015 (Keeper notes as Lexical JSON), ADR 0017 (kernel holds derived values and section 5.5 notation; it grows only with rules more than one module needs), ADR 0018 (400 keyed by request path, server-owned messages), ADR 0005 and ADR 0007 (schema-versioned JSON).
- Game rules, cited not restated: `docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md` sections 3.1, 3.2, 3.4, 5.3 to 5.10, and 8; `docs/game-rules/project_ruleset.md` sections 5.1, 5.2, 5.4, 5.5, 5.6, 5.8, and 5.9 (5.2, 5.4, 5.5, and 5.8 amended and 5.9 added in this commit).
- Spec: `specs/scenario-preparation/spec.md` line 27 (endpoints), line 30 (row plus JSON document; no SignalR), lines 57-58 (Monster Profile fields and limits, amended in this commit), lines 86-88 (guardrails), Scenarios "Keeper creates a Mythos Creature", "Malformed dice notation is refused", "A Derived Value Override needs a reason", "A Mythos Creature's firearm attack cannot add Damage Bonus" (added in this commit), "Hit Points not applicable needs a defeat outcome", "Non-Player Entity profiles are the Keeper's alone", "Keeper finds a profile in the list".
- CONTEXT.md: Mythos Creature, Monster Profile, Creature Kind, Derived Value Override, Investigator Difficulty (updated in this commit), Non-Player Entity. UI copy never says "monster" or "NPC" alone (ux.md section 21).
- PBI-SP-003 decision record D6 (one table per aggregate, `Concat` projection, no shared base) and D3 (`DiceNotation` unchanged, sanity loss added beside it): background, not binding, except where ADRs carry it.
- Existing patterns: aggregate Create and Edit returning problems (`backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Domain/HumanNpc.cs:35-56`); Keeper check first (`.../Application/HumanNpcService.cs:3-8,93-96`); problems to ModelState (`.../Controllers/HumanNpcsController.cs:158-171`); kind-to-message map (`.../Controllers/NpcProfileProblemMessages.cs:9-35`); versioned JSON (`.../Infrastructure/HumanNpcProfileJsonStorage.cs:10-31`); list projection (`.../Infrastructure/EfNonPlayerEntityDirectory.cs:163-170`); handler-map reducer (`frontend/src/scenario-preparation/services/humanNpcForm.ts:349-435`).
- Observed while designing: `DiceNotation` refuses a leading sign, because the term before a leading "+" or "-" is empty (`backend/src/GameRules/CocAssistant.GameRules.Domain/DiceNotation.cs:63-74`); the computed Damage Bonus is written "+1D4", "-1", or "0" (`DerivedValueRules.cs:54-63`, `docs/game-rules/catalogs/characteristics-rules.json`).
- Cyclomatic complexity 10 or below; no new ESLint baseline entries or GlobalSuppressions.

## UX
- Selected option: B, long form plus an "On this page" section index - `specs/scenario-preparation/ux.md` section 25.5 (field-level, new), with the header, 25.1, 26, 27, 28 (SP-UX-45 to SP-UX-49), 29 (SP-A11Y-28, SP-A11Y-29), and 30 updated.
- Sections 23 and 24 already specify the enabled Mythos Creature flow (linked names; Type and Name with "Mythos Creature created."); only the code is behind (`frontend/src/scenario-preparation/components/create-non-player-entity-page/create-non-player-entity-page.tsx:163-167`, `.../non-player-entity-list-page/non-player-entity-list-page.tsx:183-195`). No ux.md change there.

## Decisions

### D1: Shape of the Mythos Creature slice
Option A: a parallel vertical slice (`MythosCreature`, `MonsterProfile` records, per-section `Monster*Validation`, `MonsterProfileNormalizer`, `MonsterProfileCalculator`, `MonsterProfileJsonStorage`, `IMythosCreatureRepository` and `EfMythosCreatureRepository`, `MythosCreatureService`, `MythosCreaturesController` with Requests, Responses, Mapping, and `MonsterProfileProblemMessages`), sharing only kind-free helpers (D2, D5). Option B: a generic Non-Player Entity base, or a generic `NonPlayerEntityService<T>` and controller that both types plug into.

| Metric | A: parallel slice | B: generic base |
| --- | --- | --- |
| Consistency | + follows the Human NPC template file for file; spec.md line 30 and guardrail lines 86-87 keep the aggregates separate; PBI Refinement Protocol "keeping Human NPC and Mythos Creature separate" | - reintroduces the shared base PBI-SP-003 D6 rejected |
| Modifiability | + a Monster rule change never touches Human NPC code | - every change to one type risks the other; PBI-SP-010 duplicate and PBI-SP-004 links would widen the base |
| Testability | + each slice tested alone with existing builders | 0 generic tests plus per-type tests |
| Simplicity | 0 about 150 lines of service and controller shape repeated | - generics, type parameters, and per-type hooks for different rules |
| Reversibility | + a base can be extracted later if a third type appears | - hard to unpick once both types depend on it |
| Security and correctness | + Keeper-first check visible in each service | 0 one check, but behind indirection |

- **Chosen:** A, because of consistency with the guardrails and modifiability - giving up DRY for the service and controller *shape* (Keeper check, find, save). This is a documented DRY exception: the repeated code is structure, not shared knowledge; each copy encodes a different profile's rules.
- **Rejected:** B. The Developer must not add a shared base class, generic service, or generic controller for Non-Player Entities.

### D2: Problem vocabulary
Option A: separate `MonsterProfileProblem(Path, Kind, Subject = "")` and `MonsterProfileProblemKind`, with `MonsterProfileProblemMessages`; kind-free helpers move to neutral files: `ProfileLimits` (name 200, plain text 4,000, row text 1,000, 100 rows, armor 0-2,000, attacks per round 1-99; the shared rows of project_ruleset.md section 5.2 and spec.md line 58), `ProfileText.Trimmed`, `ProfilePaths.Row`, and `ProfileRanges.InRange` (Domain), and `ProfileProblemPaths` (`FieldLabel` lookup helper, `WithoutIndexes`, `LastSegment`; Controllers). `NpcProfileLimits` keeps Age and the 0-100 value maximum and refers to `ProfileLimits` for the rest. Option B: one shared `ProfileProblem` and `ProfileProblemKind` renamed across the Human NPC code, with range-specific copy carried on the problem.

| Metric | A: separate kinds, shared helpers | B: one shared kind enum |
| --- | --- | --- |
| Consistency | + CONTEXT.md separates NPC Profile and Monster Profile; the controller still owns copy (ADR 0018) | - renames PBI-SP-003 types; "Enter STR from 0 to 100" versus "0 to 2,000" needs ranges on the problem record |
| Modifiability | + a Monster kind never changes the Human NPC map | - one enum keeps growing with kinds that apply to one type only (already mixed, `NpcProfileProblem.cs:4-28`) |
| Testability | + existing message tests untouched | 0 existing tests renamed |
| Simplicity | 0 about six generic kinds (NameRequired, TextTooLong, ...) listed twice | - wider churn for the same behavior |
| Reversibility | + merging later is mechanical | 0 |
| Security and correctness | N/A: copy only | N/A: copy only |

- **Chosen:** A, because of modifiability and narrow churn - giving up one enum (the six generic kinds appear in both).
- **Rejected:** B. The Developer must not rename `NpcProfileProblem` or `NpcProfileProblemKind`, and must not reuse them for Monster Profiles (NPC Profile is the Human NPC's CONTEXT.md term).

### D3: Where Derived Value Overrides and Hit Points not applicable live
Option A: inside the Characteristics section. Request `characteristics: {values: {STR..EDU: int?}, hitPointsNotApplicable: bool, overrides: {hitPoints: {value: int?, reason}?, magicPoints: {...}?, damageBonus: {value: string?, reason}?, build: {...}?}} | null`. Removing the section removes them. Paths: `characteristics.values.STR`, `characteristics.overrides.hitPoints.reason`, `characteristics.hitPointsNotApplicable`. Option B: a tagged Hit Points mode (`hitPoints: {mode: Computed|Override|NotApplicable, value, reason}`) beside optional overrides for the other three. Option C: a generic list `overrides: [{value: "HitPoints", amount: "25", reason}]`.

| Metric | A: per-value objects + flag | B: tagged HP mode | C: generic list |
| --- | --- | --- | --- |
| Consistency | + matches ux.md 25.5 (the radio becomes a flag plus an override); one `{value, reason}` shape for all four | 0 Hit Points shaped unlike the other three | - stringly typed, unlike every other section |
| Modifiability | + a fifth overridable value adds one property | 0 | + |
| Testability | + one conflict check to test | + conflict impossible by construction | - parsing and duplicate-entry cases |
| Simplicity | + flat; one extra problem kind (overridden and not applicable) | - mode parsing and mode-value consistency checks | - |
| Reversibility | + | + | - |
| Security and correctness | + the server refuses the conflict; the UI radio prevents it | + | 0 duplicates possible |

- **Chosen:** A, because of simplicity and consistency - giving up making the conflict unrepresentable (the server refuses it instead).
- **Rejected:** B and C. Overrides must not live outside the Characteristics section.

### D4: Parsing sanity loss and the Damage Bonus override
Option A: kernel types beside the unchanged `DiceNotation`: `SanityLossNotation.TryParse(text, out)` (exactly one "/", each side `DiceNotation.TryParse(side, DamageBonusUse.Refused)`) and `DamageBonusNotation.TryParse(text, out)` (optional leading "+" or "-", then `DiceNotation.TryParse(rest, DamageBonusUse.Refused)`), both per project_ruleset.md section 5.5. Option B: the same two parsers in Scenario Preparation Domain.

| Metric | A: kernel | B: Scenario Preparation |
| --- | --- | --- |
| Consistency | + ADR 0017 puts section 5.5 notation in the kernel; sanityLoss and damageBonusOverride are in the section 5.5 grammar; PBI-SP-003 D3 planned this | 0 strictest reading of "grows only with rules more than one module needs" |
| Modifiability | + Campaign Play or Scene Play sanity rolls can reuse it | - would move later |
| Testability | + GameRules.Tests beside `DiceNotationTests` | + |
| Simplicity | + two small types reusing `DiceNotation` | + |
| Reversibility | + | + |
| Security and correctness | + `DiceNotation` unchanged; its tests protect it | + |

- **Chosen:** A, because of consistency with ADR 0017 - giving up the strict "two consumers today" reading.
- **Rejected:** B; and changing `DiceNotation` to accept a leading sign (it would also widen damage input).

### D5: Shared derived-value calculation
Option A: extract `CharacteristicDerivedValues.From(IReadOnlyDictionary<string, int?>, CharacteristicsRules)` returning Hit Points, Magic Points, Damage Bonus, and Build (each null when its characteristics are missing) from `NpcProfileCalculator.cs:24-50`; `NpcProfileCalculator` adds MOV, `MonsterProfileCalculator` adds nothing but difficulty. Option B: `MonsterProfileCalculator` repeats the null-guard helpers.

| Metric | A: extract | B: repeat |
| --- | --- | --- |
| Consistency | + one place says which characteristics feed which value (NPC ruleset section 3.2) | - two places |
| Modifiability | + | - drift |
| Testability | + existing calculator tests prove no change | 0 |
| Simplicity | + about 20 lines move | 0 |
| Reversibility | + | + |
| Security and correctness | + the human MOV formula stays out of Monster code (NPC ruleset section 5.3) | 0 |

- **Chosen:** A.
- **Rejected:** B; and reusing `NpcProfileCalculator` for Monster Profiles (it applies human MOV).

### D6: Frontend form architecture
Option A: a parallel `services/mythosCreatureForm.ts` (state, `stateFromMythosCreature`, `inputFromState`, section order and labels) with the handler map split by section into `services/mythosCreatureFormHandlers.ts`, reusing the generic helpers moved to `services/profileForm.ts` and the props-based `spell-row-fields`. Option B: a config-driven generic profile form engine serving both editors.

| Metric | A: parallel reducer | B: generic engine |
| --- | --- | --- |
| Consistency | + the `humanNpcForm.ts` pattern | - a new abstraction neither editor has |
| Modifiability | + Monster sections change alone | - both editors ride one engine |
| Testability | + pure reducer tests per action | 0 |
| Simplicity | 0 a second reducer of similar size | - speculative layer; rewrites a working editor |
| Reversibility | + | - |
| Security and correctness | N/A: the server validates | N/A: the server validates |

- **Chosen:** A - giving up one shared reducer.
- **Rejected:** B. The Developer must not rewrite `humanNpcForm.ts` beyond moving the listed generic helpers.

### Single-option decisions
- Create payload `{name}` only: ux.md section 24 shows Type and Name; Creature Kind is set in Edit. `POST /api/campaigns/{campaignId}/mythos-creatures` returns 201 with the profile.
- Response: the request shape plus `id`; `characteristics.difficulty` (entered codes); `characteristics.derived {hitPoints, magicPoints, damageBonus, build}` (computed, null when not computable, computed even when Hit Points are not applicable); `skills[i].difficulty`; `combat.dodgeDifficulty`; `combat.attacks[i].difficulty`. The client shows each override beside `derived` (ux.md 25.5). No MOV.
- The "(no computed value: needs ...)" copy is a static client map (Hit Points: CON and SIZ; Magic Points: POW; Damage Bonus and Build: STR and SIZ) citing NPC ruleset section 3.2; the client never computes.
- Monster Profile request: `name`; `details {creatureKind, descriptionAndSensoryCues, origin, goalAndBehavior, signsAndTraces, defeatOutcome, specimenRangeNotes}`; `keeperNotes`; `characteristics` (D3); `movement [{mode, label, rate}]`; `combat {attacksPerRound, dodge, attacks [{name, skill, skillValue, damage, effect, manoeuvre}]}`; `defenses {armorPoints, armorNote, immunities [{description}], vulnerabilities [{description}]}`; `skills [{name, value}]`; `spells [{name, magicPointCost, effect}]`; `powers [{name, magicPointCost, effect, limits}]`; `sanityLoss {value}`. Each section is null when not added; an added empty section is kept.
- `creatureKind` (Beast, Folklore, Mythos, Unique) and movement `mode` (Walk, Swim, Fly, Burrow, Other) arrive as strings; the domain refuses unknown values with a path-keyed problem and the normalizer stores the canonical casing. No enum model binding (its 400 keys are not ADR 0018 paths).
- Characteristic order for Monster Profiles: STR, CON, SIZ, DEX, INT, POW, then APP and EDU (project_ruleset.md section 5.2). APP and EDU are added only by the Keeper (ux.md 25.5).
- Investigator Difficulty: kernel `InvestigatorDifficulties.ForOpposingValue` for characteristics, skills, attack skill values, and Dodge (project_ruleset.md section 5.9; NPC ruleset section 3.4).
- A Monster attack's skill is Firearms when its text before any parenthesis, trimmed, is "Firearms", ignoring case; DB is then refused in its damage (project_ruleset.md sections 5.5 and 5.9).
- Table `MythosCreatures`: `Id`, `CampaignId`, `Name`, `CreatedAt`, JSON `Profile` (SchemaVersion 1, ValueComparer, Keeper notes as a nested element, as `HumanNpcProfileJsonStorage.cs:10-31`); index on `CampaignId`; no foreign key (ADR 0013); no concurrency token. Migration `<yyyyMMddHHmmss>_AddMythosCreatures`.
- List: `EfNonPlayerEntityDirectory` concatenates a `MythosCreatures` projection (`NonPlayerEntityType.MythosCreature`) with the Human NPC one, then orders by name, then id. If EF cannot translate `Concat` with ordering, escalate; do not sort in memory.
- No SignalR (spec.md line 30); the UI invalidates `nonPlayerEntityQueryKeys.all` and a new `mythosCreature(campaignId, mythosCreatureId)` key.
- Dice text is trimmed at the ends and stored as entered; the PBI-SP-003 F2 rules apply to damage, sanity loss, and the Damage Bonus override.
- Create page: enable the Mythos Creature radio; submit dispatches by type through a two-entry map (Human NPC: name and age; Mythos Creature: name); success navigates with "{type} created."; server problems show the server's message for `name` and `age` (ADR 0018), replacing the fixed mapping at `create-non-player-entity-page.tsx:29-38`.
- List page: Mythos Creature names link to `/campaigns/$campaignId/mythos-creatures/$mythosCreatureId`.
- Section index: a new `profile-section-index` component; `profile-section` gains an optional `id` prop and becomes a `tabIndex=-1` focus target (`profile-section.tsx:20-41` has none today); the Human NPC page is unchanged.
- Frontend generic pieces moved to neutral locations, with no behavior change: `ValidationProblem` (`types/HumanNpc.ts:110-113`) to `types/ValidationProblem.ts`; `InvestigatorDifficulty` and `CHARACTERISTIC_NAMES` (`types/HumanNpc.ts:4,10-19`) to `types/NonPlayerEntity.ts`; `MAX_ROWS`, `rowPath`, `messageFor`, `hasProblemOn`, `replaceAt`, and `focusAfterRemoval` (`services/humanNpcForm.ts:16,94,278-286,319-329`) to `services/profileForm.ts`; `HumanNpcValidationError` and `failWrite` (`services/humanNpcApi.ts:220-240`) to `services/nonPlayerEntityApi.ts` as `NonPlayerEntityValidationError` and `failNonPlayerEntityWrite`; the spell row of `npc-spell-rows.tsx` to a props-based `spell-row-fields`; `npc-spells-view` renamed `spells-view` with an optional Limits line. Not moved: the campaign-play hooks and fields (PBI-SP-003 D7 follow-up), `skillRowLabels.ts`, `CHARACTERISTIC_CODES` (the NPC order).

## Patterns
- **Used:** Strategy as a handler map in the `mythosCreatureForm` handlers (about 35 actions) and in `MonsterProfileProblemMessages` (about 35 kinds) - force: conditionals that would exceed complexity 10; same as `humanNpcForm.ts:349` and `NpcProfileProblemMessages.cs:9`.
- **Used:** Strategy as a two-entry create map on the create page - force: the type switch in `handleSubmit`.
- **Used:** Builder for test data, extending `ScenarioPreparationTestBuilder` with Mythos Creature and Monster Profile builders - force: many-step profile construction.
- **Rejected:** Template Method or a generic base for both aggregates (D1). The Developer must not add one.
- **Rejected:** State for the Hit Points mode - a value choice with no behavior per state; a radio and a flag.
- **Rejected:** Composite for profile sections - sections are a flat fixed list, not recursive.
- **Rejected:** Chain of Responsibility for validation - section validators are independent and concatenated, as `NpcProfileValidation.cs:11-22`.
- **Rejected:** Interpreter for dice - nothing is evaluated or rolled (project_ruleset.md section 5.1).
- **Rejected:** Observer or SignalR - spec.md line 30.
- **Rejected:** Strategy per profile type inside one message map (D2 B).

## Invariants
- Every Mythos Creature operation checks the Keeper first; a Player, another Campaign's Keeper, a missing Campaign, an id of another Campaign, or a Human NPC id on the Mythos Creature route (and the reverse) ends in 404 before any profile is read or written.
- A Mythos Creature never becomes a Human NPC (separate table); Human NPC behavior, routes, request and response shapes, and messages are unchanged.
- Derived values and difficulty are computed on the server and never accepted from a request; overrides are stored with their reason and never replace the computed value in the response.
- Only Monster Profiles have overrides (spec.md line 88); the human MOV formula never runs for a Mythos Creature.
- Hit Points not applicable requires a non-empty defeat outcome; Hit Points cannot be both overridden and not applicable.
- `DiceNotation`, `DiceExpression`, and every kernel formula are unchanged; the new kernel parsers only call `DiceNotation`.
- A refused create or edit stores nothing.
- The list contract stays `{id, type, name}`.
- Complexity 10 or below with no baseline growth: one validator per section, the normalizer split per section, no method branching over all sections; ASCII only.
- Refactor steps change no behavior: Human NPC unit, integration, component, and E2E tests pass with only import-path edits.

## Implementation plan
1. Refactor, backend (Phase 1): `ProfileLimits`, `ProfileText`, `ProfilePaths`, and `ProfileRanges` in Domain; `ProfileProblemPaths` in Controllers; `CharacteristicDerivedValues` (D5); the Human NPC code calls them. Run all Scenario Preparation tests.
2. Refactor, frontend (Phase 1): the moves listed under Single-option decisions, plus `spell-row-fields` and `spells-view`. Run all frontend tests.
3. Kernel (Phase 2): `SanityLossNotation`, `DamageBonusNotation`, and their tests.
4. Domain (Phase 3): `CreatureKind`, `MovementModeKind`, `MonsterProfile` and section records, `MythosCreature` (Create(name), Edit(name, profile)), `MonsterProfileLimits`, per-section validators plus the defeat-outcome cross-check, `MonsterProfileNormalizer`, `MonsterProfileCalculator`, `MonsterProfileProblem`.
5. Persistence (Phase 3): `MonsterProfileJsonStorage`, DbContext mapping, migration, `EfMythosCreatureRepository`, directory `Concat`, DI in `ScenarioPreparationInfrastructureServiceCollectionExtensions.cs`.
6. Application and API (Phase 4): `MythosCreatureService`, results and view, `MythosCreaturesController`, requests, responses, mapping, `MonsterProfileProblemMessages`; integration tests.
7. Frontend data and entry points (Phase 5): `types/MythosCreature.ts`, `services/mythosCreatureApi.ts`, the query key, hooks in `hooks/useNonPlayerEntities.ts`, the create page, the list link, tests.
8. Profile page (Phase 6): route `routes/campaigns.$campaignId.mythos-creatures.$mythosCreatureId.tsx`, `mythos-creature-page`, `mythos-creature-view`, `mythos-creature-form`, `profile-section-index`, `monster-characteristics-fields` and `-view`, `monster-movement-rows` and `-view`, `monster-combat-fields` and `-view`, `monster-defenses-fields` and `-view`, `monster-skill-rows` and `-view`, `monster-sanity-loss-fields` and `-view`; stories and component tests.
9. E2E (Phase 7): `e2e/tests/mythos-creatures.spec.ts`, fixture additions, and the docblock update in `e2e/tests/non-player-entities.spec.ts`.

## Reuse
- Using: kernel formulas via `CharacteristicDerivedValues`; `DiceNotation`; `InvestigatorDifficulties`; `RichTextDocument.Validate`; `ICampaignKeepers`; `INonPlayerEntityRuleData.CharacteristicsRules` (its specializations are not used for Monster Profiles, RG2); `ScenarioPreparationControllerBase`; `profile-section`, `add-section-group`, `remove-section-dialog`, `repeating-rows`, `remove-row-button`, `stat-table`, `form-error-summary`, `sticky-form-actions`, `delete-non-player-entity-dialog`, `non-player-entity-not-found`; campaign-play `useSkillCatalog`, `WizardField`, `WizardSelect`, `WizardTextarea`, `fieldId` (PBI-SP-003 D7); shadcn `Collapsible`, `Checkbox`, `RadioGroup`, `Select`, `Table`; `useUnsavedChangesPrompt`; e2e `openAndCaptureBearer`, `createCampaignViaUi`, `joinAsNewPlayer`.
- Not using: `npc-skill-rows` (its Specialization select is NPC-only, RG2); `npc-combat-fields` (weapons reference skill rows; Monster attacks carry their own skill); `NpcProfileCalculator` (human MOV); `useOccupationCatalog` (no profession field).

## TDD units
- Kernel: `SanityLossNotation` accepts `0/1D6`, `1/1D10`, `1D4/1D8+1`, `0/0`; refuses `1D6`, `0/`, `/1D6`, `0/1D6/1`, `0/1D6+DB`, `0 / 1D6`, and empty. `DamageBonusNotation` accepts `0`, `+1D4`, `-1`, `-2`, `+2D6+1`, `1D4`; refuses `DB`, `+DB`, `+-1`, `++1D4`, `+`, empty, and `1D`.
- Domain: Create refuses an empty and a 201-character name. Each problem kind on its exact path: characteristic 2,001 and -1; unknown code; unknown Creature Kind; Hit Points override 0 and 10,000; Magic Points -1 and 10,000; Build -3 and 100; Damage Bonus override `1D` and `DB`; override without value; override reason empty and 501 characters; Hit Points overridden and not applicable; not applicable without defeat outcome (path `details.defeatOutcome`); unknown movement mode; Other without label; rate missing and 1,000; attacks per round 0 and 100; Dodge 2,001; attack without name, skill, or skill value; attack damage missing (accepted when manoeuvre), malformed `D`; `1D10+DB` with skill `Firearms (Rifle)` and `firearms` refused, `1D6+DB` with `Fighting` accepted; armor 2,001; immunity and vulnerability without description; skill without name or value, value 2,001; spell and power without name; sanity loss `1D6` refused, `0/1D6` accepted; 101 rows in each list; 4,001-character plain text and 1,001-character row text and override value; invalid Keeper notes. A refused edit leaves the profile unchanged. The normalizer stores canonical Creature Kind and mode casing.
- Calculator: the spec "Ghoul" characteristics give Hit Points, Magic Points, Damage Bonus, and Build; STR+SIZ above 524 uses the kernel progression; missing characteristics give null; overrides do not change `derived`; difficulty for 49, 50, 89, 90, and 2,000 (Extreme).
- Refactor: existing `NpcProfileCalculator` and Human NPC validation tests pass unchanged.
- Storage: round trip including overrides and Keeper notes; schema-version guard (SQLite fixture).
- Service: Player, other Keeper, missing Campaign, foreign id, and Human NPC id give NotFound with no write; the list includes both types ordered by name, then id.
- Frontend: zod parsing of the Monster response; reducer add and remove for each section and row, 100-row limits, focus targets (SP-UX-33, SP-UX-34, SP-A11Y-22); the Hit Points radio and override checkboxes reveal and clear fields (SP-UX-46); APP and EDU appear only after "Add APP" or "Add EDU" or with a value (SP-UX-49); attack More details auto-opens on a value or problem (SP-UX-47); problem-to-field mapping and summary links (SP-UX-35, SP-A11Y-20); the view shows "{override} (computed {value})", "(no computed value: needs ...)", and "Not applicable" with the defeat outcome (SP-UX-36, SP-UX-46, SP-A11Y-25); difficulty text and no half or fifth values or MOV (SP-UX-48); the section index lists present sections in order, moves focus, and updates in edit (SP-UX-45, SP-A11Y-28); named row groups (SP-A11Y-29); the create page creates a Mythos Creature with a name only and shows the server's name message; the list links Mythos rows (SP-UX-29); busy buttons disabled (SP-UX-40); a Player sees not found without a request (SP-UX-39); 320px reflow in stories (SP-A11Y-26).
- Integration (`MythosCreatureApiTests`, `NonPlayerEntityListApiTests`, `ScenarioPreparationMigrationTests`): 201, 200, 204, 404, and 400 with exact path keys and messages; Player and other-Keeper 404 on all four endpoints; another Campaign's id and a Human NPC id on the Mythos Creature route give 404; the list returns both types.

## E2E coverage
New `e2e/tests/mythos-creatures.spec.ts`; fixture additions in `e2e/fixtures/non-player-entities.ts` (`createMythosCreatureViaUi`, `mythosCreaturesApiUrl`, `mythosCreatureIdFromUrl`); the docblock cites spec Scenarios and SP-UX ids.
- "Keeper creates a Mythos Creature" (create part), "Keeper finds a profile in the list" (Mythos Creature part) -> "Keeper creates a Mythos Creature and finds it in the list" (SP-UX-29, 30, 31, 32, 41).
- "Keeper creates a Mythos Creature" (profile part) -> "Keeper records a Ghoul's Monster Profile": Creature Kind Mythos, characteristics, 3 attacks per round, a claw "Fighting" 40 "1D6+DB", armor 0, an immunity, a spell, a power, sanity loss "0/1D6"; the view shows computed values and difficulty, and the section index moves focus to Sanity loss (SP-UX-33, 36, 45, 48; SP-A11Y-28).
- "Malformed dice notation is refused" and "A Mythos Creature's firearm attack cannot add Damage Bonus" -> "Keeper is told about malformed dice notation" (SP-UX-35, 47; SP-A11Y-20).
- "A Derived Value Override needs a reason" -> "A Hit Points override needs a reason and shows the computed value" (SP-UX-35, 36, 46).
- "Hit Points not applicable needs a defeat outcome" -> the test of the same name (SP-UX-35, 46).
- "Keeper deletes an unlinked profile" (Mythos Creature part) -> "Keeper deletes a Mythos Creature" (SP-UX-37).
- "Non-Player Entity profiles are the Keeper's alone" (Mythos Creature part) -> "Players and other Keepers can't see Mythos Creatures": UI not found and API 404 with the Player's bearer on GET, PUT, DELETE, and POST; a Mythos Creature id on the Human NPC route shows not found (SP-UX-39).
- `e2e/tests/non-player-entities.spec.ts` docblock: the Mythos Creature exceptions now point to `mythos-creatures.spec.ts`; SP-UX-38 stays with PBI-SP-010.
- Exceptions: SP-UX-34 (100 rows), SP-UX-40 (double activation), SP-UX-49 (APP and EDU), and override range edges are covered by component and unit tests, where E2E would only repeat them slowly.

## ADR
- None: D1 and D2 follow PBI-SP-003 D6 and ADR 0018; D4 follows ADR 0017; the override shape (D3) is internal to one aggregate's JSON document and recorded here.

## Phases
- Phase 1: shared helpers and frontend moves; checkpoint: `refactor(scenario-preparation): share profile helpers between profile types (PBI-SP-009)`
- Phase 2: kernel parsers; checkpoint: `feat(game-rules): add sanity loss and Damage Bonus override notation (PBI-SP-009)`
- Phase 3: domain and persistence; checkpoint: `feat(scenario-preparation): add the Mythos Creature aggregate and storage (PBI-SP-009)`
- Phase 4: application, API, integration tests; checkpoint: `feat(scenario-preparation): add the Mythos Creature API (PBI-SP-009)`
- Phase 5: frontend data, create page, list link; checkpoint: `feat(frontend): create Mythos Creatures and link them in the list (PBI-SP-009)`
- Phase 6: profile page; checkpoint: `feat(frontend): add the Monster Profile view and editor (PBI-SP-009)`
- Phase 7: E2E; checkpoint: `test(e2e): cover Mythos Creature profiles (PBI-SP-009)`

## Human decisions
- 2026-10-18, UX gate: "B, use recommended for open questions". Option B (long form plus an "On this page" section index) selected; Option A (plain long form) and Option C (per-section editing, which reopens ux.md 25.2) rejected. Override values per the working assumption (whole numbers for Hit Points, Magic Points, and Build, Build may be negative; Damage Bonus as notation text; overriding a value that cannot be computed is allowed). Monster skills: catalog suggestions and free names, no specialization rule. Investigator Difficulty shown on Monster values; ux.md 25.1 and CONTEXT.md wording updated.
- 2026-10-18, plan gate: "approve" (RG1-RG4 A, D1-D6 as chosen, scope calls, branch). Accepted:
  - RG1 A (house rule, project_ruleset.md sections 5.2 and 5.4): Hit Points override 1-9999, Magic Points override 0-9999, Build override -2 to 99; Damage Bonus override "0" or an optional "+" or "-" followed by section 5.5 notation without DB; an override value is at most 1,000 characters; a value may be overridden when its computed value cannot be worked out; Hit Points cannot be both overridden and not applicable. Rejected: unbounded override values.
  - RG2 A (project choice, project_ruleset.md section 5.9): Monster skills from the Era catalog or a custom name, no specialization rule, name and value required, value 0-2000. Rejected: applying section 5.7's NPC rules.
  - RG3 A (project_ruleset.md section 5.8): the Monster Profile structural checks listed there. Rejected: only the checks section 5.8 named before.
  - RG4 A (project_ruleset.md sections 5.5 and 5.9; NPC ruleset section 3.2): DB is refused in the damage of a Monster Profile attack whose skill is Firearms; spec Scenario "A Mythos Creature's firearm attack cannot add Damage Bonus" added. Rejected: allowing it.
  - D1 A, D2 A, D3 A, D4 A, D5 A, D6 A as recorded above.
  - Scope calls: fix the create page's `name` mapping (ADR 0018); move only the listed Human-named generic frontend pieces; close PBI-SP-003 follow-ups for the Mythos Creature option and list links, the `name` mapping, and the ux.md section 27 touch-up. The D7 move, `NonPlayerEntityRuleDataAdapterTests`, duplicating (PBI-SP-010), Scene links and 409 (PBI-SP-004), catalogs, groups, AI drafting, and SignalR stay out of scope.
  - Branch `feature/sp-009-create-mythos-creature-profiles` from `master` at `cd19ae5`.

## Revisions

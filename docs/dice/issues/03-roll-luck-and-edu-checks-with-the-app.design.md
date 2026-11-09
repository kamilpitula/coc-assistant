# Design: PBI-DICE-003: Roll Luck and EDU improvement checks on the server, with age-bracket and EDU creation locks

## Triggers
- 2 Shared interface, aggregate, or data model:
  - the PUT contract stops accepting `luckRolls` and `ageEffects.eduImprovementChecks`;
  - `locks` gains `ageBracket` and `edu`;
  - `Investigator` gains two roll transitions, and `ReplaceCharacterSheet` gains two locks;
  - `CharacterSheetInputs` loses its dice fields, and `IRollSource` is deleted.
- 6 Explorer open questions with competing answers: how far the 400 reaches, what a valid EDU is, whether PlayerEntered records lock, and the parity harness.
- 7 UX: mostly covered by ux.md 6.2, 6.3, 6.8 and UX-36 to UX-38. Two gaps (G1, G2) were presented and selected at the gate.

## Constraints
- ADR 0030: dice are rolled only on the server through `IDiceRoller`; no body carries a dice result; `PlayerEntered` exists only for legacy results.
- ADR 0005 and ADR 0007: versioned JSON. No schema change is needed, because v5 already stores Luck and EDU records with faces, who, and when. `Version` turns races into 409.
- ADR 0017: the Dice module and Roll Record stay in the GameRules kernel, unchanged.
- Rules (cited, not restated):
  - [character rules section 3.1](../../game-rules/coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets) (brackets, Luck roll and EDU check counts, from `catalogs/age-rules.json`);
  - [section 3.2](../../game-rules/coc7_character_creation_and_development_rules.md#32-edu-improvement-check) (EDU check and gain);
  - [section 3.3](../../game-rules/coc7_character_creation_and_development_rules.md#33-age-modifier-ordering) (ordering);
  - [section 5.5](../../game-rules/coc7_character_creation_and_development_rules.md#55-luck) (Luck, the higher roll in the two-roll bracket);
  - [project_ruleset.md section 4.1](../../game-rules/project_ruleset.md#41-investigator-age-at-creation) (age range);
  - [project_ruleset.md section 4.3](../../game-rules/project_ruleset.md#43-dice-results-at-creation) (its interim sentence is removed by this PBI).
- [specs/character-sheet/spec.md](../../../specs/character-sheet/spec.md): Creation rolling, Creation locks ("has a Roll Record", with no source qualifier), API Contracts, the catalog messages, and Constraints (no API accepts a dice result).
- [specs/character-sheet/ux.md](../../../specs/character-sheet/ux.md): 6.2 Luck, 6.3 EDU checks, 6.8 Creation rolling, UX-36 to UX-38, A11Y-12 to A11Y-14.
- CONTEXT.md terms: Roll Record, Creation lock, Creation Method, Re-roll grant (out of scope).
- Existing patterns:
  - bool transitions on the aggregate, false -> 409 (Investigator.cs:76-94 `ReplaceCharacterSheet`, :105-121 `RollCharacteristics`);
  - the domain roll service `CharacteristicRolling.RollMissing` (CharacteristicRolling.cs:9-24);
  - locks derived from records with `CreationLocks.Of` (CreationLocks.cs:4-9), mapped at CharacterSheetWireFormat.cs:129;
  - the 400 for a body carrying values (CharacterSheetRequest.cs:138, `HasValues` at :156);
  - the DICE-002 frontend flow: save first, roll, reload on 409 (useWizardMoves.ts:190-262).
- Cyclomatic complexity of at most 10, with no new suppressions.

### Discrepancies found against the Explorer report
- `EduImprovementGainRequired` still says "Enter the 1D10 gain for EDU check {n}." (ValidationErrors.cs:113-117), while spec.md shows "EDU check {n} is missing its 1D10 gain. Ask your Keeper.". Updated in this PBI (server scope).
- E2E helpers rely on a typed EDU check that never improves EDU: `submitValidInvestigatorViaUi` asserts "Occupation points left: 0 of 200" (e2e/fixtures/investigators.ts:104); `e2e/fixtures/scene-play.ts:48-49` and `CampaignPlayApiRequests.cs:57-58` PUT typed `luckRolls` and `eduImprovementChecks` (now 400); `campaign-overview.spec.ts:233` types the check. Handled by D6.
- The frontend parity harness already runs only shared cases and strips the stored rolls the DICE-002 way (characterSheetValidation.test.ts:82, :94-96), so Explorer question 5 is settled.

## UX
- Selected at the gate: G1 option A and G2 option A, no prototype. Recorded in `specs/character-sheet/ux.md` (updated: 6.2, 6.3, 6.8, UX-36, UX-38), already linked from spec.md.
- **G1, Creation Method under an EDU lock (Point buy, Quick fire):** option A. The method shows as text with "Locked because you rolled an EDU check." (in Draft also "To use another method, start over."), reusing the `creation-method-choice` `locked` pattern. Rejected: option B, radios that refuse inline, because it offers a control that always fails (against ux.md 6.8).
- **G2, Luck and EDU checks typed in before the dice system:** option A, following UX-33: "Luck 55 (entered by you)", "D100 30 (entered by you)" with its result line; "Roll your second Luck roll" when only a typed first roll exists at 15 to 19; a legacy check missing its gain shows its error and has no action. Rejected: option B, no marker, because it hides the source the Keeper sees as "(entered)".

## Decisions

### D1: How rule data reaches the aggregate's roll and lock checks
| Metric | A: aggregate methods take `AgeRules` as a parameter | B: the application computes brackets and passes them | C: the aggregate holds a rules service |
| --- | --- | --- | --- |
| Consistency | + domain rule data (`RuleData/AgeRules.cs`) passed like the roller in `RollCharacteristics(roller, ...)` | - business rules in the application layer (DICE-002 D3 rejected that) | - no aggregate holds a service; EF plumbing |
| Modifiability | + DICE-004 grant paths reuse the same methods | - Keeper paths would repeat the bracket logic | 0 |
| Testability | + pure tests with a hand-built `AgeRules` | 0 | - |
| Simplicity | + one parameter | + | - |
| Reversibility | + | + | - |
| Security and correctness | + a caller can't pass a wrong bracket | - a caller could | + |
- **Chosen:** A, for correctness and consistency, giving up one parameter on three methods.
- **Rejected:** B and C. The Developer must not compute brackets or locks in `PlayerInvestigatorService`.

### D2: How far the "400 for dice totals" on PUT reaches
| Metric | A: keep `luckRolls` and `ageEffects.eduImprovementChecks` on the request; 400 when any value is non-null; null, empty, or absent accepted | B: remove the properties and reject unknown members globally (`UnmappedMemberHandling.Disallow`) | C: 400 whenever the property is present, even null |
| --- | --- | --- | --- |
| Consistency | + the same as `characteristicRolls` (CharacterSheetRequest.cs:138) | - changes JSON handling for every endpoint | 0 a second rule for one concept |
| Modifiability | + local | - large ripple | + |
| Testability | + | 0 | + |
| Simplicity | + two `AddIf` lines | - | + |
| Reversibility | + | - | + |
| Security and correctness | + no value is ever accepted | + | + but breaks clients sending `[]` |
- **Chosen:** A. The properties remain only to be rejected.
- **Rejected:** B (global ripple) and C (inconsistent with the DICE-002 precedent).

### D3: What "an EDU value" means as the EDU check prerequisite
| Metric | A: EDU is not null | B: EDU is a value its Creation Method can produce (Point Buy within min and max, Quick Fire in the characteristic pool, Standard Rolling a record its dice can produce) |
| --- | --- | --- |
| Consistency | + the old spec wording read literally | 0 spec wording becomes "a valid EDU" (ux.md 6.3 already says "valid") |
| Modifiability | + | + |
| Testability | + | + table-driven per method |
| Simplicity | + | 0 one small predicate, mirrored in the frontend |
| Reversibility | + | + |
| Security and correctness | - rolling against an invalid EDU (for example Point Buy 95) locks it at a value that always fails validation; only Start over fixes the Draft | + a locked EDU is always valid |
- **Chosen:** B, for correctness.
- **Rejected:** A.

### D4: Do legacy PlayerEntered Luck and EDU records lock the age bracket and EDU?
| Metric | A: any Roll Record locks (Server or PlayerEntered) | B: only Server records lock |
| --- | --- | --- |
| Consistency | + spec Creation locks ("has a Roll Record"); the DICE-002 human decision for the method lock | - a second lock rule |
| Modifiability | + | 0 |
| Testability | + | + |
| Simplicity | + | 0 |
| Reversibility | + | + |
| Security and correctness | + | - a typed Luck could be carried into another bracket |
- **Chosen:** A. Accepted consequence: legacy Drafts with typed Luck now have a fixed bracket; Start over is the way out in Draft.
- **Exception:** the age-bracket lock applies only while the stored age has a bracket. Otherwise a legacy record on a sheet with no valid age would block every age; the first valid age fixes the bracket. `locks.ageBracket` reports exactly what is enforced (DICE-002 D7).
- **Rejected:** B.

### D5: Client feedback for an age outside a locked bracket (ux.md 6.8 "the client validator reports" it; the catalog has no code)
| Metric | A: reuse `AgeOutOfRange` with the locked bracket's bounds, client-only while the lock applies | B: a new code `AgeBracketLocked` with a new scope "client" |
| --- | --- | --- |
| Consistency | + the catalog message is already "Age must be between {minimumAge} and {maximumAge}." | - a third catalog scope |
| Modifiability | + | 0 |
| Testability | + unit test (not in the parity fixtures, which have no locks) | + |
| Simplicity | + about 3 lines | - catalog row, code, scope docs |
| Reversibility | + | 0 |
| Security and correctness | 0 the server answers 409, never this error; a catalog note says so | 0 |
- **Chosen:** A, for simplicity.
- **Rejected:** B. The Developer must not add a client-only code.

### D6: E2E with real server dice (EDU checks are random)
| Metric | A: a scripted `IDiceRoller` in the E2E environment | B: E2E that holds for any outcome; unit and integration tests cover exact branches with scripted dice | C: start over and roll again until the wanted outcome |
| --- | --- | --- | --- |
| Consistency | - the registration test asserts SecureDiceRoller only; ADR 0030 says one roller | + like the DICE-002 E2E (faces by regex) | - e2e/CLAUDE.md section 5: "Don't retry actions manually" |
| Modifiability | - a global script fights parallel tests | + | 0 |
| Testability | + deterministic | 0 each run covers the branch it rolled; both are deterministic below E2E | + |
| Simplicity | - config seam and per-test scripts | + | - |
| Reversibility | 0 | + | + |
| Security and correctness | - a dice-changing seam in the deployed app | + | 0 |
- **Chosen:** B.
  - The scenario test uses Point buy with EDU at the minimum, so a gain is likely. It logs the faces (e2e/CLAUDE.md section 5) and asserts invariants: a Gain row exists exactly when the result line reads "EDU a -> b"; b is a + gain, capped by section 3.2; otherwise "No improvement" and no Gain row.
  - Helpers stop asserting exact occupation budgets that depend on EDU. A check only raises EDU, so spending a fixed 200 still fits.
  - Integration tests that need an exact outcome replace `IDiceRoller` with a scripted roller through `ConfigureTestServices`, justified as replacing a nondeterministic source at the composition boundary.
- **Rejected:** A (security) and C (e2e rules).

### D7: E2E for "Typed-in rolls from before the dice system are kept"
No API can create a PlayerEntered record after this PBI, and E2E has no DB seeding.
| Metric | A: documented exception; an integration test seeds the legacy record (the `SeedPlayerEnteredCharacteristicRollsAsync` pattern, InvestigatorApiTests.cs:353) and POSTs the EDU roll | B: SQL seeding from Playwright (new `mssql` dependency) | C: a test-only API endpoint |
| --- | --- | --- | --- |
| Consistency | + the same as UX-33 in DICE-002 | - a new dependency (trigger 1) | - |
| Testability | 0 integration, not browser | + | + |
| Simplicity | + | - | - |
| Security and correctness | + | 0 | - an endpoint that writes dice results |
- **Chosen:** A. The PBI Verification line is amended (human decision below).
- **Rejected:** B and C.

### D8: Frontend roll orchestration
| Metric | A: one roll flow in `useWizardMoves` keyed by a `CreationRollGroup` descriptor table (`characteristics`, `luck`, `eduImprovementCheck`: API call, "has results" predicate for the 409 reload, labels) | B: three copies of the DICE-002 flow |
| --- | --- | --- |
| Consistency | + extends the existing flow | 0 |
| Modifiability | + DICE-004's "Roll {group} again" is a table property | - three places |
| Testability | + states tested once, table per group | - |
| Simplicity | 0 one small table | - about three times the code; complexity grows in `useWizardMoves` |
| Reversibility | + | + |
| Security and correctness | 0 | 0 |
- **Chosen:** A. `RollStatus` gains `group`; one roll pending at a time.
- **Rejected:** B.

### Single-option decisions
- **Endpoints:** `POST mine/character-sheet/rolls/luck` and `POST mine/character-sheet/rolls/edu-improvement-checks` return 200 with `CharacterSheetResponse`, 404 for anyone but the owner, and 409 for every refusal: wrong status, no valid age, no usable EDU, or nothing left to roll.
- **Luck in one action:** one action creates `Luck` and, when the bracket has two rolls, `Luck:SecondRoll`. It rolls only missing purposes, so a legacy first roll is kept. It needs a valid age, not a Creation Method.
- **The next EDU check:**
  - the lowest number from 1 to the bracket's count that has no check record;
  - "improves" comes from `EduImprovement.Evaluate` over the earlier checks plus the new one, so section 3.2's comparison has one source;
  - a gain record is created exactly when the new check improves;
  - a legacy check missing its gain is not "next" and is never filled in (its message says to ask the Keeper; DICE-004).
- **What a PUT keeps:** every stored Roll Record; a PUT never adds, changes, or removes one. `ReplaceCharacterSheet` builds `next = sheet with { RollRecords = stored.RollRecords }` first and checks the locks against `next`, so Standard Rolling EDU is still read from records.
- **EDU lock:** compares EDU before age effects, `CharacterSheetCalculator.AssignedValuesOf(...)[EDU]`, between the stored sheet and `next`. A method switch that changes EDU is refused too.
- **Bracket lock:** compares `(MinimumAge, MaximumAge)` of the stored bracket and the new one. A null new bracket (age cleared or out of range) is a break. Age within the bracket is accepted.
- **Locks:** `CreationLocks(bool CreationMethod, bool AgeBracket, bool Edu)` with `Of(sheet, AgeBracket? bracket)` and `Refuses(stored, next, ageRules)`. The wire format passes `view.Computation.Bracket` (the stored bracket), so the controller needs no rules. `edu` is true when any EDU check record exists, under any method; the frontend shows the EDU lock only under Point buy and Quick fire, and treats the method as locked when `locks.creationMethod` or (`locks.edu` and the method is Point buy or Quick fire) (G1).
- **Bracket function:** `CharacterSheetCalculator.BracketFor(InvestigatorIdentity, AgeRules)` becomes static; the instance method delegates.
- **Messages (backend and frontend):** `LuckRollRequired` "Roll Luck."; `LuckSecondRollRequired` "Roll your second Luck roll."; `EduImprovementCheckRequired` "Roll EDU check {n}."; and, backend only (server scope), `EduImprovementGainRequired` "EDU check {n} is missing its {gainDice} gain. Ask your Keeper.".
- **Fixtures:** `luckRolls` and `ageEffects.eduImprovementChecks` keep their JSON keys but now model stored PlayerEntered Roll Records, as `characteristicRolls` did in DICE-002. The backend `FixtureSheet` seeds them with `RollRecord.PlayerEntered`; the frontend harness strips them from the inputs and passes them as saved rolls. Expected messages change in the same commit.
- **Frontend validator:** `validateCharacterSheet(inputs, rules, bracket, saved: SavedRolls)` with `SavedRolls = {characteristicRolls, luckRolls, eduImprovementChecks, lockedAgeBracket}`, built by one helper from the `CharacterSheetView`. The parity harness passes `lockedAgeBracket: null`.
- **`IRollSource` and `PlayerEnteredRollSource`:** deleted, with their registration (CampaignPlayInfrastructureServiceCollectionExtensions.cs:44). `RollRecord.PlayerEntered` stays for storage and test seeding.
- **Application:** `PlayerInvestigatorService` replaces its `IRollSource` dependency with `CreationRuleSets` (already a singleton, :42) and reads `.For(campaign.Era).AgeRules`. The three roll methods share one private `RollAsync(campaignId, playerId, Func<Investigator, AgeRules, bool>, ct)`.
- **SignalR: none**, for the DICE-002 reasons: rolls happen in Draft or Changes Requested, where the Keeper has no live view of the sheet.
- **A move's save refused with 409** (already ux.md 6.8): reload, stay on the step, and show "Your Investigator changed elsewhere, so we reloaded it." at wizard level, where the section 5.1 save failure Alert sits. Today a move's 409 shows the save failure with "Try again" (useWizardMoves.ts:123-124), which would loop.
- **Copy:** "Luck rolled." and "EDU check {n} rolled."; after a 409: "Your Luck was already rolled." and "Your EDU check was already rolled."; failures: "We couldn't roll your Luck. Try again." and "We couldn't roll your EDU check. Try again.".
- **Focus after a roll (A11Y-13):** Luck -> the `h2` "Luck" (`tabIndex=-1`); EDU -> that check's group heading "EDU check n of m".
- **Error summary links:** `luckRolls[*]` focus the Luck roll trigger; `ageEffects.eduImprovementChecks[n]...` focus the next EDU roll trigger, or the section heading when there is no trigger.
- **Age hint:** "{rolled}" reads "Luck", "EDU checks", or "Luck and EDU checks", depending on which records exist.

## Patterns
- **Used:** one domain service per roll group, `LuckRolling.RollMissing` and `EduImprovementRolling.RollNext`, like `CharacteristicRolling`. Force: each group has its own selection rules; separate services keep each within complexity 10.
- **Used:** a descriptor table (lightweight Strategy) for frontend roll groups (D8). Force: three groups that differ only in endpoint, "has results" predicate, and copy.
- **Rejected:** a backend Strategy or one polymorphic roll-group endpoint. Each endpoint already picks its service; nothing switches on the group.
- **Rejected:** State for locks. Locks are derived from records (DICE-002).
- **Rejected:** Chain of Responsibility for lock checks. Three boolean clauses in `CreationLocks.Refuses` stay within complexity 10.
- **Rejected:** Command and Observer. Nothing is queued or undone, and there is no SignalR.

## Invariants
- No API accepts a dice result. Every new record is `Server`, with faces, `rolledByAccountId`, and `rolledAt`.
- A PUT never adds, changes, or removes a Roll Record. Roll Records are never changed or deleted.
- At most one `Luck` and one `Luck:SecondRoll` record; the second only when the bracket has two rolls.
- EDU check n is rolled only after checks 1 to n-1 have check records and only while n is at most the bracket's count. Its gain is rolled in the same action exactly when the check improves EDU.
- Once any Luck or EDU record exists (Server or PlayerEntered) and the stored age has a bracket, a PUT to another bracket or to no bracket returns 409 and changes nothing.
- Once any EDU check record exists, a PUT whose EDU before age effects differs returns 409 and changes nothing.
- A roll against an EDU its Creation Method can't produce is refused (409).
- Legacy PlayerEntered Luck and EDU records keep counting.
- Point Buy and Quick Fire characteristic inputs are otherwise unchanged.
- Complexity at most 10, with no new suppressions.

## Implementation plan
1. **Domain** (`CampaignPlay.Domain/CharacterSheets`): static `CharacterSheetCalculator.BracketFor(identity, AgeRules)`; `LuckRolling`; `EduImprovementRolling` (with the D3 predicate); `CreationLocks` with three flags, `Of(sheet, bracket)`, and `Refuses(stored, next, ageRules)`; `CharacterSheetInputs` drops `LuckRolls` and `EduImprovementChecks`, and `ToCharacterSheet()` takes no argument and creates no records; delete `IRollSource` and `PlayerEnteredRollSource`; update the validation messages.
2. **`Investigator`:** `RollLuck(AgeRules, roller, by, now)`, `RollEduImprovementCheck(AgeRules, roller, by, now)`, and `ReplaceCharacterSheet(sheet, AgeRules, now)` keeping every record and checking `CreationLocks.Refuses`; one private helper adds records.
3. **Application:** `PlayerInvestigatorService` takes `CreationRuleSets`; add `RollMyLuckAsync` and `RollMyEduImprovementCheckAsync`, sharing `RollAsync` with characteristics.
4. **Controllers:** the two POST endpoints; two `AddIf` rules in `CharacterSheetRequestRules`; `ToInputs` drops the dice fields; `CharacterSheetLocksResponse(CreationMethod, AgeBracket, Edu)`.
5. **Infrastructure:** remove the `IRollSource` registration.
6. **Fixtures and parity:** `validation-fixtures.json` messages, `FixtureSheet` seeding, the backend parity test.
7. **Docs:** spec.md and ux.md were updated in the design commit. The Developer removes the interim sentence of project_ruleset.md section 4.3 ("Luck ... results are still entered by the Player until the app rolls them.") with Phase 1, following `docs/game-rules/README.md`.
8. **Frontend types, API, and state:** `locks` gains `ageBracket` and `edu` (zod); `rollMyLuck` and `rollMyEduImprovementCheck` (409 throws `InvestigatorConflictError`); remove the dice fields from `CharacterSheetInputs`, the reducer, `inputsFromSheet`, `inputsForSave`, and `shownAgeInputs`; `SavedRolls` in the validator, with D5 in `identityProblems`.
9. **Frontend components:** `characteristics-step` Luck section with `creation-roll-action`, Point buy EDU disabled and Quick fire EDU as text under the lock; `creation-method-choice` lock reason (G1); `age-effects-step` EDU groups with the action (G2 markers); `identity-step` age hint; `investigator-wizard` focus mapping and the wizard-level conflict Alert; `useWizardMoves` D8 table and the move 409 handling; delete `dice-roll-input` (ux.md section 8).
10. **Tests and E2E,** as listed below.

## Reuse
- **Using:** `creation-roll-action`; `EduImprovement.Evaluate`; `CreationDice`; `RollPurposes`; `DiceRolling.Roll`; `CharacterSheet.WithAddedRollRecords`; `CharacterSheetCalculator.AssignedValuesOf`; `QuickFireRules.CharacteristicValues`; `PointBuyRules`; `eduBeforeEachCheck` (characterSheetForm.ts) for the dialog's "{eduBefore}"; `rollCharacteristicsViaUi` as the template for `rollLuckViaUi` and `rollEduCheckViaUi`; `SeedPlayerEnteredCharacteristicRollsAsync`, generalised to any purpose and reworked to seed through the EF change tracker (Revisions, 2026-11-09).
- **Not using:** `IRollSource` (deleted); `dice-roll-input` (retired); `PublishInvestigatorChanges` (no SignalR).

## TDD units
- **`LuckRolling`:** one record in a one-roll bracket; two at age 17; only the second when a legacy first exists; nothing when both exist.
- **`EduImprovementRolling`:** a check above EDU rolls the gain; at or below rolls none; checks in order; check 2 uses EDU after check 1's gain; nothing once the bracket's checks are done; nothing when EDU is unusable, per method (Point Buy out of range, Quick Fire not in the pool, Standard Rolling not rolled or an impossible legacy value); a legacy check missing its gain is not rolled.
- **`CreationLocks`:** `Of` sets each flag, a PlayerEntered record locks too, and there is no bracket lock without a stored bracket. `Refuses`: age within the bracket accepted; another bracket or no bracket refused; EDU change refused; a Point Buy to Quick Fire switch that clears EDU refused; Standard Rolling EDU unaffected by a PUT.
- **`Investigator`:** `RollLuck` and `RollEduImprovementCheck` succeed in Draft and Changes Requested; return false with the sheet unchanged when Submitted, without a bracket, or with nothing to roll. `ReplaceCharacterSheet` keeps every record; each lock break returns false with the sheet unchanged.
- **Validator:** the four messages; `DiceResultOutOfRange` still fires for an out-of-range legacy Luck.
- **Request:** 400 for `luckRolls: [11]` and for `eduImprovementChecks: [{check: 30}]`; `[]`, `[null]`, and absent are accepted.
- **Service:** the roll methods return NotFound for others, StatusConflict on refusal, and the view on success.
- **Integration** (scripted roller where noted): Luck POST 200 with Server records, two at 17 with Luck the higher; a second Luck POST 409; EDU scripted above EDU gives check and gain with `eduAfter` including it; scripted at or below gives no gain; PUT another bracket 409, same bracket 200, EDU change 409; PUT with Luck or EDU values 400; legacy: a seeded PlayerEntered Luck then an EDU POST keeps Luck PlayerEntered and counting (D7). The `StandardRollingSheet` and `CampaignPlayApiRequests` helpers POST the rolls instead.
- **Frontend:**
  - Luck section: no action without a saved valid age (text instead); dialog text including "twice at your age"; after rolling "Luck 55" or "Luck rolls 45 and 55, kept 55"; focus on the `h2`; not counted in "Points used"; "(entered by you)" (G2).
  - EDU group: only the next check has the action; later ones read "Roll EDU check {n-1} first."; the dialog's EDU clause only under Point buy and Quick fire; the result line; "(entered by you)" (G2).
  - Identity age hint; EDU lock under Point buy (disabled) and Quick fire (text); method shown as text under the EDU lock (G1).
  - Validator: D5 narrowing, new messages, `SavedRolls`.
  - `useWizardMoves`: per-group status; a move 409 reloads; one confirmation sends one roll.
  - API zod and the 409 error. Stories for the new states.

## E2E coverage
File: `e2e/tests/investigator-lifecycle.spec.ts`; the header trace gains UX-36 to UX-38 and drops UX-20.
- **"An EDU check rolls its gain in the same action" (UX-37):** Point buy with EDU at the minimum, age 25; roll the check; log the faces; assert the D6 invariants on the step and in the Keeper's Dice results.
- **"A rolled EDU check locks the age bracket and EDU" (UX-38):** EDU disabled with its reason; the method as text (G1); `page.request.put` with another bracket -> 409 and with another EDU -> 409; a reload shows nothing changed.
- **"A rolled Luck locks the age bracket" (UX-36, UX-38):** the dialog names the age range; the age hint shows; PUT with an age in another bracket -> 409; within the bracket -> 200.
- **"Young Investigator keeps the higher Luck roll" (UX-36):** age 17; the step shows "Luck rolls a and b, kept max(a, b)"; the Keeper's table shows both Server rows.
- **"Dice results are never accepted from the Player":** `page.request.put` with `characteristicRolls`, `luckRolls`, or `eduImprovementChecks` values -> 400 each; the GET is unchanged.
- **"Typed-in rolls from before the dice system are kept":** documented exception (D7); covered by the integration test.
- **Existing tests:** the UX-20 step becomes the app-rolled Luck; the Keeper Luck row regexes become `Server, for {name}`; `submitValidInvestigatorViaUi`, `saveDraftUpToAgeEffectsViaUi`, and their budget assertions become outcome-independent (D6); `scene-play.ts` PUTs then POSTs the rolls; `campaign-overview.spec.ts:233` rolls through the UI.
- **CO-UX check:** the specs/campaign-overview/ux.md criteria (CO-UX-1 to CO-UX-12) are unaffected; the card and attention texts and the stepper don't change.

## ADR
- None: the decisions extend ADR 0030 and the DICE-002 lock pattern, and passing rule data as an argument is easy to reverse.

## Phases
| Phase | What is committed | Checkpoint |
| --- | --- | --- |
| 1 | Domain roll services, locks, aggregate, application, endpoints, request 400s, `IRollSource` removal, messages, fixtures, integration tests, project_ruleset.md section 4.3 | `feat(character-sheet): roll Luck and EDU checks on the server and lock age bracket and EDU (PBI-DICE-003)` |
| 2 | Frontend types, API, validator, state, components, stories, unit tests, `dice-roll-input` removal | `feat(character-sheet): roll Luck and EDU checks in the wizard (PBI-DICE-003)` |
| 3 | E2E scenarios and fixture updates | `test(e2e): server-rolled Luck and EDU checks and their locks (PBI-DICE-003)` |

## Human decisions
- **2026-11-09, UX gate (relayed by the Orchestrator):**
  - G1: option A, the Creation Method shown as text with the EDU lock reason. No prototype.
  - G2: option A, follow UX-33 with "(entered by you)" markers.
- **2026-11-09, plan gate (relayed by the Orchestrator):**
  - D7: yes. The legacy-records scenario is covered by an integration test, and the PBI Verification line is amended.
  - Overall: approved as written. D1 to D6, D8, and every single-option decision are unchanged.

## Revisions

### 2026-11-09: how tests place legacy PlayerEntered Roll Records (clarification)
- **Escalation (Developer, Phase 1):**
  - `ReplaceCharacterSheet` now keeps only the stored records (`next = sheet with { RollRecords = stored.RollRecords }`), so it drops the records on the sheet passed in.
  - That breaks two tests: `InvestigatorReplaceCharacterSheetLockTests` (stored-records case) and the `InvestigatorPersistenceTests` round trip.
  - It also silently breaks the DICE-002 seeder `SeedPlayerEnteredCharacteristicRollsAsync` (InvestigatorApiTests.cs:353-375 on master). That seeder placed records through `ReplaceCharacterSheet`.
  - No production path can place a PlayerEntered record any more, so D7 could not be implemented as written.
- **Ruling: the seam is the EF change tracker, in integration tests only.**
  - The Investigator's `CharacterSheet` is a mapped property with a value conversion (CampaignPlayDbContext.cs:94-100).
  - The seeder loads the Investigator through `CampaignPlayDbContext` in a service scope. Integration tests already use DbContexts this way (for example `ScenePlaySeed.PlayAsync(dbContext, ...)`, HandoutApiTests.cs:108).
  - It sets `dbContext.Entry(investigator).Property(investigator => investigator.CharacterSheet).CurrentValue` to the current sheet `with { RollRecords = [.. stored, .. RollRecord.PlayerEntered(...)] }`, then calls `SaveChangesAsync`.
  - The production converter (`CharacterSheetJsonStorage`) writes the row, so the test never hand-edits the stored JSON.
  - Generalise the seeder to take `(purpose, dice, result)` tuples. The DICE-002 legacy integration test and the D7 test both use it.
- **Domain unit tests seed without a seam:**
  - Pure functions take a `CharacterSheet` value built with `RollRecord.PlayerEntered` directly: `CreationLocks.Of`, `CreationLocks.Refuses`, `LuckRolling`, and `EduImprovementRolling`. This covers D4 (PlayerEntered records lock) and the "roll only what is missing" legacy cases.
  - Aggregate tests (`Investigator` lock, keep-records, and persistence round trip) seed Server records through `RollCharacteristics`, `RollLuck`, and `RollEduImprovementCheck` with `ScriptedDiceRoller`, and compare against the sheet after the roll. This accepts the Developer's proposal for `InvestigatorPersistenceTests`.
  - The aggregate must not be given a test-only way to place records.
- **Rejected:**
  - **Developer option A (editing the stored JSON document in tests).** It couples tests to the storage document's field names, a second representation that ADR 0005 and ADR 0007 keep behind `CharacterSheetJsonStorage`. The change tracker reaches the same row through the production converter.
  - **Developer option B (Server-seeded records instead of PlayerEntered in D7).** It would change the approved D7 and leave the PlayerEntered keep-and-count path untested end to end.
  - **A production method or constructor that places PlayerEntered records.** It would reopen a domain path that writes dice results, against ADR 0030 and the "no client dice results" invariant.
- **What changes:**
  - No chosen option, rejected option, or invariant changes. D7 stays as approved.
  - The Reuse entry for the seeder now names the mechanism.
  - The "a PUT never adds, changes, or removes a Roll Record" invariant applies to `ReplaceCharacterSheet` itself: it ignores the records on the sheet passed in.

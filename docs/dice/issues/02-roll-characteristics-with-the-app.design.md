# Design: PBI-DICE-002: Roll Standard Rolling characteristics on the server, with the shared Dice module

## Triggers
- 1 New dependency: none added. BannedApiAnalyzers was considered and rejected in D6.
- 2 Shared data model: the Roll Record gains faces, who rolled, and when, and moves to the shared kernel. The Character Sheet moves to schema v5, and the PUT contract changes.
- 3 New cross-layer pattern: the `IDiceRoller` port is the only source of random numbers, and creation roll actions are server-side POSTs.
- 4 ADR: dice are rolled only on the server ([ADR 0030](../../adr/0030-dice-are-rolled-only-on-the-server.md)).
- 5 More than one bounded context: the GameRules kernel, Campaign Play, and the API composition root.
- 6 Explorer open questions: the random-number audit, spec drift, validators, and SignalR.
- 7 UX: a new roll journey, the locks, and the Dice results table.

## Constraints
- ADR 0005 and ADR 0007: the Character Sheet is versioned JSON. Upgrade steps live in `CharacterSheetJsonStorage.FromStorage`, and an unknown version throws (CharacterSheetJsonStorage.cs:27-30).
- ADR 0017: `CocAssistant.GameRules.Domain` is the shared rules kernel. It holds value types and calculations only.
- ADR 0009, ADR 0011, ADR 0012: live updates come from domain events dispatched after commit, published by `PublishInvestigatorChanges`.
- Rules (cited, not restated):
  - [character rules section 2.1](../../game-rules/coc7_character_creation_and_development_rules.md#21-standard-rolling-method)
  - [project_ruleset.md section 4.3](../../game-rules/project_ruleset.md#43-dice-results-at-creation) (rewritten by this PBI)
  - [project_ruleset.md section 5.5](../../game-rules/project_ruleset.md#55-dice-notation)
  - character rules sections 5.5 and 3.2 (UX only; built in PBI-DICE-003)
- [specs/dice/spec.md](../../../specs/dice/spec.md):
  - module at `GameRules.Domain/Dice/`;
  - `IDiceRoller`, with `SecureDiceRoller` on `RandomNumberGenerator`, registered once in the composition root;
  - `DiceRoll {dice, faces, total}`;
  - the module owns the Roll Record value object and never references Campaign, Account, Investigator, or Scene types;
  - DoD: every section 5.5 form is tested, and nothing outside `SecureDiceRoller` creates `Random` or calls `RandomNumberGenerator`.
- [specs/character-sheet/spec.md](../../../specs/character-sheet/spec.md):
  - Creation rolling (:17-21), Creation locks (:22-26), Persistence (:117), API (:123-126, :142-143);
  - Constraints :160-161;
  - Guardrails :185-186.
- CONTEXT.md terms: Roll Record, Creation Method, Creation lock, Re-roll grant.
- Existing patterns this design relies on:
  - `Investigator` transitions return bool, and false maps to 409 (Investigator.cs:71-81, InvestigatorControllerBase.cs:12-29).
  - Optimistic concurrency through `Version` (Investigator.cs:25-26), which surfaces as `InvestigatorConflictException` and then 409 (PlayerInvestigatorService.cs:152-166).
  - E2E captures the bearer token and calls `page.request` (e2e/tests/investigator-guardrails.spec.ts:58).
  - An AlertDialog with the safe action focused by default (ux.md 5.5, creation-method-choice.tsx:75-84).
- Cyclomatic complexity of at most 10 (ESLint `complexity`, CA1502).

## UX
- Selected option: B, an inline roll with a confirmation dialog. Recorded in `specs/character-sheet/ux.md` (updated), which is already linked from spec.md:116.
- Answers to the open questions:
  - 3a: the Player does not see the Dice results table.
  - 3b: the Player sees values only inline; the faces appear only in the Keeper's table.
  - 3c: "Entered by" becomes "Rolled by" ("Server, for Ada" or "Ada (entered)"), plus a "When" column.
- No prototype.

## Decisions

### D1: What dice expression rolling accepts
| Metric | A: `DiceExpression` (nDm) only | B: `DiceNotation` terms, plus a `DiceExpression` overload |
| --- | --- | --- |
| Consistency | 0 creation only uses nDm | + the dice spec DoD asks for every section 5.5 form; reuses the existing parser (DiceNotation.cs:43) |
| Modifiability | - Roll Requests and later sanity or damage rolls would need a second roller | + one roller for every form |
| Testability | + small | + table-driven over the section 5.5 forms |
| Simplicity | + about 10 lines | 0 about 30 lines: sums signed dice and constant terms |
| Reversibility | + | + |
| Security and correctness | 0 | 0 a DB term can't be rolled without a Damage Bonus, so it throws `ArgumentException` |
- **Chosen:** B. It meets the dice spec DoD and reuses the parser. We give up a slightly larger first slice.
- **Rejected:** A, because it leaves the dice spec DoD unmet. The Developer must not reintroduce it.
- **Rejected:** extending `DiceExpression` to the full grammar, because it duplicates `DiceNotation` (DRY).

### D2: The PUT's typed Luck and EDU inputs in this PBI
| Metric | A: PUT drops `characteristicRolls` only; `luckRolls` and `eduImprovementChecks` stay typed (PlayerEntered) until DICE-003 | B: drop all three dice inputs now | C: build the Luck and EDU roll actions now too |
| --- | --- | --- | --- |
| Consistency | 0 an interim gap against spec.md:126, recorded as a delivery note | + matches the spec text | + matches the spec |
| Modifiability | + DICE-003 removes two fields | - | - folds DICE-003 into this PBI |
| Testability | + | + | - doubles the E2E scope |
| Simplicity | + | 0 | - |
| Reversibility | + | + | 0 |
| Security and correctness | 0 Luck and EDU stay PlayerEntered for one more PBI, as they are today | - between merges no Investigator can be completed, because LuckRollRequired blocks every method | + |
- **Chosen:** A. Correctness on master decides it. We give up full spec conformance for one PBI. spec.md gets explicit "until PBI-DICE-003" notes on the PUT contract and the validation messages. The Luck and EDU messages stay "Enter ..." until DICE-003.
- **Rejected:** B, because no Investigator can be completed between the merges.
- **Rejected:** C, because it is out of scope (PBI-DICE-003).

### D3: Where the roll action and the lock live
| Metric | A: aggregate (`Investigator.RollCharacteristics`, lock check in `ReplaceCharacterSheet`), helped by the domain service `CharacteristicRolling` and the value `CreationLocks` | B: checks and rolling in `PlayerInvestigatorService` |
| --- | --- | --- |
| Consistency | + matches the bool transitions on the aggregate (Investigator.cs:71-81) | - puts business rules in the application layer (backend/CLAUDE.md) |
| Modifiability | + DICE-003 adds its groups and locks in the same places | - the rules spread out, and DICE-004's Keeper paths would duplicate them |
| Testability | + pure domain unit tests with a scripted roller | 0 needs repository fakes |
| Simplicity | 0 one small service and one small record | + fewer types |
| Reversibility | + | + |
| Security and correctness | + no caller can bypass the invariant | - another path, such as a Keeper re-roll, could skip it |
- **Chosen:** A, for consistency, correctness, and testability. We give up two small types.
- **Rejected:** B. The Developer must not put lock or roll rules in the application service.

### D4: Where the Roll Record value object lives
| Metric | A: move `RollRecord` and `RollSource` to `GameRules.Domain/Dice/` | B: keep them in `CampaignPlay.Domain/CharacterSheets/` |
| --- | --- | --- |
| Consistency | + the dice spec says the module owns the value objects; matches ADR 0017 | - goes against the dice spec |
| Modifiability | + Roll Requests (DICE-005, another context) can reuse it | - DICE-005 has to move it anyway |
| Testability | 0 | 0 |
| Simplicity | 0 Campaign Play namespaces change | + no move |
| Reversibility | + | + |
| Security and correctness | + `RolledByAccountId` is a Guid, with no Account type | 0 |
- **Chosen:** A. `RollPurposes`, `IRollSource`, and `PlayerEnteredRollSource` stay in Campaign Play, because they are specific to creation.
- **Rejected:** B, because it contradicts the dice spec's Architecture.

### D5: What schema v5 stores
| Metric | A: v5 adds faces, rolledByAccountId, and rolledAt; DICE-004 adds isReplaced and the re-roll grants as v6 | B: the full spec.md:117 shape now (isReplaced always false, grants always empty) |
| --- | --- | --- |
| Consistency | 0 needs an edit to spec.md:117 | + matches the current spec text |
| Modifiability | + each PBI owns its fields | 0 |
| Testability | + no untestable fields | - fields with no behavior |
| Simplicity | + no speculative fields | - domain state with no behavior |
| Reversibility | + one more upgrade step is trivial (the chain at CharacterSheetJsonStorage.cs:33) | 0 |
| Security and correctness | 0 | 0 |
- **Chosen:** A. spec.md:117 changes to: "v5 adds faces, who rolled, and when; v6 (PBI-DICE-004) adds replaced and the open re-roll grants".
- **Rejected:** B, because it adds speculative domain state.

### D6: Enforcing "no random numbers outside SecureDiceRoller"
| Metric | A: source-scan unit test in `CocAssistant.Api.Tests` | B: Microsoft.CodeAnalysis.BannedApiAnalyzers in Directory.Build.props |
| --- | --- | --- |
| Consistency | + like other repo-wide source checks (tools/ascii-check) | 0 a new analyzer convention |
| Modifiability | + one regex list | + BannedSymbols.txt |
| Testability | + it is a test | + runs at build time |
| Simplicity | + no dependency, no suppression | - a new package, plus a justified `#pragma` suppression in SecureDiceRoller |
| Reversibility | + | 0 |
| Security and correctness | 0 textual; a `using` alias could evade it, which matching the type names anywhere mitigates | + semantic |
- **Chosen:** A, for simplicity. The test scans `backend/src/**/*.cs`, excluding `bin` and `obj`, for `new Random(`, `Random.Shared`, `System.Random`, and `RandomNumberGenerator`. It allows them only in `GameRules.Domain/Dice/SecureDiceRoller.cs`.
- **Rejected:** B, because a dependency plus a suppression isn't justified for one rule. Revisit it if the scan misses a case.
- **Scope:** `Guid.NewGuid()` for entity ids, invite tokens, and handout file names (for example CampaignMembershipService.cs:138 and HandoutFileService.cs:173) is an identifier, not a game random number. It is out of scope.
- **Sample code:** delete the template sample `backend/src/CocAssistant.Api/Controllers/WeatherForecastController.cs` (:18-19 use `Random.Shared`), `WeatherForecast.cs`, and any `CocAssistant.Api.http` entry for them. Nothing else references them.

### D7: The response contract delivered now
| Metric | A: add `faces`, `rolledByDisplayName`, `rolledAt`, and `locks: {creationMethod}` now; `isReplaced`, `rerollGrants`, `locks.ageBracket`, and `locks.edu` come in their PBIs | B: the full spec shape now, with stubs |
| --- | --- | --- |
| Consistency | 0 delivery notes in spec.md | + matches the spec text |
| Modifiability | + additive later | 0 |
| Testability | + every field has behavior | - stub fields are constant |
| Simplicity | + | - |
| Reversibility | + | + |
| Security and correctness | + no field claims a lock that isn't enforced | - `ageBracket: false` would be untrue while Luck is typed |
- **Chosen:** A.
- **Rejected:** B, because stubs mislead clients about which locks are enforced.

### Single-option decisions
- **IDiceRoller registration:** `AddSingleton<IDiceRoller, SecureDiceRoller>()` in `backend/src/CocAssistant.Api/Program.cs`, because the dice spec places it in the composition root. `CocAssistant.Api.Tests` asserts that it is the single registration.
- **SignalR: none.** A PUT of the same Draft raises no event and publishes nothing (Investigator.cs:71-81; PublishInvestigatorChanges.cs:8-13). Rolls happen only in Draft, which the Keeper can't see, or in Changes Requested, where the Keeper has no actions.
- **Every roll refusal is 409.** Wrong status, a method other than Standard Rolling, or nothing left to roll all make `Investigator.RollCharacteristics` return false, which maps to StatusConflict (spec.md:123).
- **`ReplaceCharacterSheet` stays bool.** A lock break returns false and leaves the sheet unchanged, which gives 409 (spec.md:26).
- **Racing double rolls:** the `Version` concurrency check makes the second save a 409.
- **What a PUT keeps:** every stored characteristic Roll Record and every `Server` Roll Record. It rebuilds only the PlayerEntered Luck and EDU records from its inputs.
- **PUT body:** 400 when `characteristicRolls` has any non-null value, under every method. This extends CharacterSheetRequest.cs:138, which today rejects it only outside Standard Rolling. Null or absent is accepted.
- **Who rolled:**
  - `rolledByAccountId` is the caller's account id (`ResolveCallerAccountIdAsync`); only the owner reaches the action.
  - `rolledByDisplayName` is resolved through `IAccountDisplayNames` for every account id on the records, in both the Player and the Keeper views.
  - PlayerEntered records get the Investigator's Player name.
- **`IRollSource` and `PlayerEnteredRollSource`** stay only for typed Luck and EDU. DICE-003 deletes them.
- **`RollRecord` equality:** a custom `Equals` that compares `Faces` element by element, because `CharacterSheet.Equals` uses `SequenceEqual` (CharacterSheet.cs:54).
- **`ScriptedDiceRoller` test double:** duplicated in GameRules.Tests and CampaignPlay.Tests, about 15 lines each. This is a deliberate DRY exception: there is no shared test-support project, and one fake doesn't justify adding one.
- **Frontend roll mutation:**
  1. Save the current step with the existing PUT.
  2. POST the roll.
  3. `reset` the form from the response and set the query cache.
- **Validators:**
  - `CharacteristicRollRequired` uses the spec.md:69 message "Roll characteristics. {C} has no {dice} roll yet." in both the backend (ValidationErrors.cs:127) and the frontend (characterSheetValidation.ts:69).
  - `DiceResultOutOfRange` stays for PlayerEntered records.
  - The Luck and EDU messages stay unchanged until DICE-003.
  - In `validation-fixtures.json`, `characteristicRolls` now models stored PlayerEntered Roll Records, not PUT input. Both harnesses seed them onto the sheet, and the expected messages are updated in the same commit.

## Patterns
- **Used:** a port with two implementations (Adapter over `RandomNumberGenerator`).
  - Where: `IDiceRoller`, with `SecureDiceRoller` in production and `ScriptedDiceRoller` in tests, at `GameRules.Domain/Dice/`.
  - Force: tests need deterministic faces, and production needs a cryptographic source.
  - Same port style as ADR 0008 and ADR 0021.
- **Used:** named constructors `RollRecord.FromServer(purpose, DiceRoll, rolledBy, rolledAt)` and `RollRecord.PlayerEntered(purpose, dice, result)`.
  - Force: two construction variants with different required fields. A Factory Method hierarchy is not warranted.
- **Rejected:** Strategy per roll group. Only one group exists in this PBI. DICE-003 may introduce it if the group conditionals would pass complexity 10.
- **Rejected:** Command for roll actions. Nothing is queued or undone, and Roll Records are immutable.
- **Rejected:** State for locks. A lock is derived from the Roll Records (`CreationLocks.Of(sheet)`), not from lifecycle state.
- **Rejected:** Observer or SignalR. See the single-option decisions.
- **Rejected:** a Decorator or Proxy around the roller for audit. The Roll Record already is the audit.

## Invariants
- **No client dice results:** no API accepts a dice result. Every new Roll Record has source `Server`, its faces, `rolledByAccountId`, and `rolledAt`.
- **One random source:** no backend code outside `SecureDiceRoller.cs` uses `Random` or `RandomNumberGenerator`. The Dice module references no Campaign, Account, Investigator, or Scene type.
- **Roll Records are immutable:** a Roll Record is never changed or deleted. A PUT never creates, changes, or removes a characteristic Roll Record or a `Server` record.
- **Each characteristic is rolled at most once:**
  - The action rolls only characteristics that have no record.
  - It rolls them in `CharacteristicCodes.All` order, using `StandardRolling.FormulaFor(c).Dice`.
  - `Result` is the raw dice total.
- **Creation Method lock:** once any characteristic has a Roll Record (Server or PlayerEntered), a PUT with another Creation Method returns 409 and changes nothing.
- **Upgrade keeps old data:** a v4 document upgrades to v5 with its PlayerEntered records unchanged (no faces, no times). Its computed values do not change.
- **Point Buy and Quick Fire are unchanged.**
- **Complexity:** at most 10, with no new suppressions or baseline entries.

## Implementation plan
1. **GameRules Dice module** in `GameRules.Domain/Dice/`:
   - `IDiceRoller`.
   - `SecureDiceRoller`: `RandomNumberGenerator.GetInt32(1, sides + 1)`; sides below 1 throws.
   - `DiceRoll(string Dice, IReadOnlyList<int> Faces, int Total)`.
   - `DiceRolling.Roll(DiceNotation, IDiceRoller)` and `Roll(DiceExpression, IDiceRoller)`; a DB term throws.
   - Update the DiceNotation.cs:24-25 comment: preparation still never rolls notation, but the Dice module can.
2. **Move `RollRecord` and `RollSource` into `GameRules.Domain/Dice/`:**
   - add `RollSource.Server`;
   - add optional `Faces`, `RolledByAccountId`, and `RolledAt`;
   - add the named constructors and the custom equality;
   - fix the Campaign Play usings.
3. **Storage v5:**
   - `CharacterSheet.CurrentSchemaVersion = 5`;
   - `RollRecordDocument` gains the three nullable fields;
   - the upgrade comment and chain read absent fields as null when going from v4 to v5.
4. **Domain:**
   - `CharacterSheet.WithAddedRollRecords`.
   - `CharacteristicRolling.RollMissing(sheet, roller, rolledBy, now)`.
   - `CreationLocks(bool CreationMethod)` with `Of(sheet)`.
   - `Investigator.RollCharacteristics(roller, rolledBy, now)`.
   - `ReplaceCharacterSheet` keeps the stored characteristic and Server records, and refuses a lock break.
   - `CharacterSheetInputs` drops `CharacteristicRolls`, and `ToCharacterSheet` no longer builds characteristic records.
5. **Application:**
   - `PlayerInvestigatorService.RollMyCharacteristicsAsync`, following the shape of PlayerInvestigatorService.cs:81-103 and injecting `IDiceRoller`.
   - The Player and Keeper views resolve display names for every `rolledByAccountId`.
6. **Controllers:**
   - `POST mine/character-sheet/rolls/characteristics`: 200 with `CharacterSheetResponse`, 404 for anyone but the owner, 409 for refusals.
   - `CharacterSheetRequest` rejects `characteristicRolls` values under every method.
   - `RollRecordResponse` gains `Faces`, `RolledByDisplayName`, and `RolledAt`.
   - The view gains `Locks`.
7. **Composition root:** register `IDiceRoller` in Program.cs and delete the WeatherForecast sample.
8. **Validators and fixtures:**
   - the backend and frontend `CharacteristicRollRequired` messages;
   - the fixture harness semantics (D6 single-option entry on validators);
   - the expected messages.
9. **Docs:**
   - Rewrite project_ruleset.md section 4.3, following the README conventions. It should say:
     - the app rolls on the server when the Player asks;
     - this is still a project choice, not a deviation;
     - each result is kept as a Roll Record with its faces;
     - earlier typed results are kept as Player-entered;
     - Luck and EDU improvement check results are still entered by the Player until the app rolls them (that sentence is removed in DICE-003).
   - spec.md:
     - delivery notes on PUT (:125-126), on the response (:142-143), and on the validation messages;
     - Persistence v5 and v6 (:117);
     - the Data Models line that names `IRollSource` (:147).
   - Dice spec: tick the DoD items this PBI delivers.
10. **Frontend types and API:**
    - `RollRecord` gains `faces`, `rolledByDisplayName`, and `rolledAt`; `CharacterSheetView` gains `locks`; add the zod schemas.
    - Add `rollMyCharacteristics()`; a 409 throws `InvestigatorConflictError`.
    - Remove `characteristicRolls` from `CharacterSheetInputs`, the reducer, `inputsFromSheet`, `methodInputsOnly`, and `hasCharacteristicInputs`.
    - Under Standard Rolling, `assignedValue` reads the saved sheet's `characteristics[code].assigned`.
11. **Frontend components:**
    - new `components/creation-roll-action/` (button, AlertDialog, story, test);
    - the `characteristics-step` Standard Rolling section shows the roll action or the rolled values;
    - `creation-method-choice` gets a `locked` prop, which shows text and the reason;
    - `dice-results` gets the new columns and formatting, using the `Intl.DateTimeFormat` approach of wallEntryTime.ts;
    - the wizard gets the roll mutation (save first) and the 409 reload handling.
12. **Tests and E2E,** as listed below.

## Reuse
- **Using:**
  - `DiceNotation.TryParse` and `DiceExpression`
  - `StandardRolling.FormulaFor`
  - `CharacteristicCodes.All`
  - `IAccountDisplayNames`
  - `ResolveCallerAccountIdAsync`
  - `FakeTimeProvider`
  - the shadcn `AlertDialog` (the creation-method-choice pattern)
  - the `Table` and `Collapsible` in `DiceResults`
  - `openAndCaptureBearer` plus `page.request` for the E2E 409 checks
- **Not using:**
  - `IRollSource` for Server rolls: its signature takes a Player-entered result, and the spec deprecates it.
  - `dice-roll-input` for characteristics: it stays only for typed Luck and EDU until DICE-003.
  - `PublishInvestigatorChanges`: see the single-option decision on SignalR.

## TDD units

### GameRules.Tests
- **`SecureDiceRoller`:**
  - every face is between 1 and the number of sides over many rolls of 6, 10, and 100;
  - 0 sides throws.
- **`DiceRolling`** (each test names project_ruleset.md section 5.5):
  - "3D6" with scripted faces 2, 5, 6 gives faces [2, 5, 6] and total 13 (the dice spec Gherkin);
  - "D100" with no count;
  - lowercase "2d6";
  - the constant "5", which has no faces;
  - "2D6-1";
  - "1D6+1D4" keeps the faces in order;
  - "0";
  - a sanity-loss side;
  - a damageBonusOverride side such as "-1";
  - a DB term throws;
  - the `DiceExpression` overload gives the same result as the notation.
- **`RollRecord`:**
  - `FromServer` copies the faces, total, who, and when, with source Server;
  - `PlayerEntered` has null faces and time;
  - equality compares faces by value.

### CampaignPlay.Tests
- **`CharacteristicRolling`:**
  - rolls the eight characteristics with their section 2.1 dice (SIZ, INT, and EDU use 2D6);
  - stores the raw totals;
  - skips characteristics that have a PlayerEntered record.
- **`Investigator.RollCharacteristics`:**
  - succeeds in Draft and in Changes Requested;
  - returns false when Submitted or Approved, when the method is not Standard Rolling, or when nothing is missing;
  - leaves the sheet unchanged when it returns false.
- **`ReplaceCharacterSheet`:**
  - keeps the characteristic and Server records;
  - rebuilds the PlayerEntered Luck and EDU records;
  - refuses a method change after a characteristic record, leaving the sheet unchanged;
  - allows a method change when there is no characteristic record.
- **`CreationLocks.Of`.**
- **Storage:**
  - v4 to v5 keeps the PlayerEntered records and the computed values;
  - v5 round-trips faces, who, and when;
  - version 6 throws.
- **Validator:**
  - the CharacteristicRollRequired message;
  - DiceResultOutOfRange still fires for an out-of-range PlayerEntered characteristic;
  - Server records never produce it.
- **Fixture parity tests** pass with the new fixture semantics.

### Api.Tests
- The composition root resolves exactly one `IDiceRoller`, and it is `SecureDiceRoller`.
- The randomness source scan (D6).

### Integration (InvestigatorApiTests)
- **POST roll:**
  - returns 200 with 8 Server records;
  - each record has as many faces as its dice, each face in range;
  - each result is the sum of its faces;
  - each record has `rolledByDisplayName` and `rolledAt`.
- **Refusals:**
  - a second POST returns 409, and the records are unchanged;
  - POST under Point Buy returns 409;
  - POST when Submitted returns 409;
  - POST by another Player returns 404.
- **PUT:**
  - another method after rolling returns 409;
  - a body with `characteristicRolls` values returns 400.
- **Seeded legacy Draft** (PlayerEntered STR and CON):
  - after a POST, STR and CON are still PlayerEntered and the other six are Server;
  - a PUT keeps them all.
- **Existing PUT/PlayerEntered tests** (:116-280) are updated.

### Frontend (Vitest)
- **`creation-roll-action`:**
  - the trigger opens the dialog;
  - "Not yet" has initial focus, closes without rolling, and focus returns to the trigger;
  - "Roll now" calls onRoll;
  - while pending, it reads "Rolling..." and both buttons are disabled.
- **`characteristics-step`, Standard Rolling:**
  - before rolling: "Roll characteristics" and no number inputs;
  - after rolling: eight values, focus on the "Your characteristics" heading, no button;
  - a legacy partial sheet: "(entered by you)" values and "Roll the remaining characteristics";
  - the error summary link for `characteristicRolls.{C}` focuses the roll action.
- **`creation-method-choice` with `locked`:** text plus the lock reason, and no radios.
- **`dice-results`:**
  - the column headers;
  - "Server, for Ada" and "Ada (entered)";
  - "Not recorded";
  - faces as "2, 5, 6";
  - `<time dateTime>`.
- **API:**
  - zod parses the new fields;
  - the roll POST;
  - a 409 throws `InvestigatorConflictError`.
- **Form:** the PUT body never carries `characteristicRolls`.
- **Validator:** the new message.
- **Stories:** creation-roll-action; characteristics-step (rolled, legacy, and locked); dice-results.

## E2E coverage
**File to rewrite:** `e2e/tests/investigator-lifecycle.spec.ts`, the Standard rolling test (about line 279 onward) and the header trace at :19-26. Replace the deprecated "Standard Rolling records every Player-entered roll" with the scenarios below and UX-31 to UX-35.

**Scenario "Standard Rolling characteristics are rolled by the server" (UX-31, UX-34):**
1. The Player chooses Standard rolling and sees no characteristic inputs.
2. "Roll characteristics" opens "Roll characteristics?".
3. "Not yet" closes it, and nothing is rolled.
4. "Roll now" shows the eight values, and the action is gone.
5. Set age 25. Type in Luck and an EDU D100 below EDU (interim, until DICE-003).
6. Choose Antiquarian with only Credit Rating 30 spent. This submits whatever the rolls are, because unspent points only warn (spec.md:36).
7. The Keeper's Dice results show:
   - eight characteristic rows with "Server, for {name}", Faces matching `/^\d+(, \d+)+$/`, and a When;
   - the Luck row with "{name} (entered)" and Faces "Not recorded".

**Scenario "Characteristics are rolled only once":**
- After rolling, `page.request.post(.../rolls/characteristics)` returns 409.
- A reload shows the same eight values.

**Scenario "Rolled characteristics lock the Creation Method" (UX-32):**
- The step shows the method as text with the lock reason and no radios.
- `page.request.put` with the GET body but `creationMethod: "PointBuy"` returns 409.
- A reload still shows Standard rolling.

**UX-35:**
- `page.route` aborts the roll POST, and the Alert "We couldn't roll your characteristics. Try again." appears.
- The retry succeeds.

**Other existing tests:**
- **UX-7** moves to the Point Buy lifecycle test, because EDU under Standard Rolling can no longer be edited.
- **Keeper row assertion** `/^Luck 3D6 11 Player$/` (lifecycle about line 146) is updated to the new columns.
- **`e2e/fixtures/investigators.ts`** gets `rollCharacteristicsViaUi(page)`.

**Documented exception, UX-33** ("A Draft with typed-in characteristic totals from before keeps them"):
- No current API can create that state.
- It is covered by the storage upgrade tests and the seeded integration test.

**CO-UX check:** the specs/campaign-overview/ux.md criteria are unaffected. The card and attention texts and the 7-step stepper don't change.

## ADR
- [ADR 0030](../../adr/0030-dice-are-rolled-only-on-the-server.md): dice are rolled only on the server, through IDiceRoller in the game-rules kernel.

## Phases
| Phase | What is committed | Checkpoint |
| --- | --- | --- |
| 1 | Dice module, randomness guard, deletion of the WeatherForecast sample, composition-root registration | `feat(dice): secure dice roller and dice expression rolling (PBI-DICE-002)` |
| 2 | Roll Record moved and extended, storage v5, response fields | `feat(character-sheet): roll records with faces, roller and time in schema v5 (PBI-DICE-002)` |
| 3 | Roll characteristics action, Creation Method lock, PUT changes, validators and fixtures, section 4.3 and spec delivery notes, integration tests | `feat(character-sheet): roll characteristics on the server and lock the creation method (PBI-DICE-002)` |
| 4 | Frontend types, API, components, stories, unit tests | `feat(character-sheet): roll characteristics in the wizard and show faces to the Keeper (PBI-DICE-002)` |
| 5 | E2E rewrite and re-pointing | `test(e2e): server-rolled characteristics and the creation method lock (PBI-DICE-002)` |

## Human decisions
- **2026-11-08, UX gate:**
  - Option B (inline roll with a confirmation dialog), with no prototype.
  - 3a: no Dice results table for the Player.
  - 3b: the Player sees values only; the faces are in the Keeper's table.
  - 3c: "Rolled by" ("Server, for Ada" or "Ada (entered)") plus "When".
  - Accepted consequence: the Player never sees faces in the UI. The API still returns them.
- **2026-11-08, plan gate:** approved as proposed, with no changes. This includes:
  - D2: typed Luck and EDU stay until PBI-DICE-003.
  - D5: v5 holds faces, who, and when; v6 in PBI-DICE-004 adds replaced and the grants.
  - The legacy-Draft method lock: spec.md:23 applies to PlayerEntered characteristic records too. Start over is the way out in Draft.

## Revisions

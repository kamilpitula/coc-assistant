# Design: PBI-DICE-004: The Keeper grants a re-roll of Characteristics, Luck, or EDU improvement checks with a Change Request

## Triggers
- **2. Shared aggregate and data model:**
  - `Investigator.RequestChanges` gains the grant.
  - `CharacterSheet` gains replaced Roll Records and open re-roll grants.
  - The stored document moves from schema v5 to v6.
  - The view contract gains `isReplaced` and `rerollGrants`.
  - The request-changes body gains `rerollGrants`.
- **4. ADR:** where "replaced" lives is a Roll Record ownership rule that later consumers will copy (ADR 0034).
- **6. Explorer open questions with competing answers:** the wire shape, the grant lifecycle, PlayerEntered groups, the purpose collision, and where the Player and Keeper views diverge.
- **7. UX: not a trigger.** `specs/character-sheet/ux.md` already specifies the UI:
  - 6.8 Re-roll grant;
  - 7.1 Replaced results;
  - UX-39 and UX-40;
  - the PBI-DICE-004 delivery row.

  Wording the ux.md leaves open is pinned under "UX interpretations" and was confirmed at the gate.
- **5. More than one bounded context: not triggered.** The chosen D1 keeps the change inside CampaignPlay; the GameRules kernel is unchanged.

### Discrepancies found against the Explorer report
- `RollRecord` is not a CampaignPlay type.
  - It is the GameRules kernel type (`GameRules.Domain/Dice/RollRecord.cs:103-112`).
  - Roll Requests also store it (`ScenarioPreparation.Domain/RollRequests/RequestedRoll.cs:29`, `RollRequestJsonStorage.cs`).
- `specs/dice/spec.md:30` says a Roll Record is never changed after it is created. The PBI says it is "never changed except to mark it replaced". These conflict unless "replaced" lives outside the record, which is what D1 does.
- No migration is needed. The sheet is stored through a string value converter (`CampaignPlayDbContext.cs:97-98`), and ADR 0007 makes a shape change a schema version plus an upgrade step.

## Constraints
- **ADR 0030:**
  - dice are rolled only on the server;
  - the `RollRecord` shape belongs to the GameRules kernel;
  - each consumer owns its purposes and its storage.
- **ADR 0005 and ADR 0007:**
  - the Character Sheet is versioned JSON;
  - a new shape needs a new schema version and an upgrade on read in `CharacterSheetJsonStorage` (`CharacterSheetJsonStorage.cs:22-36`);
  - `Version` turns races into 409.
- **ADR 0017:** the game-rules kernel stays free of consumer concepts.
- **specs/dice/spec.md:30:** a Roll Record is never changed after it is created.
- **specs/character-sheet/spec.md:**
  - Re-roll grant (line 28);
  - Creation rolling (line 21: a PlayerEntered EDU check missing its gain is replaced only by a grant);
  - Persistence v6 (line 118);
  - the view contract (lines 144-145);
  - Constraints (line 163);
  - Regression Guardrails (lines 187-188);
  - Scenario "Keeper grants a characteristics re-roll" (lines 238-243).
- **specs/campaign-play/spec.md:32:**
  - `request-changes` optionally carries `rerollGrants`, a list of `Characteristics`, `Luck`, and `EduImprovementChecks`;
  - a group with no Roll Record, or an unknown group, returns 400.
- **Game rules:**
  - [project_ruleset.md section 4.3](../../game-rules/project_ruleset.md#43-dice-results-at-creation) only says that the server rolls and keeps Roll Records.
  - No rule covers re-rolls. The Re-roll grant is a project workflow concept (CONTEXT.md "Re-roll grant"), not a rule derivation.
  - No rules document changes, and nothing is restated.
- **CONTEXT.md terms:**
  - Roll Record;
  - Creation lock;
  - Re-roll grant (avoid "re-roll token" and "reset");
  - Change Request;
  - Changes Requested.
- **Existing patterns:**
  - Bool aggregate transitions, where false maps to 409 (`Investigator.cs:75-91`, `:144-152`, `:183-197`).
  - The service checks the status first, so that two failures map to two outcomes (`PlayerInvestigatorService.cs:170-187`).
  - Outcomes map to HTTP in one switch (`InvestigatorControllerBase.cs:12-29`).
  - String enums in request bodies are checked by a validation attribute and then parsed (`SupportedCreationMethodName`, `CharacterSheetRequest.cs:97+`, parsed at `CharacterSheetWireFormat.cs:44`).
  - Locks are derived from the records (`CreationLocks.cs:13-17`).
  - The roll services skip purposes that already have a record (`CharacteristicRolling.cs:15-17`, `LuckRolling.cs:17-22`).
  - The Player and Keeper responses are separate mappers (`CharacterSheetWireFormat.cs:66`, `:76`).
- **Cyclomatic complexity:** at most 10, with no new suppressions.

## UX
- Not a trigger. The UX is specified in `specs/character-sheet/ux.md` (existing): 6.8 Re-roll grant, 7.1 Replaced results, UX-39, and UX-40.
- **UX interpretations** (confirmed at the gate; the Developer records them in ux.md):
  - **U1. Roll action labels:**
    - While a group is in `rerollGrants`, its existing roll action label gets " again":
      - "Roll characteristics again" (`characteristics-step.tsx:173`);
      - "Roll Luck again" (`characteristics-step.tsx:369`);
      - "Roll EDU check {n} again" (`age-effects-step.tsx:312`).
    - The dialog title follows the label ("{Label}?").
  - **U2. Dialog body:**
    - For a granted group, the existing body gets " Only your Keeper can allow a re-roll." appended.
    - The dialog of a group that is not granted is unchanged.
  - **U3. The Keeper comment Alert** (`investigator-wizard.tsx:250`, `:315-322`):
    - It adds "Your Keeper lets you roll again: {groups}." only while `rerollGrants` is not empty.
    - The group names are "characteristics", "Luck", and "EDU checks".
    - They are joined by ", ", in the order Characteristics, Luck, EDU checks.
  - **U4.** The fieldset "Allow the Player to roll again" is not rendered when no group has current (not replaced) Roll Records.

## Decisions

### D1: Where the "replaced" state lives

Options:
- **A:** an `IsReplaced` flag on the kernel `RollRecord`.
- **B:** a separate `ReplacedRollRecords` list on `CharacterSheet`.
- **C:** a CampaignPlay wrapper `CreationRollRecord(RollRecord, IsReplaced)` in one list.

| Metric | A: kernel flag | B: separate list | C: wrapper |
| --- | --- | --- | --- |
| Consistency | - contradicts dice spec:30 and puts a creation concept into the kernel shared with Roll Requests (ADR 0030, 0017) | + the kernel record never changes; the consumer owns the classification, as ADR 0030 gives each consumer its storage | 0 the kernel is untouched, but a second record type sits beside it |
| Modifiability | - every consumer (ScenarioPreparation, ScenePlay) carries an unused flag | + `ResultFor`, the roll services, locks, and the validator keep reading `RollRecords`, now meaning "current" | - every reader of `RollRecords` must filter (CharacterSheet.cs:29-46, CreationLocks.cs:15-17, CharacteristicRolling.cs:15, LuckRolling.cs:17, the views) |
| Testability | 0 | + replacement is one pure method on CharacterSheet; existing tests keep passing | 0 |
| Simplicity | - every reader must filter, or `ResultFor` (`SingleOrDefault`, CharacterSheet.cs:45-46) throws on a purpose collision | + the collision can't occur in the domain; about 2 new properties and 2 methods | - same filtering burden as A |
| Reversibility | - a kernel shape change ripples across three contexts | + local to the CampaignPlay domain and the v6 document | 0 |
| Security and correctness | - one forgotten filter counts a replaced result toward values | + replaced records are unreachable from the value paths by construction | - same risk as A |

- **Chosen: B.**
  - Deciding metrics: consistency with ADR 0030 and dice spec:30, simplicity, and correctness by construction.
  - "Marking replaced" moves a record from `RollRecords` to `ReplacedRollRecords`. The record value never changes and is never deleted.
  - Given up: the stored order of the two lists is separate, so the review view must merge them for display.
- **Rejected:**
  - A, because it changes the shared kernel and contradicts dice spec:30.
  - C, because every reader would need a filter.
  - **The Developer must not add `IsReplaced`, or any replaced flag, to `GameRules.Domain.Dice.RollRecord`.**

### D2: Grant lifecycle

Options:
- **A:** grants are stored. A group's grant clears when that group is next rolled, and Submit clears all grants.
- **B:** grants are stored. A group's grant clears only when that group is next rolled.
- **C:** grants are not stored. They are derived as "the group has replaced records and is missing current ones".

| Metric | A: stored, cleared on roll and Submit | B: stored, cleared on roll only | C: derived |
| --- | --- | --- | --- |
| Consistency | + matches spec:118 (v6 stores the open grants) and spec:145 ("granted ... not rolled again yet"); ties the grant to one Change Request | 0 matches spec:118 and spec:145 | - contradicts spec:118 |
| Modifiability | + one clearing rule in `WithAddedRollRecords` plus one line in `Submit` | 0 | - for EDU, "missing" depends on the bracket, so bracket logic leaks into the view |
| Testability | + pure state transitions | + | 0 |
| Simplicity | + | + | - |
| Reversibility | + | + | + |
| Security and correctness | + a grant left open after a method or bracket switch can't resurface in a later Change Request | - a stale "Your Keeper lets you roll again" can resurface | 0 |

- **Chosen: A**, because of consistency with spec:118 and spec:145, and because no stale grant message can resurface.
- **How grants are set and cleared:**
  - `RequestChanges` sets the grants. Submit always clears grants first, so at request time the set is empty and becomes exactly the requested groups.
  - A successful roll of a group (`RollCharacteristics`, `RollLuck`, or `RollEduImprovementCheck`) removes that group's grant. For EDU, the first re-rolled check clears it; later checks use their normal label.
  - Rolling one group never changes another group's grant or records.
  - `Submit` clears all grants.
- **The grant is not a permission gate.**
  - The roll actions keep working on "purposes with no current record" (CharacteristicRolling.cs:15-17, LuckRolling.cs:17-22).
  - Records become missing again only through a grant, so spec:163 still holds.
- **Rejected:**
  - B, because of the stale grant.
  - C, because it contradicts spec:118 and spreads bracket logic.
  - **The Developer must not make `rerollGrants` gate the roll endpoints.** A gate would be a second source of truth for "may roll".

### D3: Where the Player view and Keeper view diverge

Options:
- **A:** the application layer. `CharacterSheetView` carries the audience, and the Keeper service includes replaced records.
- **B:** the controllers. `ToViewResponse(view, includeReplaced)` in `CharacterSheetWireFormat`.
- **C:** the frontend filters, and the server sends everything to both.

| Metric | A: application | B: controllers | C: frontend |
| --- | --- | --- | --- |
| Consistency | + visibility rules already live in the domain and application (`Investigator.IsVisibleToKeeper`, Investigator.cs:51) | 0 the two mappers exist (CharacterSheetWireFormat.cs:66, :76), but a visibility rule would sit in the mapping layer | - CLAUDE.md: authorization is server-side |
| Modifiability | + one property decides | + | - |
| Testability | + application unit tests and integration tests | 0 integration tests only | - |
| Simplicity | 0 one flag on the view, set in two services | + one parameter | + |
| Reversibility | + | + | + |
| Security and correctness | + the Player never receives replaced records | + | - Keeper-only data is sent to the Player |

- **Chosen: A**, because of consistency with where visibility rules live, and testability.
- **What changes:**
  - `CharacterSheetView` gains `bool IncludesReplacedRollRecords` (InvestigatorResults.cs:33-38).
  - The flag is set through a parameter on `CharacterSheetViews.ViewAsync`:
    - true by `KeeperInvestigatorService.ViewAsync` (KeeperInvestigatorService.cs:125-126);
    - false by `PlayerInvestigatorService.ViewAsync` (:211-212).
  - The wire format emits current records with `isReplaced: false`. When the flag is set, replaced records with `isReplaced: true` follow them.
  - When replaced records are included, `CharacterSheetViews.ViewAsync` also collects their roller ids (CharacterSheetViews.cs:13-17).
- **Given up:** one more field on the view record.
- **Rejected:**
  - B, because it puts a visibility rule in the controller layer.
  - C, because it sends Keeper-only data to the Player.
  - **The Developer must not send replaced records in the Player's response and filter them in the browser.**

### D4: How an invalid grant becomes 400 while a wrong status stays 409

Options:
- **A:** the service checks first, as in `SubmitMineAsync`, and the domain still guards.
- **B:** `RequestChanges` returns a new outcome enum instead of bool.

| Metric | A: service pre-check | B: domain outcome enum |
| --- | --- | --- |
| Consistency | + same shape as `SubmitMineAsync` (PlayerInvestigatorService.cs:179-187); the aggregate keeps bool transitions | - the only non-bool transition on `Investigator` |
| Modifiability | 0 | 0 |
| Testability | + the domain guard and the service mapping are each unit-testable | + |
| Simplicity | + | 0 a new enum |
| Reversibility | + | 0 |
| Security and correctness | + the aggregate enforces the invariant (false when a group has no current record); the service reports it precisely | + |

- **Chosen: A**, because of consistency.
- **Order in `KeeperInvestigatorService.RequestChangesAsync`:**
  1. Invalid comment: `InvalidChangeRequestComment` (400), checked before the lookup as today.
  2. Not found: 404.
  3. Status not Submitted: `StatusConflict` (409).
  4. A requested group with no current Roll Record: the new `InvalidRerollGrant` (400).
  5. Call `investigator.RequestChanges(comment, grants, now)`.
  6. Save; a conflict returns 409.
- Unknown group names are rejected at model validation (400) by a validation attribute, like `SupportedCreationMethodName`.
- **Rejected:** B, because the aggregate stays bool-only. The Developer must not change `Investigator` transitions to return enums.

### Single-option decisions
- **Wire shape (Q1):**
  - **Request body:**
    - The body is `{comment, rerollGrants?}`, pinned by campaign-play spec:32.
    - `rerollGrants` is camelCase. Its values are `Characteristics`, `Luck`, and `EduImprovementChecks`, in PascalCase like `creationMethod` and `source`.
    - A missing, null, or empty `rerollGrants` means no grant. Duplicates count once.
  - **View:**
    - Each roll record gains `isReplaced: boolean`. It is always false in the Player's view.
    - `characterSheet` gains `rerollGrants: string[]`, with the same values in the order Characteristics, Luck, EduImprovementChecks.
    - `rerollGrants` is a sibling of `locks`, not inside it, because `locks` holds booleans and grants are a different kind of data.
    - The Keeper's response carries `rerollGrants` too, because it is the same view.
- **PlayerEntered-only groups (Q3): grantable.**
  - spec:21 and spec:188 already say that a PlayerEntered record counts until a grant replaces it.
  - "Has a Roll Record" means at least one current (not replaced) record, of any source.
  - A group whose records are all replaced is not grantable (400).
- **Purpose collision (Q4):**
  - In the domain, D1 removes it: `ResultFor` (CharacterSheet.cs:45-46) only sees current records.
  - In the frontend, `DiceResults` keys rows by purpose (`dice-results.tsx:66`). Use a key that includes `isReplaced` and the row index.
- **Group mapping:**
  - Add a `RollGroup` enum (`Characteristics`, `Luck`, `EduImprovementChecks`) and `RollPurposes.GroupOf(purpose)` in `CharacterSheets/RollRecord.cs`.
  - `CreationLocks` reuses them in place of its private `IsLuckOrEduPurpose` and `IsEduPurpose`. This is optional, but recommended for DRY.
- **Storage v6:**
  - `CurrentSchemaVersion = 6` (CharacterSheet.cs:23).
  - The document gains `replacedRollRecords` (the same `RollRecordDocument` shape) and `rerollGrants` (a list of `RollGroup`).
  - v1 to v5 documents upgrade with both empty.
  - `RollRecordDocument` is unchanged.
- **Domain properties:**
  - `ReplacedRollRecords` and `RerollGrants` are init-only properties on `CharacterSheet`, with empty defaults, not new positional parameters. Existing `new CharacterSheet(...)` call sites don't change.
  - `Equals` and `GetHashCode` (CharacterSheet.cs:52-65) include both.
- **PUT keeps both:** `ReplaceCharacterSheet` copies `ReplacedRollRecords` and `RerollGrants` from the stored sheet, as it already does for `RollRecords` (Investigator.cs:82).
- **Dice results order:**
  - The server emits current records in stored order, then replaced records in stored order.
  - A pure, unit-tested frontend helper lays out the rows:
    - each current row comes first;
    - the replaced rows with the same purpose follow it, newest first;
    - replaced rows whose purpose has no current record (for example an old EDU gain) go at the end, in stored order.
  - A replaced row's "Rolled for" reads "{Rolled for} (replaced)" (ux 7.1).
- **No domain event change:** `InvestigatorChangesRequested` (Investigator.cs:195) does not carry the grants, because no consumer needs them.

## Patterns
- **Used:** none new. Bool aggregate transitions and the service pre-check are reused.
- **Rejected:**
  - **Strategy per roll group:** the force, a switch over three groups, lives in one small `GroupOf` with complexity below 10, and the roll services already exist per group.
  - **State for the grant lifecycle:** the grant is a set, not a lifecycle with behavior per state, and `InvestigatorStatus` already covers the lifecycle with bool transitions.
  - **Command or Memento to undo a roll:** nothing is undone; records are moved and kept.
  - **Observer (a new SignalR topic or domain event for grants):** `InvestigatorChangesRequested` already covers the user-visible change.
  - **Decorator filtering `RollRecords` by audience:** one flag on the view (D3) is simpler.

## Invariants
- A Roll Record value is never modified or deleted. A grant only moves it from `RollRecords` to `ReplacedRollRecords`.
- The kernel `RollRecord` (`GameRules.Domain/Dice/RollRecord.cs`) is unchanged.
- Replaced records never count toward values, validation, locks, or "already rolled".
- The Player's response never contains a replaced record. The Keeper's response contains all of them, with `isReplaced: true`.
- A grant is accepted only:
  - from Submitted;
  - with a valid comment;
  - for groups with at least one current Roll Record (PlayerEntered included).

  It is applied together with the Submitted -> Changes Requested transition, in one save.
- PUT never adds, removes, or moves a current or replaced record, and never changes `rerollGrants`.
- Rolling a group clears only that group's grant. Submit clears all grants.
- No API accepts a dice result (ADR 0030). The re-roll uses the existing roll endpoints, unchanged.
- Cyclomatic complexity stays at or below 10, with no new suppressions.

## Implementation plan
1. **Specs first** (Refinement Protocol):
   - **character-sheet spec.md:**
     - line 28: how groups map to purposes; a group is grantable only with a current record of any source; replaced records don't count toward locks; grants clear when the group is next rolled and on Submit;
     - lines 144-145: drop "follows in PBI-DICE-004" and pin `isReplaced` (always false for the Player) and `rerollGrants` (a sibling of `locks`, with its values and order);
     - line 118: v6 stores `replacedRollRecords` and `rerollGrants`.
   - **campaign-play spec.md:32:**
     - a missing, null, or empty list means no grant, and duplicates count once;
     - a 409 for status takes precedence over the grant 400.
   - **dice spec.md (Roll Record bullet or line 30):** add "A consumer may classify a record as replaced without changing it (ADR 0034)."
   - **ux.md 6.8 and 7.1:** record U1 to U4 and the Dice results ordering.
2. **`CharacterSheets/RollRecord.cs`:** add `RollGroup` and `RollPurposes.GroupOf`, with unit tests.
3. **`CharacterSheet.cs`:**
   - add `ReplacedRollRecords` and `RerollGrants`, and include them in `Equals` and `GetHashCode`;
   - add `HasCurrentRecordsIn(RollGroup)`;
   - add `WithRerollGranted(IReadOnlyCollection<RollGroup>)`, which moves the records and sets the grants;
   - make `WithAddedRollRecords` clear the grants of the groups it adds to;
   - set `CurrentSchemaVersion = 6`.
4. **`CreationLocks.cs`:**
   - optionally express the predicates through `GroupOf`;
   - existing tests stay green;
   - a new test checks that replaced records lift locks.
5. **`Investigator.cs`:**
   - `RequestChanges(comment, IReadOnlyCollection<RollGroup> grants, now)` guards every group, then calls `WithRerollGranted`;
   - `Submit` clears the grants;
   - `ReplaceCharacterSheet` carries the replaced records and grants over (line 82);
   - update the existing callers and test builders.
6. **`CharacterSheetJsonStorage.cs`:**
   - add the v6 document fields, the upgrade, and the doc comment;
   - storage tests cover a v5 document reading with both empty, and a v6 round trip.
7. **Application:**
   - add `InvestigatorCommandOutcome.InvalidRerollGrant`;
   - `KeeperInvestigatorService.RequestChangesAsync(..., grants)` follows the order in D4;
   - add `CharacterSheetView.IncludesReplacedRollRecords`;
   - `CharacterSheetViews.ViewAsync(..., includeReplaced)` also collects the replaced records' rollers.
8. **Controllers:**
   - `RequestChangesRequest` gains `[RerollGroupNames] IReadOnlyList<string>? RerollGrants`, with a new attribute beside `SupportedCreationMethodName`;
   - the controller parses the names and drops duplicates;
   - `Failure` maps `InvalidRerollGrant` to 400 with the title "A re-roll can only be granted for a group that has Roll Records.";
   - the wire format adds `IsReplaced` to `RollRecordResponse` and `RerollGrants` to `CharacterSheetViewResponse`.
9. **Integration tests** (`CocAssistant.Api.IntegrationTests`, CampaignPlay):
   - a grant returns 200, and the Keeper's view shows the replaced records;
   - an unknown group returns 400;
   - a group with no record returns 400;
   - a grant when not Submitted returns 409;
   - the Player's GET leaves out replaced records and lists `rerollGrants`;
   - the re-roll returns 200, and the locks apply again;
   - a second roll returns 409.
10. **Frontend types and API:**
    - `types/CharacterSheet.ts`: add `RollGroup`, `RollRecord.isReplaced`, and `rerollGrants`;
    - update the zod schema in `services/investigatorApi.ts:186-197`;
    - `requestChanges(..., comment, rerollGrants)` (:381-390);
    - `useRequestChanges` takes `{comment, rerollGrants}` (`useKeeperInvestigators.ts:43-48`);
    - add a shared `rollGroupOf(purpose)` helper in `campaign-play/services/`, which may replace the local helpers at `identity-step.tsx:18-24`.
11. **Frontend, Keeper side:**
    - `RequestChangesDialog` gains a `grantableGroups` prop and the fieldset with Checkboxes and help text (ux 7.1), and its send callback becomes `onSend(comment, rerollGrants)`;
    - `investigator-review.tsx` derives the grantable groups from the non-replaced `rollRecords`;
    - `DiceResults` gets the ordering helper, the "(replaced)" label, and stable keys.
12. **Frontend, Player side:**
    - `KeeperComment` gets the grant line (U3);
    - the characteristics, Luck, and EDU roll actions get the U1 label and the U2 body from `sheet.rerollGrants`;
    - `CreationRollAction` doesn't change; it already takes `label` and `body` (creation-roll-action.tsx:14-27).
13. **E2E** (below).

## Reuse
- **Using:**
  - the existing roll endpoints and services, unchanged, for the re-roll;
  - `CreationLocks.Of`, which lifts the locks automatically because it reads current records;
  - the `SupportedCreationMethodName` attribute pattern;
  - the `SubmitMineAsync` pre-check pattern;
  - the existing `Checkbox`, `Dialog`, and `Alert` components;
  - the `CreationRollAction` `label` and `body` props.
- **Not using:**
  - a new roll endpoint, because the spec says "with the same actions";
  - a migration, because the sheet is a JSON column (ADR 0007);
  - SignalR changes, because no new live update is specified.

## TDD units
- **`RollPurposes.GroupOf`:**
  - each purpose maps to its group;
  - an unknown purpose maps to none.
- **`CharacterSheet.WithRerollGranted`:**
  - moves exactly the group's records, current and PlayerEntered;
  - keeps their values;
  - leaves other groups alone;
  - sets the grants.
- **`CharacterSheet` values ignore replaced records:**
  - this covers `ResultFor`, `CharacteristicRolls`, `LuckRolls`, and `EduImprovementChecks`;
  - a purpose shared by a replaced and a current record does not throw.
- **`WithAddedRollRecords`** clears only the rolled group's grant.
- **`CreationLocks`:**
  - a Characteristics grant lifts the Creation Method lock;
  - a Luck grant lifts the age-bracket lock only when no current EDU records remain;
  - an EDU grant lifts the EDU lock;
  - re-rolling locks again.
- **The roll services after a grant:**
  - `RollMissing` and `RollNext` roll the replaced purposes;
  - after an EDU grant, a PlayerEntered EDU check that is missing its gain is re-rolled from check 1 (spec:21).
- **`Investigator.RequestChanges`** returns false:
  - when the Investigator is not Submitted;
  - with an invalid comment;
  - with a group that has no current record, including a group whose records are all replaced.

  On success it sets Changes Requested and the grants. An empty grant behaves as today.
- **`Investigator.Submit`** clears the grants.
- **`ReplaceCharacterSheet`** keeps the replaced records and the grants.
- **`CharacterSheetJsonStorage`:**
  - a v5 document upgrades to empty replaced records and grants;
  - a v6 round trip keeps both.
- **`KeeperInvestigatorService.RequestChangesAsync`:** the outcomes come in the order set out in D4.
- **The views:**
  - the Player's view leaves out replaced records;
  - the Keeper's view includes them, with roller names.
- **Frontend:**
  - zod parses `isReplaced` and `rerollGrants`.
  - `RequestChangesDialog`:
    - shows only the groups that are present (U4);
    - sends the selected groups;
    - focus and labelling follow A11Y-8.
  - The `DiceResults` ordering helper and the "(replaced)" rows (UX-40).
  - Roll actions read "Roll {group} again" with the extra body sentence while granted (UX-39, U1, U2).
  - The `KeeperComment` grant line (U3).

## E2E coverage
- **Traces to:** `specs/character-sheet/spec.md` Scenario "Keeper grants a characteristics re-roll" (lines 238-243), plus UX-39 and UX-40.
- **Test:** a new test in `e2e/tests/investigator-lifecycle.spec.ts`, traced in the file header comment.
- **Steps and checks:**
  1. A Standard Rolling Investigator rolls characteristics and is submitted.
  2. The Keeper opens Request changes, sees the "Characteristics" checkbox, checks it, and sends.
  3. The Player sees "Your Keeper lets you roll again: characteristics." and "Roll characteristics again".
  4. The Player confirms and sees eight values. The Player never sees "(replaced)".
  5. The Player resubmits.
  6. The Keeper's Dice results show eight "(replaced)" characteristic rows, each after its replacement.
  7. Each characteristic value matches its non-replaced row. The multiplier comes from `rules.standardRolling` in the API response, not a hard-coded value.
- **Dice are real in E2E:** `Program.cs:21` registers `SecureDiceRoller`. No assertion may depend on specific values, or on the old and new values differing.
- **Integration tests, not E2E,** cover the 400 and 409 cases and the Player-view filtering.

## ADR
- **ADR 0034:** "Replaced Roll Records are classified by their consumer; the kernel Roll Record never changes" (`docs/adr/0034-replaced-roll-records-are-classified-by-their-consumer.md`).

## Phases
- **Phase 1:**
  - what is committed: specs, ux.md, and the domain and storage changes (steps 1-6), with unit tests;
  - checkpoint: `feat(campaign-play): re-roll grants replace roll records (PBI-DICE-004)`.
- **Phase 2:**
  - what is committed: application, controllers, and integration tests (steps 7-9);
  - checkpoint: `feat(campaign-play): request-changes grants re-rolls (PBI-DICE-004)`.
- **Phase 3:**
  - what is committed: the frontend changes (steps 10-12), with unit tests;
  - checkpoint: `feat(frontend): re-roll grant and replaced results (PBI-DICE-004)`.
- **Phase 4:**
  - what is committed: the E2E test (step 13);
  - checkpoint: `test(e2e): keeper grants a characteristics re-roll (PBI-DICE-004)`.

## Human decisions
- 2026-11-13: approved as presented, with no changes (the human's reply: "approve"), relayed by the Orchestrator.
  - D1 B, D2 A, D3 A, and D4 A are approved.
  - UX interpretations U1 to U4 are approved.
  - ADR 0034 is approved.

## Revisions

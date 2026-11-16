# Design: PBI-DICE-009: A Player asks to push a failed roll, the Keeper approves or declines, and the pushed roll is recorded

## Triggers
- **2. A shared aggregate and data model change:** `RequestedRoll` gains two statuses, push fields, and a migration. The Scene Play port records `RequestedRollRecord` and `StoredRollRecord` change.
- **3. New cross-layer pattern:**
  - four new endpoints;
  - a new Player read;
  - a pushability rule in GameRules, like `ExperienceCheck`.
- **5. More than one bounded context:** GameRules, Scenario Preparation (aggregate and Scene exit), and Scene Play (use cases, API, signals).
- **6. Open questions with competing answers:**
  - the dice for the pushed roll;
  - whether a declined push uses up the push;
  - which rolls count where.
- **7. UX:** new push states on the panel, the Keeper list, and the card. Option A with K1 was selected by the human on 2026-11-15.

## Constraints
- Rules (cited, not restated):
  - [skill rolls section 6](../../game-rules/coc7_skill_rolls_rules.md#6-pushing-a-roll): which rolls can be pushed, and the dice and Difficulty of the pushed roll.
  - [section 7](../../game-rules/coc7_skill_rolls_rules.md#7-luck-rolls): Luck is never pushed.
  - [section 5](../../game-rules/coc7_skill_rolls_rules.md#5-bonus-and-penalty-dice): the dice limits.
  - [character rules 16.1](../../game-rules/coc7_character_creation_and_development_rules.md#161-skill-experience-tick-during-play) with [project_ruleset 4.9](../../game-rules/project_ruleset.md#49-experience-checks-when-bonus-dice-are-cancelled): the experience check on the pushed roll.
  - [project_ruleset 4.8](../../game-rules/project_ruleset.md#48-luck-rolls).
  - [project_ruleset 4.10](../../game-rules/project_ruleset.md#410-a-declined-push): a declined push uses up the push. Written in this design commit (Human decisions, H1).
- **ADR 0032:**
  - The `RollRequest` aggregate sits beside the Scene.
  - Its `Version` token decides races.
  - Its Consequences say that pushing (DICE-009) changes only this aggregate.
  - Closing a Scene's rolls shares one `SaveChanges` with finishing the Scene.
- **ADR 0024:** Scene Play reaches the aggregate through a provider service and consumer-owned ports. Scene Play checks authorization, and signals are sent after the commit, best-effort.
- **ADR 0030:** dice are rolled only on the server.
- **ADR 0033/0035:** the card is composed by the client from the read by id, or from the Scene History read.
- **ADR 0009:** closed topics. `rollRequests` and `myRequestedRolls` already exist, and the publication policy is unchanged.
- **ADR 0034:** checked; it does not apply. A pushed roll adds a Roll Record and replaces nothing.
- **CONTEXT.md terms:** "Pushed roll", "Push justification" (added in this design commit, H2), Roll Request, Requested Roll, Roll Record, Keeper, Player, Investigator.
- **spec.md (specs/roll-requests):** status lifecycle, the `:Push` purpose, visibility of the justification, Lifecycle with the Scene, the push API, and "the Scene check comes before the status check".
- **Existing patterns to copy (PBI-DICE-007):**
  - a domain transition (`RequestedRoll.Cancel`, `RequestedRoll.cs:95-110`);
  - the provider method (`SceneRollRequestService.CancelAsync`, `SceneRollRequestService.cs:161-188`);
  - the port (`IRollRequests`, `ScenePlayRollRequestPorts.cs:191-229`);
  - the Scene Play use case (`RollRequestService.CancelAsync`, `RollRequestService.cs:191-221`);
  - the controller with 409-title dispatch (`RollRequestsController.cs:101-113,179-189`).
- Cyclomatic complexity of 10 or less. No new suppressions.
- **Explorer report correction:** the report said "no migration". Pushing does need one: `RequestedRolls` has no column for the justification or the pushed roll's dice (`ScenarioPreparationDbContext.cs:400-427`). The `PushAsked` and `Pushed` statuses do fit the existing string(20) Status column.

## UX
- Selected option: **Option A (the Player's panel lists the rolls they can push) with K1 (the Keeper sets the pushed roll's dice)**. No prototype.
- [specs/roll-requests/ux.md](../../../specs/roll-requests/ux.md): updated. It has the Human decisions of 2026-11-15, section 19, and amendments to sections 4, 5.1, 6, 7, 8, 9, 11, 13, 16, and 18, plus RR-UX-24.
- [specs/scene-play/ux.md](../../../specs/scene-play/ux.md): updated. Section 23.11 and SPL-UX-75 are narrowed to Cancelled rows without a Roll Record; section 24 and SPL-UX-70 to SPL-UX-72 gain the declined-push clause.
- UX acceptance criteria: RR-UX-25 to RR-UX-33 and RR-A11Y-18 to RR-A11Y-21.

## Decisions

### D1: Where the pushability rule lives
| Metric | A: GameRules static `Pushing.CanPush(isSuccess, hasBeenPushed, isSkillOrCharacteristicRoll)`, called by the aggregate | B: private logic inside `RollRequest` / `RequestedRoll` |
| --- | --- | --- |
| Consistency | + mirrors `ExperienceCheck.EarnsExperienceCheck` (`GameRules.Domain/Development/ExperienceCheck.cs:8-12`), called from `RequestedRoll.Roll` (`RequestedRoll.cs:84`) | - rule logic in Scenario Preparation, which "carries state it doesn't interpret" (ADR 0032 Consequences) |
| Modifiability | + Sanity and combat rolls (skill rolls section 8) extend one function | - a second consumer would copy it |
| Testability | + pure function, one test per clause of section 6 | 0 tested through the aggregate only |
| Simplicity | 0 one small file | + no new file |
| Reversibility | + trivial | + trivial |
| Security and correctness | + one source of truth for the read flag and the write check | 0 same, if kept private and shared |

- **Chosen:** A. Consistency and testability decided it. The cost is one more GameRules file.
- **Rejected:** B. It keeps a game rule outside GameRules, against the established `ExperienceCheck` split. The Developer must not reintroduce it.

### D2: How the push is stored on the Requested Roll
| Metric | A: three nullable scalar properties `PushJustification` (nvarchar 2000), `PushBonusDice`, `PushPenaltyDice` on `RequestedRoll`, plus an EF migration | B: a JSON push document column, like the Roll Records | C: approval overwrites `RequestedRoll.BonusDice` / `PenaltyDice`, and only the justification is stored |
| --- | --- | --- | --- |
| Consistency | + plain columns like the existing `BonusDice` and `PenaltyDice` (`ScenarioPreparationDbContext.cs:408-409`) | 0 copies `RollRequestJsonStorage` (schema version 1) for three fields | - mutates a value the card shows as the request's dice |
| Modifiability | 0 more push fields would mean more columns | + fields can be added without columns | - the original dice exist only inside the first record's percentile |
| Testability | + direct | 0 needs a storage round-trip test, as `RollRequestJsonStorageTests` does | - |
| Simplicity | + one migration, no schema versioning | - versioned document for three scalars | + one column |
| Reversibility | + drop the columns | 0 | - the original dice are lost from the row |
| Security and correctness | + the original dice stay unchanged, which keeps line 2 of the card and the experience-check inputs of the first record honest | + | - line 2 changes after approval, and `StoredRollRecord` doesn't expose the percentile's dice (`ScenePlayRollRequestPorts.cs:100-116`) |

- **Chosen:** A. Simplicity and correctness decided it. The cost is a migration.
- **Rejected:** B, because schema versioning for three scalars is speculative. C, because it mutates request data the card already shows and hides the original dice. The Developer must not reintroduce either.

### D3: Player read for "Rolls you can push"
| Metric | A: widen `GET .../investigators/mine/requested-rolls` to also return rolls that can be pushed and Push asked rolls | B: a new `GET .../investigators/mine/pushable-rolls` (pushable Rolled plus PushAsked, Public only); the existing read keeps Waiting plus Pushed |
| --- | --- | --- |
| Consistency | - the read named "waiting" would return rolls that aren't waiting, against the spec | + the existing read's spec line stays true; the new read follows `RollRequestService.ListMineAsync` (`RollRequestService.cs:131-149`) |
| Modifiability | - three consumers filter by status: the badge (`campaign-layout.tsx:105` uses `rolls.length`), the announcement diff (`requestedRollAnnouncements.ts:13-23` keys on id only), and the panel | + badge and announcement code stay unchanged; a Pushed roll entering the waiting read is "new" and announced naturally |
| Testability | 0 | + each read tested on its own |
| Simplicity | + one endpoint | 0 one more endpoint, query key, and hook |
| Reversibility | 0 | 0 |
| Security and correctness | - missing one filter would inflate the badge or announce a failed roll as "requested" | + no filter to miss |

- **Chosen:** B. Modifiability and correctness decided it. The cost is a second endpoint and a second query. The `myRequestedRolls` signal invalidates both.
- **Rejected:** A. Every waiting-list consumer would need a status filter, and one missed filter misreports. The Developer must not reintroduce it.

### D4: What Scene exit reports for declined pushes
| Metric | A: rename `CancelledRequestedRoll` to `ClosedRequestedRoll`, covering cancelled and declined | B: keep `CancelledRequestedRoll`, which then also carries declined rolls | C: a separate `DeclinedRolls` list next to `CancelledRolls` |
| --- | --- | --- | --- |
| Consistency | + accurate vocabulary (a decline is not a cancel) | - the name lies | 0 |
| Modifiability | + one list; its only consumer is signalling (`ActiveSceneService.cs:168-189`) | 0 | - parallel plumbing through three result records (`SceneLifecycleResults.cs:37,51,68`, `ScenePlayPorts.cs:50-90`) and the adapter (`ScenarioPreparationPlayableScenes.cs:28-51`) with no reader |
| Testability | 0 mechanical test renames | + no churn | - |
| Simplicity | 0 rename only | + | - |
| Reversibility | + | + | 0 |
| Security and correctness | + | 0 | + |

- **Chosen:** A. Consistency decided it. The cost is a mechanical rename across about 15 references, tests included. The property becomes `ClosedRolls`.
- **Rejected:** B, because the name would be misleading. C, because it is plumbing nobody reads: the counts come from the client cache (scene-play ux section 24, "The count {n}"). The Developer must not reintroduce either.

### Single-option decisions
- **Dice for the pushed roll:** `POST .../push/approve` takes a required body `{bonusDice, penaltyDice}`, each an integer 0..2, otherwise 400. This is K1 (human) and skill rolls sections 6 and 5. The Difficulty and the target value are unchanged (section 6).
- **A declined push uses up the push:** `HasBeenPushed` is true once a justification is stored, and the justification is never cleared ([project_ruleset 4.10](../../game-rules/project_ruleset.md#410-a-declined-push)).
- **Check order for asking:**
  1. Player role, request visible (Public), and caller owns the Investigator. Otherwise 404; the Keeper also gets 404.
  2. Scene Active, otherwise 409.
  3. Justification trimmed to 1..2000, otherwise 400.
  4. Status and pushability, otherwise 409.
  This follows the spec ("the Scene check runs before the roll's status check") and the create precedent (shape before state).
- **Check order for approve and decline:**
  1. Keeper, otherwise 404.
  2. Request exists, otherwise 404.
  3. Scene Active, otherwise 409.
  4. Approve only: dice range, otherwise 400.
  5. Status `PushAsked`, otherwise 409. A Cancelled roll gets 409 with `CancelledTitle`; anything else gets 409 with `ConflictTitle`, as in `RollRequestsController.cs:167-189`.
- **Pushed-roll marker:**
  - The second record's purpose is `RollRequest:{id}:{investigator}:Push` (spec.md, Roll Record).
  - The adapter derives `IsPushed` on `StoredRollRecord` from the purpose suffix, using one domain constant, `RequestedRoll.PushPurposeSuffix`.
  - The view exposes `isPushed` on each completed roll and `push {justification, bonusDice, penaltyDice} | null` on the Requested Roll.
- **`canBePushed`:**
  - Computed by the aggregate with D1.
  - Carried on `RequestedRollRecord` and the view. It does not depend on who reads it.
  - The read in D3 filters on it.
- **Push use cases go in the existing `RollRequestService` and `SceneRollRequestService`.** Cancel set this precedent (`RollRequestService.cs:191-221`), and keeping them there reuses `TrySignalAsync` and the projection without duplication.
- **Signals:** ask, approve, decline, and rolling a Pushed roll publish as roll and cancel do: `rollRequests` to the request's audience and `myRequestedRolls` to the owner's account. The publication policy is unchanged.
- **Client push state:** one pure helper derives the row state from status, Roll Record count, and push: Waiting, Rolled, PushAsked, Pushed, PushedRolled, PushDeclined, Cancelled, CancelledAfterPush. The card and the Scene History filter use it.

## Patterns
- **Used: Strategy (a lookup from row state to row renderer)** in `roll-request-card` (the row) and `waiting-rolls` (the Keeper row: Waiting row vs `push-ruling-row` vs Pushed row). The force is a conditional that switches on Requested Roll status and grows from 3 to 8 states. A switch would break complexity 10 in `RequestedRollRow`, which today reads `rolls[0]` only.
- **Rejected: State (GoF) for `RequestedRoll`.** There are six guarded transitions (Roll, Cancel, AskToPush, ApprovePush, DeclinePush, CloseForSceneExit), each a short status guard within complexity 10. The status is an EF-stored enum (`ScenarioPreparationDbContext.cs:410`), and state objects would fight EF materialization and the `Version` token. Keep the guard style of `Roll` and `Cancel`.
- **Rejected: Command for the push actions.** There is no queueing, logging, or undo force. The spec forbids undo, because a Roll Record never changes.
- **Rejected: Chain of Responsibility for the check order.** The order is fixed and short. Sequential guard clauses, as in `RollRequestService.RollAsync`, are enough.
- **Rejected: Observer.** The existing SignalR topics already cover it (ADR 0009). No domain events are added.
- **Rejected: Template Method to share the roll and cancel provider skeleton.** Each method is already within the limit, and the shared skeleton is three lines.

## Invariants
- A Roll Record never changes. A push only appends a second record. A Requested Roll has at most two Roll Records.
- Once stored, `PushJustification` never changes and is never cleared. A Requested Roll is asked to push at most once, and a declined push cannot be asked again (project_ruleset 4.10).
- The pushed roll uses the same `TargetValue` and `Difficulty`, and only the approved dice. Its `earnsExperienceCheck` uses `ExperienceCheck` with the approved dice.
- The original `BonusDice` and `PenaltyDice` of a Requested Roll never change.
- Only failed rolls (`!IsSuccess`, so Fumbles and below-Difficulty levels count), not yet pushed, of Skill or Characteristic targets, of Public Roll Requests, in status Rolled, can be asked to push.
- Authorization happens in Scene Play before the provider is called:
  - only the Investigator's Player asks;
  - only the Keeper approves or declines;
  - a Player never receives a KeeperOnly request or signal.
- The Scene-active check runs before the status check on every state change.
- Scene exit (finish, start with finish, removing an Investigator present) does this in the same save as the Scene change:
  - Waiting and Pushed rolls move to Cancelled;
  - PushAsked rolls move to Rolled (declined).
- Every transition bumps `Version`, so a lost race changes nothing (ADR 0032).
- The publication policy is unchanged. No new hub topic.
- Cyclomatic complexity is 10 or less. No new entries in `eslint.config.js` or `GlobalSuppressions.cs`.
- Breaking any of these means escalating to the Architect.

## Implementation plan
1. **GameRules:**
   - `GameRules.Domain/Dice/Pushing.cs`: `CanPush(bool isSuccess, bool hasBeenPushed, bool isSkillOrCharacteristicRoll)`, citing skill rolls section 6 and project_ruleset 4.10.
   - Tests in `GameRules.Tests`.
   - Why: D1.
2. **Scenario Preparation Domain:**
   - `RequestedRollStatus`: add `PushAsked` and `Pushed`.
   - `RequestedRoll`:
     - add `PushJustification`, `PushBonusDice`, `PushPenaltyDice`, `HasBeenPushed`, `PushPurposeSuffix`, and `JustificationMaxLength = 2000`;
     - add `AskToPush(string justification, bool isPushable)`, `ApprovePush(int bonusDice, int penaltyDice)`, and `DeclinePush()`;
     - `Roll` accepts `Pushed`: it uses the push dice and the `:Push` purpose, and both paths go through one private method to stay within complexity 10;
     - `CloseForSceneExit` handles Waiting and Pushed (to Cancelled) and PushAsked (to Rolled).
   - `RequestedRollOutcome`: add outcomes for asked, approved, declined, not pushable, not push asked, justification required, justification too long, and invalid dice.
   - `RollRequest`: add `AskToPushInvestigatorRoll`, `ApprovePushInvestigatorRoll`, `DeclinePushInvestigatorRoll`, and `CanBePushed(roll)`. Pushability combines `Visibility == Public`, `Target.Kind` Skill or Characteristic, and D1. `CloseRollsForSceneExit` reports closed rolls, not only cancelled ones.
   - Why: the aggregate owns its transitions (ADR 0032).
3. **Scenario Preparation Infrastructure:**
   - Map the three columns in `ScenarioPreparationDbContext`.
   - Add the EF migration `AddRequestedRollPush` (nullable columns).
   - Persistence round-trip test.
   - Why: D2.
4. **Scenario Preparation Application:**
   - `SceneRollRequestService`: add `AskToPushAsync`, `ApprovePushAsync`, `DeclinePushAsync`, and `ListPushableForInvestigatorAsync`.
   - `ListWaitingForInvestigatorAsync` filters on Waiting or Pushed.
   - Views gain the push fields and `CanBePushed`.
   - The write outcomes are extended.
   - `SceneLifecycleService`: `CancelledRequestedRoll` becomes `ClosedRequestedRoll` and `CancelledRolls` becomes `ClosedRolls`.
   - Why: provider pattern; D3, D4.
5. **Scene Play Application:**
   - Ports: the status enum mirror gains PushAsked and Pushed (keep the mapping test). `RequestedRollRecord` gains the push fields and `CanBePushed`. `StoredRollRecord` gains `IsPushed`. `IRollRequests` gets the four methods.
   - `RollRequestService`: add `AskToPushAsync`, `ApprovePushAsync`, `DeclinePushAsync`, and `ListMinePushableAsync`, with the check orders above. Signals as in roll and cancel.
   - Projection and views carry the push fields.
   - `ClosedRequestedRoll` rename in `ScenePlayPorts` and `ActiveSceneService`.
6. **Scene Play Infrastructure:** `ScenePlayRollRequestAdapters` maps the new methods and fields, deriving `IsPushed` from `PushPurposeSuffix`. Also the `ScenarioPreparationPlayableScenes` rename.
7. **Scene Play Controllers:**
   - Add `POST .../push` (body `{justification}`), `POST .../push/approve` (body `{bonusDice, penaltyDice}`), `POST .../push/decline`, and `GET investigators/mine/pushable-rolls`.
   - Contracts and mapping gain `push`, `canBePushed`, and `isPushed`.
   - New `RollRequestProblems` keys and messages for justification and dice.
   - Integration tests in `RollRequestApiTests.cs`.
8. **Frontend roll-requests services and types:**
   - Statuses, push fields, and zod schemas.
   - API functions with 409-title dispatch.
   - Query keys and hooks (`useMyPushableRolls`, `useAskToPush`, `useApprovePush`, `useDeclinePush`).
   - `myRequestedRolls` invalidates both Player queries.
   - `requestedRollPushState` presentation helper.
   - `waitingRollCount`: `countKeeperOpenRolls`, a closing count `{cancelled, declined}`, and the new sentences.
   - Announcement copy for Pushed rolls.
9. **Frontend components:**
   - The `roll-request-card` row uses the Strategy lookup.
   - New `push-ruling-row`; `waiting-rolls` lists Waiting, PushAsked, and Pushed rows.
   - New `rolls-you-can-push` hosted by `waiting-rolls-panel`, plus the Pushed-row label.
   - `campaign-layout` Keeper count.
   - scene-play finish dialog, start page, and present report sentences.
   - `sceneHistoryItems.withoutCancelledRolls` keeps Cancelled rows with a Roll Record (H3).
   - Stories for every new state.
10. **E2E:** see E2E coverage.

## Reuse
- **Using:**
  - `RequestedRoll.Cancel` / `CancelAsync` (all layers) as the template for each transition;
  - `ExperienceCheck` for the pushed roll's check;
  - `PercentileRolling.Roll` for the pushed roll;
  - `RollRequest.InDiceRange` and `MaxDice` for the approve dice;
  - the message trim and length pattern (`RollRequest.cs:253-256`) for the justification;
  - `TrySignalAsync` and `RollerNames` in `RollRequestService`;
  - `describeDice`, `describeOutcome`, and `rollTargetName` in `rollRequestPresentation`;
  - the "Change for" inline group pattern and the message counter pattern from `roll-request-form`;
  - the focus-after-removal logic in `waiting-rolls-panel.tsx:59-77`.
- **Not using:**
  - ADR 0034 replaced-records collections: nothing is replaced.
  - `RollRequestJsonStorage` for the push: D2.
  - A new hub topic: ADR 0009 topics suffice.

## TDD units
- **`Pushing.CanPush`:**
  - false for a success;
  - true for Failure, Fumble, and a level below the Difficulty (`isSuccess` false);
  - false once pushed;
  - false for a roll that is not a skill or characteristic roll.
- **`RequestedRoll.AskToPush`:**
  - Rolled and failed: moves to PushAsked, stores the trimmed text, bumps Version;
  - empty after trim: justification required;
  - more than 2000: too long;
  - Waiting, Cancelled, PushAsked, or Pushed: refused;
  - a success: refused;
  - already pushed or declined: refused;
  - Luck, or KeeperOnly through `RollRequest`: refused.
- **`ApprovePush`:**
  - PushAsked: moves to Pushed and stores the dice;
  - dice outside 0..2: invalid dice;
  - any other status: refused;
  - the original dice are unchanged.
- **`DeclinePush`:** PushAsked moves to Rolled with one record and keeps the justification; it is not pushable afterwards. Any other status is refused.
- **`Roll` on Pushed:**
  - adds a second record with the `:Push` purpose, the same target and Difficulty, and the approved dice;
  - experience check per 16.1 and 4.9 with the approved dice;
  - moves to Rolled;
  - a third roll is refused.
- **`CloseForSceneExit`:**
  - Waiting moves to Cancelled;
  - Pushed moves to Cancelled and keeps the first record;
  - PushAsked moves to Rolled (declined);
  - Rolled and Cancelled are unchanged;
  - each change reports a closed roll.
- **`SceneLifecycleService`:** finish, start with finish, and present-replace close Pushed and PushAsked rolls in the same save, and return `ClosedRolls`.
- **`SceneRollRequestService`:**
  - each push method: Scene-not-active before status, lost race reported;
  - the waiting read returns Waiting and Pushed;
  - the pushable read returns pushable Rolled and PushAsked only.
- **`RollRequestService` (Scene Play):**
  - asking: Keeper 404, other Player 404, KeeperOnly 404, owner allowed;
  - approve and decline: Player 404;
  - signals published after commit, to the owner's account;
  - check order as specified.
- **Port enum mapping test:** includes PushAsked and Pushed.
- **API integration tests:**
  - 400 for a missing, whitespace-only, or 2001-character justification;
  - 409 for a success, Luck, a second ask, and after a decline;
  - 404 for a hidden roll;
  - 400 for approve dice outside the range;
  - 409 for approve or decline on a non-PushAsked roll;
  - 409 when the Scene is not Active;
  - happy path producing two records, the second with `isPushed`.
- **Frontend:**
  - `requestedRollPushState`: each of the 8 states;
  - count helpers: Keeper open count, closing `{cancelled, declined}`, sentences for every combination including unknown;
  - announcement copy for a Pushed roll;
  - `withoutCancelledRolls` keeps a Cancelled row with a record (RR-UX-33);
  - zod parsing of the push fields;
  - `rolls-you-can-push`: RR-UX-25, RR-UX-26, RR-UX-28 (Player side), RR-A11Y-18, RR-A11Y-19;
  - `push-ruling-row`: RR-UX-27, RR-UX-28, RR-A11Y-18, RR-A11Y-19;
  - card: RR-UX-29 (rendering), RR-UX-30, RR-A11Y-20;
  - `waiting-rolls` and `campaign-layout` counts: RR-UX-31;
  - panel: the Pushed row label and the " You can ask to push it." suffix;
  - announcement region use: RR-A11Y-21;
  - Scene History: RR-UX-33.

## E2E coverage
In `e2e/tests/roll-requests.spec.ts`: the header drops the push exception and adds RR-UX-25 to RR-UX-33 and RR-A11Y-18 to RR-A11Y-21. New fixtures in `e2e/fixtures/roll-requests.ts`: `askToPushViaUi`, `approvePushViaUi`, and `declinePushViaUi`.
- **spec.md Scenario "A Player asks to push a failed roll and the Keeper approves" -> test "A Player pushes a failed roll and the Keeper approves it with a Bonus Die":**
  - To make the failure dependable, it requests Cthulhu Mythos (target 0, project_ruleset 4.7) with 2 Penalty Dice. The fixture repeats the request at most 3 times if the first roll is not a failure. This deviates from the scenario's "Library Use", and the deviation is documented in the test.
  - It asserts RR-UX-25, RR-UX-26, RR-UX-27, RR-UX-29, and the Keeper and Player badge counts (RR-UX-31).
  - It checks RR-UX-12 still holds: the Player's badge shows the Pushed roll.
- **spec.md Scenario "The Keeper declines a push" -> test "The Keeper declines a push and it can't be asked again":** RR-UX-28, the card "Push declined" (RR-UX-30).
- **spec.md Scenario "Finishing the Scene closes pushes" -> test:** one PushAsked and one Pushed roll. The finish dialog shows both sentences (RR-UX-31, amended SPL-UX-70). Afterwards the cards show "Push declined" and "Cancelled" with the first result (RR-UX-32), and the Scene History shows both rows (RR-UX-33).
- **spec.md Scenarios "A declined push can't be asked again" and "Luck and hidden rolls can't be pushed":** covered by the API integration tests. The UI never offers these pushes (RR-UX-25), so there is no UI path to a 409 or 404.
- **Checked against existing criteria the change touches:**
  - RR-UX-12 (badge): amended by RR-UX-31; Player Waiting-only behavior is unchanged when there are no pushes.
  - RR-UX-13 (announcement): new Waiting rolls are unchanged; Pushed rolls get the new copy.
  - RR-UX-22, RR-UX-23, RR-UX-24: RR-UX-24 is amended by RR-UX-33.
  - SPL-UX-70 to SPL-UX-72 and SPL-UX-75: amended.
  - The existing E2E for finish and removal with only Waiting rolls must still pass unchanged, because the declined clause is absent at d = 0.

## ADR
- None. ADR 0032's Consequences already say that pushing (DICE-009) changes only this aggregate. The new GameRules rule copies the existing `ExperienceCheck` pattern. The schema change is additive nullable columns, which are easy to reverse.

## Phases
- **Phase 1:** GameRules plus the Scenario Preparation Domain, Infrastructure (migration), and Application, with unit and persistence tests. Checkpoint: `feat(dice-009): push transitions on the Requested Roll (PBI-DICE-009)`.
- **Phase 2:** Scene Play ports, adapters, service, controller, and the `ClosedRequestedRoll` rename, with API integration tests. Checkpoint: `feat(dice-009): push API (PBI-DICE-009)`.
- **Phase 3:** frontend types, services, hooks, components, stories, and unit tests. Checkpoint: `feat(dice-009): push states on the panel, Waiting rolls, and the card (PBI-DICE-009)`.
- **Phase 4:** E2E. Checkpoint: `test(e2e): push a roll (PBI-DICE-009)`.

## Human decisions
- 2026-11-15, Orchestrator override: the backlog tool lists the blocker PBI-DICE-005 as in progress only because of leftover unmerged branches. Its frontmatter is `done`, and the human confirmed proceeding.
- 2026-11-15, UX gate (verbatim): "Option A with K1, no prototype, accept the recommendations". That means:
  - Option A, with "Rolls you can push" in the Player's panel;
  - K1: the Keeper sets the pushed roll's Bonus and Penalty Dice when approving, so push/approve takes `{bonusDice, penaltyDice}`;
  - a declined push uses up the push;
  - the counts as in ux.md section 19.6;
  - a declined push keeps the justification plus "Push declined" on the card;
  - Push asked and Pushed rows show only while the Scene is Active.
- 2026-11-15, plan gate (verbatim): "H1:a H2:yes H3 confirm, plan approved". That means:
  - **H1 (a):** the Architect writes project_ruleset.md section 4.10 ("A declined push") and a "A refused push" line in skill rolls section 9, in the design commit.
  - **H2 (yes):** "Push justification" is added to CONTEXT.md in the design commit.
  - **H3 (confirmed):** a Pushed roll cancelled at Scene exit keeps its first result on the card. The Scene History shows Cancelled rows that have a Roll Record. RR-UX-24 and SPL-UX-75 are narrowed (RR-UX-33).
  - The plan is approved as written.

## Revisions

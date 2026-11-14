# Design: PBI-DICE-007: The Keeper cancels a Waiting Requested Roll, and finishing the Scene or removing an Investigator present cancels the affected Waiting rolls in the same transaction

## Triggers
- **2, shared interface or data model:** `RequestedRollStatus` gains `Cancelled` in four mirrored places. The `SceneLifecycleService` results and their `IPlayableScenes` mirrors gain the cancelled rolls. `IRollRequests` gains `CancelAsync`.
- **3, cross-layer pattern:** the Scene lifecycle now writes a second aggregate in its save and publishes the roll-request topics.
- **5, more than one bounded context:** Scene Play (use cases, API), Scenario Preparation (aggregate, provider), and Campaign Play (publication policy, reused).
- **6, Explorer open questions with competing answers:** shaping for PBI-DICE-009, 409 mapping, the count source, the transaction, and live signals.
- **7, UX:** a new Cancel control, the Cancelled card state, the finish-dialog count, and the present-save report ([ux.md](../../../specs/roll-requests/ux.md) section 17).

## Constraints
- **ADR 0032** (`docs/adr/0032-roll-requests-are-an-aggregate-beside-the-scene-in-scenario-preparation.md:12,27`):
  - Each Requested Roll has a `Version` concurrency token.
  - "Finishing a Scene and cancelling its rolls can share one `SaveChanges`."
- **ADR 0024:**
  - Scene Play reaches Scenario Preparation only through consumer-owned ports.
  - The provider performs no authorization.
  - The Wall Entry and signals are best-effort after the commit.
- **ADR 0025:**
  - A lost race is reported, never retried.
  - `SaveFinishThenStartAsync` is the one explicit transaction (`EfSceneRepository.cs:99-118`).
- **ADR 0009:** the topic set is closed, and signals are invalidation-only.
- **roll-requests spec** (`specs/roll-requests/spec.md`):
  - `:13`: the status model.
  - `:21`: Lifecycle with the Scene.
  - `:29`: the cancel contract.
  - `:32`: 409 when the Scene is not Active.
  - `:35`: `myRequestedRolls` goes to each Player who loses a Waiting roll.
  - `:114-128`: the Scenarios.
- **scene-play spec:** `specs/scene-play/spec.md:57`.
- **roll-requests ux.md:**
  - Section 5.1: the Cancelled row is "Cancelled" (muted) with no extra line.
  - Section 5.1: Keeper actions belong in the section 4 list.
  - Section 16: each PBI confirms its copy.
- **No game rule involved.** Cancellation is app lifecycle, not a CoC 7e rule.
- **CONTEXT.md:150-159:** "Roll Request", "Requested Roll", "Hidden roll". Statuses are specified in spec `:13`, not glossed, so no CONTEXT.md change is made.
- **Existing patterns:**
  - The provider check order (`SceneRollRequestService.cs:127-147`).
  - Post-commit `TrySignalAsync` (`RollRequestService.cs:318-332`, `ActiveSceneService.cs:146-156`).
  - `ForRollRequestChanged`, which fails closed for anything not Public (`CampaignLivePublicationPolicy.cs:56-66`).
  - The Keeper's roll-request query, mounted on every Campaign page (`campaign-layout.tsx:94`).
- **Complexity:** cyclomatic complexity at most 10 (CLAUDE.md), with no new suppressions.

## UX
- **Selected option:** Option A, an immediate Cancel in the "Waiting rolls" row. No prototype was requested.
- **Specs updated:**
  - `specs/roll-requests/ux.md` section 17, plus the amendments listed there.
  - `specs/scene-play/ux.md` section 24.
  - Both files are already linked from their `spec.md`.
- **Rejected at the UX gate:**
  - **Option B (a confirmation dialog):** an extra dialog for an action that a re-request undoes. It would be heavier than the irreversible "Roll for", which has no confirmation.
  - **Option C (an inline two-step confirm in the row):** a new in-row state pattern with no precedent, and harder focus handling.

## Decisions

### D1: How the lifecycle cancellation shares one transaction with the Scene write
| Metric | A: tracked aggregate, one save | B: set-based `ExecuteUpdate` in an explicit transaction | C: Scene Play orchestrates two provider calls |
| --- | --- | --- | --- |
| Consistency | + exactly ADR 0032:27. Scene and RollRequest share the scoped `ScenarioPreparationDbContext` (`ScenarioPreparationInfrastructureServiceCollectionExtensions.cs:7,18,32`) | - no `ExecuteUpdate` anywhere in `backend/src`; a second explicit-transaction pattern | - breaks the PBI's "same transaction" |
| Modifiability | + DICE-009 adds transitions in the domain only | - status rules duplicated in SQL; DICE-009 edits SQL | 0 |
| Testability | + domain and provider unit tests with fakes | - the rule needs a database to test | + |
| Simplicity | + one tracked list method and a domain call | - transaction nesting inside `SaveFinishThenStartAsync` | + |
| Reversibility | + | 0 | + |
| Security and correctness | 0 atomic. A concurrent roll that commits between the read and the save fails the whole save on `Version`, reported as Conflict (R1) | + never conflicts with rolls. - bypasses the aggregate's invariants and `Version` unless re-coded in SQL | - a crash between the saves leaves Waiting rolls on a Finished Scene |

- **Chosen:** A, because of consistency (ADR 0032), the correctness of the domain rule, and simplicity.
  - `SceneLifecycleService` gets `ISceneRollRequestRepository`.
  - It loads the Scene's requests tracked and changes them through the aggregate.
  - The existing `_scenes.SaveChangesAsync` or `SaveFinishThenStartAsync` writes both in one EF save.
  - `SceneSaveChanges.ExecuteAsync` already maps any `DbUpdateConcurrencyException` to `SceneConcurrencyException`, which the service reports as Conflict (`SceneLifecycleService.cs:161`).
  - **Giving up:** a finish can lose a millisecond race to a Player's roll and return 409 (R1).
- **Rejected:**
  - **B:** a new pattern that moves a domain rule into SQL. The Developer must not reintroduce it.
  - **C:** not atomic, which contradicts the PBI and spec `:21`. The Developer must not reintroduce it.

### D2: Shaping for PBI-DICE-009
| Metric | A: one scene-exit operation that today cancels only Waiting | B: Waiting-only names and an SQL `Status = Waiting` filter |
| --- | --- | --- |
| Consistency | + the spec defines one lifecycle effect for every open status (`spec.md:21`) | 0 |
| Modifiability | + DICE-009 adds branches inside one domain method; no repository or caller change | - DICE-009 renames methods and changes the query filter and callers |
| Testability | + | + |
| Simplicity | + the same code size now; the repository loads the Scene's requests with no status filter | + |
| Reversibility | + | + |
| Security and correctness | + one place decides what a Scene exit does to a roll | 0 |

- **Chosen:** A, because of modifiability at no extra cost now.
  - `RequestedRoll.CloseForSceneExit()` moves Waiting to Cancelled and returns whether it changed.
  - `RollRequest.CloseRollsForSceneExit(Func<Guid, bool> isAffected)` returns the closed Investigator ids.
  - `ISceneRollRequestRepository.ListTrackedForSceneAsync(campaignId, sceneId)` is tracked and has no status filter. It is named like `ISceneRepository.ListTrackedForScenarioAsync` (`ISceneRepository.cs:17`).
  - **Giving up:** a slightly abstract method name.
- **Rejected:** B. The Developer must not add `PushAsked` or `Pushed` code, a status-set type, or an SQL status filter in this PBI.

### D3: 409 mapping for a roll that is not Waiting
| Metric | A: one conflict title for every not-Waiting refusal | B: a distinct 409 title when the roll is Cancelled |
| --- | --- | --- |
| Consistency | + reuses `RollFailure` (`RollRequestsController.cs:153-161`) | 0 one more title, in the same style as the existing ones |
| Modifiability | - DICE-009's states would be indistinguishable too | + |
| Testability | + | + |
| Simplicity | + | 0 one enum member through domain, provider, port, and controller |
| Reversibility | + | + |
| Security and correctness | - the Player panel would say "already made by the Keeper" for a cancelled roll: false, and not silent | + correct copy, and silent on the Player side |

- **Chosen:** B, because of correctness and the human's "silent" decision.
  - **Domain:** `RequestedRollOutcome` gains `Cancelled` (the transition happened) and `AlreadyCancelled` (refused).
  - **Through the layers:** the provider write outcomes, `RollRequestedRollOutcome`, and the new `CancelRequestedRollOutcome` carry `AlreadyCancelled`.
  - **Controller:** maps `AlreadyCancelled` to 409 with the new `RollRequestProblems.CancelledTitle = "This roll was cancelled."`.
  - **Frontend:** a new `RequestedRollCancelledError`.
  - **Giving up:** a lost-race save still reports `NotWaiting`, because it can't tell why it lost. A Player whose roll loses a race to a cancel sees "already made". This is accepted.
- **Rejected:** A. The Developer must not fold Cancelled into the generic conflict title.

### D4: Where the counts come from
| Metric | A: derived in the browser from the Keeper's cached Active Scene roll requests | B: served by the server (a count endpoint plus a field on the present response) |
| --- | --- | --- |
| Consistency | + the Keeper badge already counts this way (`campaign-layout.tsx:93-119`) | - a new endpoint, and a field on `KeeperActiveSceneResponse`, which GET shares |
| Modifiability | + one helper for the badge, the dialog, the start page, and the present report | - |
| Testability | + pure-function unit tests | 0 |
| Simplicity | + no backend change | - |
| Reversibility | + | 0 |
| Security and correctness | 0 the shown number can lag by one live-signal round trip; the server always cancels exactly what is Waiting at commit. A count shown before confirming is just as racy with B | 0 exact only after the fact |

- **Chosen:** A, because of consistency and simplicity.
  - **Count helper:** `countWaitingRolls(requests, investigatorIds?)` in `frontend/src/roll-requests/services/waitingRollCount.ts`. The badge derivation at `campaign-layout.tsx:119` uses it (DRY).
  - **Copy helpers, beside it:**
    - `waitingRollsToCancelSentence(count: number | undefined)`.
    - `cancelledRollsReport(count: number)`.
  - **Present report count:** captured on Save from the cache. It is the Waiting rolls of Investigators who were present and are now unchecked.
  - **Giving up:** in a race of a few seconds, the shown number can differ from what was cancelled.
- **Rejected:** B. The Developer must not add a count endpoint or a response field.

### D5: Live signals after finish, start with finish, and a present change
| Metric | A: the server publishes the roll-request topics after a lifecycle commit that cancelled rolls | B: the frontend maps `activeScene` to also invalidate the roll-request queries |
| --- | --- | --- |
| Consistency | + spec `:35` requires `myRequestedRolls` for each Player who loses a Waiting roll | - departs from spec `:35`; topics would no longer say what changed |
| Modifiability | + DICE-009's lifecycle effects reuse it | - |
| Testability | + Scene Play service tests assert the signal port | 0 |
| Simplicity | 0 one more port dependency on `ActiveSceneService` | + one line |
| Reversibility | + | + |
| Security and correctness | + goes through `ForRollRequestChanged` with each request's visibility, so it fails closed | 0 no leak, but every Scene change refetches every roll query |

- **Chosen:** A, because of consistency with the spec and correctness.
  - `ActiveSceneService` gets `IRollRequestSignals`.
  - After a committed finish, start, or present change that cancelled at least one roll, it groups the cancelled rolls by their request's visibility.
  - For each group it calls `RollRequestChangedAsync(campaignId, visibility, playerAccountsOf(cancelled))`, best-effort. The existing `activeScene` signal stays.
  - A `KeeperOnly` request is rolled at creation (`RollRequest.cs:129-132`), so it is never Waiting and never cancelled. The grouping still fails closed.
  - **Giving up:** one more constructor dependency.
- **Rejected:** B. The Developer must not change `frontend/src/campaign-play/services/liveTopics.ts` for this.

### Single-option decisions
- **Start with "Finish {title} first" also cancels:** this was a human decision.
  - Rolls are closed before `active.Finish` inside `TryWriteStartAsync` (`SceneLifecycleService.cs:134-150`).
  - The closing runs after every refusal check, so a refused start cancels nothing.
- **Which rolls a present change affects:** the Active Scene's Waiting rolls whose Investigator is not in the new present list.
  - They are computed only after `ReplaceInvestigatorsPresent` returns `Transitioned` (`SceneLifecycleService.cs:122-126`).
  - A refused change cancels nothing.
  - Adding the Investigator again does not revive them.
- **Finish affects:** every Waiting roll of the Active Scene.
- **Cancel bumps `Version`:** like `Roll()` (`RequestedRoll.cs:81`).
  - Roll against cancel: whichever saves first wins, and the other gets 409.
  - Finish against roll:
    - If the roll commits first, the finish save fails (R1).
    - If the finish commits first, the roll fails on `Version` and returns `NotWaiting`.
- **Cancel endpoint:**
  - `POST /api/campaigns/{campaignId}/roll-requests/{rollRequestId}/requested-rolls/{investigatorId}/cancel` returns 200 with the Requested Roll (`RequestedRollResponse`), like `/roll`.
  - Keeper only.
  - Check order, as in `SceneRollRequestService.cs:127-142`:
    1. Not the Keeper: 404.
    2. Request missing or not in the Campaign: 404.
    3. Investigator not requested: 404.
    4. Scene not Active: 409 `NoActiveSceneTitle`.
    5. Rolled: 409 `ItemHolderProblems.ConflictTitle` (unchanged).
    6. Cancelled: 409 `CancelledTitle`.
  - It signals `rollRequests` (by visibility) and `myRequestedRolls` to the owner's account through the existing `TrySignalAsync`.
- **No migration:** `Status` is stored as a string of at most 20 characters (`ScenarioPreparationDbContext.cs:410`).
- **Status mirrors, mapped by name:** the domain, `ScenePlayRollRequestPorts.cs:46`, `frontend/src/roll-requests/types/RollRequest.ts`, and the zod enum (`rollRequestApi.ts:50`). Extend the existing every-member mapping test.
- **Cancelled rolls cross the port as a record:** `CancelledRequestedRoll(RollRequestId, InvestigatorId, Visibility)`.
  - It is added as `IReadOnlyList<...>` to `SceneStartResult`, `SceneFinishResult`, and `InvestigatorsPresentResult` (`SceneLifecycleResults.cs:33,44,58`).
  - It is added the same way to their Scene Play mirrors (`ScenePlayPorts.cs:50,62,77`).
  - The list is empty when nothing was cancelled.
- **No Wall Entry for a cancellation:** the card changes in place.
- **Investigator-to-account mapping is shared:** it moves from `RollRequestService.AffectedAccounts` (`RollRequestService.cs:249-256`) into a small static helper used by `RollRequestService` and `ActiveSceneService`.

## Patterns
- **Used:**
  - **Unit of Work** (the EF `DbContext`, already present) in `SceneLifecycleService`. Force: two aggregates written atomically.
  - **Facade** (the existing provider services) for `CancelAsync`.
- **Rejected:**
  - **State** for the `RequestedRoll` status: three states and two guards don't need it. DICE-009 may revisit it at five states.
  - **Strategy** for the affected-roll filter: a `Func<Guid, bool>` is enough.
  - **Observer** (domain events) for cancellation signals: Scene Play's pattern is a post-commit `TrySignalAsync` (ADR 0024).
  - **Command** for cancel: nothing is queued or undone.
  - **Template Method** for roll and cancel in `waiting-rolls`: a pure function `refusalStatusFor(error, row)` covers the shared branching.

## Invariants
- **Transitions:**
  - The only new transition is Waiting to Cancelled, and Cancelled is terminal.
  - A cancel adds no Roll Record, and Roll Records never change.
  - Cancel and scene-exit closing bump `Version`.
- **Atomicity:**
  - Lifecycle cancellations commit in the same EF save as the Scene write, or in the same `SaveFinishThenStartAsync` transaction.
  - A refused or conflicted lifecycle write cancels nothing.
  - Nothing is retried (ADR 0025).
- **Authorization:**
  - It stays server-side in Scene Play, and the provider never authorizes.
  - Only the Keeper cancels. Players and non-members get 404.
- **Error order:** for a 409, "Scene not Active" is checked before the roll's status.
- **Signals:**
  - Every roll-request signal goes through `ForRollRequestChanged` with the request's visibility.
  - A Player never receives a signal about a `KeeperOnly` request.
- **Complexity:** at most 10, with no new entries in `GlobalSuppressions.cs` or the ESLint baseline.
- **R1, accepted at the gate:** a lifecycle write that loses to a concurrent roll returns 409 with the existing finish, present, or start copy. Nothing is committed, and the Keeper retries. Follow-up in the PBI.
- **R2, accepted at the gate (it already existed after DICE-005):** a Roll Request created at the same moment as a finish can keep a Waiting roll on a Finished Scene. That roll can be neither rolled nor cancelled (409, Scene not Active). Follow-up in the PBI.
- Breaking any invariant means escalation.

## Implementation plan
1. **Specs:**
   - `specs/roll-requests/spec.md`:
     - `:21`: remove the "Until PBI-DICE-007" note, and add "including starting another Scene with `finishActiveScene`".
     - `:29`: add "returns the Requested Roll", the 409 order, and the cancelled title.
     - Add the Gherkin scenario "Starting another Scene cancels the finished Scene's waiting rolls".
   - `specs/scene-play/spec.md`:
     - `:12`: starting with `finishActiveScene` cancels the waiting rolls.
     - `:34`: lifecycle cancellations also publish the roll-request topics.
     - `:57`: add starting with a finish.
2. **Domain:**
   - `RequestedRollStatus.Cancelled`.
   - `RequestedRoll.Cancel()` and `CloseForSceneExit()`.
   - `Roll()` returns `AlreadyCancelled` for a Cancelled roll.
   - `RollRequest.CancelInvestigatorRoll(investigatorId)` and `CloseRollsForSceneExit(isAffected)`.
   - The `RequestedRollOutcome` members.
3. **Provider:**
   - `ISceneRollRequestRepository.ListTrackedForSceneAsync` and its implementation in `EfSceneRollRequestRepository`.
   - `SceneRollRequestService.CancelAsync`, in the same order as `RollAsync`.
   - `SceneLifecycleService` closes rolls in finish, start with finish, and present, and returns the cancelled rolls.
   - The result records gain `CancelledRolls`.
4. **Scene Play:**
   - Port enums and records mirror the provider.
   - `IRollRequests.CancelAsync` and its adapter in `ScenePlayRollRequestAdapters.cs`.
   - The `IPlayableScenes` adapter maps the cancelled rolls.
   - `RollRequestService.CancelAsync`, with the Keeper check first.
   - `ActiveSceneService` signals as in D5.
5. **Controllers:**
   - `RollRequestsController.Cancel`.
   - The failure mapping sends `AlreadyCancelled` to the new title.
   - `RollRequestProblems.CancelledTitle`.
   - `RollRequestMapping` maps the status.
6. **Frontend data:**
   - `Cancelled` in the type and in the zod enum.
   - `cancelRequestedRoll` and `RequestedRollCancelledError`. `rollRequestedRoll` also maps the cancelled title.
   - `useCancelRequestedRoll`, which invalidates `rollRequestQueryKeys.all`.
   - `waitingRollCount.ts`, with the badge refactored onto it.
7. **Frontend UI** (roll-requests ux.md section 17, scene-play ux.md section 24):
   - `waiting-rolls`: Cancel.
   - `roll-request-card`: the Cancelled branch of `RollStatus`.
   - `waiting-rolls-panel`: silent removal and focus.
   - `finish-scene-dialog`: a `waitingRollCount` prop, passed by `active-scene-header`.
   - `investigators-present-section`: `onSaved(cancelledCount)`.
   - `start-scene-page`: the count hint.
   - Stories updated.
8. **E2E:** in `e2e/tests/roll-requests.spec.ts`:
   - Add the scenarios below.
   - Drop DICE-007 from the header exceptions (`:35-37`).
   - Add a `cancelRollViaUi` fixture.

## Reuse
- **Using:**
  - `SceneRollRequestService.RollAsync`'s check order and `TrySaveAsync`.
  - The `SceneSaveChanges` conflict mapping.
  - `SaveFinishThenStartAsync`, unchanged.
  - `TrySignalAsync` and `ForRollRequestChanged`.
  - The `RollFailure` 409 mapping and `NoActiveSceneTitle`.
  - `waitingRowsOf` and the focus rule in `waiting-rolls.tsx`.
  - `FinishSceneDialog`.
  - `useActiveSceneRollRequests`, already mounted by the layout.
  - `rollTargetName`.
- **Not using:**
  - `ListForSceneAsync`: it is `AsNoTracking` (`EfSceneRollRequestRepository.cs:21-28`), so it can't save.
  - `liveTopics.ts` changes (D5).
  - A new ADR (see ADR).

## TDD units
- **Domain:**
  - Cancel moves Waiting to Cancelled and bumps `Version`.
  - Cancel on a Rolled roll returns `NotWaiting`, and on a Cancelled roll returns `AlreadyCancelled`. Neither changes anything.
  - Roll on a Cancelled roll returns `AlreadyCancelled` and adds no Roll Record.
  - `CloseRollsForSceneExit` closes only the Waiting rolls that match the predicate, and returns their ids.
  - The status maps by name across contexts.
- **Provider:**
  - `CancelAsync` runs in this order: NotFound, SceneNotActive, InvestigatorNotRequested, NotWaiting or AlreadyCancelled, then Cancelled. A lost race returns NotWaiting.
  - Finish cancels every Waiting roll and returns them.
  - A present change cancels only the rolls of Investigators not in the new list. A refused present change cancels nothing.
  - Start with finish cancels the old Scene's Waiting rolls. A refused start cancels nothing.
  - A conflict returns Conflict.
  - SQL Server: a finish whose save hits a stale `RequestedRoll.Version` rolls back the Scene's finish.
- **Scene Play:**
  - A cancel by a Player or a non-member returns NotFound with no provider call.
  - A Keeper's cancel signals the owner's account.
  - `ActiveSceneService` signals the roll-request topics only when rolls were cancelled, grouped by visibility.
  - A failed signal is logged and never fails the finish.
- **API (`RollRequestApiTests`):**
  - A cancel returns 200; a Player gets 404.
  - Cancelling a Rolled roll returns 409 with the conflict title.
  - Cancelling a Cancelled roll returns 409 "This roll was cancelled.".
  - Cancelling on a Finished Scene returns 409 "No Scene is Active.".
  - Rolling a cancelled roll returns 409 with the cancelled title.
  - After a finish, a present change, or a start with finish, GET shows the rolls as Cancelled.
- **Frontend and UX criteria:**
  - `countWaitingRolls` and the copy helpers: 0, 1, n, and unknown.
  - The criteria in the ux.md files: RR-UX-20 to RR-UX-23, RR-A11Y-15 and RR-A11Y-16, SPL-UX-70 to SPL-UX-72, and SPL-A11Y-27.

## E2E coverage
- **"Keeper cancels a waiting roll"** (new test):
  - The Keeper requests Spot Hidden from Lucy and clicks "Cancel" in "Waiting rolls".
  - The status reads "Lucy Ward's Spot Hidden roll was cancelled." and the row leaves.
  - The card shows Lucy as "Cancelled" for the Keeper and for Lucy's Player.
  - Lucy's panel row disappears without a reload, and the tab badge count drops.
  - Covers RR-UX-12 and RR-UX-20 to RR-UX-22.
- **"Finishing the Scene cancels waiting rolls"** (new test):
  - There are two Waiting rolls. "Finish Scene" shows "2 waiting rolls will be cancelled.", and the Keeper confirms.
  - On the Wall, both rows are "Cancelled".
  - Covers SPL-UX-70.
- **"Removing an Investigator present cancels their waiting rolls"** (new test):
  - The Keeper chooses "Change", unchecks Lucy, and saves.
  - The status reads "Investigators present saved. 1 waiting roll cancelled.". Lucy's row is Cancelled and Harvey's stays Waiting.
  - Covers SPL-UX-71.
- **New Gherkin "Starting another Scene cancels the finished Scene's waiting rolls"** (new test):
  - The start page notice shows "{n} waiting rolls will be cancelled." under "Finish {title} first".
  - After the start, the old card's rows are Cancelled.
  - Covers SPL-UX-72.
- **Exception, covered by the API integration tests:** a 409 on cancelling a roll that is not Waiting. The UI can't reach it without a race.

## ADR
- None. ADR 0032 already decides the storage, the per-roll `Version`, and that "finishing a Scene and cancelling its rolls can share one `SaveChanges`" (`0032:27`). The port and enum changes are additive and recorded here.

## Phases
- **Phase 1:** specs, domain, provider, and their tests. Checkpoint: `feat(dice-007): cancel requested rolls in the aggregate and scene lifecycle (PBI-DICE-007)`.
- **Phase 2:** Scene Play ports, services, controllers, and API tests. Checkpoint: `feat(dice-007): cancel endpoint and lifecycle signals (PBI-DICE-007)`.
- **Phase 3:** frontend data and UI, with unit tests and stories. Checkpoint: `feat(dice-007): cancel and cancelled states in the UI (PBI-DICE-007)`.
- **Phase 4:** E2E, and the PBI Verification ticks. Checkpoint: `test(e2e): cancel waiting roll scenarios (PBI-DICE-007)`.

## Human decisions
- **2026-11-14, UX selection** (relayed verbatim): "1. A 2. save and then report 3. it should cancel waiting rolls 4. silent".
  - Option A: an immediate Cancel in the row. No prototype.
  - Removing an Investigator present: save, then report the count. No warning before saving.
  - Starting another Scene with "Finish {title} first" also cancels the waiting rolls.
  - The Player side stays silent when a roll is cancelled.
- **2026-11-14, plan gate:** "approve".
  - The Orchestrator read this as approving the plan as presented.
  - The start-page count hint stays (scene-play ux.md SPL-UX-72).
  - Residuals R1 and R2 are accepted, each with a Follow-up in the PBI.

## Revisions

# Design: PBI-DICE-006: The Keeper makes a Keeper-only Roll Request that is rolled at creation and reaches only the Keeper

## Triggers
- **2, shared interface or aggregate:**
  - `RollRequest.Create` (the aggregate factory) gains dice and the Keeper's account.
  - The Scene Play port `IRollRequests.CreateAsync` gains the Keeper's account.
  - `WaitingRequestedRollRecord` gains `Visibility`.
- **5, more than one bounded context:** Scenario Preparation (aggregate, provider), Scene Play (use case, API), and Campaign Play (Wall, publication; reused unchanged).
- **6, Explorer open questions with competing answers:** where the roll at creation lives; the Player roll and mine-read defenses; the visibility of the roll signal.
- **7, UX:** a new control in the creation journey ([ux.md](../../../specs/roll-requests/ux.md) section 3.1).

## Constraints
- **Spec, Hidden roll** (`specs/roll-requests/spec.md:16`): rolled for every targeted Investigator at creation, straight to Rolled, with the Keeper as the roller.
- **Spec, API** (`spec.md:23`): "A Player gets 404 for a `KeeperOnly` Roll Request."
- **Spec, Constraints and Guardrails** (`spec.md:44-45, 63`): visibility never changes; a `KeeperOnly` request, its Wall Entry, its results, and its signals reach only the Keeper.
- **Spec, Live updates** (`spec.md:34-35`).
- **campaign-play spec,** Wall Entry visibility.
- **CONTEXT.md:158-160,** "Hidden roll"; avoid "secret roll" and "blind roll". The UI says "Keeper only", as on the Wall.
- **No game rule covers hidden rolls.** The authority is the spec and the glossary. The dice and Success Level follow the skill rolls document sections 4 and 5, already implemented in `PercentileRolling` and `RequestedRoll.Roll` (`RequestedRoll.cs:62-83`).
- **ADR 0030:** dice only on the server, through `IDiceRoller`.
- **ADR 0032:**
  - the provider performs no authorization;
  - "Hidden rolls ... change only this aggregate";
  - the `Version` token guards concurrency.
- **ADR 0024:** Scene Play authorizes, then calls the provider. The Wall Entry and the signal are best-effort after the commit.
- **ADR 0033:** the card reads the Roll Request by id.
- **ADR 0009:** the topic set is closed; no new topic.
- **Existing patterns:**
  - Scene Play's read rule: a non-Keeper asking for a non-Public request gets null (`RollRequestService.cs:108`).
  - The publication policy's non-Public branch publishes to the Keeper group only, with no account topics (`CampaignLivePublicationPolicy.cs:60-61`).
  - The Wall list filters visibility in the query (`IWallEntryRepository.cs:14-18`).
- **Complexity:** at most 10 (ESLint `complexity`, CA1502). `RollRequestForm` and `RollRequestService.RollAsync` are already dense, so new logic goes into small helpers.
- **The DICE-005 gate:** design D4 (`05-request-a-roll-in-the-active-scene.design.md:116-128`) set the temporary fail-closed 400. This PBI is the planned removal.

## UX
- **Selected option:** A, a visibility choice in the form.
  - The choice is kept after a request.
  - The status shows the results inline.
- **Spec files:** `specs/roll-requests/ux.md` is updated (sections 3.1, 5.2, 11 to 16, 12.1, and the 2026-11-13 human decisions), and `spec.md` is linked at line 16.

## Decisions

### D1: Where the roll at creation lives
| Metric | A: Domain. `RollRequest.Create` rolls every Requested Roll when the request is `KeeperOnly` | B: Provider. `SceneRollRequestService.CreateAsync` rolls each one after `Create`, before the single save | C: Scene Play. `RollRequestService.CreateAsync` creates, then calls `IRollRequests.RollAsync` per Investigator |
| --- | --- | --- | --- |
| Consistency | + Domain entities enforce their invariants (backend CLAUDE.md); ADR 0032 says hidden rolls change only this aggregate | 0 The provider already orchestrates domain calls (`SceneRollRequestService.cs:136`), but the rule sits outside the aggregate | - Contradicts ADR 0032: the change spreads to Scene Play and several transactions |
| Modifiability | + DICE-009 (a hidden roll cannot be pushed) and DICE-007 (cancel) can rely on an aggregate invariant | 0 A second creation path would have to repeat the loop | - Every future status rule must account for partly rolled hidden requests |
| Testability | + A pure domain test with `ScriptedDiceRoller`, with no fakes | + A provider test with the fake repository | 0 N port calls and partial-failure fakes |
| Simplicity | 0 `Create` gains two parameters (`IDiceRoller dice`, `Guid requestedByAccountId`); about 5 test call sites change (`RollRequestTests.cs:28,44`, `RollRequestPersistenceTests.cs:28`, `ScenarioPreparationMigrationTests.cs:233,273`) | + About 5 lines in the provider | - A loop, N commits, N signals, and partial-failure handling |
| Reversibility | 0 A signature change to undo | + | 0 |
| Security and correctness | + Atomic: one `SaveChanges`. No code path can persist a Waiting hidden roll | + Atomic, but the invariant holds only by convention for future creation paths | - Not atomic: a crash between commits leaves Waiting hidden rolls that the mine read and a Player roll could reach |

- **Chosen: A.** Security and correctness decided it (the invariant can't be bypassed), together with Consistency with ADR 0032 and with "entities enforce invariants". I give up a wider `Create` signature and about 5 test call sites to update.
- **How it works:**
  - Dice and the account are passed on every call and used only when `KeeperOnly`.
  - The rolls use the same `now` as `CreatedAt`.
  - The provider passes its existing `_diceRoller` (`SceneRollRequestService.cs:13`).
  - The port `IRollRequests.CreateAsync` (`ScenePlayRollRequestPorts.cs:199-208`) and its adapter gain `Guid keeperAccountId`. Scene Play fills it with `callerAccountId`, already confirmed as the Keeper (`RollRequestService.cs:56`).
- **Rejected: B.** The invariant would live outside the aggregate. The Developer must not reintroduce it.
- **Rejected: C.** It is not atomic and contradicts ADR 0032. The Developer must not reintroduce it.
- **Also not allowed:** a separate `CreateHidden` factory (see Patterns).

### D2: A Player rolling a hidden request's Requested Roll, and the visibility of the roll signal
- **Today:** `RollAsync` checks only the role and the ownership (`RollRequestService.cs:158-169`) and never reads the request's visibility.
- **Today:** `RolledAsync` hard-codes `RollRequestVisibility.Public` (`RollRequestService.cs:189`).

| Metric | A: Scene Play reads the request first through the existing `IRollRequests.FindAsync`; a non-Keeper on a non-Public request gets NotFound; the visibility that was read goes to `RolledAsync` | B: Pass a "may see Keeper-only" flag into the provider's `RollAsync` | C: Rely on D1 (hidden rolls are never Waiting, so a Player gets 409); add `Visibility` to `RequestedRollWriteResult` for the signal |
| --- | --- | --- | --- |
| Consistency | + The same rule as `FindAsync` (`RollRequestService.cs:108`), extracted to one helper | - The provider would authorize, against ADR 0024, ADR 0032, and `SceneRollRequestService.cs:5-6` | 0 |
| Modifiability | + The DICE-007 and DICE-009 Player actions reuse the same guard | - Every new provider write needs the flag | - Every new write result must carry the visibility |
| Testability | + Fake `Found`; assert NotFound and that the provider roll was not called | 0 | + |
| Simplicity | 0 One extra read per roll; the guard lives in a helper so `RollAsync` stays at or below 10 | 0 | + |
| Reversibility | + | 0 | + |
| Security and correctness | + 404, as `spec.md:23` requires. The signal uses the stored visibility, which never changes (`spec.md:44`), so reading first is not a race | + | - 409 instead of 404 tells the Player the request exists, against `spec.md:23` |
| Performance | 0 One indexed read per roll, at human speed | + | + |

- **Chosen: A.** Security and correctness and Consistency decided it. I give up one extra provider read per roll.
- **How it works:**
  - The checks run in this order:
    1. The role is null: NotFound.
    2. The request is missing, or the caller is not the Keeper and the request is not Public: NotFound.
    3. The caller doesn't own the Investigator: NotFound.
    4. Otherwise, roll.
  - A private static helper, `IsVisibleTo(RollRequestRecord, CampaignMemberRole)`, is shared by `FindAsync` and `RollAsync` (DRY).
  - `RolledAsync` takes a `RollRequestVisibility` and passes it to `TrySignalAsync`.
- **Rejected: B,** because it puts authorization in the provider. The Developer must not reintroduce it.
- **Rejected: C,** because it answers 409 where the spec requires 404. The Developer must not reintroduce it.

### D3: Visibility defense on the Player's "mine" read
- **Today:** `SceneRollRequestService.ListWaitingForInvestigatorAsync` (`SceneRollRequestService.cs:105-110`) does not filter by visibility, and neither does `RollRequestService.ListMineAsync` (`RollRequestService.cs:145-147`).
- **Risk:** a Waiting hidden roll would reach the panel, the badge, and the announcement.

| Metric | A: Add `Visibility` to the provider's waiting view and to `WaitingRequestedRollRecord`; Scene Play's `ListMineAsync` keeps Public only | B: The provider filters to Public in `ListWaitingForInvestigatorAsync` | C: No filter; rely on the D1 invariant plus a test |
| --- | --- | --- | --- |
| Consistency | + Scene Play decides what a Player sees, as `FindAsync` does (ADR 0024) | - A Player visibility rule inside a provider that "performs no authorization" | 0 |
| Modifiability | + When DICE-009 adds `Pushed` to "mine", the filter still holds | 0 | - Depends on every future status keeping hidden requests out of "mine" |
| Testability | + A Scene Play unit test with a Keeper-only item from the fake | + | 0 Proving an absence needs domain and integration tests |
| Simplicity | 0 One field threaded through the view, the record, and the adapter, plus one `Where` | + One `Where` | + Nothing |
| Reversibility | + | + | + |
| Security and correctness | + Defense in depth: holds even if a Waiting hidden roll ever exists | + | - A single point of failure on a guardrail (`spec.md:63`) |

- **Chosen: A.** Security and correctness and Consistency decided it. I give up one field threaded through 3 types and the adapter.
- **Rejected: B,** because it puts authorization in the provider.
- **Rejected: C,** because it leaves no defense in depth for a regression guardrail.

### Single-option decisions
- **Remove the 400 gate.** DICE-005 D4 made it temporary by design.
  - Delete the `KeeperOnly` branch in `CheckShape` (`RollRequestService.cs:252-255`).
  - Delete `CreateRollRequestOutcome.KeeperOnlyNotAvailable` (`RollRequestViews.cs:74`), its controller mapping (`RollRequestsController.cs:150`), and `KeeperOnlyNotAvailableMessage` (`RollRequestContracts.cs:101`).
  - Update the comments at `RollRequestContracts.cs:10` and `ScenePlayRollRequestPorts.cs:35-36`.
  - Replace the gate tests (`RollRequestServiceTests.cs:103-107`, `RollRequestApiTests.cs:186-192`) with positive ones.
  - An unknown visibility stays 400 (`RollRequestService.cs:257-260`).
- **Signals and Wall Entry on create: no change.**
  - The service already passes the request's visibility to the Wall (`RollRequestService.cs:93`) and to the signal (`:94`).
  - The policy drops the account topics for non-Public requests (`CampaignLivePublicationPolicy.cs:60-61`).
- **201 response: no change.** The existing `ProjectAsync` (`RollRequestService.cs:196-200`) already resolves the roller names, so the Keeper's name appears with no new code.
- **Scene History: nothing to build in DICE-006.**
  - No Scene History code reads Roll Requests yet.
  - `08-roll-requests-in-the-scene-history.md:13,26` already requires that a Player sees Public requests only.
  - An invariant below binds DICE-008.
- **Frontend contract:**
  - `CreateRollRequestInput` gains `visibility: 'Public' | 'KeeperOnly'`, and `requestRoll` sends it.
  - Update the comment at `RollRequest.ts:86`.
  - The response schema already has `visibility` (`rollRequestApi.ts:58`).
- **Hidden-roll status:** a pure function, `hiddenRollStatus(request: RollRequest)`, in `rollRequestPresentation.ts`. It is built from the mutation's 201 response with the existing `describeOutcome` and `rollTargetName`.
- **The kept choice:** it lives in `RollRequestForm` component state only. It is not reset in `onSuccess` (`roll-request-form.tsx:184-192`) and resets on unmount (ux.md section 3.1).

## Patterns
- **Used: Factory Method (existing),** `RollRequest.Create` at `RollRequest.cs:74`. Force: construction with variants (Public stays Waiting; KeeperOnly is rolled). Extended, not duplicated.
- **Used: Observer (existing),** the SignalR invalidation topics through `CampaignLivePublicationPolicy`, reused unchanged.
- **Rejected: Strategy or Template Method for creation by visibility.** There are two values and one branch, and complexity stays well under 10. The Developer must not add a `CreateHidden` factory or a visibility strategy.
- **Rejected: State for `RequestedRollStatus`.** There are two statuses, and nothing in this PBI behaves differently per state. DICE-007 and DICE-009 can reconsider when they add statuses.
- **Rejected: Proxy or Decorator around `IRollRequests` to filter visibility.** It would hide the authorization rule away from `RollRequestService`, where ADR 0024 places it.
- **Rejected: Chain of Responsibility for the `RollAsync` guards.** One `IsVisibleTo` helper is enough.

## Invariants
- A `KeeperOnly` Roll Request is never persisted with a Waiting Requested Roll. It is created and rolled in one `SaveChanges`.
- Every Roll Record of a hidden roll:
  - comes from `IDiceRoller`;
  - has the purpose `RollRequest:{requestId}:{investigatorId}`;
  - names the creating Keeper as the roller;
  - has `RolledAt` equal to `CreatedAt`.
- A Player gets 404 for every read or roll of a `KeeperOnly` request: never 200, never 409.
- The Player's "mine" list, panel, badge, and announcement never include a `KeeperOnly` request.
- Every Roll Request signal uses the request's stored visibility. A `KeeperOnly` request publishes no account topics.
- Visibility never changes after creation.
- An unknown visibility is still 400, and a Player who creates a Roll Request still gets 404.
- The provider stays free of authorization.
- DICE-008 must exclude `KeeperOnly` requests from a Player's Scene History, with no gap or count.
- The visibility choice is never sent to or shown for Players. The form stays Keeper-only.

## Implementation plan
1. **`RollRequest.cs`:**
   - `Create` gains `IDiceRoller dice, Guid requestedByAccountId`.
   - After the rolls are built, a `KeeperOnly` request calls `RequestedRoll.Roll(dice, requestedByAccountId, now)` on each, in a private helper.
   - Update the doc comment. (D1)
2. **`SceneRollRequestService`:**
   - `CreateAsync` gains `Guid keeperAccountId` and passes `_diceRoller`.
   - `WaitingRequestedRollView` and `ListWaitingForInvestigatorAsync` carry `request.Visibility`. (D1, D3)
3. **Scene Play port and adapter:**
   - `IRollRequests.CreateAsync` gains `keeperAccountId`.
   - `WaitingRequestedRollRecord` gains `Visibility`.
   - `ScenePlayRollRequestAdapters.cs` maps both.
   - Fix the comment at `ScenePlayRollRequestPorts.cs:35-36`.
4. **`RollRequestService`:**
   - Remove the gate and pass `callerAccountId` to create.
   - Add `IsVisibleTo` and use it in `FindAsync` and in `RollAsync`, which now reads the request first.
   - Pass the visibility into `RolledAsync`.
   - `ListMineAsync` keeps Public only.
   - Remove `KeeperOnlyNotAvailable` from the views, the controller, and the contracts. (D2, D3)
5. **Shared `VisibilityChoice`:**
   - Extract it to `frontend/src/shared/components/visibility-choice/visibility-choice.tsx`, with a story and a test.
   - Props: the legend text, the two labels and descriptions, the value, and `onChange`. The value type is the literal `'Public' | 'KeeperOnly'`.
   - The composer uses it with its existing copy, and its tests stay green.
6. **Roll Request types and services:**
   - `RollRequest.ts` and `rollRequestApi.ts` gain `visibility` on the input.
   - `rollRequestPresentation.ts` gains `hiddenRollStatus`.
7. **`roll-request-form.tsx`:**
   - `visibility` state, kept after success.
   - `VisibilityChoice` after "Who rolls".
   - In `SubmitSection`, the mode line and a `submitLabel(pending, hidden, count)` helper.
   - `onSuccess` uses the response for the hidden status.
8. **`roll-request-card.tsx`:**
   - A header `Badge` "Keeper only" when `visibility === 'KeeperOnly'`.
   - The row suffix " (hidden roll)".
   - Stories for the hidden card and for the form in Keeper only.
9. **E2E:**
   - A `visibility` option in `e2e/fixtures/roll-requests.ts` `requestRollViaUi`.
   - The tests in E2E coverage.

## Reuse
- **Using:**
  - `VisibilityChoice` (extracted) for the form's choice.
  - `CampaignLivePublicationPolicy.ForRollRequestChanged` and `PublishRollRequestChanged`, unchanged, for the audiences.
  - `RequestedRoll.Roll` for every hidden roll.
  - `IRollRequests.FindAsync` for the roll guard.
  - `describeOutcome` and `rollTargetName` for the status.
  - `ScriptedDiceRoller` in tests.
  - The WL-UX-12 test in `e2e/tests/campaign-wall.spec.ts` as the template for "a Player receives nothing".
- **Not using:**
  - A separate hidden-roll endpoint: the spec has one create endpoint with `visibility`.
  - A new SignalR topic: the closed set of ADR 0009 is enough.
  - `localStorage` for the choice: the human chose to keep it for the session on Run, not as a stored preference.

## TDD units
- **Domain (`RollRequestTests`):**
  - Given KeeperOnly, When created, Then every Requested Roll is Rolled with one Roll Record: the scripted result, the purpose, the Keeper as roller, and `RolledAt` equal to `CreatedAt`.
  - Given Public, When created, Then every roll is Waiting and no dice are drawn.
  - Given a refused KeeperOnly creation, Then no dice are drawn.
  - A hidden skill success earns an experience check exactly as a Public one does.
- **Provider (`SceneRollRequestServiceTests`, `RollRequestPersistenceTests`):**
  - A KeeperOnly create returns Rolled views after one save.
  - The waiting views carry the Visibility.
  - A KeeperOnly request with Roll Records round-trips through persistence.
- **Scene Play (`RollRequestServiceTests`):**
  - A KeeperOnly create succeeds: it passes the Keeper's account to the port, adds a KeeperOnly Wall Entry, and signals KeeperOnly.
  - An unknown visibility is still refused.
  - A Player rolling their own Investigator's KeeperOnly request gets NotFound, and the provider roll is not called.
  - A Player rolling a missing request gets NotFound.
  - The Keeper rolling a hidden request reaches the provider and gets NotWaiting (409).
  - The roll signal uses the request's visibility, for both Public and KeeperOnly.
  - `ListMineAsync` leaves out non-Public items.
- **Campaign Play (`CampaignLivePublicationTests`):** a KeeperOnly roll request change with Player accounts publishes only to the Keeper group. Add this if it is not already pinned.
- **Integration (`RollRequestApiTests`):**
  - The Keeper's POST of KeeperOnly answers 201, with every roll Rolled and the Keeper as `rolledBy`.
  - A Player's GET by id answers 404.
  - A Player's POST roll on their own Investigator answers 404.
  - A Player's "mine" read does not include it.
  - A Player's Wall list leaves out the entry.
  - An unknown visibility answers 400.
- **Frontend:**
  - `VisibilityChoice`: the name, the descriptions, the keyboard, and `onChange` (RR-A11Y-11).
  - Form, choice: it defaults to Public (RR-UX-15); the label and the mode line follow the choice (RR-UX-16, RR-A11Y-12).
  - Form, submit: `visibility` is sent; the choice is kept after a success and after an error, and Public returns on remount (RR-UX-17); the hidden status comes from the response.
  - `hiddenRollStatus`: one, two, and three Investigators; an unnamed Investigator; a success, a "not enough", a failure, and a fumble.
  - `requestRoll` sends `visibility`.
  - Card: KeeperOnly shows the badge and the "(hidden roll)" suffix; Public shows neither (RR-UX-18, RR-A11Y-14).

## E2E coverage
- **Spec scenario "A hidden roll is rolled at once and stays Keeper-only":** a new test in `e2e/tests/roll-requests.spec.ts`, with a second Player context as in WL-UX-12.
  - The Keeper chooses Keeper only, Psychology, and Harvey, then "Roll now".
  - The status matches `/^Psychology hidden roll: Harvey Walters rolled \d+: .+\.$/` (RR-UX-18).
  - The card has "Keeper only" and "Rolled by {Keeper} (hidden roll)".
  - "Waiting rolls" is empty, and the tab badge shows no count.
  - The choice stays Keeper only after the request (RR-UX-17), and is Public after leaving Run and coming back.
  - Harvey's Player sees no panel, no badge, and no card on the Wall or in the preview, and the assertive region stays empty (RR-UX-19, RR-UX-12, RR-UX-13).
- **Spec scenario "A Player cannot read a hidden Roll Request":** a new test using the Player's API request context. GET by id answers 404, and POST roll answers 404.
- **Checked against existing criteria:**
  - RR-UX-6 is reworded to apply to Public requests only, so no existing assertion changes.
  - RR-UX-12 and RR-UX-13 are unchanged for Public requests.
  - WL-UX-12, NAV-UX-3, and CO-A11Y-7 are unchanged.

## ADR
- None.
  - D1 follows ADR 0032 ("hidden rolls ... change only this aggregate").
  - D2 and D3 apply the existing ADR 0024 rule that Scene Play authorizes around the provider.
  - All three are recorded here and are easy to reverse.

## Phases
- **Phase 1:** domain and provider, with tests. Checkpoint: `feat(scenario-preparation): hidden Roll Requests are rolled at creation (PBI-DICE-006)`.
- **Phase 2:** Scene Play service, port, adapter, controller, and integration tests. Checkpoint: `feat(scene-play): Keeper-only Roll Requests reach only the Keeper (PBI-DICE-006)`.
- **Phase 3:** frontend (the shared VisibilityChoice, the form, the card, and the presentation), with tests and stories. Checkpoint: `feat(frontend): hidden roll choice and Keeper-only card (PBI-DICE-006)`.
- **Phase 4:** E2E. Checkpoint: `test(e2e): hidden roll scenarios (PBI-DICE-006)`.

## Human decisions
- **2026-11-13, prototype:** yes. The prototype is on the local, never-merged branch `prototype/dice-006-hidden-rolls` (commit `f588457`) and is referenced from ux.md section 12.1.
- **2026-11-13, UX:** "option A, keep the last choice, include results inline". Options B (two submit actions) and C (two form modes with inline results) are rejected for this PBI.
- **2026-11-13, kept choice:** this overrides the Architect's reset-to-Public recommendation, which moves to Rejected.
  - The human's reason: Keepers often make several hidden rolls in a row.
  - The risk of a mistaken Public roll is handled by the "Roll now" label and the mode line (ux.md section 3.1).
- **2026-11-13, plan approval:** "approved", exactly as written. This includes:
  - the mode line above the submit;
  - "Experience check earned" left out of the hidden-roll status;
  - the absence of a game rule on hidden rolls, which is flagged and not invented.

## Revisions
_(empty)_

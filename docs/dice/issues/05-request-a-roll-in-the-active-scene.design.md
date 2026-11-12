# Design: PBI-DICE-005: Request a roll in the Active Scene

The Keeper creates a Public Roll Request for Investigators present in the Active Scene. The Investigator's Player, or the Keeper, rolls each Requested Roll once on the server. Results show live on a non-removable `RollRequest` Wall card. Targeted Players are told through a panel, a tab badge, and an assertive announcement, over two new live topics. This PBI also adds the percentile roll resolver and the experience-check flag.

## Triggers
- **1. New dependency:** none. No package is added. A `cmdk` combobox was considered and rejected (Reuse).
- **2. Shared interface or data model:**
  - `WallEntry` gains a kind and a Roll Request id.
  - `RollRecord` gains `Percentile` and `EarnsExperienceCheck`.
  - A new Roll Request aggregate and new tables.
  - The closed `CampaignDataTopic` set grows.
- **3. New cross-layer pattern:**
  - New live topics `rollRequests` and `myRequestedRolls`.
  - A Wall Entry kind whose card the client composes from another functionality's read (D2).
- **4. ADR:** D1 and D2 are hard to reverse and likely to be copied (section ADR).
- **5. More than one bounded context:** Scene Play (use cases, API), Scenario Preparation (storage, ADR 0024), Campaign Play (Wall, values, live), and Game Rules (Dice).
- **6. Explorer open question:** the spec defers aggregate storage and the Wall read to this record (`specs/roll-requests/spec.md:17`, `specs/campaign-play/spec.md:49`).
- **7. UX:** a new journey and new components. Option A was selected (UX).

## Constraints
- **ADR 0024:**
  - Scene Play has no `DbContext`; its state lives with the Scene in `ScenarioPreparationDbContext`.
  - Commands cross the boundary through consumer-owned ports and a provider service that performs no authorization.
  - The Wall Entry and the live signal follow the commit, best-effort.
  - Scene Play Application and Controllers reference nothing in Scenario Preparation or Campaign Play.
- **ADR 0029:** a play-time aggregate beside the Scene, in the same context, with a `Version` concurrency token, changed through a provider service. This is the precedent for D1.
- **ADR 0025:** the Scene `Version` concurrency token (`ScenarioPreparationDbContext.cs:89`).
- **ADR 0009:** a closed topic set; REST stays the only authorized read; the audience comes from `CampaignLivePublicationPolicy`; no new hub methods.
- **ADR 0011:** domain events after commit for Campaign Play aggregates. `WallEntryAdded` already publishes `wallEntries` (`PublishWallEntryChanges.cs:16-27`).
- **ADR 0030:** `IDiceRoller` is the only random source, and `SecureDiceRoller` is the only one registered (`Program.cs:21`).
- **ADR 0008:** cross-functionality reads go through consumer-owned ports.
- **ADR 0028:** a body lives in its subject slice and the host adapts. This is the precedent for `roll-request-card` hosted by the Wall.
- **Game rules** (cited, not restated):
  - `docs/game-rules/coc7_skill_rolls_rules.md`: sections 1, 2, 3, 4.1-4.3, 5, 7, and 9.
  - `docs/game-rules/project_ruleset.md`: sections 4.2, 4.7, 4.8, and the new 4.9 (Human decisions).
  - `docs/game-rules/coc7_character_creation_and_development_rules.md`: sections 6.1, 6.2, and 16.1.
- **CONTEXT.md terms:** Roll Request, Requested Roll, Difficulty, Success Level, Bonus Die, Penalty Die, Roll Record, Active Scene, Investigators present, Wall Entry, Public Wall Entry, Keeper-Only Wall Entry.
  - **Gap:** "experience check" has no CONTEXT.md term. It is used by `specs/roll-requests/spec.md:15` and by character rules section 16.1. The Developer adds it (Implementation plan step 1).
- **Specs:**
  - `specs/roll-requests/spec.md`, the source of truth.
  - `specs/dice/spec.md:13` (resolver input and output) and `:16` (the Roll Record carries `percentile`).
  - `specs/campaign-play/spec.md:49` (Wall Entry kinds) and `:81`.
  - `specs/scene-play/spec.md:57` (lifecycle).
- **Existing patterns:**
  - Keeper-check-first and best-effort after commit (`ActiveSceneService.cs:43-64`, `:134-156`).
  - Port adapters onto Campaign Play (`CampaignPlayAdapters.cs:37-96`).
  - Static factory with an outcome (`WallEntry.Author`, `WallEntry.cs:35-61`).
  - Visibility applied in the query (`WallEntryService.cs:41`).
  - Policy methods per change (`CampaignLivePublicationPolicy.cs:20-23`, `:44-48`).
  - Topic-to-query map (`frontend/src/campaign-play/services/liveTopics.ts:17-41`).
- **Cyclomatic complexity:** at most 10 (ESLint `complexity`, CA1502), with no new suppressions.

## UX
- **Selected option:** A, "Roll tool inline on Run": `specs/roll-requests/ux.md` (new), linked from `specs/roll-requests/spec.md:22`. Chosen 2026-11-12 after a three-option HTML prototype.

## Decisions

### D1: Where Roll Requests are stored
| Metric | A1: children of the Scene aggregate (like Reveals) | A2: own aggregate beside the Scene in `ScenarioPreparationDbContext` | B: `ScenePlay.Domain` with a `ScenePlayDbContext` |
| --- | --- | --- | --- |
| Consistency | + the Reveal precedent (ADR 0024) | + the Item aggregate precedent (ADR 0029), within ADR 0024 | - contradicts ADR 0024, which rejected a ScenePlay context |
| Modifiability | - every roll loads and saves the whole Scene; Scene growth affects every Scene read | + Cancel (DICE-007), Push (009), and Hidden (006) change only this aggregate; finish-and-cancel stays one `SaveChanges` | 0 clean ownership, but DICE-007's finish-and-cancel spans two contexts |
| Testability | 0 domain tests need a full Scene | + the aggregate tests stand alone with a scripted roller | + the same, plus new context plumbing |
| Simplicity | 0 no new aggregate root, but a larger Scene | + one aggregate, two tables, one provider service | - a new project, context, migrations pipeline, and DI |
| Reversibility | 0 moving out later is a data move | 0 a data move (ADR 0024 consequence) | - hard to undo once two contexts hold related data |
| Security and correctness | 0 concurrent Player rolls contend on the Scene | + a per-Requested-Roll concurrency token makes "rolled once" race-safe | - "Scene still Active" is a check across contexts; finish-and-cancel can't be atomic without a cross-context transaction (rejected in ADR 0024) |
| Performance | - each roll writes through the Scene graph | + a small row per roll | 0 small rows, but two round trips across contexts |

- **Chosen: A2.**
  - **Why:** consistency with ADR 0024 and 0029; correctness, because finishing the Scene and cancelling (DICE-007) stay in one context and one transaction, and the per-row token keeps "rolled once" race-safe; and modifiability.
  - **Details:** a `RollRequest` aggregate root in `CocAssistant.ScenarioPreparation.Domain/RollRequests/` with `RequestedRoll` children. The tables are `RollRequests(Id, CampaignId, SceneId FK -> Scenes cascade, TargetKind, TargetSkill, TargetSpecialization, TargetCharacteristic, Message, Visibility, RequestedByAccountId, CreatedAt)` and `RequestedRolls(RollRequestId FK cascade, InvestigatorId (no FK, ADR 0013), Position, Difficulty, BonusDice, PenaltyDice, TargetValue, UsesBaseValue, CanEarnExperienceCheck, Status, RollRecords (JSON, D3), Version concurrency token)`.
  - **Giving up:** Scenario Preparation's Domain carries more play-time state that it doesn't interpret. This is the consequence ADR 0024 already accepted.
- **Rejected:**
  - A1: the whole-Scene load and contention on every roll. The Developer must not reintroduce it.
  - B: contradicts ADR 0024, and makes DICE-007's atomic finish-and-cancel impossible without a cross-context transaction. The Developer must not reintroduce it.

### D2: How the Wall shows a Roll Request card
| Metric | A: Wall query embeds the Roll Request view (server composition through a Campaign Play port) | B: Wall Entry carries `rollRequestId`; the card reads `GET /roll-requests/{id}` (client composition) |
| --- | --- | --- |
| Consistency | + matches the spec wording "GET entries gain `rollRequest`" (`campaign-play/spec.md:49`) | 0 the spec defers this choice to this record (same line), and needs a one-line spec change; follows the ADR 0028 host-adapts pattern |
| Modifiability | - every change to the card's data (DICE-006/007/009) also changes a Campaign Play port, its records, and a second wire mapper | + later PBIs change only Scene Play's view and the card |
| Testability | 0 Wall tests need a fake card port | + Wall tests are unchanged except for kind and id; card tests stand alone |
| Simplicity | - a new port, a duplicated view shape, an adapter from Campaign Play into Scene Play (a new reverse dependency), and two JSON mappers for one shape | + two columns and one field on the Wall; no new port |
| Reversibility | - removing the embedded field later breaks the Wall contract | + embedding later is additive |
| Security and correctness | + one authorized read | + REST authorizes every read (ADR 0009); the entry has the request's visibility, so a Player never gets a `KeeperOnly` id; the GET returns 404 to a Player for `KeeperOnly` |
| Performance | + one HTTP call per Wall page | 0 one extra GET per visible card (at most 5 on the preview, at most a page on the Wall), cached by TanStack Query; a result refetches only that card, not the Wall |

- **Chosen: B.**
  - **Why:** modifiability (three follow-up PBIs change the card), simplicity, and reversibility.
  - **Giving up:** a single round trip per Wall page, and the spec's "embedded" wording. `specs/campaign-play/spec.md:49` becomes "`GET` entries gain `kind` and, for a `RollRequest` entry, `rollRequestId`".
- **Rejected:**
  - A: it couples Campaign Play to the card's shape. The Developer must not reintroduce it.
  - Also rejected without scoring: snapshotting the Roll Request into the Wall Entry. It contradicts the constraint that a `RollRequest` Wall Entry never changes (`roll-requests/spec.md:43`).
- **Wall Entry model:**
  - `WallEntryKind { Text, RollRequest }`, a nullable `RollRequestId`, and an empty `Text` for `RollRequest`.
  - A unique filtered index on `RollRequestId`, so there is one card per request.
  - `WallEntry.RecordRollRequest(campaign, keeperAccountId, rollRequestId, visibility, now)` refuses a non-Keeper and raises `WallEntryAdded`. The existing handler then publishes `wallEntries`.
  - `RemoveAsync` keeps the non-Keeper 404 first (`WallEntryService.cs:85-88`). It then returns a new `RemoveWallEntryOutcome.NotRemovable` for a `RollRequest` entry, which maps to 409 (`WallEntriesController.cs:85`).
  - `POST` never creates a `RollRequest` entry.

### D3: The Roll Record shape for percentile rolls
| Metric | A: extend the shared `RollRecord` with optional `Percentile` (a `PercentileRoll`) and `EarnsExperienceCheck` | B: keep `RollRecord`; Roll Requests store their own `RequestedRollRecord(RollRecord, PercentileRoll, bool)` |
| --- | --- | --- |
| Consistency | + the dice spec puts `percentile` on the Roll Record (`dice/spec.md:16`); the roll-requests spec puts `earnsExperienceCheck` there (`:15`) | - a second record shape next to the spec's |
| Modifiability | + Combat and the development phase reuse one shape | 0 each consumer wraps its own |
| Testability | + value equality is covered once | 0 |
| Simplicity | + two optional members | - a wrapper type and its mapping |
| Reversibility | 0 optional members with null defaults | + |
| Security and correctness | 0 the `Equals` and `GetHashCode` overrides (`RollRecord.cs:33-44`) must include the new members; Character Sheet JSON keeps null | + |

- **Chosen: A.**
  - **Why:** consistency with two specs, and simplicity.
  - **Giving up:** a slightly wider shared record. Character Sheet records leave both members null; `CharacterSheetJsonStorage` needs no change and must stay byte-compatible.
- **Rejected:** B, a second shape for the same concept. The Developer must not reintroduce it.

### D4: Scope of the cancel, push, and hidden endpoints
| Metric | A: build create, get, mine, roll, and the Keeper list (D5) now; defer cancel, push, approve, decline, and `KeeperOnly` | B: build every endpoint of the spec now |
| --- | --- | --- |
| Consistency | + matches the PBI's out-of-scope list and DICE-006, 007, and 009 | - takes over three PBIs' scope and their UX |
| Modifiability | + the model keeps `Visibility` and an extensible `RequestedRollStatus`, so the later PBIs are additive | 0 |
| Testability | + 13 scenarios in this PBI | - roughly doubles the E2E scope |
| Simplicity | + | - |
| Reversibility | + | 0 |
| Security and correctness | + `visibility: KeeperOnly` returns 400 until DICE-006 (fail closed: never stored as Public) | 0 |

- **Chosen: A.**
  - **Why:** consistency with the backlog, and simplicity.
  - **Details:** `RequestedRollStatus` has only `Waiting` and `Rolled` now; DICE-007 and 009 add theirs. `Visibility` is stored now (always Public), and the publication policy already fails closed for anything not Public.
  - **Giving up:** a temporary 400 for `KeeperOnly`. The spec gets an interim note (Implementation plan step 1).
- **Rejected:** B. The Developer must not build those endpoints, statuses, or controls.

### D5: How the Keeper reads the Active Scene's Roll Requests (the "Waiting rolls" list and the Keeper badge)
| Metric | A: new `GET /api/campaigns/{campaignId}/active-scene/roll-requests`, Keeper only | B: add `rollRequests` to the Keeper's Active Scene read |
| --- | --- | --- |
| Consistency | + one resource per read, like Clues and held Items | - the `activeScene` topic would also have to fire on every roll |
| Modifiability | + DICE-006/007/009 reuse it for their Keeper actions; DICE-008 reads by Scene separately | - couples the Scene read to rolls |
| Testability | + | 0 |
| Simplicity | 0 one endpoint (a spec addition) | 0 no endpoint, but a larger view |
| Reversibility | + | 0 |
| Security and correctness | + 404 to a Player; 200 with an empty list when no Scene is Active | 0 |

- **Chosen: A.**
  - **Why:** consistency and modifiability.
  - **Giving up:** a spec addition, since the spec lists no Keeper list read; it is added at `roll-requests/spec.md` under API Contracts.
- **Rejected:** B. The Developer must not reintroduce it.

### Single-option decisions
- **The percentile roll resolver** goes in `GameRules.Domain/Dice/` as `PercentileRolling`:
  - A pure `Resolve(input)` over the input and output of `dice/spec.md:13`, implementing skill rolls sections 1-5, plus project_ruleset section 4.7 through the same algorithm.
  - A `Roll(IDiceRoller, targetValue, difficulty, bonusDice, penaltyDice)` that draws one units die and 1+|net| tens dice and calls `Resolve`.
  - It references no Campaign, Account, Investigator, Scene, or skill type, as the spec says.
- **Experience-check flag.**
  - At creation, Campaign Play's value query returns `CanEarnExperienceCheck`. It is false for Credit Rating and Cthulhu Mythos (character rules 16.1) and for characteristic and Luck targets. It is snapshotted on the Requested Roll.
  - At roll time: `EarnsExperienceCheck = CanEarnExperienceCheck && percentile.IsSuccess && !(bonusDice > penaltyDice)`. The last part implements character rules 16.1 with project_ruleset 4.9 (net reading).
  - This expression lives in one function in `GameRules.Domain` (outside `Dice/`), for example `Development/ExperienceCheck.cs`, with a comment citing 16.1 and 4.9.
  - Reason: the skill exclusions need the catalog's skill identity, which Campaign Play owns (`SkillReference.CreditRating`). The rule stays in one place.
- **Target values are snapshotted at creation**, not looked up at roll time.
  - Reason: the card shows the target values while a roll is Waiting (ux.md section 5), and what the Player was asked to roll against must not move under them. The Roll Request's target is immutable (`roll-requests/spec.md:43`).
  - The value comes from the Approved Character Sheet through `CharacterSheetCalculator` (`CharacterSheetCalculator.cs:84-93`): the skill row's value, final characteristics after age, or derived Luck. A skill the Investigator lacks uses `SkillBases.Resolve` (`SkillBases.cs:27-40`), sections 6.1 and 6.2. `UsesBaseValue` is set accordingly.
- **Rolled once:** the domain refuses anything but `Waiting`. A `DbUpdateConcurrencyException` on the `RequestedRolls.Version` token also maps to "not Waiting". Both return 409, and no Roll Record is added.
- **Scene check on every state change:** the provider loads the request's Scene status. Not Active means 409 (`roll-requests/spec.md:31`).
  - A race between Finish and a roll is benign in DICE-005: a roll may commit just after Finish.
  - DICE-007 closes the race, because Finish will modify the same Waiting rows (Version conflict).
- **The Wall Entry is added after the Roll Request commits, best-effort,** through an extended `ISceneWallEntries.AddRollRequestAsync`. Same port and adapter as `CampaignPlayAdapters.cs:37-54`. A failure is logged and does not fail the 201 (ADR 0024).
  - Failing the request or adding an outbox stay rejected, for ADR 0024's reasons.
  - The panel and "Waiting rolls" still work without the card.
- **Live publication:**
  - After each committed change, Scene Play calls a new port `IRollRequestSignals.RollRequestChangedAsync(campaignId, visibility, affectedPlayerAccountIds)`. The adapter calls a new Campaign Play `PublishRollRequestChanged`, which uses a new policy method `CampaignLivePublicationPolicy.ForRollRequestChanged(campaignId, visibility, playerAccountIds)`.
  - **Public:** `rollRequests` goes to `campaign:{id}`, and `myRequestedRolls` goes to each distinct affected Player's `account:{id}`.
  - **Anything else:** `rollRequests` goes to `campaign:{id}:keeper` only, and no account topics are sent (fail closed).
  - This is the ADR 0024 path, with no domain events. `CampaignDataTopic` gains `RollRequests` and `MyRequestedRolls`. Hub methods are unchanged.
- **Affected Players:**
  - Create: the Players of every targeted Investigator.
  - Roll: the rolled Investigator's Player, whoever rolled it.
- **Rolling authorization:**
  - The Keeper may roll any Requested Roll.
  - A Player may roll only an Investigator whose `PlayerAccountId` is theirs (`IApprovedInvestigators`, `ScenePlayPorts.cs:20-23`).
  - Anyone else gets 404, decided before any write.
- **An Investigator removed from the Investigators present keeps their Waiting rolls, and the rolls stay rollable,** until DICE-007. The roll needs only an Active Scene (spec line 31), and the spec's guardrail is about presence at creation (`roll-requests/spec.md:64`).
- **Account ids never appear in views.** Rollers are shown by display name, through a new Scene Play port `IAccountNames` adapted over Campaign Play's `IAccountDisplayNames` (used by `WallEntryService.cs:105-106`). This is the same rule as the Wall projection (`campaign-play/spec.md:45`).
- **The frontend slice** is `frontend/src/roll-requests/`, named after `specs/roll-requests` (frontend/CLAUDE.md). The Wall hosts its card (ADR 0028).
- **Announcement merging:**
  - The existing `wallEntryAnnouncementThrottle` reducer is generalized to take its `describe` function, so the Player's Requested Rolls reuse it. This is DRY over a copy.
  - The Wall's behavior and tests stay unchanged.

## Patterns
- **Used:**
  - **Adapter** in `ScenePlay.Infrastructure`:
    - `ScenarioPreparationRollRequests` onto `SceneRollRequestService`;
    - `CampaignPlayInvestigatorTargetValues` onto `InvestigatorTargetValueQuery`;
    - `CampaignPlayRollRequestSignals` onto `PublishRollRequestChanged`;
    - `CampaignPlayAccountNames` onto `IAccountDisplayNames`;
    - the extended `CampaignPlaySceneWallEntries`.
    - Force: incompatible interfaces at a context boundary (ADR 0008, ADR 0024). This is the existing pattern.
  - **Facade** (provider service): `SceneRollRequestService` in `ScenarioPreparation.Application`. Force: Scene Play needs create, read, and roll on an aggregate it can't reference. Same as `SceneRevealService.cs:10-52`.
  - **Factory Method with an outcome:**
    - `RollRequest.Create(...)` returns a `RollRequestCreation(outcome, request)`;
    - `WallEntry.RecordRollRequest(...)` returns the same shape as `WallEntry.Author`.
    - Force: construction with several refusals (Luck rules, dice limits, duplicate or absent Investigators). This is the existing `WallEntry.Author` pattern (`WallEntry.cs:35-61`).
- **Rejected:**
  - **State** for `RequestedRollStatus`: two states and one transition now; a guard clause suffices. DICE-009 (three more states) should reconsider it if `RequestedRoll` methods exceed complexity 10.
  - **Strategy** for target kinds (Skill, Characteristic, Luck): a three-arm switch expression stays well within complexity 10, and a strategy per kind is a speculative layer.
  - **Observer** via domain events for Roll Request changes: the change commits in Scenario Preparation's context, which has no dispatcher (ADR 0024, rejected option). The existing explicit-port path is used.
  - **Command** for rolls: no queue, log, or undo is needed. The Roll Record is the log.
  - **Decorator** for best-effort Wall and signal calls: `ActiveSceneService` already uses private `Try...` helpers (`ActiveSceneService.cs:134-156`). The new service follows the same shape; a shared decorator would be a second way of doing it.

## Invariants
- **Dice:**
  - Every die face comes from `IDiceRoller` on the server, and no endpoint accepts faces or results.
  - The resolver is deterministic, and its code and tests cite skill rolls sections.
  - The Dice module references no Campaign, Account, Investigator, Scene, or skill types.
- **Rolled once:** a Requested Roll leaves `Waiting` at most once. A second roll returns 409 and adds no Roll Record. Roll Records, a Roll Request's target, message, and visibility, and a `RollRequest` Wall Entry never change after creation.
- **Who may do what:**
  - A non-Keeper creating gets 404 before any Scene, value, Wall, or live port is touched.
  - A Player rolling another's Investigator gets 404, and nothing changes.
  - Non-members get 404 on every endpoint.
- **Status codes:**
  - No Active Scene on create, or a Scene no longer Active on roll: 409.
  - An Investigator not present, a duplicate or empty list, an unknown or unallowed target, Luck with a non-Regular Difficulty or with dice, dice outside 0..2, a message over 2000, or `KeeperOnly`: 400.
- **Visibility:**
  - `KeeperOnly` is never stored in DICE-005.
  - The publication policy sends anything not Public to the Keeper group only.
  - `myRequestedRolls` never goes to `campaign:{id}`.
- **Wall card:**
  - A `RollRequest` Wall Entry has no text, has exactly one Roll Request, and is unique per Roll Request.
  - DELETE returns 409 to the Keeper and 404 to everyone else, unchanged in order.
- **Values:**
  - Target values are snapshotted from the Approved Character Sheet at creation.
  - A missing skill uses its catalog base, and the flag says so.
  - The experience-check flag follows 16.1 with 4.9 (net Bonus Dice only) and is false for non-skill targets.
- **Boundaries and live topics:**
  - Scene Play Application and Controllers reference nothing in Scenario Preparation or Campaign Play.
  - The topic set grows by exactly `rollRequests` and `myRequestedRolls`, with no hub method changes.
- **Code quality:**
  - Complexity stays at 10 or below, with no new suppressions or baseline growth.
  - The Character Sheet's stored Roll Records and their JSON are unchanged.

## Implementation plan
1. **Design artifacts:** committed by the Architect after approval, listed under Human decisions and ADR. The Developer also adds the CONTEXT.md term "Experience check" (the Constraints gap), with the definition: "The mark a successful skill roll can earn for later improvement, per character rules section 16.1."
2. **`GameRules.Domain/Dice/`:**
   - `Difficulty`, `SuccessLevel`, `PercentileRoll`, and `PercentileRolling` (Resolve and Roll).
   - `RollRecord` gains `Percentile` and `EarnsExperienceCheck`, included in `Equals` and `GetHashCode`.
   - `GameRules.Domain/Development/ExperienceCheck.cs`.
   - Why: every other step depends on them.
3. **Campaign Play: the Wall Entry kind.**
   - `WallEntryKind`, `WallEntry.RollRequestId`, `WallEntry.RecordRollRequest`, and `RemoveWallEntryOutcome.NotRemovable`.
   - `WallEntryService.AddRollRequestAsync` and the `RemoveAsync` 409 branch; `WallEntryView` gains `Kind` and `RollRequestId`.
   - The EF config and a migration (Kind default `Text`; unique filtered index on `RollRequestId`).
   - `WallEntryWireFormat` and the responses (`kind`, `rollRequestId`); `WallEntriesController` DELETE 409.
4. **Campaign Play: live updates.**
   - `CampaignDataTopic.RollRequests` and `MyRequestedRolls`.
   - `CampaignLivePublicationPolicy.ForRollRequestChanged` and `PublishRollRequestChanged`.
5. **Campaign Play: target values.**
   - `InvestigatorTargetValueQuery`: provider, no authorization. Input: the Campaign, a target, and Investigator ids. Output: per Investigator `{value, usesBaseValue, canEarnExperienceCheck}`, or a refusal (`UnknownTarget`, `SpecializationRequired`, `SpecializationNotAllowed`, `InvestigatorNotApproved`).
   - It uses the Era's `CreationRuleSet` and `CharacterSheetCalculator`.
6. **Scenario Preparation:**
   - `Domain/RollRequests/`: `RollRequest`, `RequestedRoll`, `RollTarget`, `RequestedRollStatus`, and the creation outcomes.
   - EF config for the two tables (`RollRecords` as JSON, following the `CharacterSheetJsonStorage.RollRecordDocument` mapping) and a migration.
   - `ISceneRollRequestRepository` and the EF implementation.
   - `SceneRollRequestService` (create on the Active Scene, which checks present and duplicates; find; list for the Active Scene; list Waiting for one Investigator; roll with `IDiceRoller` and `TimeProvider`).
7. **Scene Play Application:**
   - The ports `IRollRequests`, `IInvestigatorTargetValues`, `IRollRequestSignals`, `IAccountNames`, and `ISceneWallEntries.AddRollRequestAsync`.
   - `RollRequestService`, with this create order: Keeper check, Active Scene (409), shape validation (400), approved and values (400), provider create, Wall (best-effort), signal (best-effort). It also has get, list for the Keeper, mine, and roll.
   - `RollRequestProjection`, with views that contain no Account ids.
8. **Scene Play Infrastructure and Controllers:**
   - The adapters, and the DI registration in `ScenePlayInfrastructureServiceCollectionExtensions`.
   - `RollRequestsController` with the five endpoints, `RollRequestContracts`, and the wire mapping.
9. **Frontend: data.**
   - `roll-requests/types`, `services/rollRequestApi.ts` (zod; `rollRequestQueryKeys` with `all`, `detail`, `activeScene`, and `mine`).
   - `liveTopics.ts`: `rollRequests` maps to `rollRequestQueryKeys.all(campaignId)`, and `myRequestedRolls` maps to `rollRequestQueryKeys.mine(campaignId)`.
   - `WallEntry` types gain `kind` and `rollRequestId`.
10. **Frontend: components** (ux.md sections 3 to 7):
    - `roll-request-form`, `waiting-rolls`, `roll-request-card`, and `waiting-rolls-panel`, each with stories and tests.
    - Hosts: `run-view` slot, `wall-entry-list`, `wall-preview` (no clamp, no Remove), `active-scene-player-view`, the `campaign-header` count, and the `campaign-layout` badge queries plus the assertive region with the generalized throttle.
11. **Spec trace:**
    - Tick nothing in the PBI.
    - Cite RR-UX and RR-A11Y ids in tests.
12. **Tests and E2E,** as below.

## Reuse
- **Using:**
  - `ICampaignRoles`, `IApprovedInvestigators`, and their adapters (`CampaignPlayAdapters.cs:4-34`).
  - `ISceneWallEntries` and its adapter, extended.
  - `CampaignLivePublicationPolicy` and `LivePublicationSender`.
  - `ApprovedInvestigatorQuery` (Investigator to Player).
  - `CharacterSheetCalculator`, `SkillBases`, and `SkillReference.CreditRating`.
  - `IDiceRoller` and `ScriptedDiceRoller` (tests).
  - `GET /rules/skills` and `ruleDataApi.ts` for the target picker.
  - `Badge`, `LiveBadge`, `active-scene-wall`, and `wall-preview`.
  - `wallEntryAnnouncementThrottle`, generalized.
  - The `CharacterSheetJsonStorage` Roll Record document mapping pattern.
  - E2E: `openAndCaptureBearer` plus `page.request` for status-code checks (the DICE-002 approach).
- **Not using:**
  - `cmdk` or a combobox: a new dependency; the grouped `Select` suffices.
  - `RevealDialog`: Option B was rejected.
  - The domain event dispatcher for Roll Requests: ADR 0024.
  - A test-only dice seam in the running API: ADR 0030 and `dice/spec.md:35` allow only `SecureDiceRoller` to be registered.

## TDD units
- **GameRules: resolver** (each test names its section):
  - "1 with 0 tens and 0 units reads 100" (section 1).
  - Hard and Extreme targets are floored (section 2).
  - Each Difficulty's required target (section 3).
  - Critical at 01, including target 0 (sections 4.2 and project 4.7).
  - Fumble at 96+ when the required target is below 50, and only at 100 otherwise (section 4.2).
  - Every Success Level at Regular, Hard, and Extreme (section 4.3).
  - "Hard 45 at target 60 is Regular, not a success" (section 4.3, the dice spec Gherkin).
  - One and two Bonus Dice keep the minimum; one and two Penalty Dice keep the maximum; one Bonus and one Penalty Die cancel (one tens die); the net is clamped at plus or minus 2 (section 5); the dice spec's 23 and 73 scenarios.
- **GameRules: `Roll`** draws exactly 1+|net| tens dice and 1 units die from a scripted roller.
- **GameRules: `ExperienceCheck`:**
  - True for a success with no Bonus Die.
  - False for a failure.
  - False for a success with 1 Bonus and 0 Penalty Dice.
  - True for a success with 1 Bonus and 1 Penalty Die (project 4.9).
  - False when the skill can't earn a check (16.1).
- **GameRules: `RollRecord`** equality includes `Percentile` and `EarnsExperienceCheck`.
- **Campaign Play: Wall:**
  - `RecordRollRequest` refuses a non-Keeper, and creates an entry with an empty text and the kind.
  - `RemoveAsync`: Keeper on a `RollRequest` entry gets `NotRemovable`; Player gets `NotFound` (unchanged).
  - The list view carries `kind` and `rollRequestId`.
  - Visibility filtering is unchanged.
- **Campaign Play: policy `ForRollRequestChanged`:**
  - Public gives the campaign plus each distinct account.
  - Not Public gives the keeper only, with no accounts.
  - No `myRequestedRolls` goes to the campaign group.
- **Campaign Play: `InvestigatorTargetValueQuery`:**
  - A skill value from the sheet.
  - A missing skill gives the base with `usesBaseValue` (section 6.1).
  - A specialization is resolved (6.2, project 4.2).
  - The characteristic after age.
  - Luck.
  - Credit Rating and Cthulhu Mythos give `canEarnExperienceCheck = false`.
  - The refusals.
- **Scenario Preparation: `RollRequest.Create`:**
  - Refuses an empty list, duplicates, an Investigator not present, Luck with Hard or with dice (project 4.8), dice above 2 (section 5), and a message over 2000.
  - Trims the message.
  - Per-Investigator overrides fall back to the defaults.
- **Scenario Preparation: `RequestedRoll.Roll`:**
  - `Waiting` becomes `Rolled`, with one Roll Record whose purpose is `RollRequest:{id}:{investigatorId}`, the percentile, the flag, the roller, and the time.
  - A second roll is refused.
- **Scenario Preparation: `SceneRollRequestService`:** no Active Scene gives `NoActiveScene`; a Finished Scene's roll gives `SceneNotActive`; a concurrency conflict gives "not Waiting".
- **Scene Play: `RollRequestService`:**
  - Order: Keeper check first; Active Scene before validation.
  - The Wall and signal failures are logged and the request still succeeds.
  - The affected accounts for create and roll.
  - A Player rolling their own Investigator succeeds; a Player rolling another's gets `NotFound`; the Keeper rolls any.
  - `mine` gives 404 without an Approved Investigator, and an empty list without an Active Scene.
  - The Keeper list is NotFound for a Player.
  - `KeeperOnly` is refused.
- **Integration** (`CocAssistant.Api.IntegrationTests`, ScenePlay folder): each endpoint's status codes per the spec; DELETE of a `RollRequest` Wall Entry returns 409; a non-member gets 404 everywhere.
- **Frontend** (Vitest; the RR-UX and RR-A11Y ids in test names):
  - Form: RR-UX-2 to RR-UX-6, RR-A11Y-1 to 4.
  - Waiting list: RR-UX-7, focus per section 4.
  - Card: RR-UX-10, RR-UX-11, RR-A11Y-6 and 7; outcome copy for every level; faces copy for 1 and 2 tens dice; no Remove.
  - Panel: RR-UX-8, RR-UX-9, RR-A11Y-4.
  - Header count names: RR-UX-12; the existing NAV-UX-3 tests stay green.
  - Assertive announcement: RR-UX-13, RR-A11Y-5; no announcement on first load; merge window.
  - `liveTopics`: the two new topics.
  - Generalized throttle: the Wall's existing tests are unchanged.
- **Storybook:** stories for the form (default, Luck, overrides open, error), the Waiting list (empty, rows, rolling), the card (Waiting, rolled success with a check, failure, Penalty Die with two tens, base value, loading, error, later-PBI placeholders as a story only), and the panel (one, two, result).

## E2E coverage
- **New file:** `e2e/tests/roll-requests.spec.ts`, plus `e2e/fixtures/roll-requests.ts` (`requestRollViaUi`, `rollFromPanel`, `rollForViaUi`, and a result oracle `expectedOutcome(result, value, difficulty)` that cites skill rolls 4.3).
- **Why the oracle and the bounded loop:**
  - Server dice are random in the running app (ADR 0030, `dice/spec.md:35`).
  - So result-dependent scenarios assert that the card's outcome and experience line agree with its own displayed faces and targets, through the oracle.
  - The exact mapping (for example 25 against 60 is Hard) is covered by the resolver unit tests.
  - The success case is reached by a bounded loop: up to 10 requests against a skill of at least 60, where all failing has probability below 0.4^10.
- **Scenario to test mapping:**
  - **"Keeper requests a skill roll from two Investigators"** -> test with steps RR-UX-6 (status, one card, both Waiting) and RR-UX-8 plus RR-UX-12 (both Players see the panel and the badge without reloading).
  - **"A Player rolls a Requested Roll"** -> RR-UX-9 (panel result) and RR-UX-10 (every member's card shows faces, targets, and outcome without reloading, with "Rolled by {Player}"). The literal "server rolls 25" is a documented exception, covered by the unit tests.
  - **"The Keeper rolls for an absent Player"** -> RR-UX-7 (Lucy's Player context closed; "Roll for Lucy Ward"; "Rolled by {Keeper}").
  - **"Per-Investigator Difficulty and Penalty Die"** -> RR-UX-4. Lucy's card row reads "Regular . 1 Penalty Die", and Harvey's reads "Regular . no Bonus or Penalty Dice".
  - **"A skill the Investigator lacks uses its catalog base value"** -> a card row with "(base value)" and the catalog base value for the fixture skill.
  - **"A Player cannot roll for another Investigator"** -> `page.request.post` of Lucy's roll as Harvey's Player gives 404. Lucy's card row is still Waiting; RR-UX-14 (no control).
  - **"A Requested Roll is rolled only once"** -> after a UI roll, `page.request.post` again gives 409, and the card shows one result.
  - **"A successful skill roll earns an experience check"** -> the bounded loop to a success, then "Experience check earned" on the row (RR-UX-11). The Player's sheet shows no change.
  - **"A success with a Bonus Die earns no experience check"** -> a request with 1 Bonus Die and 0 Penalty Dice. After the roll, "Experience check earned" is absent whatever the result.
  - **"A Roll Request needs an Active Scene"** -> after Finish, `page.request.post` create gives 409, and no new card appears.
  - **"Only Investigators present can be targeted"** -> `page.request.post` with an Approved Investigator who isn't present gives 400, and no card appears.
  - **"A Roll Request card cannot be removed"** -> the Keeper sees no "Remove" on the card (WL-UX-7 amended). `page.request.delete` of the entry gives 409, and the card stays.
  - **"Players cannot create Roll Requests"** -> the Player sees no form (RR-UX-14). `page.request.post` create gives 404.
- **Checked against existing criteria:**
  - NAV-UX-3: Playwright matches `name: 'Active Scene, live'` as a substring by default, so `e2e/tests/navigation.spec.ts:67-198` still pass with the count suffix. The exact-match assertion at `:38` runs without an Active Scene, so it has no count.
  - WL-UX-7 (no Remove on cards) and WL-UX-9 (preview at most 5, cards count as entries) are amended in ux.md section 9.
  - CO-A11Y-7 (polite live regions) is amended for the assertive region in ux.md section 9.
  - SPL-UX-50 (Run order) is amended in ux.md section 9.
  - The vitest name assertions in `campaign-header.test.tsx:80-91` and `campaign-layout.test.tsx:132-170` render without counts and stay valid.
- **Not covered by E2E in this PBI:** the hidden, cancel, and push scenarios of the spec (DICE-006, 007, and 009).

## ADR
- **ADR 0032 to write:** "Roll Requests are an aggregate beside the Scene in Scenario Preparation" (D1). It extends ADR 0024 and 0029.
- **ADR 0033 to write:** "Wall Entries reference play records by id and the client composes their card" (D2). It changes the shared Wall Entry model, and is the pattern future Wall kinds (for example Combat) will copy.
- **No ADR for D3, D4, or D5:** these are additive and easily reversed, and are recorded here.

## Phases
- **Phase 1:** GameRules resolver, experience check, and the RollRecord extension, with unit tests. Checkpoint: `feat(dice): percentile roll resolver and experience-check rule (PBI-DICE-005)`.
- **Phase 2:** Campaign Play Wall Entry kind, DELETE 409, topics, policy, publisher, and target value query, with migrations and tests. Checkpoint: `feat(campaign-play): RollRequest Wall Entry kind and roll request live topics (PBI-DICE-005)`.
- **Phase 3:** Scenario Preparation aggregate, persistence, migration, and provider service. Checkpoint: `feat(scenario-preparation): Roll Request aggregate beside the Scene (PBI-DICE-005)`.
- **Phase 4:** Scene Play service, ports, adapters, controller, and integration tests. Checkpoint: `feat(scene-play): request and roll Requested Rolls in the Active Scene (PBI-DICE-005)`.
- **Phase 5:** Frontend data, components, hosts, badge, and announcement, with tests and stories. Checkpoint: `feat(frontend): Roll Request tool, card, panel, and badge (PBI-DICE-005)`.
- **Phase 6:** E2E. Checkpoint: `test(e2e): roll requests scenarios (PBI-DICE-005)`.

## Human decisions
- **2026-11-12, UX:** Option A, "Roll tool inline on Run", with no changes. The prototype used for the selection is kept as evidence on the local, never-merged branch `prototype/dice-005-roll-requests`, file `specs/roll-requests/prototype/roll-requests-prototype.html`, and referenced from ux.md section 12.
- **2026-11-12, form values:** confirmed. The request form leaves out each Investigator's target value; the values appear on the card (ux.md section 12, deviation 1). The Developer must not add a values preview read.
- **2026-11-12, plan gate:** the decision record was approved with no changes to D1 to D5, the single-option decisions, the ADRs, or the phases. The spec and game-rules edits listed below were accepted.
- **2026-11-12, Q2:** the Keeper also gets a Waiting-rolls count on the Campaign "Active Scene" tab.
- **2026-11-12, Q3:** skill-roll rows on the card show "Experience check earned".
- **2026-11-12, Q4: held until PBI-DICE-007.**
  - DICE-005 builds no automatic cancellation on Finish Scene or on removing an Investigator present, and no Finish-dialog count.
  - **Deferred (to PBI-DICE-007, which already scopes them in `docs/dice/issues/07-cancel-waiting-rolls.md`):**
    - `specs/roll-requests/spec.md:21` (Lifecycle with the Scene);
    - `:56` (Definition of Done, the "finishing the Scene or removing an Investigator present cancels" half);
    - `:119-127` (the scenarios "Finishing the Scene cancels waiting rolls" and "Removing an Investigator present cancels their waiting rolls");
    - `specs/scene-play/spec.md:57` (the cancellation half).
  - **Interim inconsistency:** a Requested Roll can stay Waiting after its Scene is Finished. It can't be rolled (409, spec line 31), it drops out of the panel and badges (they read the Active Scene, spec line 26), and its card keeps "Waiting". While the Scene is Active, a removed Investigator's Waiting roll stays rollable.
  - **Spec note added** under "Lifecycle with the Scene": "Until PBI-DICE-007: finishing the Active Scene or removing an Investigator present leaves their Requested Rolls as they are. A Waiting roll of a Finished Scene can no longer be rolled (409), leaves the waiting-rolls panel and the badge, and its card keeps showing Waiting." DICE-007 removes the note.
  - **PBI Follow-ups entry:** "Cancelling waiting rolls on Finish Scene and on removing an Investigator present, and the Finish-dialog count, are deferred (design record, Human decisions Q4) -> PBI-DICE-007".
- **2026-11-12, Q1:** reading (b). Only a net Bonus Die (Bonus Dice outnumber Penalty Dice) means the success "used a Bonus Die" (character rules 16.1). One Bonus Die and one Penalty Die can still earn a check.
  - This is recorded as the house rule `docs/game-rules/project_ruleset.md` section 4.9, "Experience checks when Bonus Dice are cancelled".
  - It is listed in `docs/game-rules/coc7_skill_rolls_rules.md` section 9.
  - The skill rolls section 5 sentence on experience checks gains a link to 4.9.
  - The spec scenario "A success with a Bonus Die earns no experience check" says "one Bonus Die and no Penalty Die", with `# Rule: character rules section 16.1; project_ruleset.md section 4.9`.
- **Spec changes made by this record** (committed with it):
  - `specs/roll-requests/spec.md`:
    - the ux.md link (line 22);
    - the Keeper list endpoint (D5);
    - "the Wall Entry carries the Roll Request id; the card reads the Roll Request" (D2, line 18 and the open decision at line 17, which also gets D1's answer);
    - the interim notes for `KeeperOnly` (D4) and the lifecycle (Q4);
    - the scenario wording (Q1).
  - `specs/campaign-play/spec.md:49`: "`rollRequest`" becomes "`rollRequestId`" (D2).

## Revisions

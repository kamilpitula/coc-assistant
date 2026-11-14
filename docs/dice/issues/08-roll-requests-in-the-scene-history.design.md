# Design: PBI-DICE-008: Each Scene's Roll Requests listed inside it in the Scene History, all for the Keeper, Public only for a Player

## Triggers
- 2 (shared interface / data model): `PlayedScene`, the Keeper and Player history views, the Scene History response contracts, and a new provider read (all Roll Requests of a Campaign).
- 3 (cross-layer pattern): Roll Requests enter the Scene History read model through the existing `ISceneHistory` adapter. A live topic (`rollRequests`) gains a new client consumer.
- 6 (Explorer open questions): embedding versus a read per card (N+1), live topics, statuses, order, and Player scope.
- 7 (UX): new content in an existing screen. Option A was selected.

## Constraints
- ADR 0008 / ADR 0024: Scene Play reads Scenario Preparation only through consumer-owned ports and adapters. Authorization stays in Scene Play application services. Providers and repositories do none (`SceneHistoryService.cs:3-7`, `ScenePlayPorts.cs:142-147`).
- ADR 0032: Roll Requests are an aggregate beside the Scene in Scenario Preparation. They are read through `SceneRollRequestService` and `ISceneRollRequestRepository` (`EfSceneRollRequestRepository.cs:21-28`).
- ADR 0033: Wall Entries reference Roll Requests by id and the client composes the card. It binds the Wall, not the Scene History. D1 is a deliberate second delivery path, with its reason recorded in ADR 0035.
- ADR 0009: invalidation-only topics, with the audience decided by `CampaignLivePublicationPolicy`. `rollRequests` goes to the Campaign for Public and to the Keeper group for anything else (`CampaignLivePublicationPolicy.cs:56-66`; specs/roll-requests/spec.md, Live updates).
- ADR 0013: a non-member or a missing Campaign gets 404. ADR 0023: the `GET scene-history` row in `ScenePlayAuthorizationMatrixTests`.
- ADR 0028: hosts adapt. The card stays in the roll-requests slice and scene-play hosts it.
- specs/roll-requests/spec.md: Visibility of results; Scene History; Live updates. specs/scene-play/spec.md: `GET .../scene-history`, Live updates, Constraints, Regression Guardrails.
- Scene History behaviour in the PBI-SPL-004 design record (history, not binding): the Player view type carries no present list or recipients (`SceneHistoryViews.cs:14-24`), and Reveals are newest first in the projection (`SceneHistoryProjection.cs:18, 29-33`).
- CONTEXT.md: Scene History (avoid "timeline", "log", "play order"), Roll Request, Requested Roll, Hidden roll. No conflict found.
- Game rules: none apply. This PBI governs listing and visibility only.
- CLAUDE.md: complexity at most 10, unit tests, E2E, ASCII.

## UX
- Selected option: Option A (Roll Request cards mixed into each Scene's list), with "all Public rolls" for a Player, Cancelled rows hidden, and the order consistent with the other history items (newest first).
- `specs/scene-play/ux.md` section 23.11 (new; amends 23.2 to 23.6, SPL-UX-63, SPL-UX-64, SPL-UX-68; adds SPL-UX-73 to 77, SPL-A11Y-28 and 29).
- `specs/roll-requests/ux.md` sections 12.2 and 18 (new), with amendments to sections 1, 5, 9, 11, 13, 17.2, RR-UX-21 and RR-UX-23; adds RR-UX-24 and RR-A11Y-17.
- Prototype: `prototype/dice-008-roll-requests-in-scene-history`, commit `0eb9472` (local, never merged).

## Decisions

### D1: How Roll Requests reach the Scene History page
| Metric | Option A: embed the projected Roll Request views in the history response; split the card into a loader and a view | Option B: the history carries references (id, createdAt); the card loads each by id (ADR 0033 shape) |
| --- | --- | --- |
| Consistency | 0 a second delivery path beside ADR 0033, but history already embeds Reveal views the same way (`SceneHistoryProjection.cs:18`), and both reads live in Scene Play, so ADR 0033's cross-context reason does not apply | + the same shape as the Wall |
| Modifiability | + a later card change (DICE-009 push states) changes `RollRequestView` once; history and GET-by-id share the projection | + the card contract stays private to GET-by-id |
| Testability | + one response shows all visibility, testable in `SceneHistoryApiTests` and the matrix; the empty sentence and Cancelled hiding are pure functions over data in hand | - the Scene cannot know whether a card has rows left after hiding Cancelled ones until each card has loaded |
| Simplicity | 0 card split (a view plus the existing loader); history contracts grow by one array | - per-card loading, error and retry states in a history list; Cancelled hiding needs a server rule or post-load counting |
| Reversibility | + additive field; dropping it later is a contract change confined to one page | + easy |
| Security and correctness | + one projection applies the visibility rule; the Player zod schema pins `visibility: 'Public'` (fails closed) | + GET-by-id already returns 404 for a Player and a Keeper-only request (`RollRequestService.cs:99-113`) |
| Performance | + one extra query (all Campaign Roll Requests with their rolls) and one account-names call per page load | - the history is unpaged and every card is open: about 30 Scenes x 15 rolls = 450 GETs, each with a role check, approved list and names lookup |

- **Chosen:** A, because of Performance, Testability (the empty sentence and Cancelled hiding need the data at the Scene level), and Simplicity. Given up: a second way to deliver a card beside ADR 0033, recorded in ADR 0035.
- **Rejected:** B. N+1 on an unpaged page, and the Scene cannot compute its empty sentence or Cancelled hiding. The Developer must not reintroduce it, including by rendering the self-loading `RollRequestCard` in the history.

### D2: Where Scene Play reads a played Scene's Roll Requests
| Metric | Option A: extend `PlayedScene` with `RollRequests`, filled by `ScenarioPreparationSceneHistory` | Option B: new `IRollRequests.ListForCampaignAsync`; `SceneHistoryService` joins by SceneId |
| --- | --- | --- |
| Consistency | + `PlayedScene` already carries a Scene's children (Reveals, `ScenePlayPorts.cs:131-139`); the PBI-SPL-004 record named this port as the extension point for later history additions | 0 `IRollRequests` already has reads (`ScenePlayRollRequestPorts.cs:193-200`) |
| Modifiability | + history stays one read port; a later child (another play record) follows the same path | 0 each later child adds a join to the service |
| Testability | + service tests fake one port with complete Scenes | 0 two fakes, and every `IRollRequests` fake gains a method |
| Simplicity | + the join is in the adapter, by SceneId | 0 the join and grouping are in the service |
| Reversibility | + local | + local |
| Security and correctness | + the adapter does no filtering; the visibility rule stays in the Scene Play projection | + same |
| Performance | 0 two provider queries, as with B | 0 same |

- **Chosen:** A, because of Consistency and Testability. Given up: the history adapter now depends on two providers (`SceneLifecycleService` and `SceneRollRequestService`).
- **Rejected:** B. It splits one read model across two ports. The Developer must not add `ListForCampaignAsync` to `IRollRequests`.

### D3: Where the combined newest-first order is computed
| Metric | Option A: the server keeps `reveals` and `rollRequests` as separate arrays, each newest first; a pure client helper merges them | Option B: the server returns one discriminated `items` list per Scene |
| --- | --- | --- |
| Consistency | + keeps the existing `reveals` contract and zod schemas (`sceneHistoryApi.ts:8-26`); `RollRequestView` reused as is | - replaces `reveals` with a new union |
| Modifiability | 0 a new item kind adds an array and a merge input | + a new kind adds a union member |
| Testability | + the merge is a pure function with tie tests | + server-side ordering tested in projection tests |
| Simplicity | + about 10 lines of client code | - new view hierarchy, contracts, mapping and zod union |
| Reversibility | + trivial | - a breaking contract change |
| Security and correctness | N/A - ordering only; the data is already filtered | N/A - same |

- **Chosen:** A, because of Consistency, Simplicity and Reversibility. Given up: the order of one list is split between the server (each array) and the client (the merge). The tie rule is stated once, in the helper.
- **Rejected:** B. A breaking change to a working contract for no user-visible gain.

### D4: Which live topic refetches the Scene History on Roll Request changes
| Metric | Option A: client only; `rollRequests` also invalidates `sceneHistoryQueryKeys.detail` | Option B: the server publishes `sceneHistory` with every Roll Request change |
| --- | --- | --- |
| Consistency | + the same as `myClues` and `sceneReveals`, which already refetch the history (`liveTopics.ts:22-33`) | - `sceneHistory` is a Campaign-wide topic (specs/scene-play/spec.md, Live updates); a Keeper-only change would need a second, Keeper-group path |
| Modifiability | + one line | - a policy change plus tests |
| Testability | + `liveTopics.test.ts` | 0 policy and hub tests |
| Simplicity | + no server change | - |
| Reversibility | + trivial | 0 |
| Security and correctness | + a Player receives `rollRequests` only for Public changes (`CampaignLivePublicationPolicy.cs:60-65`), so no Keeper-only activity is signalled; the refetch is filtered on the server | - publishing `sceneHistory` Campaign-wide on a Keeper-only change would tell Players that something hidden happened (a timing leak) |

- **Chosen:** A, because of Security and correctness, plus Simplicity. Given up: Players who have only the Scene History open also refetch it on Public roll activity, which is cheap.
- **Rejected:** B. The leak risk breaks RR-UX-19. The Developer must not touch `ForRollRequestChanged`.

### Single-option decisions
- **Visibility rule (one place):**
  - `RollRequestService.IsVisibleTo` (`RollRequestService.cs:246-247`) moves to an internal static rule in ScenePlay.Application, used by `RollRequestService` and `SceneHistoryProjection.ForPlayer`. A Player gets `Visibility == Public` only, so `Unknown` fails closed.
  - The filter does not depend on the Player's Investigator, and a Player without one still gets Public requests (human decision Q1).
- **Projection:**
  - `SceneHistoryProjection.ForKeeper` and `ForPlayer` add `RollRequests` via `RollRequestProjection.ForView` (`RollRequestProjection.cs:9-22`), ordered `CreatedAt` descending then `Id`, mirroring the Reveal order at `SceneHistoryProjection.cs:18`.
  - In `ForPlayer`, the "no Investigator" ternary applies to Reveals only. Each method stays at complexity 10 or below.
- **Roller names:**
  - `RollRequestService.RollerNamesAsync` (`RollRequestService.cs:287-297`) moves to an internal static helper used by both services.
  - `SceneHistoryService` takes `IAccountNames` and resolves names once for all Scenes. Authorization stays first: a NotAMember read still makes no port call (`SceneHistoryService.cs:24-28`).
- **Views and contracts:**
  - `KeeperHistorySceneView` and `PlayerHistorySceneView` gain `IReadOnlyList<RollRequestView> RollRequests`. The JSON field `rollRequests` is mapped with the existing `RollRequestMapping`.
  - The Player view thereby carries Requested-Roll Investigator ids and names for Public requests only. That is exactly what `GET roll-requests/{id}` already gives a Player. It is not an "Investigators present" list (specs/scene-play/spec.md, `GET .../scene-history`, says so).
- **Cancelled hiding is presentation, not projection:**
  - The response carries Cancelled rows, and the client hides them.
  - This keeps one Roll Request shape across GET-by-id and history, and the visibility rule stays the only server filter. Cancelled rows of Public requests are already visible to every member on the Wall.
- **Provider read:**
  - New `ISceneRollRequestRepository.ListForCampaignAsync(campaignId)` (AsNoTracking, includes rolls, filtered by `CampaignId`, ordered `CreatedAt, Id`) and `SceneRollRequestService.ListForCampaignAsync` returning provider `RollRequestView`s.
  - The adapter groups them by `SceneId` and maps them with `ScenarioPreparationRollRequests.ToRecord` (`ScenePlayRollRequestAdapters.cs:75`). A Roll Request whose Scene is not listed is dropped (it cannot occur: requests are created only on the Active Scene).
- **Keeper display name on the card:**
  - The history host passes the display name of the member with role `Keeper` from `useCampaignMembers` (`campaignApi.ts:56-64`, visible to every member). Only the Keeper requests rolls (roll-requests ux section 5), and a Campaign has one Keeper (CONTEXT.md, Campaign).
  - While the members query is pending, the history shows its page Skeleton.
  - Rejected: a server-side `requestedByDisplayName`. Scene Play has no port for the Keeper's Account (`ScenePlayPorts.cs:11-14`), and the aggregate stores no requester (`RollRequest.cs:25-34`).
- **Card split:**
  - `roll-request-card.tsx` exports `RollRequestCardView({ request, requestedByDisplayName })`, which holds today's article markup unchanged.
  - `RollRequestCard` keeps its props and states and renders the view.
  - The Wall hosts and their tests are unchanged.
- **History helpers (scene-play, pure):**
  - `withoutCancelledRolls(request)` returns the request with its Cancelled rows removed, or null when none are left.
  - `historyItems(scene)` merges the visible Reveals and Roll Requests newest first, with the Reveal first on equal times and then by id.
  - The empty sentence shows when `historyItems` is empty.
- **zod:**
  - Export `rollRequestSchema` from `rollRequestApi.ts:54`.
  - The Keeper history scene adds `rollRequests: z.array(rollRequestSchema)`.
  - The Player scene adds `rollRequests: z.array(rollRequestSchema.extend({ visibility: z.literal('Public') }))`, kept strict. A Keeper-only item fails the parse, so the page shows its error state rather than the item.

## Patterns
- **Used (existing):** Adapter at `ScenarioPreparationSceneHistory`. Force: the provider shapes (`PlayableSceneView`, provider `RollRequestView`) are not Scene Play's `PlayedScene`. It now composes two providers.
- **Used (existing):** Observer through the Campaign hub topics. Force: the history must react to Roll Request changes. One client mapping is added (D4).
- **Rejected:** Strategy for the Keeper and Player projections. Two static methods selected by role stay under complexity 10, as in PBI-SPL-004.
- **Rejected:** Composite or a polymorphic "history item" hierarchy (server or client). Two arrays and a merge suffice (D3).
- **Rejected:** Decorator or Proxy around `RollRequestCard` to hide Cancelled rows. The host passes filtered data to the view (ADR 0028, hosts adapt). The card gets no history-specific prop.
- **Rejected:** Facade over `IRollRequests` and `ISceneHistory`. D2 keeps one port.

## Invariants
- A Player's Scene History response never contains a Roll Request whose visibility is not Public. The filter is in `SceneHistoryProjection.ForPlayer`, through the shared rule.
- No Keeper-only Roll Request change produces any signal to a Player. `ForRollRequestChanged` and the `sceneHistory` publication are unchanged.
- Authorization runs in `SceneHistoryService` before any port call. Adapters and repositories do no filtering by role.
- Every Roll Request query is filtered by `CampaignId`.
- `GET roll-requests/{id}`, the Wall card behaviour, RR-UX-21 on the Wall, and the existing history fields and order are unchanged.
- Cancelled hiding happens only in the Scene History host. The card view renders whatever rows it is given.
- No Account id reaches any view (`RollRequestProjection.cs:3-6`).
- Complexity at most 10 everywhere, with no new suppression.

## Implementation plan
1. Specs and UX: committed with this record (Phase 0). Read specs/roll-requests/spec.md (Scene History), specs/scene-play/spec.md (`GET .../scene-history`, Live updates), specs/scene-play/ux.md section 23.11, and specs/roll-requests/ux.md section 18 first.
2. ScenarioPreparation.Application and Infrastructure: `ISceneRollRequestRepository.ListForCampaignAsync`, `EfSceneRollRequestRepository`, `SceneRollRequestService.ListForCampaignAsync`.
3. ScenePlay.Application: `PlayedScene.RollRequests`; the shared visibility rule and roller-names helper (moved, with behaviour unchanged); views; `SceneHistoryProjection`; `SceneHistoryService` (adds `IAccountNames`).
4. ScenePlay.Infrastructure: `ScenarioPreparationSceneHistory` takes `SceneRollRequestService`, then groups and maps.
5. ScenePlay.Controllers: `SceneHistoryContracts` and mapping add `rollRequests` through `RollRequestMapping`.
6. Backend tests (see TDD units), including the matrix seed and assertion.
7. Frontend: export `rollRequestSchema`; split the card; `sceneHistoryApi.ts` schemas; types in `scene-play/types/SceneHistory.ts`; history helpers; `scene-history-scene` (combined list, new empty sentences); `scene-history-page` (members for the Keeper name, the new Player description); `liveTopics.ts`; stories.
8. E2E: a `requestRollViaApi` fixture (`POST .../roll-requests`) in `e2e/fixtures/roll-requests.ts`; scenarios in `e2e/tests/scene-history.spec.ts`.

## Reuse
- Using: `RollRequestProjection.ForView`, `RollRequestMapping` and its contracts, `ScenarioPreparationRollRequests.ToRecord`, `ISceneRollRequestRepository`, `IAccountNames`, `CampaignLivePublicationPolicy` (unchanged), `rollRequestSchema`, the card markup (as `RollRequestCardView`), `useCampaignMembers`, `reveal-disclosure`, e2e `setUpTable`, `startSceneViaApi`, `finishActiveSceneViaApi`, `rollRequestCard` locator.
- Not using: `RollRequestCard` (the self-loader) in the history (D1); `ISceneRollRequestRepository.ListForSceneAsync` per Scene (N queries); `IRollRequests` for the history read (D2); `wallEntries` (unrelated to history).

## TDD units
Backend (`Given_..._When_..._Then_...`):
- `SceneHistoryService`:
  - The Keeper gets every Roll Request of each Scene, Keeper-only included, newest first then Id.
  - A Player gets only Public ones, including ones that don't involve their Investigator.
  - A Player without an Approved Investigator gets Public Roll Requests and no Reveals.
  - A non-member makes no port call.
  - Roller names resolve, and no Account id is in the views.
- Shared visibility rule: Public is visible to both roles; KeeperOnly and Unknown only to the Keeper. `RollRequestServiceTests` stay green.
- `SceneRollRequestService.ListForCampaignAsync` returns only the Campaign's requests, with rolls.
- Adapter: groups by SceneId; a Scene without requests gets an empty list.
- `SceneHistoryApiTests`:
  - A Player's JSON contains a Public request's id and not a KeeperOnly request's id or message.
  - The Keeper's JSON contains both.
  - Cancelled rows are present (hiding is client-side).
- `ScenePlayAuthorizationMatrixTests`: the seed adds a KeeperOnly Roll Request with a secret message, and the existing no-secret assertion covers `GET scene-history` for the Player.

Frontend (Vitest):
- `sceneHistoryApi`: parses `rollRequests` for both roles; the Player schema rejects `visibility: 'KeeperOnly'` and unknown fields.
- `withoutCancelledRolls`: removes Cancelled rows; returns null when all are Cancelled; keeps Waiting (SPL-UX-75, RR-UX-24).
- `historyItems`: newest first across both kinds; on equal times the Reveal comes first, then by id (SPL-UX-73).
- `scene-history-scene`:
  - Mixed list order; a Keeper-only badge for the Keeper (SPL-UX-74).
  - Empty sentences per role, including a Cancelled-only Scene (SPL-UX-76).
  - The Player sees another Investigator's Public roll.
  - Cards are `article`s with an h3 (SPL-A11Y-28).
- `scene-history-page`: the new Player description; the Keeper name comes from members; the Skeleton shows while members are pending.
- `roll-request-card`: existing tests unchanged; a `RollRequestCardView` test renders from data.
- `liveTopics`: `rollRequests` includes `sceneHistoryQueryKeys.detail` (D4).

## E2E coverage
In e2e/tests/scene-history.spec.ts, tracing to specs/roll-requests/spec.md Scene History and SPL-UX-73 to 77:
- "A Public Roll Request appears in the Scene History for a Player and the Keeper":
  - The Keeper requests a Public roll for Lucy.
  - Harvey's Player sees the card under the Active Scene (all Public rolls) and sees its result arrive without reloading (SPL-UX-74, SPL-UX-77).
  - The Keeper sees it too, ordered against a Reveal (SPL-UX-73).
- "A Keeper-only roll appears only for the Keeper":
  - A hidden roll shows with "Keeper only" for the Keeper.
  - For the Player, no card shows, and the captured `scene-history` response contains no request with `visibility` KeeperOnly (PBI verification 2, RR-UX-19).
- "Cancelled rolls are hidden":
  - The Keeper finishes a Scene with a Waiting roll. The cancelled row and its emptied card disappear from the history.
  - The Keeper sees "Nothing was revealed or rolled in this Scene." (SPL-UX-75 and 76).
- The existing scene-history tests are rechecked against the amended SPL-UX-63, SPL-UX-64 and the new Player description.
- roll-requests.spec.ts assertions on "Cancelled" stay valid: they are on the Wall, and RR-UX-21 is scoped there.

## ADR
- [ADR 0035](../../adr/0035-scene-history-embeds-play-records-within-visibility.md): "The Scene History embeds play records within visibility, and their cards render from data" (D1 and the card split).

## Phases
- Phase 0: specs, ux.md files, this record and ADR 0035. Checkpoint: `docs(design): Roll Requests in the Scene History (PBI-DICE-008)`.
- Phase 1: backend steps 2 to 6. Checkpoint: `feat(dice-008): Roll Requests in the Scene History read (PBI-DICE-008)`.
- Phase 2: frontend step 7. Checkpoint: `feat(dice-008): Roll Request cards in the Scene History (PBI-DICE-008)`.
- Phase 3: E2E step 8. Checkpoint: `test(e2e): Roll Requests in the Scene History (PBI-DICE-008)`.

## Human decisions
- Blocker override (2026-11-14): the backlog tool shows PBI-DICE-005 as in progress only because of an unmerged prototype branch. Its feature work is merged on master, and the human approved proceeding.
- Prototype gate (2026-11-14): yes, UI branch, relayed by the Orchestrator.
- UX gate (2026-11-14), verbatim: "Option A, Q1: all public rolls, Q2 hide cancelled, Q3 keep consistent with other items within history list".
- Plan gate (2026-11-14), verbatim: "approved". The stated defaults for H1 to H4 apply:
  - H1: one list per Scene, newest first, Reveals by Revealed time and Roll Requests by request time; on equal times the Reveal comes first, then by id.
  - H2: Cancelled Requested Rolls are hidden in the Scene History for both the Keeper and Players. A Roll Request whose rows are all Cancelled is not listed. The Wall and the Wall preview are unchanged (RR-UX-21, RR-UX-23 and roll-requests ux 17.2 are scoped to them).
  - H3: Keeper empty sentence "Nothing was revealed or rolled in this Scene." (also for a Cancelled-only Scene). The Player's "Nothing from this Scene reached {name}." shows only when no Reveal reached them and no Public Roll Request is shown.
  - H4: the Player description becomes "Every Scene played in this Campaign, what reached {name}, and the Public rolls, newest first."; the note for a Player without an Approved Investigator is unchanged.

## Revisions

# Design: PBI-SPL-008: Publish the Keeper-only `scenes` live topic whenever today's Scene content changes

## Triggers
- 3, new cross-layer pattern: this is the first time Scenario Preparation publishes a live update. Until now only Campaign Play (through domain events) and Scene Play (through ADR 0024 ports) have published.
- 2, change to a shared interface: `CampaignDataTopic` is the closed wire contract of the Campaign hub (specs/campaign-play/spec.md:57).
- 5, more than one bounded context: Scenario Preparation, Campaign Play, and the frontend's scene-play, scenario-preparation, and campaign-play slices.
- 4, needs an ADR: the publishing shape will be copied by PBI-SPL-009 and PBI-BEAT-001.
- 6, the Explorer's open questions have competing reasonable answers (D1 to D4).
- Trigger 7 does not apply. There is no user-visible UI change: data refreshes in place, which specs/scene-play/ux.md:139 and :679 already specify ("refetch silently ... Nothing is announced to the Keeper"). Per the CLAUDE.md exception there is no UX pass.
- No game rules are involved.

## Constraints
- [ADR 0009](../../adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md), Audience: a Keeper-only change never produces a signal to `campaign:{id}`. Reuse: a new feature adds a topic name and a client mapping, with no new hub method.
- [ADR 0012](../../adr/0012-live-update-publisher-port-implemented-beside-the-hub.md): the publisher adapter `HubCampaignLiveUpdates` is unchanged. It already swallows failures (backend/src/CampaignPlay/CocAssistant.CampaignPlay.Controllers/HubCampaignLiveUpdates.cs:40-50).
- [ADR 0008](../../adr/0008-cross-functionality-reads-through-a-consumer-owned-port.md), [ADR 0013](../../adr/0013-scenario-preparation-functionality-with-campaign-ownership-port.md): the consumer owns the port, and its own Infrastructure holds the adapter. ScenarioPreparation.Infrastructure already references CampaignPlay.Application for exactly this (CocAssistant.ScenarioPreparation.Infrastructure.csproj, the ICampaignKeepers comment; CampaignPlayCampaignKeepers.cs).
- [ADR 0024](../../adr/0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md), Live updates: a context with no dispatcher publishes after its commit, through a port onto a public Campaign Play publisher whose audience comes from `CampaignLivePublicationPolicy`. ADR 0024 also rejected "Domain events on the Scene with an interceptor on ScenarioPreparationDbContext".
- [ADR 0011](../../adr/0011-dispatch-domain-events-after-commit.md): dispatch happens after commit, never before.
- backend/CLAUDE.md:5-7: Application references only its Domain, Infrastructure implements ports, Controllers call Application services only, and boundaries are crossed only through ports or events.
- specs/scene-play/spec.md:44-47 is the `scenes` entry: Keeper group, "when Scene content, the prepared order, links, or Items change". Its "not yet sent" note at line 45 is removed.
- specs/scenario-preparation/spec.md:58: Non-Player Entity profile edits are not pushed over SignalR.
- specs/scenario-preparation/spec.md:30: the future Keeper notes endpoint publishes `scenes` (PBI-SPL-009, out of scope).
- CONTEXT.md terms: Scene, Handout, Non-Player Entity link, Item, prepared order, Active Scene, Keeper notes.
- Existing pattern to copy: PublishActiveSceneChanged and PublishItemHolderChanged with LivePublicationSender.PublishAllAsync (CampaignPlay.Application), registered at CampaignPlayInfrastructureServiceCollectionExtensions.cs:41-45.
- Cyclomatic complexity <= 10. No new suppressions.

## Decisions

### D1: How Scenario Preparation's write paths publish `scenes`

| Metric | Option A: consumer-owned signal port, called explicitly after each commit | Option C: EF SaveChanges interceptor on ScenarioPreparationDbContext |
| --- | --- | --- |
| Consistency | + The exact shape of ADR 0013 (port in SP Application, adapter in SP Infrastructure over CampaignPlay.Application) and of ADR 0024 (after-commit signal through a public publisher) | - A new mechanism; ADR 0024 rejected the interceptor route for this context |
| Modifiability | 0 PBI-SPL-009 and PBI-BEAT-001 each add one call; a new write path must remember it (tests guard each path) | + New write paths publish automatically; - every Scene-row write publishes, including SceneLifecycleService start and finish, Reveals, holder changes, and Roll Requests, so Scene Play's topics change silently |
| Testability | + Service unit tests with a recording fake assert "Saved -> one signal, refusal -> none" per path | - Needs a real DbContext (SQLite) for every unit; the campaign id of a Handout or link row must be inferred from its owner |
| Simplicity | + One port, one adapter, one publisher, one policy method, one line per write path | - Entry-type switch, owner resolution for child rows, and per-save buffering |
| Reversibility | + Delete the port and the calls | 0 Removable, but Scene Play paths would come to depend on the extra signal |
| Security and correctness | + The signal fires only after this request's successful commit | - SavedChanges fires per SaveChanges, not per transaction. Finish-then-start runs two saves in one transaction (ADR 0025), so a signal could go out before the commit (breaks ADR 0011) |

- **Chosen:** A, because of Consistency, Testability, and correctness. We give up automatic coverage of future write paths: each new path must call the port, and its unit test must prove it.
- **Rejected:** C. It signals before commit inside the finish-then-start transaction, it widens publication to Scene Play writes, and ADR 0024 already rejected it. The Developer must not reintroduce it.
- **Rejected (not scored):** domain events plus a dispatcher in Scenario Preparation. ADR 0024 rejected this "for now" because it needs a shared kernel or a copy of Campaign Play's AggregateRoot and dispatcher. Nothing has changed since. Do not reintroduce it.
- **Rejected (not scored):** publishing from Scenario Preparation controllers. It breaks backend/CLAUDE.md:5 (controllers call Application services only) and puts a use-case side effect in the HTTP layer.

### D2: Which change paths publish
"Publishes" means immediately after this request's successful SaveChangesAsync, before returning. A path never publishes on a refusal, on a NotFound, on a failed save, on a refused concurrency branch, or when nothing was saved.

| Path (service.method) | Decision | Reason |
| --- | --- | --- |
| SceneService.EditAsync, both the first save and EditAfterConcurrentChangeAsync | IN | Title and location (PBI scope). The pre-SPL-009 Keeper notes travel in the same PUT and also publish. No field diffing (see Single-option decisions). |
| SceneService.ReorderAsync | IN | Prepared order (PBI scope). |
| SceneService.CreateAsync | IN | Changes the Scene list, which the PBI maps. |
| SceneService.RemoveAsync | IN (Removed only) | Changes the Scene list. |
| HandoutService.CreateAsync, EditAsync, RemoveAsync, ReorderAsync | IN, for both Scene and Item owners | Scene Handouts are PBI scope. Item Handout summaries appear in the Scene detail through ItemReference.Handouts (ItemLinkView.cs:4, :22-27). |
| HandoutFileService.CreateAsync, EditAsync | IN, for both owners | A file Handout is a Handout. Publish only after Saved, never on StorageFailed or InPlay. |
| NonPlayerEntityLinkService.LinkAsync, EditAsync, UnlinkAsync | IN | Non-Player Entity links (PBI scope). |
| ItemLinkService.LinkAsync (Linked and saved), UnlinkAsync | IN | Item links (PBI scope). AlreadyLinked, including a lost race on the unique index, made no change in this request, so no signal; the winning request already signalled. |
| ItemService.EditAsync | IN | The live Item name shows in the Scene detail and the Active Scene (ItemLinkView.cs:22-27). The spec says "or Items change" (specs/scene-play/spec.md:44). |
| ItemService.DeleteAsync (Deleted only) | IN | It removes the Item's Prepared links. |
| ItemService.CreateAsync | OUT | A new Item has no links, so no Scene read changes. |
| Scenario writes, Non-Player Entity profile writes | OUT | Not Scene content. Profiles are explicitly not pushed (specs/scenario-preparation/spec.md:58). |
| Keeper notes endpoint, Beats | OUT | PBI-SPL-009 and PBI-BEAT-001. |
| SceneLifecycleService, SceneRevealService, ItemHolderCommandService, SceneRollRequestService | OUT, unchanged | Already covered by `activeScene`, `sceneReveals`, and `rollRequests`, which the frontend already maps to the Scene queries (frontend/src/campaign-play/services/liveTopics.ts:24, :29-36). |

- **Chosen:** the table above. It goes beyond the PBI's list to the spec's wider "or Items change" wording, because every IN row changes a query the PBI maps. We give up some redundant Keeper refetches (for example an Item Handout on an Item linked to no Scene). These are Keeper-only and cheap.
- **Rejected:** the PBI's literal list only (no create or remove, no Item edit or delete, no Item Handouts). It leaves the Keeper's other tab stale on changes the spec names. Revisit only if the human narrows scope.
- **Rejected:** checking whether an Item is linked to any Scene before signalling. It adds a query and branches for an invalidation that is harmless when redundant.

### D3: Where the best-effort guarantee lives

| Metric | Option A: try/catch plus log in the SP Infrastructure adapter | Option B: try/catch in every SP service (as ActiveSceneService.TrySignalAsync, ActiveSceneService.cs:152-162) |
| --- | --- | --- |
| Consistency | + Matches the ICampaignLiveUpdates contract, where "an adapter never lets a failed publish fail the caller" (ICampaignLiveUpdates.cs doc) | + Matches Scene Play's services |
| Modifiability | + One place | - Six services, two of which (NonPlayerEntityLinkService, ItemLinkService) need a new ILogger |
| Testability | + One adapter test with a throwing ICampaignLiveUpdates | 0 One test per service |
| Simplicity | + Each service adds one line | - Duplicated catch blocks |
| Reversibility | + Trivial | + Trivial |
| Security and correctness | + Cancellation still propagates (`when (exception is not OperationCanceledException)`) | + Same |

- **Chosen:** A, because of Simplicity and Modifiability. We give up symmetry with ActiveSceneService.
- **Rejected:** B. It duplicates the same catch in six services. Do not add catches in the services.

### D4: ADR 0009 edit and a new ADR

| Metric | Option A: leave ADR 0009, update the spec, write ADR 0036 | Option B: append `scenes` to ADR 0009 line 19, no new ADR |
| --- | --- | --- |
| Consistency | + ADR 0009 delegates the contract to specs/campaign-play/spec.md, and its list already lacks four later topics | - Updates the list for one topic only, which leaves it inconsistent anyway |
| Modifiability | + PBI-SPL-009 and PBI-BEAT-001 cite ADR 0036 for the shape | - The publishing shape lives only in a design record, which is history, not a constraint |
| Simplicity | 0 One short ADR | + No new file |
| Reversibility | + ADRs can be superseded | + Trivial |
| Testability | N/A: documentation | N/A: documentation |
| Security and correctness | N/A: documentation | N/A: documentation |

- **Chosen:** A. The policy itself is unchanged (a new Keeper-group topic follows ADR 0009's existing Audience rule), so per the PBI's Refinement Protocol ADR 0009 is not edited.
- **Rejected:** B. It keeps a stale list and leaves a pattern that will be copied unrecorded.

### Single-option decisions
- Topic: add `Scenes` as the last member of `CampaignDataTopic`. The wire name is "scenes" through HubCampaignLiveUpdates.cs:38. It goes last so existing members do not shift.
- Policy: `CampaignLivePublicationPolicy.ForScenesChanged(Guid campaignId)` returns `[new LivePublication(LiveAudience.CampaignKeeper(campaignId), [CampaignDataTopic.Scenes])]`. It takes no parameters that could widen the audience.
- Publisher: `public sealed class PublishScenesChanged` in CampaignPlay.Application, a copy of PublishActiveSceneChanged's shape using LivePublicationSender.PublishAllAsync, registered beside it (CampaignPlayInfrastructureServiceCollectionExtensions.cs:41-45).
- Port: `ISceneContentSignals` in ScenarioPreparation.Application with a single method `Task ScenesChangedAsync(Guid campaignId, CancellationToken cancellationToken)`. Its doc states that the call is best-effort and never throws except on cancellation. It carries no Scene ids, because the topic carries no data.
- Adapter: `CampaignPlaySceneContentSignals : ISceneContentSignals` in ScenarioPreparation.Infrastructure. It calls PublishScenesChanged and catches and logs per D3. It is registered in ScenarioPreparationInfrastructureServiceCollectionExtensions next to ICampaignKeepers.
- Campaign id: use the `campaignId` parameter every listed method already has. No lookup.
- No field diffing in SceneService.EditAsync: every Saved edit publishes once. Diffing adds branches, and PBI-SPL-009 removes notes from this path anyway.
- Frontend mapping: `scenes: (campaignId) => [sceneQueryKeys.inCampaign(campaignId), activeSceneQueryKeys.detail(campaignId), sceneHistoryQueryKeys.detail(campaignId)]` in liveTopics.ts. The topic carries no ids, so the campaign-wide prefix is the only possible key. By prefix it covers the Scene list, the Scene detail, and the Scene Handout details (frontend/src/scenario-preparation/services/handoutOwner.ts:71), plus the Scenario queries under the same prefix.
- One signal per request: a request publishes at most once, even when it touches several rows (reorder, delete).

## Patterns
- **Used:** Adapter at `CampaignPlaySceneContentSignals` (ScenarioPreparation.Infrastructure) - force: Scenario Preparation's port vocabulary has to meet Campaign Play's publisher across the boundary. This is the existing pattern (CampaignPlayCampaignKeepers, CampaignPlayActiveSceneSignals).
- **Rejected:** Observer / domain events - ADR 0024 rejected them for this context (it needs a shared kernel). The existing domain events serve Campaign Play aggregates only.
- **Rejected:** Decorator over ISceneRepository, IItemRepository, or IHandoutOwner.SaveChangesAsync - it hides the side effect inside persistence. ISceneRepository is shared with SceneLifecycleService and the Reveal and holder services, so it would also signal Scene Play writes, and it cannot tell a refused concurrency branch from success at the right level.
- **Rejected:** Strategy or Template Method for "which paths signal" - there is no conditional on type or kind, just one unconditional call after each commit.
- **Rejected:** Chain of Responsibility or a pipeline behavior - speculative; there is one consumer.

## Invariants
- `scenes` is only ever published to `LiveAudience.CampaignKeeper`. No code path sends it to Campaign or Account audiences. A Player never receives it.
- A signal is sent only after this request's successful commit, at most once per request, never for a refusal, NotFound, failed save, or concurrency-refused outcome.
- A failed publish never changes the HTTP result or status code (best-effort, ADR 0009 Delivery).
- Scenario Preparation Domain and Application reference nothing new outside Scenario Preparation. Only ScenarioPreparation.Infrastructure references CampaignPlay.Application (already true).
- Player-visible topics and their audiences are unchanged: the existing policy methods and their tests are untouched.
- CampaignHubTests.cs:419 ("players hear nothing" during preparation) stays green, unchanged.
- No endpoint, request, or response shape changes.

## Implementation plan
1. backend/src/CampaignPlay/CocAssistant.CampaignPlay.Application/CampaignDataTopic.cs: add `Scenes` last - the closed set.
2. CampaignLivePublicationPolicy.cs: add `ForScenesChanged`, with a doc comment citing specs/scene-play/spec.md Live updates and ADR 0036 - the audience.
3. New CampaignPlay.Application/PublishScenesChanged.cs, plus its registration at CampaignPlayInfrastructureServiceCollectionExtensions.cs:41-45 - the publisher.
4. New ScenarioPreparation.Application/ISceneContentSignals.cs (the port) and new ScenarioPreparation.Infrastructure/CampaignPlaySceneContentSignals.cs (the adapter, with the try/catch and log). Register the adapter in ScenarioPreparationInfrastructureServiceCollectionExtensions.cs.
5. Inject ISceneContentSignals into SceneService, HandoutService, HandoutFileService, NonPlayerEntityLinkService, ItemLinkService, and ItemService. Add one `await _signals.ScenesChangedAsync(campaignId, cancellationToken)` after each successful commit marked IN under D2. For HandoutService, the shared private SaveAsync covers create and edit. For HandoutFileService, StoreAndSaveAsync covers create and edit after the Saved point. Keep every method at complexity <= 10.
6. Update the test builders and fakes in backend/tests/ScenarioPreparation (ScenarioPreparationTestBuilder and others) with a new `RecordingSceneContentSignals` fake, and fix the constructors in any other test project that builds these services.
7. frontend/src/campaign-play/services/liveTopics.ts: add the `scenes` entry with a one-line comment citing the scene-play spec Live updates and PBI-SPL-008.
8. Docs (Developer):
   - specs/scene-play/spec.md:44-47: remove the "As of 2026-11-23 ... not yet sent" sub-bullet and the "It is added with the Keeper notes endpoint" wording. Keep "published for every Keeper notes save and every Beat change" as future triggers. List today's triggers per D2.
   - Add the Gherkin scenario "Scene changes reach the Keeper's other tabs live" next to "Keeper notes reach the Keeper's other tabs live" (spec.md:271). The steps are: Given the Keeper has the Scenario open in two tabs and a Player is connected; When the Keeper renames a Scene in one tab; Then the other tab shows the new title without reloading; And no Player receives a live signal about it.
   - specs/campaign-play/spec.md:57: append `scenes` (PBI-SPL-008; see the Scene Play spec, Live updates) to the closed list.
   - specs/campaign-play/spec.md:58: add `scenes` to the `campaign:{campaignId}:keeper` list.
   - specs/campaign-play/spec.md:59: add one sentence saying that Scene Play and Scenario Preparation, which have no dispatcher, publish after commit through ports onto Campaign Play publishers (ADR 0024, ADR 0036).
9. Tests per TDD units and E2E coverage below.

## Reuse
- Using: LivePublicationSender.PublishAllAsync and the PublishActiveSceneChanged shape for the publisher.
- Using: the CampaignPlayCampaignKeepers / ADR 0013 adapter placement and csproj reference. No new project reference.
- Using: CampaignHubTestClient and the sentinel technique (CampaignHubTests.cs:291-296, AssertNothingElseBeforeSentinelAsync) for the integration audience assertions.
- Using: recordHubFrames (e2e/fixtures/hub.ts:11) for the Player's frames in E2E, and the fixtures in e2e/fixtures/scenes.ts and scenarios.ts for setup.
- Not using: IDomainEventDispatcher or IDomainEventHandler - Campaign Play only (ADR 0024).
- Not using: the Scene Play ports (IActiveSceneSignals and others) - they belong to Scene Play, and Scenario Preparation must not reference Scene Play.
- Not using: a shared "TopicsUntil..." helper refactor across RevealApiTests and ItemHolderApiTests - out of scope; do not refactor them.

## TDD units
- Policy (CampaignLivePublicationTests): ForScenesChanged returns exactly one publication, its audience is CampaignKeeper(campaignId), its topics are exactly [Scenes], and no publication has Campaign or Account kind.
- Wire name: Scenes is sent as "scenes". Extend an existing wire-name test if there is one; otherwise assert it in the integration test.
- PublishScenesChanged, with a recording ICampaignLiveUpdates: it publishes once to the Keeper audience with [Scenes].
- CampaignPlaySceneContentSignals (ScenarioPreparation.Tests): it forwards the campaign id. With a throwing ICampaignLiveUpdates behind a real PublishScenesChanged it does not throw and logs a warning (use the existing RecordingLogger). OperationCanceledException propagates.
- Per service, with RecordingSceneContentSignals, named Given_..._When_..._Then_...:
  - SceneService: create, edit, edit retried after a concurrency exception, reorder, and remove each send one signal with the campaign id. NotFound (non-Keeper), invalid title, Finished, NotPrepared, the reorder mismatch, and the remove that loses the concurrency race send none.
  - HandoutService and HandoutFileService, for both a Scene and an Item owner: create, edit, remove, and reorder send one signal. NotFound, refused outcomes, remove refused after a concurrent change, StorageFailed, and InPlay send none.
  - NonPlayerEntityLinkService: link, edit, and unlink send one signal. NotFound, an unknown entity, and Finished send none.
  - ItemLinkService: Linked sends one signal. AlreadyLinked, without a save or after the lost index race, sends none. Unlink sends one. Finished and NotFound send none.
  - ItemService: edit and Deleted send one signal. Create sends none. Held, LinkedToPlayedScene, and the concurrency-refused delete send none.
- Frontend liveTopics.test.ts: `scenes` maps to exactly sceneQueryKeys.inCampaign, activeSceneQueryKeys.detail, and sceneHistoryQueryKeys.detail. Combined with `activeScene` the keys are de-duplicated. Unknown topics are still ignored.
- Frontend campaign-live-connection.test.tsx: only if that suite asserts per-topic invalidation, add a `scenes` frame case that invalidates the three prefixes.
- UX criteria as units: per specs/scene-play/ux.md:139 and :679, a `scenes` refetch makes no announcement. No new live region is added. Assert this only where the existing Keeper-view tests already check that nothing is announced.

## E2E coverage
- Integration (CocAssistant.Api.IntegrationTests): a new `SceneContentLiveUpdateApiTests.cs`. The setup is a Keeper plus two Players subscribed through CampaignHubTestClient. For each IN path in D2, call the real endpoint, then assert:
  - the Keeper's next CampaignDataChanged is exactly {campaignId, ["scenes"]};
  - each Player's next signal is the Public Wall Entry sentinel (`wallEntries`), so no `scenes` reached them;
  - a Theory over a table of paths is fine if it stays readable;
  - at least one refusal case (for example editing a Finished Scene, 409) shows that the Keeper hears the sentinel first.
  CampaignHubTests.cs:419 stays unchanged and green.
- Playwright: a new e2e/tests/scene-live-updates.spec.ts. Its header traces to specs/scene-play/spec.md, Live updates (`scenes`), the new Gherkin scenario "Scene changes reach the Keeper's other tabs live", and specs/scene-play/ux.md section 3 and 21.10 (silent refetch). Steps:
  1. The Keeper signs in and creates a Campaign, a Scenario, and a Scene. A Player joins (joinAsNewPlayer) and opens the Campaign with recordHubFrames.
  2. Tab B is `page.context().newPage()` (same account, same auth), opened on the Scenario page that shows the Scene list. Set a `window` marker in tab B to prove there was no reload.
  3. Tab A opens the Scene and renames it.
  4. Tab B shows the new title in the Scene list, and the marker survives. Expect no announcement (ux.md:139).
  5. The Player's dataChangedTopics() contains no `scenes` frame.
  This is the first same-account two-tab E2E. Using one browser context with two pages is intended.
- The remaining paths have no separate E2E. Each publishes the same topic, so the integration test covers their topic and audience, and the single mapping is unit-tested. This is the stated exception.

## ADR
- [ADR 0036](../../adr/0036-scenario-preparation-publishes-keeper-only-live-updates-through-a-signal-port.md): Scenario Preparation publishes Keeper-only live updates through a consumer-owned signal port after commit. ADR 0009 is not edited (D4).

## Phases
- Phase 1: backend (topic, policy, publisher, port, adapter, six services, unit and integration tests); checkpoint: `feat(spl-008): publish the scenes topic to the Keeper (PBI-SPL-008)`.
- Phase 2: frontend mapping and its tests, the Playwright spec, and the spec edits; checkpoint: `feat(spl-008): refresh Scene queries on the scenes topic (PBI-SPL-008)`.

## Human decisions
- 2026-11-23: approved as written, with no changes. This covers D1 A, the D2 scope as tabled, D3 A, D4 A (new ADR 0036; ADR 0009 not edited), and the ux.md bookkeeping: the "live updates across the Keeper's own tabs" Deferred entries in specs/scenario-preparation/ux.md for Scene links (section 39) and Scene Handouts are marked done in PBI-SPL-008; the Items entry stays deferred, because `scenes` does not refetch Item queries.

## Revisions

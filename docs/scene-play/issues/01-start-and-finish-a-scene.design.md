# Design: PBI-SPL-001: The Keeper starts, re-staffs, and finishes one Active Scene per Campaign; Players follow it live

## Triggers
- **2 (shared aggregate and data model):** the Scene aggregate gains Investigators present, a concurrency token, and a one-Active index.
- **3 (new cross-layer pattern):**
  - a new `activeScene` topic;
  - the first cross-functionality *command* port (ADR 0008 covers reads only);
  - the first explicit post-commit publication from outside Campaign Play.
- **4 (ADR):** ADR 0024 records the boundary and the storage of Scene Play state; ADR 0025 records Scene concurrency.
- **5 (several bounded contexts):** Scene Play (new), Scenario Preparation (Scene aggregate, delete guards), and Campaign Play (Wall, topics, Investigators).
- **6 (competing answers):** the Explorer's open questions 1-5 and 8.
- **7 (UX):** a new start page, the Active Scene page, the overview card, and Scene page actions. Option B was selected.

## Constraints
- **ADR 0008:** consumer-owned port; the provider exposes an application service; the adapter lives in the consumer's Infrastructure.
- **ADR 0013:** no foreign keys across `DbContext`s; each functionality has its own projects.
- **ADR 0016:** a Scene stores `CampaignId`. A filtered unique index for one Active Scene is anticipated and is "not added before PBI-SPL-001 decides it".
- **ADR 0003:** the filtered unique index precedent (`CampaignPlayDbContext.cs:68-70`).
- **ADR 0009, ADR 0012:** closed topic set; one publication policy decides audiences; best-effort delivery; the publisher adapter lives beside the hub.
- **ADR 0011:** domain events are dispatched after commit, and only for `CampaignPlayDbContext`.
- **ADR 0015:** rich text is validated Lexical JSON.
- **ADR 0019, ADR 0022:**
  - Material an Active or Finished Scene refers to is never deleted.
  - Reveals name a link id and snapshot it.
  - SPL-001 must re-check the delete-vs-start race.
- **ADR 0020, ADR 0021:** Handout row shape; immutable blobs, deleted only while the Scene is Prepared.
- **ADR 0023:** endpoint-list authorization matrix. Scene Play adopts it (PBI-SP-006 follow-up).
- **Specs:**
  - `specs/scene-play/spec.md`: Architecture (Ownership, API Contracts, Campaign Wall, Live updates), Constraints, Regression Guardrails, Scenarios.
  - `specs/scenario-preparation/spec.md`: Scene status.
  - `specs/campaign-overview/spec.md`: Overview, Roster with Investigators.
- **CONTEXT.md terms:** Prepared Scene, Active Scene, Finished Scene, Investigators present, Reveal, Clue, Wall Entry, Public Wall Entry. There is no terminology conflict.
- **Game rules:** no `docs/game-rules/` section governs starting or finishing a Scene. None is cited and none is restated.
- **Complexity:** cyclomatic complexity stays at 10 or below (ESLint `complexity`, CA1502). ScenarioPreparation has no `GlobalSuppressions.cs`, and none may be added.
- **Investigator approval is terminal today:**
  - `Approve` and `RequestChanges` require Submitted (`Investigator.cs:98-105`, `:112-121`).
  - `StartOver` requires Draft (`Investigator.cs:48`, `:132`).
  - No Player removal exists.
  - So "An unapproved Investigator is never present" holds once it is checked at start and at change.

## UX
- **Selected option:** B, the dedicated Active Scene page with a guided start page.
- **New spec:** `specs/scene-play/ux.md`, linked from `specs/scene-play/spec.md`, replacing "Not yet recorded".
- **Amendments:**
  - `specs/scenario-preparation/ux.md` section 14 (Start Scene and Open Active Scene actions; SPL-UX-1).
  - `specs/campaign-overview/ux.md` section 3 order, and the spec's Overview list (Active Scene card; SPL-UX-14).
- **Refinement for the gate:** the start page route is nested under the Scene, `/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/start`, not the `/campaigns/$id/scenes/$sceneId/start` shown in the option.
  - Why: the existing Keeper Scene and Scenario reads then serve the page with no new read endpoint.
  - The back link "Back to the Scene" is natural.
  - The API route stays `POST /api/campaigns/{campaignId}/scenes/{sceneId}/start` as specified.
- **Interim gap (explicit):** until PBI-SPL-002, the Keeper's Active Scene page shows no Keeper notes, Handouts, Non-Player Entities, or Items. "Open in Scenario" links to the Scene page, where they are shown and stay editable (ux.md sections 1 and 10).

## Decisions

### D1: How Scene Play reaches the Scene aggregate, and where Investigators present and Reveals are stored
| Metric | A: Scene Play `DbContext` + shared DB transaction | B: Scene Play `DbContext`, two ordered commits | C: Scene Play state as children of the Scene aggregate, reached through a provider command service |
| --- | --- | --- | --- |
| Consistency | 0 own context like every functionality, but the first cross-context transaction, and it forces a shared database against ADR 0008/0013 | + own context; no new transaction pattern | 0 follows the spec's domain relationships ("An Active or Finished Scene has a set of Investigators present and a list of Reveals"); extends ADR 0008 from reads to commands; changes the spec's Ownership wording |
| Modifiability | - every Scene Play write needs the two-context unit of work | - every write needs ordering and compensation logic | + the Scene's invariants (present only while Active, Reveal only to present Investigators) live in one aggregate |
| Testability | - unit tests need two contexts on one SQLite connection | - failure-between-commits cases need fault injection | + aggregate unit tests and one SQLite context |
| Simplicity | - a 4th `DbContext`, migrations, Respawn, E2E setup, and `Program.cs` migration (the human is editing that block) | - a 4th `DbContext` plus compensation | + no new `DbContext`; one migration in the existing context |
| Reversibility | - a shared-database constraint is hard to undo | 0 | 0 moving the tables out later means a data move, but no API change |
| Security and correctness | + atomic | - an Active Scene with no Investigators present after a partial failure; concurrent starts of one Scene can pair the winner's status with the loser's present list | + finish, start, and present are written in one `SaveChanges` |

- **Chosen:** C.
  - Deciding metrics: Correctness (one atomic write for finish, start, and present), Simplicity, and Modifiability (the aggregate already owns status and its editing rules; ADR 0019).
  - Giving up: Scene Play persistence lives in Scenario Preparation's database and migrations, and Scenario Preparation's Domain carries Investigator ids it does not interpret.
- **Rejected:**
  - A: it forces a shared database and a new transaction pattern.
  - B: partial failures break "A started Scene has at least one Investigator present".
  - The Developer must not reintroduce either, and must not add a `ScenePlayDbContext` in this PBI.
- **Also rejected:** putting the Scene Play controllers inside Scenario Preparation. The ADR 0023 matrix there is Keeper-only by design, the Active Scene read is member-visible, and the spec makes Scene Play a feature of its own.
- **Shape:**
  - **Projects:**
    - New `backend/src/ScenePlay/CocAssistant.ScenePlay.{Application,Infrastructure,Controllers}`.
    - There is no `ScenePlay.Domain` project in this PBI: all play rules here are Scene-aggregate rules, and no Scene Play domain type exists yet.
  - **Ports:** Scene Play declares consumer-owned ports in its Application.
  - **Adapters:** they live in ScenePlay.Infrastructure. It references `CocAssistant.ScenarioPreparation.Application` and `CocAssistant.CampaignPlay.Application`, the same direction as `CampaignPlayCampaignKeepers.cs`.
- **Provider side:**
  - Scenario Preparation exposes a provider application service, `SceneLifecycleService`, in its Application. Its methods:
    - `FindActiveAsync(campaignId)`
    - `FindAsync(campaignId, sceneId)`
    - `StartAsync(campaignId, sceneId, presentInvestigatorIds, approvedInvestigatorIds, finishActiveScene)`
    - `FinishActiveAsync(campaignId)`
    - `ReplaceInvestigatorsPresentAsync(campaignId, presentInvestigatorIds, approvedInvestigatorIds)`
  - It does **not** check the Keeper. Scene Play authorizes before calling it (see Invariants).
- **Storage:**
  - New table `SceneInvestigatorsPresent`, with columns `SceneId` (FK to `Scenes`, cascade) and `InvestigatorId` (Guid, no FK; ADR 0013).
  - PK `(SceneId, InvestigatorId)`.
  - It is a child collection of `Scene`, mapped through a backing field like `_itemLinks`.
  - It is kept after Finish, because the Scene History needs it.
- **Reveals (PBI-SPL-002):** child entities of the Scene in the same context (D3).

### D2: One Active Scene per Campaign under concurrency, including finish-then-start
| Metric | A: filtered unique index + Scene `Version` concurrency token | B: per-Campaign "active scene pointer" row | C: serializable transaction around check-then-start |
| --- | --- | --- | --- |
| Consistency | + ADR 0003 and ADR 0016 name this shape; `Version` mirrors `Investigator.Version` (`CampaignPlayDbContext.cs:93`) | - a second record of the same fact as `Scene.Status` | - no transaction exists anywhere today |
| Modifiability | + the rule sits in the schema | - two places to keep in step | 0 |
| Testability | + `Task.WhenAll` integration tests, as `ItemLinkApiTests` | 0 | - lock behavior differs between SQLite and SQL Server |
| Simplicity | + one index, one column, and two exception mappings in `EfSceneRepository.SaveChangesAsync` (template `EfSceneRepository.cs:39-57`) | - a new table and its upkeep | - isolation plumbing and deadlock handling |
| Reversibility | + drop the index | 0 | 0 |
| Security and correctness | + the index stops two different Scenes being Active; `Version` stops two starts of the *same* Scene (the index cannot, because it is one row) and a stale finish-then-start | + | 0 depends on the lock granularity |

- **Chosen:** A, because of Consistency and Correctness. Giving up: one extra column on `Scenes`.
- **Rejected:**
  - B: it duplicates `Scene.Status`.
  - C: it introduces transactions where an index suffices.
- **Index:** `IX_Scenes_CampaignId_Active` on `Scenes(CampaignId)`, unique, with `HasFilter("[Status] = 'Active'")`.
- **Exception mapping:**
  - A violation (SQL Server index name, or the SQLite text `Scenes.CampaignId`) becomes `ActiveSceneConflictException`.
  - `DbUpdateConcurrencyException` becomes `SceneConcurrencyException`.
  - Both clear the change tracker, like the Item link mapping.
- **No retry:**
  - Both exceptions map to 409.
  - A retry of finish-then-start could finish a Scene the Keeper never saw.
- **`Version`:**
  - An `int` with `.IsConcurrencyToken()`.
  - It is incremented by `Scene.Start`, `Scene.Finish`, `Scene.ReplaceInvestigatorsPresent`, `Scene.RemoveHandout`, and the new guard in D6. It is incremented in one private method.
  - Scene removal is covered with no extra code, because EF puts the token in the `DELETE`.

### D3: How Reveal snapshots are stored (decided now; built in PBI-SPL-002)
| Metric | A: `Reveals` child table with typed snapshot columns mirroring `Handouts` + `RevealRecipients` | B: one schema-versioned JSON snapshot column per Reveal (ADR 0007 style) |
| --- | --- | --- |
| Consistency | + same columns and check-constraint style as `Handouts` (ADR 0020/0021, `CK_Handouts_Content`) | 0 ADR 0007 precedent, but for a different kind of data |
| Modifiability | 0 a new subject kind adds nullable columns | + a new kind adds JSON fields |
| Testability | + check constraints are tested like the Handout ones | 0 |
| Simplicity | 0 more columns | + one column |
| Reversibility | 0 | 0 |
| Security and correctness | + `FileKey` is queryable, so "a blob a Reveal reads is never deleted" (ADR 0021/0022) can be checked in SQL | - a file-key reference is hidden inside JSON |

- **Chosen:** A, because of Correctness (queryable blob references) and Consistency. Giving up: wider rows.
- **Rejected:** B, because file references must be queryable.
- **Columns (PBI-SPL-002 refines, within this shape):**
  - `Reveals`: `Id`; `SceneId` (FK to `Scenes`, cascade; only a Prepared Scene can be removed, and it has no Reveals); `SubjectType` (`Handout`, `NonPlayerEntity`, `Item`); `SubjectId`; `RevealedAt`.
  - `SubjectId` is the Handout id, the Non-Player Entity link id, or the Item id, with **no FK**, so the snapshot outlives an unlink or a delete (ADR 0019).
  - Snapshot columns: `Title`/name (nvarchar 200); `HandoutKind` (null unless Handout); `Content` (Lexical JSON, null for a file); `FileKey`, `FileName`, `FileMediaType`, `FileSizeBytes` (all null or all set).
  - `RevealRecipients(RevealId, InvestigatorId)`, with PK on both.
- **Files:**
  - Scene Play never copies, overwrites, or deletes a file (spec Architecture).
  - SPL-002 reads it through `IHandoutFileStore` by the snapshotted key, and must extend the delete guards so that a blob referenced by any Reveal is never deleted.

### D4: Wall Entry creation path
| Metric | A: Scene Play port onto `WallEntryService.AddAsync` after the Scene commit, best-effort | B: same call, but a failed Wall Entry fails the request | C: Scene domain event or outbox consumed by Campaign Play |
| --- | --- | --- | --- |
| Consistency | + the spec routes it "through the Campaign Play Wall Entry behavior"; the existing `WallEntryAdded` handler then publishes `wallEntries` | 0 | - Scenario Preparation has no events (ADR 0011 interceptor is Campaign Play only) |
| Modifiability | + one adapter | + | - new infrastructure |
| Testability | + fake port in unit tests; integration test reads the Wall | + | - |
| Simplicity | + | + | - |
| Reversibility | + | + | - |
| Security and correctness | 0 the author is the calling Keeper, who is a member (`WallEntryService.cs:49-73`); a lost entry is possible on a crash or a DB fault | - reports failure for a Scene that did start, which invites a retry that gets 409 | + at-least-once with an outbox |

- **Chosen:** A, because of Consistency and Simplicity.
  - Giving up: atomicity. A failure is logged at Warning and the start or finish still succeeds. The spec does not require atomicity (Explorer, section 4).
- **Rejected:**
  - B: it is misleading after a commit.
  - C: it is new infrastructure for a best-effort record.
- **Text:** "Scene started: {title}" and "Scene finished: {title}", as decided by the human. Title is at most 200 characters, well under 2000.
- **Order:** for finish-then-start, the finished entry is written first. E2E asserts presence, not order, because equal timestamps tie-break by id.

### D5: `activeScene` publication path
| Metric | A: explicit post-commit publish by Scene Play through a port onto a Campaign Play publisher using the policy | B: Scene raises domain events dispatched by an interceptor on `ScenarioPreparationDbContext` |
| --- | --- | --- |
| Consistency | 0 a second way next to ADR 0011's events; the audience still comes from `CampaignLivePublicationPolicy` | + ADR 0011 shape |
| Modifiability | + one Scene Play service owns all three transitions | - `AggregateRoot` lives in CampaignPlay.Domain; Scenario Preparation's Domain cannot reference it, so a shared kernel or a copy is needed |
| Testability | + a recording fake port | 0 |
| Simplicity | + one policy method, one public publisher, one adapter | - an interceptor, dispatcher, and base class in a second functionality |
| Reversibility | + | 0 |
| Security and correctness | + topic to `campaign:{id}` only; carries no data | + |

- **Chosen:** A, because of Simplicity and Modifiability.
  - Stated reason for the second way: the transition is committed by another functionality's context, which has no dispatcher.
  - ADR 0011's worry ("a service can forget to publish") is contained, because one service, `ActiveSceneService`, performs every transition.
  - Recorded in ADR 0024.
- **Rejected:** B. The Developer must not add an event interceptor to Scenario Preparation in this PBI.
- **Campaign Play changes:**
  - `CampaignDataTopic.ActiveScene` (wire name `activeScene`).
  - `CampaignLivePublicationPolicy.ForActiveSceneChanged(campaignId)` returns `[LivePublication(LiveAudience.Campaign, [ActiveScene])]`.
  - A public `PublishActiveSceneChanged` in CampaignPlay.Application that uses the internal `LivePublicationSender` (`LivePublicationSender.cs:42`).
- **Timing:** publish after the commit on start, finish, and present change. It is best-effort, like `ICampaignLiveUpdates` (`ICampaignLiveUpdates.cs:58-60`).
- **Not in this PBI:** `sceneHistory` (PBI-SPL-004) and the Keeper `scenes` topic. The client mapping of `activeScene` also invalidates `sceneQueryKeys`, so the Keeper's Scene pages see the status change.

### D6: Delete-versus-start races (PBI-SP-004 and PBI-SP-008 follow-ups; ADR 0019, ADR 0022)
| Metric | A: the delete touches the `Version` of each Prepared Scene that links the target, in the same `SaveChanges` | B: serializable transaction around usage check and delete | C: accept and document |
| --- | --- | --- | --- |
| Consistency | + reuses D2's token; optimistic, like `Investigator.Version` | - first transaction pattern | - leaves ADR 0019's "never deleted" open |
| Modifiability | 0 each guarded delete calls one helper | 0 | + |
| Testability | + a `RecordingSceneRepository.BeforeSave` race, as existing tests do | - lock timing is hard to test on SQLite | + |
| Simplicity | 0 one repository query and one domain method | - isolation and deadlock handling | + |
| Reversibility | + | + | + |
| Security and correctness | + a concurrent start or delete makes one side fail with a concurrency conflict; no deadlocks | + | - a just-started Scene can lose a link, Handout, or Item |

- **Chosen:** A, because of Correctness and Consistency. Giving up: each guarded delete loads the Prepared Scenes that link its target.
- **Rejected:**
  - B: transactions where a token suffices.
  - C: it breaks ADR 0019.
- **Guarded paths:**
  - `HumanNpcService.DeleteAsync` (`HumanNpcService.cs:100-114`).
  - `MythosCreatureService.DeleteAsync` (`MythosCreatureService.cs:100-114`).
  - `ItemService.DeleteAsync` (`ItemService.cs:107-130`).
  - The Item-owner paths that compute "not in play" in `HandoutOwnerLocator.cs:54-56` (Item Handout delete and file replace).
- **Mechanism:**
  - The existing usage check stays.
  - The Prepared Scenes linking the target are then loaded tracked (new `ISceneRepository.ListTrackedLinkingAsync`), and `Scene.GuardLinkedMaterialRemoval()` is called on each. It returns false unless the Scene is Prepared, and otherwise increments `Version`.
  - A `SceneConcurrencyException` maps to the path's existing "in play" or "played Scene" 409 outcome.
- **Not changed:** Scene child writes that are allowed on an Active Scene (link, edit link, add or edit Handout) do not touch `Version`. A link added at the instant a Scene finishes is a recorded residual (Follow-ups).
- **`SceneService.EditAsync`:**
  - It updates the Scene row, so it can now hit `SceneConcurrencyException` when a start or finish wins.
  - It reloads once. If the Scene is now Finished, it returns the existing `SceneFinished` outcome. Otherwise it reapplies the edit once (retry precedent: `CampaignService.ChangeAllowedCreationMethodsAsync`).
  - `SceneService.RemoveAsync` maps the exception to its existing "started" 409.

### Single-option decisions
- **Authorization matrix:** `ScenePlayAuthorizationMatrixTests`, following ADR 0023, with a table of its own (PBI-SP-006 follow-up).
  - Each row is `Row(Method, Template, Content, PlayerStatus)`, where `PlayerStatus` is 404 for Keeper-only rows. For `GET active-scene` it is 200 with the non-present shape, and 204 when nothing is Active.
  - **Callers:**
    - No token gets 401.
    - A Player gets the row's `PlayerStatus`.
    - Another Campaign's Keeper gets 404.
    - The Keeper addressing a missing Campaign gets 404.
  - There is a completeness test against the ScenePlay.Controllers assembly. The no-secret check uses `PreparedScenarioSeed.SecretPrefix`, and a DB-unchanged check covers `Scenes`, `SceneInvestigatorsPresent`, and `WallEntries`.
- **Error order** (start): 401, then 404 (non-member, Player, unknown Scene or Scene of another Campaign), then 409 (Scene not Prepared), then 409 (another Scene is Active and `finishActiveScene` is false), then 400 (present list).
  - Because: state before content, as PBI-SP-006 D4 decided for Scenes (`Scene.cs:128-138`, "Status is checked first").
  - PUT present follows the same order: 409 when no Scene is Active, then 400.
- **Present list validation** (400, keyed by request path `presentInvestigatorIds` per ADR 0018):
  - An empty list.
  - A duplicate id. Duplicates are rejected, not de-duplicated, because the client never sends them and the PK forbids them.
  - An id that is not an Approved Investigator of the Campaign.
  - Validated inside `Scene.Start` and `Scene.ReplaceInvestigatorsPresent` against the passed approved set, as `LinkNonPlayerEntity` takes `entityInCampaign` (`Scene.cs:128`).
- **`finishActiveScene: true` with no Active Scene:** a plain start, with only the "started" Wall Entry. The Keeper's intent (this Scene becomes Active) is met, and a stale view must not fail.
- **Start when the target is itself the Active Scene:** 409 "not Prepared". It is caught first.
- **Lookup without a Scenario:** new `ISceneRepository.FindForPlayAsync(campaignId, sceneId)`, which includes the links, Handouts, and present Investigators, and `FindActiveAsync(campaignId)`. Both filter by Campaign (ADR 0016).
- **`GET active-scene` shapes** (camelCase):
  - **204** when no Scene is Active.
  - **Keeper:** `{sceneId, scenarioId, scenarioTitle, title, location, startedAt, investigatorsPresent: [{id, name}], reveals: []}`. `reveals` is always present and is empty in this PBI.
  - **Player whose Investigator is present:** `{isPresent: true, title, location, investigatorsPresent: [{name, isYours}], reveals: []}`. There are no Investigator ids, in line with campaign-overview spec "a Player never receives another Player's Investigator id".
  - **Player whose Investigator is not present** (including none, or not Approved): exactly `{title, isPresent: false}`.
  - `name` may be null.
- **Responses:** start returns 200 with the Keeper shape. PUT present returns 200 with the Keeper shape. Finish returns 204.
- **Approved Investigators read:**
  - Campaign Play exposes `ApprovedInvestigatorQuery.ListAsync(campaignId)`, which returns `(InvestigatorId, PlayerAccountId, Name)` for Approved Investigators. The name comes from `CharacterSheet.Identity.Name`, as `CampaignMemberService.cs:85` does.
  - It is adapted to the Scene Play port `IApprovedInvestigators`.
- **Caller role:** port `ICampaignRoles.RoleOfAsync(campaignId, accountId)`, which returns Keeper, Player, or null. It is adapted onto `CampaignService.GetForMemberAsync` (`CampaignService.cs:42-47`).
- **Frontend:**
  - A new slice, `frontend/src/scene-play/`.
  - The overview mounts `active-scene-card`, as `campaign-page.tsx:8-10, 40-42` already mounts Scenario Preparation sections.
  - `liveTopics.ts` (`:11-16`) adds `activeScene`.
  - The start page takes Approved Investigators from the roster (`campaignQueryKeys.members`), which already gives the Keeper ids, names, and statuses.
- **Q2 (a present Investigator stops being Approved):** not applicable today (see Constraints). There is no behavior; a follow-up is recorded.

## Patterns
- **Used: Adapter.** At ScenePlay.Infrastructure: `ScenarioPreparationPlayableScenes`, `CampaignPlayApprovedInvestigators`, `CampaignPlayCampaignRoles`, `CampaignPlaySceneWallEntries`, and `CampaignPlayActiveSceneSignals`.
  - Force: incompatible interfaces at the functionality boundaries.
  - It is the existing ADR 0008 shape.
- **Rejected: State for Scene status.** The guards are single checks in `Scene.cs`, and SPL-001 adds only `ReplaceInvestigatorsPresent`. This repeats PBI-SP-005's rejection. Revisit if the guards stop being one-liners.
- **Rejected: Strategy for the Keeper and Player projections.** Three fixed shapes chosen by role and presence fit one small projection function within complexity 10.
- **Rejected: Observer (domain events) for `activeScene`.** See D5.
- **Rejected: Unit of Work or Command spanning contexts.** See D1.
- **Rejected: Facade over Campaign Play.** Separate narrow ports keep the fakes small, as ADR 0008/0013 do.

## Invariants
- At most one Scene per Campaign has Status Active. This is enforced by `IX_Scenes_CampaignId_Active` and never only in code.
- An Active or Finished Scene has at least one Investigator present. Each present Investigator was Approved in the Campaign when added.
- `SceneLifecycleService` performs no authorization. It is called only by the Scene Play adapter, after `ActiveSceneService` has checked the Keeper. No Scenario Preparation controller calls it, and no Scenario Preparation endpoint exposes present Investigators.
- A Player response never contains another Player's Investigator id, any Prepared Scene data, or (when not present) anything beyond `{title, isPresent: false}`.
- `activeScene` is sent only to `campaign:{campaignId}` and carries no data.
- Finish, then start, and the present list are written in one `SaveChanges`. Nothing retries a finish-then-start.
- Wall Entry and live-update failures never fail or undo a committed transition. They are logged.
- A guarded delete (D6) never removes material of a Scene that is not Prepared at commit time.
- No new CA1502 or ESLint complexity suppression.
- Breaking any of these requires escalation.

## Implementation plan
1. **Docs** (committed with this record): ADR 0024, ADR 0025, the ADR 0009 topic list, the ADR 0016 consequence note, and the spec updates listed under ADR. This is done by the Architect.
2. **Scene domain (Scenario Preparation):**
   - `Scene`:
     - `Version`;
     - `_investigatorsPresent` with `IReadOnlyList<Guid> InvestigatorsPresent`;
     - `Start(now, presentIds, approvedIds)`, which replaces `Start(now)` with status checked first, then the present list;
     - `ReplaceInvestigatorsPresent(presentIds, approvedIds)` (Active only);
     - `GuardLinkedMaterialRemoval()`;
     - the `Version` increment in `Finish` and `RemoveHandout`.
   - New outcome values: `NotPrepared`, `NotActive`, `NoInvestigatorPresent`, `DuplicateInvestigator`, `InvestigatorNotApproved`.
   - Update every test helper that calls `Start(now)`.
   - Unit tests first.
3. **Scenario Preparation persistence:**
   - Mapping for `SceneInvestigatorsPresent`, `Version`, and the filtered index.
   - Migration `AddScenePlayPresence`.
   - `EfSceneRepository`: `FindForPlayAsync`, `FindActiveAsync`, `ListTrackedLinkingAsync`, and the two exception mappings.
   - Fix the `PlayAsync` seed helpers so no test leaves two Active Scenes in one Campaign: finish the previous one, or use separate Campaigns.
4. **`SceneLifecycleService`** (Scenario Preparation Application) with outcome records. Unit tests use `RecordingSceneRepository.BeforeSave` races.
5. **D6 guards** in the four delete and replace paths, plus the `SceneService.EditAsync` and `RemoveAsync` concurrency mapping. Unit and integration race tests.
6. **Campaign Play:**
   - `CampaignDataTopic.ActiveScene`, `ForActiveSceneChanged`, `PublishActiveSceneChanged`, and `ApprovedInvestigatorQuery`.
   - Unit tests.
   - Update the topic lists in `specs/campaign-play/spec.md` (Explorer: L56-57, L65).
7. **ScenePlay projects:**
   - Application: `ActiveSceneService` (start, finish, replace present, get), the ports, and the projection.
   - Infrastructure: the adapters and `AddScenePlayInfrastructure`.
   - Controllers: `ScenePlayControllerBase` using `CallerAccountResolver`, and `ActiveSceneController` with the four routes.
   - Register in `Program.cs` (`AddApplicationPart`, `AddScenePlayInfrastructure`, next to `Program.cs:8-17`). Do not touch the Development migration block, which the human is editing.
   - Add the projects to the solution and the test projects.
8. **Integration tests:** `ActiveSceneApiTests`, covering:
   - the lifecycle;
   - every 400/409 case and the error order;
   - concurrent starts of two Scenes, and of the same Scene;
   - concurrent finish-then-start;
   - Wall Entries;
   - the hub `activeScene` signal through `CampaignHubTestClient`;
   - Campaign isolation.
   Plus `ScenePlayAuthorizationMatrixTests`, and the race tests for D6.
9. **Frontend:**
   - The `scene-play` slice: services and zod schemas, `investigators-present-fieldset`, `start-scene-page`, `active-scene-page` and its views, `finish-scene-dialog`, and `active-scene-card`.
   - The routes; regenerate `routeTree.gen.ts` through the normal dev or build step.
   - The `scene-page` actions, the `liveTopics` mapping, and announcements.
   - Vitest tests and stories.
10. **E2E:** see E2E coverage, including the folded follow-ups, and removal of the "unreachable until SPL-001" exception comments.
11. **Close:** tick Verification, and record Follow-ups.

## Reuse
- **Using:**
  - `Scene.Start`/`Finish` (`Scene.cs:96-120`), extended.
  - The filtered index and violation mapping (`CampaignPlayDbContext.cs:68-70`, `EfSceneRepository.cs:39-57`).
  - The concurrency-token style (`Investigator.cs:26,146`).
  - `CallerAccountResolver`.
  - `WallEntryService.AddAsync`.
  - `CampaignLivePublicationPolicy`, `ICampaignLiveUpdates`, and `LiveAudience.Campaign`.
  - `CampaignService.GetForMemberAsync`.
  - `PreparedScenarioSeed`, `IdentityApiFactory`, `CampaignHubTestClient`, and `RecordingSceneRepository.BeforeSave`.
  - The E2E fixtures `prepared-scenario.ts`, `investigators.ts`, `campaigns.ts`, `hub.ts`, `wall.ts`, and `overview.ts`.
  - On the frontend: `scene-status-badge`, `scene-times`, `scene-not-found`, `remove-scene-dialog` (pattern), `Checkbox`, and `AlertDialog`.
- **Not using:**
  - `DomainEventDispatchInterceptor` (D5).
  - `IInvestigatorRepository` directly from Scene Play, because ADR 0008 requires a provider query.
  - `item-picker`'s radio list, because the present choice is multi-select.

## TDD units
- **`Scene.Start`:**
  - Prepared with valid present ids becomes Active, with the present set, `StartedAt`, and `Version`+1.
  - Active or Finished gives `NotPrepared`, checked before the list.
  - An empty list, a duplicate, or an id not in the approved set is refused, and nothing changes.
- **`Scene.ReplaceInvestigatorsPresent`:** Active only, with the same validation. It replaces the set and leaves Reveals untouched (none yet).
- **`Scene.Finish`:** increments `Version` and keeps the present set.
- **`Scene.GuardLinkedMaterialRemoval`:** false unless Prepared; increments `Version` when Prepared.
- **`SceneLifecycleService`:**
  - Not found.
  - Not Prepared.
  - Active exists without finish.
  - Finish-then-start in one save.
  - `finishActiveScene` true with none Active.
  - The index violation and a concurrency loss each map to the conflict outcome.
- **`ActiveSceneService`:**
  - A Player or non-member gets NotFound on every write.
  - The error order.
  - The Wall port is called with "Scene started: {title}" and "Scene finished: {title}" after a successful save only.
  - The live port is called after the commit, and not on a refusal.
  - A Wall or live failure does not fail the result.
- **Projection:** the Keeper shape; the present-Player shape without ids and with `isYours`; the non-present shape is exactly two fields; 204.
- **`CampaignLivePublicationPolicy.ForActiveSceneChanged`:** the Campaign audience only.
- **`ApprovedInvestigatorQuery`:** only Approved, only this Campaign.
- **D6:** each guarded delete loses to a start racing in `BeforeSave` with its existing 409 outcome. A Prepared-only delete still cascades.
- **Frontend:** SPL-UX-1 to SPL-UX-19 and SPL-A11Y-1 to SPL-A11Y-7 as component tests where observable without a server. The live topic map: `activeScene` maps to the active-scene and scene keys.

## E2E coverage
- **New `e2e/tests/active-scene.spec.ts`** (header traces spec scenarios and SPL-UX ids). Each scenario name maps to a Playwright test:
  - "Keeper starts a Scene": SPL-UX-1, 2, 9, 16.
  - "Scenes can be started out of prepared order": SPL-UX-3.
  - "A second Active Scene is refused": SPL-UX-5.
  - "Keeper finishes the current Scene and starts the next one": SPL-UX-6, 16.
  - Change who is present: SPL-UX-10.
  - Finish: SPL-UX-11.
  - "Starting a Scene reveals nothing": SPL-UX-12.
  - "A Player whose Investigator is not present sees only the title": SPL-UX-13.
  - Overview card and live update for a connected Player: SPL-UX-14, 15, using `hub.ts`.
  - "Players cannot run Scenes": SPL-UX-17.
  - Empty selection and no Approved Investigator: SPL-UX-4, 8.
- **Exceptions, covered by integration tests** (state why in the spec file header):
  - "Concurrent starts leave one Active Scene" and the raced 409 (SPL-UX-7): they need simultaneous requests.
  - "Only Approved Investigators can be present" (400): the UI never offers an unapproved Investigator.
  - "Scene Play stays within its Campaign": covered by the matrix.
- **New fixture:** `startSceneViaApi` and `finishActiveSceneViaApi` in a new `e2e/fixtures/scene-play.ts`.
- **Folded follow-ups.** Each extends an existing spec and deletes its "unreachable until SPL-001" exception comment (`scenes.spec.ts` L28-29, `scene-links.spec.ts` L29-31, `scene-handouts.spec.ts` L30-32, `scene-file-handouts.spec.ts` L28-29, `scene-item-links.spec.ts` L25-26, `items.spec.ts` L27, `item-handouts.spec.ts` L24, `manual-preparation.spec.ts` L24):
  - **PBI-SP-002 (`scenes.spec.ts`):**
    - "A played Scene cannot be removed": no "Remove Scene" on an Active Scene (SP-UX-23).
    - "A Finished Scene is read-only": no Edit or Remove, and the sentence (SP-UX-22).
    - "The Keeper edits an Active Scene's Keeper notes" (SP-UX-20 on Active).
    - Status and times shown (SP-UX-21).
  - **PBI-SP-004 (`scene-links.spec.ts`):**
    - SP-UX-57: a Finished Scene's links have no actions.
    - SP-UX-58: deleting a profile linked to an Active Scene shows "{name} is part of a Scene that has been played, so it can't be deleted." with Delete disabled.
  - **PBI-SP-005 (`scene-handouts.spec.ts`):**
    - SP-UX-72 on an Active Scene, including "This Scene has been started, so its Handouts can't be deleted.".
    - SP-UX-73 on a Finished Scene.
  - **PBI-SP-008 (`items.spec.ts`, `item-handouts.spec.ts`, `scene-item-links.spec.ts`):**
    - An Item linked to an Active Scene cannot be deleted.
    - A Finished Scene refuses a new Item link.
    - An Item Handout's delete is hidden while the Item is in play.
    - The Developer checks the exact copy against `specs/scenario-preparation/ux.md` sections 63.3, 64, and 65 before asserting.
  - **`manual-preparation.spec.ts`:** extend the Keeper-and-Player walk-through with a start and a finish, and remove the L24 exception.

## ADR
- **ADR 0024 (new), "Scene Play runs the Scene aggregate through a provider command service":** D1, D3, D4, and D5. It extends ADR 0008 to commands and records the second publication path next to ADR 0011.
- **ADR 0025 (new), "One Active Scene per Campaign through a filtered index and a Scene version":** D2 and D6. It amends ADR 0019 and ADR 0022 ("must re-check" is resolved).
- **ADR 0009:** add `activeScene` to the topic list (line 19).
- **ADR 0016:** a Consequences note that the index now exists (ADR 0025).
- **Spec updates (Refinement Protocol, because the ownership split changes):**
  - `specs/scene-play/spec.md` Architecture: Ownership (Investigators present and Reveals are stored as children of the Scene aggregate in Scenario Preparation; Scene Play owns the use cases, API, and rules that decide them), the UX link, and the GET shapes above.
  - `specs/scenario-preparation/spec.md` Architecture (the same ownership note, and Scene status transitions through `SceneLifecycleService`).
  - `specs/campaign-overview/spec.md` (the Overview list gains the Active Scene card) and `ux.md` section 3.
  - `specs/scenario-preparation/ux.md` section 14 (Start Scene and Open Active Scene).
  - `specs/campaign-play/spec.md` topic list: implementation step 6. The ADR 0009 list is updated with this record.

## Phases
- **Phase 1:** design docs (this record, ADRs, specs, ux.md). Checkpoint: `docs(design): Scene Play start and finish design (PBI-SPL-001)`. This is the Architect commit.
- **Phase 2:** Scene domain, persistence, migration, `SceneLifecycleService`, D6 guards, and their tests. Checkpoint: `feat(scenario-preparation): Active Scene lifecycle and concurrency guards (PBI-SPL-001)`.
- **Phase 3:** Campaign Play topic, publisher, and approved-Investigator query; ScenePlay projects, API, matrix, and integration tests. Checkpoint: `feat(scene-play): start, finish, and present Investigators API (PBI-SPL-001)`.
- **Phase 4:** frontend slice, routes, card, Scene page actions, and live mapping. Checkpoint: `feat(frontend): Active Scene pages and overview card (PBI-SPL-001)`.
- **Phase 5:** E2E, including the folded follow-ups. Checkpoint: `test(e2e): Active Scene journeys and played-Scene preparation cases (PBI-SPL-001)`.

## Human decisions
- 2026-10-28, UX gate: Option B selected.
- 2026-10-28, UX gate: the Wall Entry text is "Scene started: {title}" and "Scene finished: {title}" (proposal accepted).
- 2026-10-28, UX gate, Q3: "No, Scene page only". A Scene is started only via Scenario, Scene, Start Scene. There is no cross-Scenario Prepared Scenes read and no "Start a Scene" link on the overview card.
- 2026-10-28, UX gate, Q2: not applicable. Approved is terminal today, and there is no Player removal. No behavior is designed. A follow-up is recorded. (Relayed by the coordinator; the human may override at the plan gate.)
- 2026-10-28, plan gate: approved ("Approve"), covering D1-D6, the start-route refinement to `/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/start`, Q2 as not applicable with its follow-up, and the `specs/scene-play/ux.md` draft.

## Follow-ups (to add to the PBI on close)
- Any future PBI that adds un-approving an Investigator or removing a Player must define the effect on Investigators present (spec: "An unapproved Investigator is never present").
- Residual race: a Scene child write allowed on an Active Scene (link, edit link, add or edit Handout) that races a Finish can land on a Finished Scene. Decide whether those writes touch `Version`.
- PBI-SPL-002: build Reveals on D3, and extend the D6 guards so that a blob or link a Reveal references is never deleted (ADR 0021/0022).

## Revisions

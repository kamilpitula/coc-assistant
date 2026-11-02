# Design: PBI-SPL-002: The Keeper reveals Player-facing Handouts and Non-Player Entity links of the Active Scene to chosen Investigators present; Players see them live and as Clues

## Triggers
- **2 (shared aggregate / data model):** the Scene aggregate gains `Reveal` children; `Handouts` gains `ImageDescription`; `Scene.EditFileHandout` starts touching `Version`.
- **3 (cross-layer pattern):** topics `myClues` and `sceneReveals`; the first Player-facing file delivery; a new Scene Play provider port.
- **4 (ADR):** Player file delivery changes ADR 0021's "files reach the Keeper only" (`docs/adr/0021-handout-files-are-immutable-blobs-behind-a-storage-port.md:12`).
- **5 (several contexts):** Scene Play, Scenario Preparation, and Campaign Play.
- **6 (competing answers):** Explorer open questions 1-8.
- **7 (UX):** Keeper reveal controls, the Player's revealed content, and the Clues pages. Option A was selected.

## Constraints
- **ADR 0008 / 0013 / 0024:** consumer-owned ports; Reveals are children of the Scene in `ScenarioPreparationDbContext`; no cross-context FK. The PBI-SPL-001 record D3 fixes the Reveal table shape; this PBI refines it within that shape.
- **ADR 0009 / 0012:** closed topic set, one publication policy, best-effort delivery. A Keeper-only change never signals `campaign:{id}`.
- **ADR 0011 and PBI-SPL-001 D5:** no event interceptor in Scenario Preparation; explicit post-commit publication.
- **ADR 0015:** rich text is validated Lexical JSON.
- **ADR 0019 / 0020:** links and Handouts are Scene children; material of played Scenes is never deleted.
- **ADR 0021:**
  - immutable blobs, deleted only while the Scene is Prepared (`0021:11`);
  - item 3: "A Scene status transition must conflict with a concurrent Handout write on the same Scene" (`0021:16`);
  - Keeper-only delivery (`0021:12`), amended by ADR 0026.
- **ADR 0022:** "has a Reveal" must count as in play before Items can be revealed (Items are PBI-SPL-003).
- **ADR 0023:** the endpoint-list authorization matrix covers every Scene Play endpoint.
- **ADR 0025:** `Scene.Version` is the concurrency token (`Scene.cs:34`, `:354`).
- **Specs:**
  - `specs/scene-play/spec.md`: Architecture, API Contracts, Live updates, Constraints, Regression Guardrails, Scenarios;
  - `specs/scene-play/ux.md`;
  - `specs/scenario-preparation/spec.md` (Scene read, Handout API, Constraints on links and files).
- **CONTEXT.md:** Reveal, Clue, Handout, Map ("shown prominently when revealed"), Read-aloud Handout, Investigators present.
  - Terminology gap: Reveal says "a Non-Player Entity's Player-facing description", but the snapshot holds the link's Player-facing name and description.
  - Resolved by a new "Non-Player Entity link" entry.
- **Game rules:** no `docs/game-rules/` section governs Reveals or Clues; none is cited.
- **Complexity:** at most 10. No new CA1502 or ESLint suppression.

## UX
- **Selected option:** A (material list on the Active Scene page, "Reveal..." confirm dialog, dedicated Clues pages).
- `specs/scene-play/ux.md` (updated):
  - sections 11 to 20;
  - section 1 (Interim) resolved;
  - SPL-UX-9 and SPL-UX-12 amended;
  - section 10 amended.
- `specs/scenario-preparation/ux.md` (updated): section 71 "Image description"; SP-A11Y-46 amended.
- **Q2 a:** an optional "Image description" on Image and Map Handouts, used as `alt` (falling back to the title) and snapshotted.
- **Q3 a:** Keeper notes are shown read-only and collapsed on the Keeper's Active Scene page.

## Decisions

### D1: Provider surface for Reveals and Clue reads (Explorer Q2)
| Metric | A: extend `IPlayableScenes` / `SceneLifecycleService` | B: new port `ISceneReveals` onto a new provider `SceneRevealService`, rules in `Scene.Reveal` |
| --- | --- | --- |
| Consistency | + one existing port | + same ADR 0008/0024 shape; PBI-SPL-001 kept ports narrow so fakes stay small |
| Modifiability | - lifecycle and Reveals in one growing class; PBI-SPL-003/004 add more | + Reveal, Clue, and Reveal-file reads evolve together, apart from status transitions |
| Testability | 0 larger fakes | + small fakes in `ScenePlayFakes` |
| Simplicity | + one fewer class | 0 one service, one port, one adapter |
| Reversibility | 0 | 0 |
| Security and correctness | 0 rules sit in `Scene` either way | 0 same |

- **Chosen:** B, because of Modifiability and Testability.
  - Giving up: one more adapter class.
- **Rejected:** A. It grows `SceneLifecycleService` (`SceneLifecycleService.cs:23-117`) into a second responsibility.
- **Also rejected (ADR 0024):** a Scene Play `DbContext`, or a Reveal aggregate outside the Scene.
- The Developer must not reintroduce any of these.
- **`Scene.Reveal(RevealSubject subject, IReadOnlyCollection<Guid>? recipientIds, DateTimeOffset now)`** returns `RevealResult(RevealOutcome, Reveal?)`. Checks run in this order:
  1. the Scene is Active (`NotActive`);
  2. the subject type is revealable (`SubjectNotRevealable` for `Item`);
  3. the subject is on this Scene (`SubjectNotFound`);
  4. the subject is Player-facing (`SubjectKeeperFacing`);
  5. the recipients:
     - null means every Investigator present;
     - otherwise the list must be non-empty, have no duplicates, and name only Investigators present (`NoRecipient`, `DuplicateRecipient`, `RecipientNotPresent`);
     - these checks reuse the present-list validation helper that `Scene.Start` uses, without duplicating it.
- **`SceneRevealService`:**
  - `RevealAsync(campaignId, subjectType, subjectId, recipientIds?)` loads the Active Scene (`NotActive` when none);
  - `ListCluesAsync(campaignId, investigatorId)`;
  - `FindRevealFileAsync(campaignId, revealId)` returns the file snapshot and the recipients.
  - The Active Scene's Reveals reach Scene Play on `PlayableScene` (D5).
  - The provider performs no authorization (Invariants).

### D2: Concurrency of Reveals, file replace, and the PBI-SPL-001 residual race (Explorer Q3)
| Metric | A: a Reveal adds child rows and does not touch `Version`; a Prepared-Scene file replace touches `Version` | B: a Reveal and every Active-Scene child write touch `Version` |
| --- | --- | --- |
| Consistency | + PBI-SPL-001 D6 precedent; satisfies ADR 0021 item 3 (`0021:16`) | 0 same token, much wider use |
| Modifiability | + one domain change (`Scene.cs:319-322`) | - every Scene child-write service needs a new 409 mapping and copy |
| Testability | + one `BeforeSave` race test | - many new race tests |
| Simplicity | + | - |
| Reversibility | + | 0 |
| Security and correctness | + see below | + also serializes, but two quick Reveals, or a Reveal and an edit, get spurious 409s |

- **Why A is correct:**
  - A Reveal reads the Scene status, the subject's visibility and content, and the present list. It then only inserts `Reveals` and `RevealRecipients` rows.
  - None of these writes ever reads Reveals: a Finish, a present change, or a Handout or link edit.
  - So when one of them commits between a Reveal's read and its commit, the outcome equals "the Reveal happened first". The snapshot is exactly the content at that moment.
  - "A Reveal reaches only the Investigators the Keeper chose" holds, and an Investigator removed afterwards keeps the Clue (spec Constraints).
- **The one real write skew is the blob:**
  - A Prepared-Scene file replace reads "Prepared", then deletes the old blob after commit (`HandoutFileService.cs:114-121`).
  - A start and a Reveal of the old key can commit in between.
  - Fix: `Scene.EditFileHandout` increments `Version` when it returns a `ReplacedKey`.
  - The existing `catch (SceneConcurrencyException) when (replacedKey is not null)` (`HandoutFileService.cs:114`) already maps this to `InPlay` (409), and the blob is kept. This mirrors `ItemHandoutOwner.cs:35-43`.
- **Chosen:** A, because of Correctness at no extra conflict cost, and Simplicity.
  - Giving up: a Reveal racing a Finish can be recorded on a Scene that is Finished by the time the response arrives. This is accepted, as equivalent to revealing just before the Finish.
- **Rejected:** B. The Developer must not add `Version` bumps to Reveal or to Active-Scene child writes.
- **PBI-SPL-001 residual-race follow-up:** closed with no change, by the same argument. A link or Handout write that read "Active" and commits after a Finish is equivalent to happening before it. Recorded in ADR 0025.

### D3: How Players (and the Keeper) read a revealed file (Explorer Q1)
| Metric | A: Scene Play endpoint `GET api/campaigns/{campaignId}/reveals/{revealId}/file`, authorized per recipient, bytes read through a Scene Play port onto `IHandoutFileStore.OpenReadAsync` | B: extend Scenario Preparation's Keeper file endpoint (`HandoutFilesController.cs:99`) for recipients | C: short-lived signed URLs |
| --- | --- | --- | --- |
| Consistency | + spec Architecture: "reads the file through a Scenario Preparation port"; ADR 0024 boundary | - Scenario Preparation would need Reveal recipients and Player roles; its ADR 0023 matrix is Keeper-only | - ADR 0021 forbids SAS |
| Modifiability | + PBI-SPL-003 (Item Handouts) and PBI-SPL-004 (History) reuse it, keyed by Reveal | - keyed by Handout id, so it serves the current file, not the snapshot | - |
| Testability | + matrix row plus recipient tests | 0 | - |
| Simplicity | 0 one endpoint, one port, one adapter | - authorization split across contexts | - new infrastructure |
| Reversibility | + | 0 | - |
| Security and correctness | + serves the snapshotted key, so later replaces never change what was received; non-recipients get 404 | - a file replaced on an Active Scene would serve new bytes, breaking the snapshot guardrail | - leaked URLs bypass authorization |

- **Chosen:** A, because of Correctness (the snapshot guardrail) and Consistency.
  - Giving up: a second download helper.
    - `HandoutActionResults` is `internal` in ScenarioPreparation.Controllers (`HandoutActionResults.cs:8`, `:60-72`), and ScenePlay.Controllers cannot reference it (ADR 0013).
    - So a Scene Play `RevealFileResults.Download` repeats its three header lines: `nosniff`, `private, no-store`, and an attachment with the stored media type.
    - This is a documented DRY exception, with a one-line comment.
- **Rejected:** B and C. The Developer must not add Player access to any Scenario Preparation endpoint.
- **Answers, in order:**
  - 401 without a token;
  - 404 for:
    - a non-member;
    - an unknown Reveal or one of another Campaign;
    - a Reveal with no file;
    - a Player whose Approved Investigator is not a recipient, including a Player without one;
  - 503 when storage fails.
- The Keeper reads revealed snapshots through the same endpoint. Previews of current material keep the existing Keeper Handout endpoints.
- **Port:** `IRevealedFiles.OpenReadAsync(fileKey)`. The adapter `ScenarioPreparationRevealedFiles` wraps `IHandoutFileStore` (`IHandoutFileStore.cs:8-13`) and maps `HandoutFileStoreException` to a storage failure.
- Recorded in ADR 0026.

### D4: Where the Keeper's material list comes from (Explorer Q8)
| Metric | A: reuse the Keeper Scene read (`specs/scenario-preparation/spec.md`, Scene API) and the Handout read (`useHandout`) via `scenarioId` and `sceneId` from the Keeper Active Scene response | B: add the material to the Keeper `GET active-scene` response |
| --- | --- | --- |
| Consistency | + the start page already uses `useScene` (`start-scene-page.tsx:9`); `activeScene` already invalidates `sceneQueryKeys` | - a second projection of Scene content |
| Modifiability | + Scenario Preparation stays the only reader of its content | - Scene Play must track every content change |
| Testability | + existing hooks are tested | 0 |
| Simplicity | + no new endpoint | - a new projection and schema |
| Reversibility | + | 0 |
| Security and correctness | + both reads are Keeper-checked already | + |

- **Chosen:** A, because of Consistency and Simplicity.
  - Giving up: one extra request, plus one per expanded Handout preview.
- **Rejected:** B.

### D5: API shapes and Clue reads (Explorer Q5, Q6, Q7)
- **`POST active-scene/reveals`:**
  - Body: `{subject: {type: "Handout"|"NonPlayerEntity"|"Item", id}, investigatorIds?: Guid[]}`.
  - Success: 200 with the created Keeper Reveal view `{revealId, revealedAt, subjectType, subjectId, title, handoutKind, content, file, imageDescription, recipients}` (revised 2026-10-30, see Revisions). The service does not read the Scene after the commit; the client refetches the Active Scene.
  - Error order:
    1. 401;
    2. 404 for a non-member or a Player (the Keeper check comes first, `ActiveSceneService.cs:131`);
    3. 409 when no Scene was Active before the Reveal (nothing was revealed);
    4. 400, keyed by request path (ADR 0018 style):
       - `subject.type`: missing or unknown, or `Item` ("Items can't be revealed yet.", PBI-SPL-003);
       - `subject.id`: not on the Active Scene, or a Keeper-facing Handout ("This Handout is Keeper-facing and can't be revealed.");
       - `investigatorIds`: empty, duplicate, or naming an Investigator who is not present.
- **Player Reveal view (present Player):**
  - Shape: `{revealId, revealedAt, subjectType, title, handoutKind|null, content|null, file: {name, mediaType, sizeBytes}|null, imageDescription|null}`.
  - It carries no subject id and no recipients, so a Player never learns another Investigator's id or who else received it.
  - `GET active-scene` for a present Player returns `reveals`: this Scene's Reveals that reached the caller's Investigator, newest first (`revealedAt` descending, then id).
- **Keeper Reveal view:**
  - The Player view plus `subjectId` and `recipients: [{id, name}]`. Names come from `IApprovedInvestigators`.
  - `GET active-scene` for the Keeper returns every Reveal of the Active Scene, newest first.
  - `PlayableScene` (`ScenePlayPorts.cs:26-33`) gains `Reveals`.
  - `EfSceneRepository.WithChildren()` (`EfSceneRepository.cs:79-84`) includes the Reveals with their recipients.
- **Absent Player:** the shape stays exactly `{title, isPresent:false}`. An Investigator removed from present sees no Reveals on the Active Scene page and keeps its Clues.
- **`GET investigators/mine/clues`** (Player only):
  - Returns `{investigatorName, clues: [Clue]}`, newest first, across the Active and Finished Scenes of the Campaign.
  - A Clue is the Player Reveal view plus `scene: {id, title}`.
  - 404 for the Keeper, and for a Player without an Approved Investigator.
- **`GET investigators/{investigatorId:guid}/clues`** (Keeper only):
  - Returns the same shape for an Approved Investigator of the Campaign; 404 otherwise.
  - No route collides: Campaign Play uses `mine` literals and `{investigatorId:guid}` (`PlayerInvestigatorController.cs:31`, `KeeperInvestigatorController.cs:28`).
- **Clue query:** `ISceneRepository.ListRevealsForInvestigatorAsync(campaignId, investigatorId)`, no-tracking. It filters by `Scenes.CampaignId` (ADR 0016) and uses a new index on `RevealRecipients(InvestigatorId)`.
- **Controllers:** new `RevealController` (reveal and file) and `CluesController` under `ScenePlayControllerBase`.

### D6: Live updates
- **Single sane option**, following PBI-SPL-001 D5.
- **Path:**
  - Scene Play's `RevealService` publishes after commit through a new port `IRevealSignals.RevealMadeAsync(campaignId, recipientAccountIds)`.
  - Its adapter is `CampaignPlayRevealSignals`, onto a public `PublishRevealMade` that uses `LivePublicationSender`.
- **Policy:** `CampaignLivePublicationPolicy.ForRevealMade(campaignId, recipientAccountIds)` returns:
  - `LivePublication(CampaignKeeper, [SceneReveals])`;
  - plus one `LivePublication(Account(id), [MyClues])` per distinct recipient Player account;
  - precedent: `ForInvestigatorChanged` (`CampaignLivePublicationPolicy.cs:33-37`).
- **Topics:** `CampaignDataTopic` gains `MyClues` and `SceneReveals` (`CampaignDataTopic.cs:9-13`).
- **Client map:**
  - `myClues` invalidates the Active Scene query and the Player's Clues query;
  - `sceneReveals` invalidates the Active Scene query and every Keeper Clues query.
- **A Reveal never publishes `activeScene`.** That topic goes to the whole Campaign and would signal untargeted Players.
- **Failures:** best-effort and logged, as `TrySignalAsync` (`ActiveSceneService.cs:146`).

### D7: Image description (UX Q2 a)
- **Single sane option**, given the human's choice.
- **Domain field:** `Handout.ImageDescription`, nvarchar(1000). It is trimmed, and stored as null when empty.
  - It is allowed only for Image and Map. Document and rich-text Handouts store null.
  - Check constraint `CK_Handouts_ImageDescription`: `[ImageDescription] IS NULL OR [Kind] IN ('Image','Map')`.
- **Validation:** in `Handout.ValidateFile`, after the file.
  - New outcome `InvalidImageDescription`, answered as 400 keyed `imageDescription`.
  - Message: "Image description must be 1,000 characters or fewer."
- **API:**
  - The multipart forms (`HandoutFilesController.cs:26-58` and the Item counterpart) accept `imageDescription`.
  - On `PUT` it is a full replace, like the title: absent or empty clears it.
  - `HandoutResponse` gains `imageDescription`.
- **Snapshot:** `Reveals.ImageDescription`.
- **Frontend:**
  - the add and edit form field;
  - the Keeper Handout page;
  - `alt` everywhere is `imageDescription ?? title`.

### D8: Frontend content rendering reuse
| Metric | A: `HandoutImage` and `HandoutDocument` take a file query and an `alt`; `read-aloud-text` moves to `frontend/src/shared/components/`; one new `revealed-content` composes them | B: separate Scene Play renderers |
| --- | --- | --- |
| Consistency | + scene-play already imports scenario-preparation components (`active-scene-keeper-view.tsx:4-5`); PBI-SP-005 follow-up asks for the move | - two renderings of one kind |
| Modifiability | + one place for the Map, Image, and Document rules | - drift |
| Testability | + existing tests adjusted | 0 |
| Simplicity | 0 small refactor | - duplicated code |
| Reversibility | + | + |
| Security and correctness | N/A presentation only | N/A presentation only |

- **Chosen:** A.
  - The current components hard-wire `useHandoutFile(owner, ...)` (`handout-image.tsx:18-19`) and `alt={handout.title}` (`handout-image.tsx:47`).
  - Scenario Preparation callers pass `useHandoutFile(owner, id, true)`.
  - Scene Play passes `useRevealFile(campaignId, revealId)` with `staleTime: Infinity`, because a snapshot never changes.
- **Rejected:** B.

### Single-option decisions
- **Item subject:** answered with 400 at `subject.type`. The enum keeps `Item`, as the spec contract and PBI-SPL-001 D3 do.
  - The PBI-SP-008 follow-up needs nothing now, because no Item can have a Reveal.
  - PBI-SPL-003 must add "has a Reveal" to in-play through a port before it accepts `Item` (Follow-ups).
- **PBI-SP-004 and PBI-SP-005 follow-ups:** satisfied by construction. A Reveal blocks none of the following, and integration tests prove it:
  - `Reveals.SubjectId` has no FK;
  - unlinking on an Active Scene stays allowed (`Scene.cs:233-235`);
  - deleting a Handout stays Prepared-only (`Scene.cs:331-341`), and a Prepared Scene has no Reveals;
  - the profile-delete cascade and its refusal are unchanged.
- **Blob guard (PBI-SPL-001 follow-up):**
  - D2's Prepared-replace bump closes the last Scene-Handout path. Every Scene-Handout blob deletion now happens on a Prepared Scene behind `Version`:
    - delete (`Scene.cs:341`);
    - Scene removal (the `DELETE` token);
    - replace (D2).
  - Item-Handout blobs are PBI-SPL-003.
- **Snapshot columns (refining PBI-SPL-001 D3):**
  - **`Reveals`:**
    - `Id`;
    - `SceneId` (FK, cascade);
    - `SubjectType` (nvarchar, enum name);
    - `SubjectId` (no FK);
    - `RevealedAt` (UTC datetime2);
    - `Title` (200);
    - `HandoutKind` (nullable);
    - `Content` (nullable);
    - `FileKey`, `FileName`, `FileMediaType`, `FileSizeBytes` (nullable);
    - `ImageDescription` (nullable, 1000).
  - **Check constraints:**
    - `CK_Reveals_File`: the file columns are all null or all set.
    - `CK_Reveals_Subject`:
      - `Handout`: `HandoutKind` is not null, and exactly one of `Content` and `FileKey` is set;
      - `NonPlayerEntity`: `HandoutKind`, the file columns, and `ImageDescription` are null.
  - **`RevealRecipients(RevealId, InvestigatorId)`:** `RevealId` is an FK with cascade; PK on both columns; an index on `InvestigatorId`. `RevealRecipient` follows `InvestigatorPresence`.
  - **Non-Player Entity snapshot:** `PlayerFacingName` goes to `Title`, and `PlayerFacingDescription` (maybe null) to `Content`.
  - **Migrations:** `AddReveals` and the image-description column, in `ScenarioPreparationDbContext`; one migration or two.
- **Re-reveal:** allowed. Each Reveal is its own record; the UI default skips earlier recipients (ux.md section 13).
- **Authorization matrix (ADR 0023):**
  - New rows, each answering a Player with 404:
    - `POST active-scene/reveals`;
    - `GET reveals/{revealId}/file`: the matrix Player is not a recipient;
    - `GET investigators/mine/clues`: the matrix Player has no Approved Investigator;
    - `GET investigators/{investigatorId}/clues`.
  - `SnapshotAsync` (`ScenePlayAuthorizationMatrixTests.cs:164`) adds `Reveals` and `RevealRecipients`.
  - The seed creates one Reveal, so the file row has a real id.
  - A separate test covers the Keeper on `mine/clues` (404).
- **CONTEXT.md:** add the entry "Non-Player Entity link".

## Patterns
- **Used: Adapter.** `ScenarioPreparationSceneReveals`, `ScenarioPreparationRevealedFiles`, and `CampaignPlayRevealSignals` in ScenePlay.Infrastructure.
  - Force: incompatible interfaces at the functionality boundary (ADR 0008).
- **Used: Factory Method.** `Reveal.FromHandout(...)` and `Reveal.FromNonPlayerEntityLink(...)` in ScenarioPreparation.Domain.
  - Force: two construction variants with different snapshot columns. Keeping them out of `Scene.Reveal` keeps it at complexity 10 or below.
- **Rejected: Strategy per subject type.** Two variants now, and Item arrives in PBI-SPL-003. A two-arm switch plus the factory methods suffices. Revisit if a third type grows beyond one arm.
- **Rejected: State for Scene status.** Same reason as PBI-SPL-001.
- **Rejected: Observer (domain events) for the topics.** PBI-SPL-001 D5 still holds.
- **Rejected: Proxy or Decorator for file authorization.** One explicit check in `RevealService` is clearer.

## Invariants
- **Targeting:** a Reveal, its snapshot, its file bytes, and its live signal never reach a Player whose Investigator is not among its recipients.
- **Player responses** never contain a subject id, recipients, or another Investigator's id.
- **No Campaign-wide signal:** a Reveal is never projected or signalled through `campaign:{id}`.
- **What can be revealed:** only Player-facing Handouts and Non-Player Entity links of the Active Scene. Keeper-facing Handouts, profiles, and Items are refused server-side.
- **Snapshots are immutable:** there is no update path for `Reveals` or `RevealRecipients`. Files are served by the snapshotted key only.
- **Blob safety:** no blob a Reveal references is deleted. Scene-Handout blob deletions happen only on Prepared Scenes behind `Version` (D2).
- **No `Version` bump from a Reveal** (D2).
- **No authorization in the provider:** `SceneRevealService` performs none. Scene Play checks the Keeper, or the Player's recipient status, first.
- **Complexity:** no new suppression; complexity stays at 10 or below.
- **Escalation:** breaking any of these requires escalation.

## Implementation plan
1. **Docs** (the Architect commit):
   - this record and ADR 0026;
   - the notes in ADR 0009, ADR 0021, and ADR 0025;
   - the spec updates;
   - the ux.md sections;
   - `specs/scenario-preparation/ux.md` section 71;
   - the CONTEXT.md entry.
2. **Scenario Preparation Domain** (unit tests first):
   - `Reveal`, `RevealRecipient`, `RevealSubject`, `RevealOutcome`, and `Scene.Reveal`;
   - `Scene.EditFileHandout` bumps `Version` on a replace;
   - `Handout.ImageDescription` with its validation.
3. **Persistence:**
   - mapping and check constraints;
   - migrations;
   - the `WithChildren` includes;
   - `ListRevealsForInvestigatorAsync` and a find-Reveal-by-id read;
   - SQLite and SQL Server constraint tests.
4. **Scenario Preparation Application:**
   - `SceneRevealService`;
   - the image description through `HandoutFileService`, both file controllers, and the contracts;
   - a race test: a replace losing to a start answers `InPlay`, and the old blob stays.
5. **Campaign Play:**
   - topics, `ForRevealMade`, and `PublishRevealMade`, with unit tests;
   - the topic list in `specs/campaign-play/spec.md`.
6. **Scene Play:**
   - ports `ISceneReveals`, `IRevealedFiles`, and `IRevealSignals`;
   - `RevealService` (reveal, Clues, file);
   - the projection with reveals;
   - adapters, controllers, and contracts;
   - `KeeperActiveSceneResponse.Reveals` and `PresentPlayerActiveSceneResponse.Reveals` become typed.
7. **Integration tests:**
   - `RevealApiTests`: every 400, 409, and 404, and targeting.
   - Hub signals:
     - the targeted Player receives `myClues`;
     - the untargeted Player receives nothing, proven by a later sentinel Reveal to everyone;
     - the Keeper receives `sceneReveals`.
   - Snapshots survive an edit, a file replace on the Active Scene, an unlink, and a refused profile delete.
   - Clues include a Finished Scene's Reveals, and a removed Investigator keeps its Clues.
   - The matrix rows.
8. **Frontend:**
   - move `read-aloud-text` to shared;
   - refactor `HandoutImage` and `HandoutDocument` (D8);
   - the image-description field;
   - the scene-play components (ux.md section 18);
   - routes, `liveTopics`, and announcements;
   - tests and stories.
9. **E2E:** see E2E coverage.
10. **Close:** tick Verification and record the Follow-ups.

## Reuse
- **Using:**
  - Domain and persistence: the `InvestigatorPresence` mapping (template for `RevealRecipient`); the `CK_Handouts_Content` style; `HandoutFile`; `HandoutKinds`; the present-list validation in `Scene`; `SceneSaveChanges.ExecuteAsync`; `IHandoutFileStore`.
  - Live updates: `CampaignLivePublicationPolicy`; `LiveAudience.Account` and `LiveAudience.CampaignKeeper`; `LivePublicationSender`.
  - Scene Play: `IApprovedInvestigators`, `ICampaignRoles`, `CallerAccountResolver`.
  - Backend tests: `ScenePlayAuthorizationMatrixTests`, `ScenePlaySeed`, `PreparedScenarioSeed`, `CampaignHubTestClient`, `DrainDataChangedAsync`.
  - Frontend: `ReadAloudText`, `RichTextView`, `HandoutContent`, `HandoutImage`, `HandoutDocument`, `useObjectUrl`, `handout-file-status`, `formatFileSize`, `handout-badges`, `investigators-present-fieldset`, `Dialog`, `Collapsible`, `useScene`, `useHandout`.
  - E2E: `fixtures/scene-play.ts`, `fixtures/hub.ts`, `PREPARED`.
- **Not using:**
  - `HandoutActionResults.DownloadResult`: internal (D3).
  - `useHandoutFile` for snapshots: it serves the current file (D3).
  - A new Campaign tab: UX option C was rejected.

## TDD units
- **`Scene.Reveal`:**
  - each refusal, in D1's order;
  - null recipients mean every Investigator present;
  - the snapshot equals the Handout or link fields, including the file and the image description;
  - a later `EditHandout` leaves the Reveal unchanged;
  - re-revealing to the same Investigator creates a second Reveal.
- **`Scene.EditFileHandout`:** bumps `Version` only when it returns a `ReplacedKey`.
- **`Handout` image description:**
  - it is trimmed, and empty becomes null;
  - over 1000 characters is refused;
  - it is null for a Document and for rich text.
- **`SceneRevealService`:**
  - `NotActive` when no Scene is Active;
  - it saves;
  - Clues are newest first, filtered by Campaign and Investigator.
- **`RevealService`:**
  - A Player or non-member gets `NotFound` before any port is touched.
  - The signal is called after the save with the distinct recipient accounts, and never on a refusal. A signal failure is swallowed.
  - After a successful save, `RevealAsync` never reads the Active Scene again and returns the created Reveal, even when the Scene finishes meanwhile.
  - The file is served to the Keeper and to a recipient Player. A non-recipient, a Player without an Approved Investigator, or another Campaign gets `NotFound`.
- **Projection:**
  - the Player Reveal view has no `subjectId` or `recipients`;
  - a present Player sees only the Reveals that reached their Investigator;
  - the absent shape is unchanged.
- **Policy:** `ForRevealMade` returns the Keeper group plus the distinct accounts, and never the Campaign group.
- **Frontend:**
  - ux.md SPL-UX-20 to SPL-UX-37 and SPL-A11Y-8 to SPL-A11Y-14, as component tests;
  - scenario-preparation SP-UX-104 to SP-UX-106 and SP-A11Y-59;
  - the live map for `myClues` and `sceneReveals`.

## E2E coverage
- **New `e2e/tests/reveals.spec.ts`:**
  - Its header traces spec scenarios to SPL-UX ids.
  - Setup adds a Player-facing Map ("Corbitt House cellar") and a Player-facing Image with an image description through the API. `PREPARED` is untouched.
  - **"Keeper reveals a Handout to one Investigator"** (SPL-UX-21, 22, 26, 28) carries the browser-level no-signal proof:
    1. A new `recordHubFrames(page)` in `fixtures/hub.ts` collects Lucy's received frames.
    2. After Harvey sees the Handout, the Keeper reveals a sentinel to everyone.
    3. Lucy's frames then hold exactly one `myClues`, and Lucy's page never showed the first Handout.
  - **"A Reveal defaults to every Investigator present":** SPL-UX-21 (the pre-check).
  - **"A Keeper-facing Handout cannot be revealed":** SPL-UX-20 (no control). The 400 is covered by integration tests only.
  - **"A revealed Handout keeps its revealed content":** the Keeper edits through the API, then the Player reloads (SPL-UX-30).
  - **"Revealing a Non-Player Entity shows only its Player-facing description":** SPL-UX-27.
  - **Map and Read-aloud presentation:** SPL-UX-27, including an image `alt` equal to its description.
  - **"An Investigator added later receives no earlier Reveals":** SPL-UX-29.
  - **Clues for the Player and the Keeper:** SPL-UX-31 to SPL-UX-34.
  - **"A Reveal is delivered live only to its Investigators":** SPL-UX-28.
  - **Players cannot reveal:** SPL-UX-35.
- **Updated specs:**
  - `active-scene.spec.ts`: amended SPL-UX-9 (material shown) and SPL-UX-12 (no Handout before any Reveal).
  - `scene-file-handouts.spec.ts`: SP-UX-104 to SP-UX-106.
- **Exceptions, covered by integration tests:** the reveal 400s, the 409 race, and the file 404 for non-recipients. They need crafted requests the UI never sends.

## ADR
- **ADR 0026 (new): "Revealed files are served by Scene Play from the Reveal snapshot to its recipients".** Records D3 and amends ADR 0021's delivery line.
- **ADR 0025:** a note on D2:
  - a Prepared file replace touches `Version`;
  - Reveals do not;
  - the residual race is closed by the "equivalent to before" argument.
- **ADR 0009:** the topic list gains `myClues` and `sceneReveals`.
- **ADR 0021:** a pointer to ADR 0026 on the delivery line.
- **Specs:**
  - `specs/scene-play/spec.md`: API Contracts (reveal body and responses, Item refused, the Reveal file endpoint, Clue shapes), and the link to this record.
  - `specs/scenario-preparation/spec.md`: `imageDescription` on file Handouts; the snapshot includes it; a Prepared replace conflicts with a start.
  - `specs/campaign-play/spec.md`: the topic list.
- **No ADR** for D1, D4, D7, or D8: each is local and reversible.

## Phases
- **Phase 1:** design docs. Checkpoint: `docs(design): Reveals and Clues design (PBI-SPL-002)`.
- **Phase 2:** Scenario Preparation domain, persistence, `SceneRevealService`, the image description, and the replace guard. Checkpoint: `feat(scenario-preparation): Reveal snapshots and image descriptions (PBI-SPL-002)`.
- **Phase 3:** Campaign Play topics and publisher; the Scene Play API; the matrix and integration tests. Checkpoint: `feat(scene-play): reveal and Clues API with targeted live updates (PBI-SPL-002)`.
- **Phase 4:** frontend. Checkpoint: `feat(frontend): reveal controls, revealed content, and Clues pages (PBI-SPL-002)`.
- **Phase 5:** E2E. Checkpoint: `test(e2e): Reveals and Clues journeys (PBI-SPL-002)`.

## Human decisions
- **2026-10-29, UX gate:** "Q1 a, Q2 a Q3 a" (relayed by the coordinator):
  - Option A was selected.
  - An optional image description on Image and Map Handouts, used as `alt` and snapshotted.
  - Keeper notes are shown read-only and collapsed on the Keeper's Active Scene page.
  - There was no objection to the stated assumptions:
    - the Active Scene view shows only this Scene's Reveals;
    - a removed Investigator gets the not-present shape and keeps its Clues;
    - no Items;
    - re-reveal is allowed, and the default skips earlier recipients;
    - the Player-facing Map is added through the API in the E2E setup.
- **2026-10-29, plan gate:** "approved" (relayed by the coordinator), covering D1-D8, the single-option decisions, and the UX text.

## Follow-ups (to add to the PBI on close)
- **PBI-SPL-003:**
  - count "has a Reveal" as in play for Items, through a port, before accepting `subject.type = Item` (ADR 0022);
  - extend the blob guard to Item-Handout Reveals.
- **PBI-SPL-004:** Scene History reuses the Reveal views and the Reveal file endpoint.

## Revisions
- **2026-10-30, Verifier note N2 (changed decision, approved by the human):**
  - **Problem:** N2 reads "A Reveal committed just before the Scene is finished returns an ambiguous 409. This is a known race and the Reveal is recorded."
    - `RevealService.RevealAsync` committed and signalled the Reveal, then reloaded the Active Scene for the response.
    - When a Finish landed in between, the Keeper got 409 "No Scene is Active." although Players had already received the Reveal.
    - PBI-SPL-001 D4 rejected exactly this: a failure reported after a commit.
  - **Human ruling:** "fix all non blocking issues". The change below was then approved ("approved").
  - **Changed (D5):**
    - The reveal endpoint answers 200 with the created Keeper Reveal view and does not reload the Scene after commit.
    - 409 means only that no Scene was Active before the Reveal, so nothing was revealed.
    - The client refetches the Active Scene. A Scene finished meanwhile then shows "No Active Scene" with the success status (ux.md section 13, SPL-UX-22, SPL-A11Y-9).
    - Giving up: the reveal response no longer matches start and PUT present, which return the Keeper Active Scene.
  - **Unchanged:** D1-D4 and D6-D8, D2's acceptance of the race itself, and every invariant. No rejected option returns.
  - **Rejected:**
    1. Keeping 409 and adding a `revealRecorded` marker with new copy. A 4xx for an applied write repeats what PBI-SPL-001 D4 rejected, and it adds a flag and a third 409 branch.
    2. Answering 200 with the now-Finished Scene. It needs a Finished-Scene Keeper shape, which belongs to PBI-SPL-004.
    3. Documenting the ambiguity only. The Keeper could believe nothing went out while Players have it.
    4. Building the response from data read before the commit. It shows a Finished Scene as Active. The Developer must not build it.

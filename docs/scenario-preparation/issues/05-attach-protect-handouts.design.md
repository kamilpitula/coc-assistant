# Design: PBI-SP-005: Rich-text Scene Handouts (Read-aloud and Text) with explicit visibility, stored order, and Keeper-only access

## Triggers
- 2 (shared aggregate / data model): the Scene aggregate gains a second child collection and a new table; today the only children are the links (`Scene.cs:13`, `:31-32`) and the model has no Handout (`ScenarioPreparationDbContext.cs:12-14`).
- 6 (competing open questions): Handout ownership and its extension to Item Handouts; the API read shape; the delete-refusal contract; where "the text must not be empty" is enforced.
- 7 (UX): a new Scene page section, a Handout page, an add page, and a delete dialog. Option C selected (H1).

## Constraints
Line numbers in `specs/scenario-preparation/spec.md` refer to `master` before this design's spec edits.
- `specs/scenario-preparation/spec.md`: l.9 (a Scene has ordered Handouts; an Item may have its own), l.33 (rich-text Handouts are Lexical JSON), l.34 (Read-aloud and Text are rich text; Image, Document, Map are files, PBI-SP-007), l.46 (Read-aloud is its own Handout), l.48 (edited while Prepared or Active; Finished read-only), l.51 (a Handout on an Active or Finished Scene cannot be deleted), l.52 (allowed nodes, 400, 200 KB), l.67 (visibility constraint), DoD l.76 and l.78, Guardrails l.91, l.92, l.95 and "A Finished Scene's content never changes"; Gherkin l.160-171, l.315-319, l.333-337.
- `specs/scene-play/spec.md` l.9 (a Reveal's subject is a Handout, with a snapshot), l.16 (Reveal subject `{type: Handout, id}`; 400 for a Keeper-facing Handout), l.31 (Players see Read-aloud styled as read-aloud text). Downstream; not built here.
- PBI Refinement Protocol: update the Contract and Regression Guardrails together; never weaken "Handouts reach Players only through a Reveal".
- ADR 0013 (Keeper check first, 404 otherwise, no cross-context foreign key); ADR 0014 (Position, CreatedAt, Id; max+1; `PUT .../order` full list; duplicate 400, mismatch 409; Position never sent); ADR 0015 and amendment (validated Lexical JSON, 204,800 bytes, no null document, headings h3/h4); ADR 0016 (lookups filter Campaign, Scenario, Scene); ADR 0018 (400 keyed by camelCase path, server-owned messages; names Handouts); ADR 0019 (Scene children changed only through Scene methods that refuse Finished first; cascade on Scene removal); ADR 0009 and 0012 (SignalR, not used by Scenario Preparation).
- CONTEXT.md: "Handout" (l.113-115: kinds; Player-facing or Keeper-facing; avoid "Attachment, asset, file, article"), "Read-aloud Handout" (l.117-119: avoid "boxed text, narration"), "Reveal", "Active Scene", "Finished Scene". No nested CONTEXT.md.
- Game rules: none govern Handouts (no match for "handout" in `docs/game-rules/`); no gap to flag.
- Existing patterns relied on:
  - Finished checked first in every child write (`Scene.cs:71-74`, `:119-122`, `:138-141`, `:162-165`); status before not-found (`Scene.cs:162-171`).
  - Only Prepared is removable (`Scene.cs:35`, `ScenesController.cs:110`).
  - Full-list renumber, all or nothing (`SceneOrder.cs:13-32`); Position writable only there (`Scene.cs:177-178`), "not generalized" (SP-002 D7, `SceneOrder.cs:5`).
  - Case-sensitive wire-enum parsing to null (`NonPlayerEntityLinksController.cs:105-110`).
  - Rich text in as `JsonElement?` plus `GetRawText()`, out through `RichTextJson.Parse` (`NonPlayerEntityLinksController.cs:41`, `:102`).
  - Shared 409 title (`SceneProblemTitles.cs:6`); server-owned messages (`NonPlayerEntityLinkProblemMessages.cs`).
  - A write loads the Scene with its children (`EfSceneRepository.cs:22-23`).
  - Scene response assembly (`ScenesController.cs:164-173`, `SceneService.cs:168-169`); the property-set test (`SceneApiTests.cs:139-141`).
  - Frontend reorder hook generic over `{id, title}`, taking a mutation that resolves to the new items (`usePreparedOrderReordering.ts:15-18`, `:51-62`).
  - Frontend emptiness check (`richText.ts:76-90`); strict `sceneSchema` (`sceneApi.ts:36`); Scene page sections mounted in `SceneView` (`scene-page.tsx:197-244`); `scene-form` uses `useUnsavedChangesPrompt`.
- Cyclomatic complexity 10 or below; Scenario Preparation has no `GlobalSuppressions.cs` and no ESLint exemption, so no new suppression.
- Background only: PBI-SP-002 (D7) and PBI-SP-004 (D5, D6, D9) design records.

## UX
- Selected option: C, a compact ordered list on the Scene page with each Handout on its own page (view plus Edit toggle) (H1) - `specs/scenario-preparation/ux.md` (updated): header paragraph, section 14 amendment, new sections 40 to 49 with SP-UX-64 to SP-UX-76 and SP-A11Y-37 to SP-A11Y-43. Linked from `spec.md` (Architecture, UX specification).

## Decisions

### D1: Where a Handout lives, and how Item Handouts (PBI-SP-008) and file Handouts (PBI-SP-007) extend it
| Metric | A: `Handout` child entity of the Scene, in one `Handouts` table with an owner foreign key per owner table (ADR 0019 shape) | B: per-owner entities (`SceneHandout` now, `ItemHandout` later), separate tables, a shared Handout-fields value type | C: Handout as its own aggregate with a repository and an owner reference |
| --- | --- | --- | --- |
| Consistency | + the same shape as links (ADR 0019): child created and changed only through Scene methods; one FK column per owner table plus a check constraint | 0 matches the link child pattern, but two parallel tables for one CONTEXT.md concept | - ADR 0019 Considered Options rejects a separate aggregate ("the Finished rule would leave the Scene aggregate") |
| Modifiability | + SP-008 adds nullable `ItemId`, makes `SceneId` nullable, adds a one-owner check; SP-007 adds file columns to one table; one id space for Reveal subjects `{type: Handout, id}` (scene-play spec l.16) | - every Handout change made twice; Reveals must tell two id spaces apart | 0 one place for changes, but every owner rule moves to application code |
| Testability | + domain tests through `Scene` methods, as `SceneLinkTests` | + same | 0 needs a repository fake per test |
| Simplicity | + one entity, one table, one mapping | - a value type plus two entity mappings once SP-008 lands | - new repository, service plumbing, owner-status checks |
| Reversibility | 0 splitting later is a data migration | 0 merging later is a data migration | - undoing moves rules back into two aggregates |
| Security and correctness | + Finished and Prepared rules stay inside the Scene aggregate; cascade on Scene removal | + same | - status rules enforced outside the aggregate; easy to bypass |

- **Chosen:** A, because Consistency, Modifiability, and one id space for Reveals decide it - giving up that in SP-008 one entity type is reachable from two aggregates (each owns only the rows whose FK points at it), and SP-008 needs a migration making `SceneId` nullable.
- **Rejected:** B - duplicates the concept and splits the Reveal subject id space. The Developer must not name the entity `SceneHandout` or the table `SceneHandouts`.
- **Rejected:** C - ADR 0019's rejected option. The Developer must not add an `IHandoutRepository` or a Handout `DbSet` used outside Scene loading.
- In this PBI only `SceneId` exists, non-null. No `ItemId` column now; that would be speculative.

### D2: How the API reads Handouts
| Metric | A: Scene response carries `handouts: [{id, kind, visibility, title}]`; `GET .../handouts/{handoutId}` returns one with content | B: Scene response carries full Handouts with content (as links carry descriptions) | C: no Handouts in the Scene response; `GET .../handouts` list plus `GET .../handouts/{id}` |
| --- | --- | --- | --- |
| Consistency | 0 links are embedded in full (`SceneResponses.cs`); this embeds summaries | + same as links | - a second request shape for Scene children |
| Modifiability | + the content shape can change for file kinds (PBI-SP-007 returns a file reference, not rich text) without touching the Scene response | - every content change touches the Scene response and `sceneSchema` | + independent |
| Testability | + small exact property-set assertions | 0 | 0 |
| Simplicity | 0 one extra GET endpoint and query | + one client query; the Handout page reads the Scene cache | - two requests for the Scene page |
| Reversibility | + adding content later is additive | - removing content later breaks clients | 0 |
| Security and correctness | + same Keeper-first 404 on every route | + same | + same |
| Performance | + the Scene page transfers about 4 short fields per Handout; one Handout's text is up to 204,800 bytes (ADR 0015) | - the Scene page transfers up to 200 KB per Handout on every load and refetch | 0 |

- **Chosen:** A, because Performance and Modifiability toward file Handouts decide it, and it matches Option C's compact list plus a page per Handout - giving up a second query on the Handout page (the Scene, usually cached, plus the Handout). Accepted for v1: the server still reads all Handout rows when loading a Scene (a database read, not network transfer).
- **Rejected:** B - large payloads, and PBI-SP-007 content is not rich text. C - an extra request and a second pattern. The Developer must not add `content` to the Scene response or a list GET for Handouts.

### D3: The delete-refusal contract
| Metric | A: one outcome `SceneNotPrepared`; DELETE 409 "Only a Handout on a Prepared Scene can be deleted." for Active and Finished | B: two outcomes; Active gets a new 409 title, Finished gets the shared "A Finished Scene can't be changed." |
| --- | --- | --- |
| Consistency | + mirrors Scene removal: `Scene.IsRemovable` (`Scene.cs:35`) and the single 409 at `ScenesController.cs:110` | 0 reuses the Finished title but adds a second refusal path |
| Modifiability | + one rule ("delete only while Prepared"), stated once | 0 |
| Testability | + one outcome | 0 two |
| Simplicity | + the frontend maps a delete 409 to one error and message (ux.md section 44) | - two titles; the client would have to parse titles, which it does nowhere (`failWrite` maps by status, `sceneApi.ts:113-120`) |
| Reversibility | + local | + local |
| Security and correctness | + spec l.51 and DoD l.76 hold; Finished still refuses with 409 | + same |

- **Chosen:** A, because Consistency with Scene removal and Simplicity decide it - giving up a Finished-specific title on DELETE (the one Handout write whose Finished 409 does not use `SceneProblemTitles.Finished`).
- **Rejected:** B. The Developer must not add a second delete outcome or parse problem titles on the client.
- Check order: Keeper (404), Scene found (404), Scene not Prepared (409), Handout found (404). This follows status-before-not-found (`Scene.cs:162-171`); an unknown Handout id on an Active Scene answers 409. The client treats a delete 404 as success (ux.md section 44).

### D4: Where "the text must not be empty" is enforced (H3)
| Metric | A: server and client: the domain refuses a document without visible text through a new `RichTextDocument.HasVisibleText(json)` mirroring the frontend `hasContent` (`richText.ts:76-85`); both tested against shared fixture cases | B: client only (`isEmptyRichText`); the server accepts any valid document |
| --- | --- | --- |
| Consistency | + every other save-blocking rule is enforced server-side (ADR 0018) and shared through `rich-text-fixtures.json` (ADR 0015 amendment) | - the first client-only domain rule |
| Modifiability | 0 two implementations kept aligned by one fixture | + one implementation |
| Testability | + fixture-driven on both sides | 0 |
| Simplicity | 0 one small recursive method | + none |
| Reversibility | + easy to relax | + |
| Security and correctness | + an API call cannot store an empty Handout (an empty Reveal later) | - integrity rests on the client |

- **Chosen:** A, because Correctness and Consistency decide it - giving up two implementations of one rule.
- **Rejected:** B. The Developer must not skip the server check.
- Visible text means a `text` node whose text, trimmed, is not empty, using each platform's standard trim (JS `String.prototype.trim`, .NET `string.Trim()`). Fixture cases cover a space, a tab, a newline, U+00A0 (written as the JSON escape backslash-u-00a0 so the file stays ASCII), an empty paragraph, and nested list text. Differences on rarer characters are accepted.

### Single-option decisions
- **Ordering:** `Scene.ReorderHandouts(IReadOnlyList<Guid> handoutIds)` returns `HandoutOrderOutcome` (Reordered, SceneFinished, DuplicateIds, DoesNotMatchHandouts): Finished first, then the `SceneOrder.cs:15-29` logic over the Scene's own Handouts, writing internal `Handout.MoveTo`. It lives in `Scene`, not a static `HandoutOrder`, because ADR 0019 requires Scene children to change only through Scene methods that refuse Finished first; it is not generalized with `SceneOrder` or `ScenarioOrder` (SP-002 D7).
- **New position:** `Scene.AddHandout` sets `Position = max(existing) + 1` (1 when none) from the loaded collection; the aggregate is fully loaded (`EfSceneRepository.cs:22-23` gains the Handouts include), so no repository query. Concurrent adds with equal positions resolve through the ADR 0014 tie-break.
- **Read order:** `Scene.Handouts` orders by Position, CreatedAt, Id in the aggregate getter, like `Scene.cs:31-32`; for a child collection this getter is ADR 0014's single place for read order. Position is never in a response.
- **Reorder on Active accepted, on Finished 409** (H4): Handout order is Scene content, so the Finished-content guardrail applies (unlike Scene positions in the Scenario, spec l.50).
- **Kind change:** Edit may change the kind between ReadAloud and Text (H2). PBI-SP-007 decides how file kinds refuse a change across the rich-text/file boundary.
- **Wire values:** kind `"ReadAloud"` or `"Text"`; visibility `"PlayerFacing"` or `"KeeperFacing"`; parsed case-sensitively in the controller to null, like `NonPlayerEntityLinksController.cs:105-110`. The domain takes `HandoutKind?` and `HandoutVisibility?`; null gives InvalidKind or InvalidVisibility. No server default for either. Stored as `nvarchar(20)` strings, like Scene `Status`.
- **Field rules and validation order:** title, kind, visibility, content (the form's field order; first failure wins, as `Scene.cs:180-197`). Title trimmed, 1-200 characters. Content required: absent or null gives MissingContent; failing `RichTextDocument.Validate` gives InvalidContent; valid without visible text gives MissingContent. Status before fields; Handout found before fields.
- **400 keys and server-owned messages** (ADR 0018), in a new `HandoutProblemMessages.cs`: `title` "Enter a title." or "Title must be 200 characters or fewer." (by length, like `NonPlayerEntityLinkProblemMessages.PlayerFacingName`); `kind` "Choose Read-aloud or Text."; `visibility` "Choose who can see this Handout."; `content` "Enter the Handout text." (missing or empty) or "This text can't be saved. Shorten it or remove unsupported content." (invalid); `handoutIds` "The Handout ids must not repeat.".
- **409 titles:** create, edit, reorder on Finished use `SceneProblemTitles.Finished`; delete uses "Only a Handout on a Prepared Scene can be deleted." (D3); reorder mismatch uses "The order does not match the Scene's current Handouts.".
- **Endpoints:** new `HandoutsController` at `api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes/{sceneId:guid}/handouts`: `GET {handoutId:guid}` (200 `{id, kind, visibility, title, content}`, 404); `POST` (201 same shape, 400, 404, 409); `PUT {handoutId:guid}` (200, 400, 404, 409); `DELETE {handoutId:guid}` (204, 404, 409); `PUT order` with `{handoutIds}` (200 `{handouts: [{id, kind, visibility, title}]}`, 400, 404, 409). Requests: `HandoutRequest(string? Kind, string? Visibility, string? Title, JsonElement? Content)`, `HandoutOrderRequest([Required] Guid[] HandoutIds)`. A separate controller and a separate `HandoutService`, so `ScenesController.Failure` (`:141-151`) and `SceneService` do not grow (SP-004 D9 precedent).
- **Scene response:** `SceneResponse` gains `Handouts` (`HandoutSummaryResponse(Id, Kind, Visibility, Title)` in stored order); `SceneDetailView` gains `HandoutSummaryView` items.
- **Persistence:** table `Handouts`: Id (ValueGeneratedNever), SceneId (required FK to Scenes, cascade), Kind and Visibility `nvarchar(20)`, Title `nvarchar(200)`, Content `nvarchar(max)` required, Position int, CreatedAt (UTC conversion as other entities); non-unique index (SceneId, Position); mapped with `HasMany(scene => scene.Handouts).WithOne().HasForeignKey(SceneId).OnDelete(Cascade)` and `UsePropertyAccessMode(Field)` as `ScenarioPreparationDbContext.cs:66-72`. Migration `AddHandouts` (the "no pending model changes" test requires it).
- **No SignalR:** only the Keeper sees and edits Handouts, so there is no second viewer (SP-004 D6 precedent, spec l.31). Reveals carry their own real-time rules in PBI-SPL-002.
- **Player exclusion:** no new code path outside the Keeper-only Scenario Preparation controllers; every `HandoutService` operation runs `ICampaignKeepers.IsKeeperAsync` before any read; no Campaign Play, Identity, or Scene Play code reads Handouts.
- **Frontend errors:** `handoutApi.ts` maps 404 to `HandoutNotFoundError`, 400 to `HandoutValidationError` through `validationProblem.ts`, a create or edit 409 to the existing `SceneFinishedError`, a delete 409 to a new `HandoutNotDeletableError`, and a reorder 409 to a new `StaleHandoutOrderError`. A reorder 409 on a Scene finished meanwhile shows the stale message; the refetched Scene then shows the Finished state without move controls (ux.md section 41). The client does not parse problem titles.
- **Frontend data:** `types/Handout.ts` (types plus `HANDOUT_KIND_LABELS` and `HANDOUT_VISIBILITY_LABELS` lookup maps); `sceneSchema` (`sceneApi.ts:36`) gains `handouts`; `handoutQueryKeys.detail(campaignId, scenarioId, sceneId, handoutId)`. Mutations: create and delete invalidate the Scene detail; edit sets the Handout detail and invalidates the Scene detail; reorder sets the Scene detail's `handouts` from the response, mirroring `useScenes.ts:90`.
- **Routes:** `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.handouts.new.tsx` and `...scenes.$sceneId.handouts.$handoutId.tsx`.
- **Read-aloud presentation:** a new `read-aloud-text` component in the Scenario Preparation slice. PBI-SPL-002 may move it to `src/shared/` when the Player view needs it; moving it now would be speculative.

## Patterns
- **Used:** a lookup table instead of conditionals at the backend wire-value parsing (two switch-expression maps like `NonPlayerEntityLinksController.cs:105-110`) and the frontend label maps in `types/Handout.ts` - force: switching on kind and visibility for text. Two entries each make a map, not a Strategy.
- **Rejected:** Strategy per Handout kind - Read-aloud and Text differ only in presentation, one conditional in `handout-content`. PBI-SP-007 may introduce a content Strategy when file kinds create a real force.
- **Rejected:** State for Scene status - the guards are single-line checks (`Scene.cs:71`, `:119`, `:138`, `:162`, plus the new ones); the only new rule is "delete only while Prepared". PBI-SPL-001, which adds transitions, may revisit.
- **Rejected:** Template Method or a generic Order class shared by Scene, Scenario, and Handout ordering - SP-002 D7 keeps Position writable in one place per type (`SceneOrder.cs:5`).
- **Rejected:** Observer / SignalR - no second viewer.
- **Rejected:** Chain of Responsibility for validation - four ordered checks fit within complexity 10 in one method.
- **Rejected:** Builder, Command, Composite - no multi-step construction, no undo or queue, no part-whole structure.
- **Rejected:** Adapter or Facade port - nothing crosses a context.

## Invariants
- Every Handout write loads the Scene through `FindByIdAsync(campaignId, scenarioId, sceneId)` after the Keeper check and changes Handouts only through Scene methods.
- Status is checked before anything else: add, edit, and reorder refuse a Finished Scene; delete refuses any Scene that is not Prepared. A refused call changes nothing.
- Every Handout has a kind (ReadAloud or Text), an explicit visibility with no server default, a title of 1-200 trimmed characters, and content that passes `RichTextDocument.Validate` and has visible text. Content is never null.
- Position is written only by `AddHandout` (max+1) and `ReorderHandouts` (1..n in one save); edits never write it, and no response carries it.
- No response outside the Keeper-only Handout and Scene endpoints carries Handout data; a Player, another Keeper, or a foreign id gets the same 404 body as the other Scene endpoints.
- Removing a Prepared Scene removes its Handouts (database cascade).
- No `content` in the Scene response and no Handout list endpoint (D2).
- Cyclomatic complexity 10 or below, with no new suppressions or ESLint exemptions.
- If any invariant cannot hold, escalate; do not redesign.

## Implementation plan
1. Domain: `HandoutKind.cs` (ReadAloud, Text), `HandoutVisibility.cs` (PlayerFacing, KeeperFacing), `Handout.cs` (Id, SceneId, Kind, Visibility, Title, Content, Position, CreatedAt; `TitleMaxLength = 200`; private ctor; internal `Create`, `Replace`, `MoveTo`, `Validate`), `HandoutOutcome.cs` (Accepted, SceneFinished, HandoutNotFound, InvalidTitle, InvalidKind, InvalidVisibility, MissingContent, InvalidContent), `HandoutResult.cs` (outcome plus Handout), `HandoutRemovalOutcome.cs` (Removed, SceneNotPrepared, HandoutNotFound), `HandoutOrderOutcome.cs`; `RichTextDocument.HasVisibleText`; `Scene.cs` gains `_handouts`, `Handouts`, `AddHandout`, `EditHandout`, `RemoveHandout`, `ReorderHandouts` - D1, D4; the aggregate owns the rules.
2. Persistence: DbContext mapping, the include in `EfSceneRepository.FindByIdAsync`, migration `AddHandouts`. `ISceneRepository` is unchanged, so `RecordingSceneRepository` is untouched.
3. Application: `HandoutService` (GetAsync, CreateAsync, EditAsync, RemoveAsync, ReorderAsync; Keeper first, then the Scene, then the Scene method, then `SaveChangesAsync`, as `NonPlayerEntityLinkService`); `HandoutResults.cs`; `HandoutView.cs` (`HandoutView`, `HandoutSummaryView`); `SceneDetailView` gains `Handouts` and `SceneService.ToDetail` maps it; register the service in `ScenarioPreparationInfrastructureServiceCollectionExtensions.cs`.
4. Controllers: `HandoutsController`, `HandoutRequests.cs`, `HandoutResponses.cs`, `HandoutProblemMessages.cs`; `SceneResponse` gains `Handouts`.
5. Shared fixture: add a `textPresence` array (`{name, hasVisibleText, document}`) to `specs/scenario-preparation/rich-text-fixtures.json`. First check that the existing loaders tolerate an extra top-level key; if not, escalate.
6. Backend tests: see TDD units; update `SceneApiTests.cs:139-141` to add `"handouts"`.
7. Frontend data: `types/Handout.ts`, `sceneSchema` and `types/Scene.ts`, `services/handoutApi.ts`, `hooks/useHandouts.ts`, and the `isEmptyRichText` fixture test.
8. Frontend components, each with a story and a test, per ux.md section 46: `read-aloud-text`, `handout-badges`, `handout-content`, `scene-handout-section`, `handout-form`, `add-handout-page`, `handout-page`, `delete-handout-dialog`, `handout-not-found`; `scene-page` mounts `scene-handout-section` in view mode between Keeper notes and Non-Player Entities.
9. Routes: the two leaves; regenerate `routeTree.gen.ts`.
10. E2E: new `e2e/tests/scene-handouts.spec.ts` (see E2E coverage).
11. Close the PBI: tick Verification. Follow-ups: Active and Finished Handout E2E (PBI-SPL-001); PBI-SPL-002 snapshots Handout content and must not block Prepared-Scene cascades; PBI-SP-007 decides kind changes across the file boundary and any content Strategy; PBI-SP-008 adds `ItemId` per ADR 0020; moving `read-aloud-text` to shared code for the Player view; the Scene load reads every Handout's content (D2).

## Reuse
- Using: `RichTextDocument.Validate`, `RichTextJson.Parse`, `SceneProblemTitles.Finished`, `ICampaignKeepers`, `ScenarioPreparationControllerBase`; the `SceneOrder.Apply` algorithm (copied into `Scene.ReorderHandouts`, not called: Finished must be checked first and SP-002 D7 forbids generalizing); `ScenarioPreparationTestBuilder`; `SceneApiTests` helpers (`PlayAsync`, `ErrorKeysAsync`, `ProblemTitleAsync`, `WithoutTraceId`); frontend `usePreparedOrderReordering`, `MoveControls`, `preparedOrder.ts`; the `scene-list-section` list structure; `scene-page`'s view/Edit structure and `RemoveSceneControl` dialog handling; `rich-text-editor`, `rich-text-view` (`headingOffset`), `useUnsavedChangesPrompt`, `validationProblem.ts`, `SceneFinishedError`, `scene-not-found`, `RadioGroup`, `Badge`, `AlertDialog`, `Skeleton`, `Alert`; `shared/test-support/richTextEditor.ts`; E2E `createSceneViaUi`, `formattingButton`, `openAndCaptureBearer`, `joinAsNewPlayer`, `expectAllNotFound`.
- Not using: `SceneOrder` itself (above); `scene-link-form` - different fields, the field pattern is copied, not the component; `form-error-summary` - four fields use inline errors and focus the first invalid one, like `scene-form`; a SignalR publisher - no second viewer.

## TDD units
- Scene and Handout (domain): add on a Prepared or Active Scene appends with Position max+1, the trimmed title, CreatedAt, and a new id; two Read-aloud Handouts stay in the order added, each with its own visibility; add, edit, and reorder on a Finished Scene return SceneFinished before any field check; a null kind or visibility, an empty, whitespace, or over-200-character title, null content, content failing validation, and valid content without visible text each return their outcome in field order; a refused write changes nothing; edit can switch kind between ReadAloud and Text and never changes Position; edit or remove of an unknown id returns HandoutNotFound; remove on Active or Finished returns SceneNotPrepared (even for an unknown id); remove on Prepared removes; reorder with duplicate, missing, foreign, or extra ids changes nothing and returns its outcome; a valid reorder renumbers 1..n and is accepted on an Active Scene; the `Handouts` getter orders by Position, CreatedAt, Id.
- `RichTextDocument.HasVisibleText`: every `textPresence` fixture case.
- `HandoutService`: a non-Keeper gets NotFound with no Scene read (`RecordingSceneRepository`); a wrong Scenario, Campaign, or Handout id gives NotFound; outcomes are mapped; Saved returns the view.
- Persistence: removing a Prepared Scene cascades to its Handouts; a Handout added to a tracked Scene is inserted; kind and visibility round-trip as strings; equal positions read in CreatedAt, Id order.
- API (integration): every status code and every 400 key and message; 409 titles (Finished for create, edit, reorder; the D3 title for delete on Active and on Finished, seeded with `PlayAsync`; the reorder mismatch title); create, edit, and reorder on an Active Scene succeed and delete on an Active Scene is 409; exact property sets of the Scene response (with `handouts`), a Handout summary, and a Handout response, with no `position`; a Player, another Keeper, and an unknown Campaign get identical 404 bodies on all five Handout endpoints, and no body contains the Handout's secret text; wrong-path ids give 404; unauthenticated requests give 401; Gherkin "Rich text outside the allowed nodes is refused": an image node or a `javascript:` link gives 400 and the Handout is unchanged.
- Migration: no pending model changes.
- Frontend: schema parse of `handouts` and of a Handout; `isEmptyRichText` against `textPresence`; API error mapping (400 by key, 404, create/edit 409 to `SceneFinishedError`, delete 409 to `HandoutNotDeletableError`, reorder 409 to `StaleHandoutOrderError`); `handout-form` with no kind or visibility preselected, validation messages in order, and focus on the first invalid field; every SP-UX-64 to SP-UX-76 and SP-A11Y-37 to SP-A11Y-43 behavior at component level, including the Prepared, Active, and Finished action sets on the section and the Handout page, the Read-aloud panel with its visible label, and focus moving to the `h1` (never `body`) after a refused delete - this answers the SP-002 follow-up focus risk for these controls.

## E2E coverage
- New `e2e/tests/scene-handouts.spec.ts`, with a header tracing to the spec Scenarios and ux.md ids, one journey per test, `test.step('SP-UX-nn: ...')`:
  - "Read-aloud passages are separate Handouts" -> add two Read-aloud Handouts with different visibilities; the Scene page lists both in the order added with kind and visibility; each Handout page shows the Read-aloud panel and its formatting after a reload (SP-UX-64, 65, 67, 68).
  - "Keeper edits, reorders, and deletes Handouts" -> edit then cancel; edit then save, changing Text to Read-aloud; move down and up with the announcement; delete with cancel, then confirm (SP-UX-69, 70, 71).
  - "A Handout needs an explicit visibility" plus validation -> empty title, title over 200 characters, no kind, no visibility, and empty text each show their message and focus (SP-UX-66, 67).
  - "Rich text outside the allowed nodes is refused" -> API-level only: the editor cannot produce an image node or a `javascript:` link (SP-UX-19 restricts the link dialog), so the E2E checks the link dialog's refusal on the Handout form, and the 400 is an integration test.
  - "Handouts are the Keeper's alone" -> a Player opening the Handout and add URLs sees "We couldn't find that Scene"; the captured Player and other-Keeper bearers get 404 on all five Handout endpoints (`expectAllNotFound`); an unknown Handout id shows "We couldn't find that Handout" (SP-UX-74).
  - SP-UX-75 (busy buttons) and SP-UX-76 (Overview tab current) are asserted inside the journeys above.
- Exception: Active and Finished Scenes cannot be reached in E2E until PBI-SPL-001 (consistent with `scenes.spec.ts:28-31` and `scene-links.spec.ts:26-32`). SP-UX-72, SP-UX-73, the Handout part of "A Finished Scene is read-only", "The Keeper edits an Active Scene" (add a Text Handout), and "A Handout on an Active Scene cannot be deleted" are covered by integration tests (`PlayAsync`) and component tests; the exception is stated in the spec file header.
- Checked against existing criteria: SP-UX-20 (the Handouts section is hidden in Scene Edit mode, like links, so Scene Edit and Save are unchanged); SP-UX-22 (a Finished Scene has no Edit; Handout controls follow the same rule); SP-UX-26 (Player not found, extended by SP-UX-74); SP-UX-50 ("Non-Player Entities after Keeper notes" still holds with Handouts between them; the Developer checks `scene-links.spec.ts` asserts no adjacency - lines 98-101 use a section-scoped locator); SP-A11Y-10 (one `h1` per page); SP-UX-24 and SP-UX-11 to SP-UX-14 (move behavior reused).

## ADR
- ADR 0020: Handouts are child entities of their owning aggregate in one Handouts table (`docs/adr/0020-handouts-are-child-entities-of-their-owner-in-one-table.md`).

## spec.md edits (Contract and Regression Guardrails together, per the Refinement Protocol)
1. Architecture, Scene API: GET Scene also returns the Handouts, each `{id, kind, visibility, title}`, in stored order, without their text; a new bullet for `GET`, `POST`, `PUT`, `DELETE` of `.../handouts` and `PUT .../handouts/order`, with the 409 and 400 rules.
2. Architecture, UX specification: Handouts in ux.md sections 40 to 49.
3. Constraints: a new bullet for the rich-text Handout's fields, order, Finished reorder refusal, and delete-only-while-Prepared.
4. Regression Guardrails, added (nothing removed or weakened): "No Player-visible API returns a Handout: a Player-facing Handout reaches a Player only as a Reveal in Scene Play, and a Keeper-facing Handout never does."
5. Gherkin: SP-UX tags on "A Finished Scene is read-only" (SP-UX-73), "The Keeper edits an Active Scene" (SP-UX-72), "Read-aloud passages are separate Handouts" (SP-UX-65, 67, 68), "Rich text outside the allowed nodes is refused" (SP-UX-66); new scenarios "Keeper edits, reorders, and deletes Handouts", "A Handout on an Active Scene cannot be deleted", "A Handout needs an explicit visibility", and "Handouts are the Keeper's alone".

## Phases
- Phase 1: domain, persistence, migration, fixture cases, and their tests; checkpoint: `feat(backend): add Scene Handouts to the domain (PBI-SP-005)`.
- Phase 2: service, controller, Scene response, and integration tests; checkpoint: `feat(backend): add the Scene Handout API (PBI-SP-005)`.
- Phase 3: frontend data layer, components, routes, stories, and tests; checkpoint: `feat(frontend): manage Handouts on the Scene page (PBI-SP-005)`.
- Phase 4: E2E and closing the PBI; checkpoints: `test(e2e): cover Scene Handouts (PBI-SP-005)` and `docs(backlog): close PBI-SP-005 with its follow-ups`.

## Human decisions
- H1 (2026-10-22): UX Option C, a compact ordered list on the Scene page with each Handout on its own page (view plus Edit toggle).
- H2: Q1 confirmed - the kind may change between Read-aloud and Text after creation.
- H3: Q2 confirmed - the text must not be empty.
- H4: Q3 confirmed - reordering is allowed on an Active Scene and refused with 409 on a Finished Scene.
- Not overridden at the UX gate: explicit visibility with no default; title 1-200; read-aloud panel with a text label; visibility always shown as text.
- H5 (2026-10-22, "approve"): D1 to D4 as recommended, U1 (no default kind), ADR 0020, the ux.md sections 40 to 49 with the header and section 14 amendments, and the spec.md edits above.

## Revisions

# Design: PBI-SPL-009: Save a Scene's Keeper notes through their own endpoint, guarded by a notes version, in every status

## Triggers
- 2 Shared interface / data model: the Scene aggregate gains `NotesVersion`; `PUT .../scenes/{sceneId}` drops Keeper notes; the Scene GET and `SceneResponse` gain `notesVersion`; `ISceneRepository` gains two methods.
- 3 New cross-layer pattern: a conditional single-statement update as a second concurrency mechanism beside the Scene version, and the app's first autosave/save-status/conflict UI.
- 4 ADR: the separate notes version (the PBI asks for one beside ADR 0025).
- 6 Explorer open questions (a)-(d) with competing answers.
- 7 UX: new journey (autosave, conflict prompt, Finished Scene notes editing) - Option A selected by the human.

## Constraints
- ADR 0025: `Scene.Version` is the token for start, finish, the present list, Handout removal, and the removal guard; EF checks it on every update of the Scene row (ScenarioPreparationDbContext.cs:91); a lost finish answers 409 (SceneLifecycleService.cs:110-114, 187-197) and nothing retries finish-then-start.
- ADR 0036 and the PBI-SPL-008 record (D1-D4, Invariants): publish `scenes` through `ISceneContentSignals.ScenesChangedAsync(campaignId)` once per request, only after a successful commit, Keeper audience only, best-effort in the adapter.
- ADR 0015: Keeper notes are validated Lexical JSON stored as received (Scene.cs:25-26, `RichTextDocument.Validate` at Scene.cs:476).
- ADR 0013 / ADR 0016: the Keeper check runs first; a Scene of another Scenario or Campaign is NotFound (SceneService.cs:222-225, EfSceneRepository.cs:26-29).
- specs/scenario-preparation/spec.md, Scene API (lines 19-29) and Constraints (lines 76-78, 147-150) are the contract: 200 `{keeperNotes, notesVersion}`, 409 with the current `{keeperNotes, notesVersion}`, 400 keyed `keeperNotes`, Scene version untouched, `scenes` published.
- PBI Context: a notes save must never make a start or finish fail; everything else on a Finished Scene still answers 409.
- CONTEXT.md terms: Scene, Keeper notes, Finished Scene (wording updated by this PBI), Keeper. No "draft/current/closed scene".
- Game rules: none apply (docs/game-rules/ not involved).
- Cyclomatic complexity <= 10 (ESLint `complexity`, CA1502); no new suppressions.
- Existing patterns: one controller and service per Scene sub-resource (HandoutsController, NonPlayerEntityLinksController, ItemLinksController); strict Zod response schemas (sceneApi.ts:12-62); reducers with `useReducer` (investigator-wizard.tsx:162); `useUnsavedChangesPrompt` (beforeunload only, useUnsavedChangesPrompt.ts:4-17); `CheckStart` as a side-effect-free domain check (Scene.cs:126-133); ProblemDetails extensions (InvestigatorControllerBase.cs:35-45).

## UX
- Selected option: **A, one Keeper notes section with "Edit", autosave, and "Done" on the Scene page and Run**; Finish with unsaved notes: **(i) save first, then finish whatever the outcome** (human, 2026-11-24).
- `specs/scenario-preparation/ux.md`: updated (intro, sections 14, 16, 18 amended; new section 73; SP-UX-110..115, SP-A11Y-61..66).
- `specs/scene-play/ux.md`: updated (intro, 21.3 sentence, new section 25; SPL-UX-78..83, SPL-A11Y-30..32). Section 25 is built by PBI-SPL-010.
- Both linked from their spec.md UX bullets.

## Decisions

### D1: Where the notes version lives and how a stale save is refused without touching finish (open question a)

| Metric | Option A: `NotesVersion` column on `Scenes`, plain (not an EF token); conditional single-statement update | Option B: 1:1 child table `SceneKeeperNotes` with its own EF concurrency token | Option C: `NotesVersion` as a second EF concurrency token on the `Scenes` row (Item.Version precedent) |
| --- | --- | --- | --- |
| Consistency | - First `ExecuteUpdateAsync` in the codebase: a second way to write a Scene column | + EF change tracking and a token, like every other write | + Same mechanism as `Scene.Version` and `Item.Version` |
| Modifiability | + Mentions (PBI-MEN-001) stay text inside the notes (specs/mentions/spec.md lines 24-25, 70), so nothing else needs to join this write | 0 Notes reads must load the child row; every Scene read path changes | - Every Scene row writer now races notes saves |
| Testability | + Domain check is pure; one repository test proves a finish commits after an interleaved notes save | + Domain method fully unit-testable | 0 Testable, but the test would show the forbidden failure |
| Simplicity | + One nullable-free int column (default 0), one repository method, no data move | - New table, data migration moving `KeeperNotes`, owned-type mapping | + Smallest code |
| Reversibility | + Drop a column and a method | - Moving the column back is another data migration | + Easy |
| Security and correctness | + Finish/start/title edits write disjoint columns and check only `Version`; the notes update checks only `NotesVersion` in one atomic statement, so neither side can fail the other | + Disjoint rows, same guarantee | - EF puts every concurrency token into the WHERE of any update of the row, so a notes save committed between a finish's read and write makes the finish answer 409 (SceneLifecycleService.cs:110-114). Breaks the PBI Context and spec line 29 |

- **Chosen:** A, because of Correctness (the composition with finish holds by construction), Simplicity, and Reversibility - giving up Consistency: a second persistence technique, recorded in ADR 0037 and limited to this one statement.
- **Rejected:** B - a data migration and a new child for a guarantee A gives with one column. The Developer must not split Keeper notes into their own table.
- **Rejected:** C - it makes finishes and starts fail on a notes save; fixing that needs lifecycle retries ADR 0025 declines. The Developer must never configure `NotesVersion` as a concurrency token (see Invariants).

How (a) composes, which the Developer must keep:
- Server: a finish (`UPDATE Scenes SET Status, FinishedAt, Version WHERE Id AND Version`) and a notes save (`UPDATE Scenes SET KeeperNotes, NotesVersion = NotesVersion + 1 WHERE CampaignId AND ScenarioId AND Id AND NotesVersion = @expected`) touch disjoint columns; the database serializes them on the row and both commit in either order. The Scene ends Finished with the new notes.
- Client: under the human's (i), Run flushes a pending notes save before sending the finish and does not let its outcome block the finish (scene-play ux 25.2, built by PBI-SPL-010). The Scene page has no finish.

### D2: The 409 body for a stale notes save (open question b)

| Metric | Option A: ProblemDetails with title "The Keeper notes have changed since they were read." and extensions `keeperNotes`, `notesVersion` | Option B: plain JSON `{keeperNotes, notesVersion}` via `Conflict(response)` (CampaignMembershipController.cs:86-87) |
| --- | --- | --- |
| Consistency | + Every Scene 409 is a ProblemDetails (ScenesController.cs:110, 134-136, 149); extensions precedent at InvestigatorControllerBase.cs:35-45 | - Only one non-problem 409 exists, in another context |
| Modifiability | + The members sit at the top level, so the spec's `{keeperNotes, notesVersion}` holds; more members can be added | 0 Fine |
| Testability | + Same assertions as B plus content type | + Same schema as the 200 |
| Simplicity | 0 A small `ObjectResult` helper | + One line |
| Reversibility | + Easy | + Easy |
| Security and correctness | + Distinct title, no collision with `SceneProblemTitles.Finished` (SceneProblemTitles.cs:6); the client keys on status 409 alone, because this endpoint has exactly one 409 cause | + Same |

- **Chosen:** A, because of Consistency with the error envelope - giving up the 200 schema reuse; the client parses the conflict with a loose `z.object({keeperNotes, notesVersion})`, as problem bodies carry `type/title/status/traceId` (precedent: itemApi.ts:162 parses a problem body).
- **Rejected:** B - a second error envelope for Scenes. The Developer must not sniff the title on the client; `activeSceneApi.ts:102-104` is unaffected because it calls other endpoints.

### D3: Frontend autosave structure

| Metric | Option A: pure reducer `keeperNotesSave.ts` + `useKeeperNotesAutosave` hook (timers, online events) + `useSaveKeeperNotes` mutation with `retry: false` | Option B: TanStack mutation features (`retry`, `retryDelay`, `networkMode: 'online'` pausing, `scope` serialization) with component state for debounce and conflict |
| --- | --- | --- |
| Consistency | + `useReducer` precedent (investigator-wizard.tsx:162); mutation still via `useScenes.ts` like `useEditScene` (useScenes.ts:53-63) | + Leans on the library already used |
| Modifiability | + PBI-SPL-010 mounts the same hook; new states are table rows | - Behavior spread over library options and component flags; a paused mutation resumes with the content captured when it paused |
| Testability | + Reducer tests need no timers or network; hook tests use fake timers and `onlineManager` | - Needs library internals (`onlineManager`, failure counts, paused mutations) in every test |
| Simplicity | 0 More files, each small | + Less code |
| Reversibility | + Local to the slice | + Local |
| Security and correctness | + 409/400/404 never retried by construction; version advances only on confirmed saves | - Must remember a `retry` predicate for 409/400; stale captured variables on resume |

- **Chosen:** A, because of Testability and Correctness - giving up some brevity. Offline detection uses TanStack's `onlineManager` (subscribe/isOnline) rather than new raw `navigator.onLine` listeners.
- **Rejected:** B - the Developer must not use mutation `retry`, paused `networkMode`, or `scope` for notes saves.

### Single-option decisions
- Endpoint placement: new `SceneKeeperNotesController` and `SceneKeeperNotesService` in Scenario Preparation, route `api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}/keeper-notes`, `[HttpPut]`, because each Scene sub-resource has its own controller and service.
- Request: `SceneKeeperNotesRequest(JsonElement? KeeperNotes, int? NotesVersion)`; missing `notesVersion` is a 400 keyed `notesVersion`; absent or null `keeperNotes` clears the notes (as SceneRequest.cs:5).
- Check order: Keeper and Scene (404) -> stale `notesVersion` (409) -> rich-text validation (400 `keeperNotes`) -> conditional update; 0 rows -> no-tracking re-read -> 404 if gone, else 409 with the current notes. Stale before invalid follows "409 before any 400" (spec line 33).
- Domain: `Scene.NotesVersion` (`int`, private set, never incremented in memory); `Scene.CheckKeeperNotesSave(string? keeperNotes, int notesVersion) -> KeeperNotesSaveOutcome {Accepted, StaleNotesVersion, InvalidKeeperNotes}`, side-effect free like `CheckStart` (Scene.cs:126-133). No status check: every status is allowed.
- Scene PUT: `Scene.Edit(title, location)` (drop `keeperNotes`, Scene.cs:89-105); `SceneService.EditAsync`/`EditAfterConcurrentChangeAsync` lose the parameter; a new `SceneEditRequest(string? Title, string? Location)` replaces `SceneRequest` on PUT only; POST keeps `SceneRequest` with notes (Create sets `NotesVersion` 0).
- Responses: `SceneDetailView` and `SceneResponse` gain `NotesVersion`/`notesVersion` (GET, POST, PUT); new `SceneKeeperNotesResponse(JsonElement? KeeperNotes, int NotesVersion)` for the 200.
- Repository: `ISceneRepository.TryReplaceKeeperNotesAsync(campaignId, scenarioId, sceneId, keeperNotes, expectedNotesVersion, ct) -> bool` (ExecuteUpdateAsync) and `FindKeeperNotesAsync(campaignId, scenarioId, sceneId, ct) -> SceneKeeperNotesView?` (AsNoTracking projection).
- Signal: `ScenesChangedAsync(campaignId)` once after a successful update; never on 400/404/409 (PBI-SPL-008 invariants).
- Migration: `AddSceneNotesVersion`, `int NOT NULL DEFAULT 0` on `Scenes`.
- Mentions boundary (d): rich-text validation is today's `RichTextDocument.Validate`; the check is one call inside `CheckKeeperNotesSave`, which PBI-MEN-001 swaps for its Scene-notes-only rule. No Mention node, no `keeperNotesMentions`, no resolution here.
- Zod (c): `sceneSchema` gains `notesVersion: z.number().int().nonnegative()` (strict); new strict `keeperNotesSchema` for the 200; loose conflict schema per D2. All Scene fixtures and stories gain `notesVersion`.
- `scene-form`: a `withKeeperNotes` boolean prop; create passes true, the Scene page edit passes false; `SceneInput` for create keeps notes, new `SceneEditInput {title, location}` for `editScene`.
- `useSaveKeeperNotes`: on success `setQueryData` merges `{keeperNotes, notesVersion}` into the cached Scene detail; no list invalidation (the list has no notes).
- Editor reload: "Reload newer notes" remounts `RichTextEditor` with a new `key`, since it takes `initialValue` only (rich-text-editor.tsx:106).
- scene-play in this PBI: `KeeperNotesSection` on Run stays read-only; PBI-SPL-010 swaps in the shared section. `liveTopics.ts` unchanged.
- CONTEXT.md **Finished Scene**: replaced with the PBI's exact sentence.

## Patterns
- **Used:** State (as a transition table in a reducer) at `frontend/src/scenario-preparation/services/keeperNotesSave.ts` - force: input, save results, online/offline, Done, and the conflict choices behave differently in idle, pending, saving, saved, retrying, failed, offline, conflict, refused, and gone; one conditional would exceed complexity 10. One small handler per state; reducer precedent investigator-wizard.tsx:162.
- **Used (existing):** Adapter `CampaignPlaySceneContentSignals` behind `ISceneContentSignals` - reused unchanged.
- **Used (existing):** Observer through the `scenes` live topic - no new observer.
- **Rejected:** Command (queue of saves) - at most one save in flight plus "latest content wins" is a flag, not a queue.
- **Rejected:** Strategy for per-field rich-text validation - one rule today; PBI-MEN-001 owns that change.
- **Rejected:** Template Method/Strategy for Scene page vs Run surfaces - one component, Run only wraps it with Hide/Show.
- **Rejected:** Decorator over `ISceneRepository` for publishing - rejected in PBI-SPL-008; the service calls the port.

## Invariants
- `NotesVersion` is never configured as an EF concurrency token, and no change-tracked write sets `Scene.KeeperNotes` after creation. A repository test proves that a finish (and a title/location edit) commits after an interleaved notes save.
- A notes save never reads, writes, or increments `Scene.Version`; a start or finish never fails because of one.
- A notes save is accepted in Prepared, Active, and Finished; every other write on a Finished Scene still answers 409.
- A stale save changes nothing; its 409 carries the notes and version current at that moment.
- `PUT .../scenes/{sceneId}` never changes `KeeperNotes` or `NotesVersion`, even when the body carries `keeperNotes`.
- `scenes` is published once after a successful notes save, Keeper audience only, never on a refusal.
- Keeper notes and `notesVersion` never appear in a Player-facing response (`PlayableSceneView` unchanged).
- Client: an editor's content is never replaced by a live update while editing; its base version comes only from opening, its own 200s, or a 409 body when the Keeper chooses; 400/404/409 are never retried.
- No new dependency; complexity <= 10; no new suppressions.

## Implementation plan
Phase 1 (backend):
1. `Scene.cs` - add `NotesVersion`, `CheckKeeperNotesSave`, `KeeperNotesSaveOutcome`; narrow `Edit` to title and location; split `Validate` into title/location and notes.
2. `ScenarioPreparationDbContext` + migration `AddSceneNotesVersion` - plain int column, default 0.
3. `ISceneRepository` / `EfSceneRepository` - `TryReplaceKeeperNotesAsync`, `FindKeeperNotesAsync`.
4. `SceneKeeperNotesService` (+ results, view) - the check order above, signal on success; register in DI beside `SceneService`.
5. `SceneService` - drop notes from `EditAsync`/`EditAfterConcurrentChangeAsync`; `ToDetail` carries `NotesVersion`.
6. Controllers - `SceneKeeperNotesController`, `SceneKeeperNotesRequest/Response`, `SceneEditRequest`; `ScenesController.Edit` uses it; `SceneResponse` gains `notesVersion`; conflict `ObjectResult` with extensions.
Phase 2 (frontend):
7. `types/Scene.ts`, `sceneApi.ts` (`notesVersion`, `saveKeeperNotes`, `KeeperNotesConflictError`, `KeeperNotesNotFound` handling, `SceneEditInput`), `useScenes.ts` (`useSaveKeeperNotes`).
8. `keeperNotesSave.ts` reducer, `useKeeperNotesAutosave` hook.
9. `keeper-notes-section` component + stories.
10. `scene-form` (`withKeeperNotes`), `scene-page` (section 73 mount, Finished sentence, edit accessible name) + stories; update all Scene fixtures/stories for `notesVersion`.
Phase 3 (E2E and docs):
11. `e2e/fixtures/scenes.ts` and `e2e/tests/scenes.spec.ts` per E2E coverage.
12. CONTEXT.md Finished Scene; Gherkin trace comments in specs/scenario-preparation/spec.md (SP-UX-110..115); tick spec acceptance items 124-127 when verified.

## Reuse
- Using: `ISceneContentSignals` for the signal; `RichTextDocument.Validate` for notes; `RichTextJson` (Controllers) for raw-text-to-JsonElement; `rich-text-editor`/`rich-text-view`; `useUnsavedChangesPrompt`; `onlineManager` from TanStack Query; `Alert`, `Button`.
- Not using: `SceneSaveChanges`/`SceneConcurrencyException` for notes - the conditional update raises no concurrency exception. `EditAfterConcurrentChangeAsync`'s retry-once - not needed for notes. `SceneFinishedError` - notes have no Finished refusal.

## TDD units
- Domain: `CheckKeeperNotesSave` accepts the current version in each status (3 cases); stale version -> StaleNotesVersion; stale and invalid -> StaleNotesVersion; invalid nodes or over 204,800 bytes -> InvalidKeeperNotes; null clears; it changes nothing (KeeperNotes, NotesVersion, Version unchanged). `Edit(title, location)` leaves KeeperNotes; Finished still refuses.
- Repository (SQLite): conditional update succeeds and increments NotesVersion, Version unchanged; wrong version -> false, nothing changes; tracked finish saved after an interleaved notes update commits and keeps the new notes (the (a) proof); same for a title/location edit; notes update on a removed Scene -> false.
- Service (fakes): Player/other Campaign -> NotFound; success returns notes + version + 1 and signals once; stale -> Conflict with current, no signal; invalid -> Invalid, no signal; 0-row update + gone -> NotFound; 0-row + exists -> Conflict with current.
- API integration (SceneApiTests.cs / new SceneKeeperNotesApiTests.cs): 200 in Prepared, Active, Finished; 409 problem+json with `keeperNotes`, `notesVersion` (version 4 vs 5 scenario); 400 `keeperNotes`; 400 `notesVersion`; 404 for a Player and another Scenario; GET shows `notesVersion`; PUT scene with `keeperNotes` in the body leaves notes and version; Finished PUT scene still 409; concurrent finish + notes save (Task.WhenAll, repeated) ends Finished with the new notes and both 200; `scenes` published (SceneContentLiveUpdateApiTests.cs) and not on 409; existing PUT-notes assertions rewritten.
- Reducer: each state x event transition in 73.2/73.3 (pending->saving->saved; changes during saving re-save; network failure retrying x2 then failed; typing resets attempts; offline enter/resume; conflict pauses; reload sets base to 409 version; keep mine saves with it; 400 refused no retry; 404 gone; Done with/without unsaved; Done while offline adds the hint).
- Hook (fake timers): 1 s debounce; one in flight; retry at 2 s and 4 s; `onlineManager` resume; flush on unmount; prompt flag.
- Component: SP-UX-110..115 and SP-A11Y-61..66 (accessible names, live-region subset, focus moves, alerts' roles, no Hide while editing on Run is SPL-010).
- `sceneApi`: strict schema rejects a Scene without `notesVersion`; 409 parsed into `KeeperNotesConflictError` with current notes; 400 and 404 mapped.
- `scene-page`: Finished shows only the notes Edit and the new sentence; page Edit named "Edit title and location" and the form has no notes field; title save leaves the notes section intact.

## E2E coverage
- "The Keeper edits a Finished Scene's Keeper notes" -> new test in `e2e/tests/scenes.spec.ts` 'Played Scenes': on a Finished Scene, Edit notes, type, wait for "All changes saved", Done, reload; no other edit action (SP-UX-114). Update 'A Finished Scene is read-only and shows when it started and finished' (line 325) for the new sentence.
- "A stale Keeper notes save is refused" -> new test with two pages of the same Keeper: both open Edit, page B saves, page A types -> conflict Alert; "Keep mine" then reload shows A's text; second run of the flow with "Reload newer notes" shows B's text (SP-UX-113).
- "A Scene's title and location save no longer changes its Keeper notes" and SP-UX-20/110 -> update 'Keeper prepares, reorders, edits, and removes Scenes' (line 33): title/location via the form, notes via the section, both survive a reload.
- "The Keeper edits an Active Scene's Keeper notes" -> extend line 300's test with a notes edit on the Active Scene's page.
- SP-UX-112 offline -> new test using `context.setOffline(true)`: offline text shows, back online -> "All changes saved", reload shows the text.
- "A Keeper notes save does not block finishing the Scene" -> stated exception: the browser can't make the two requests simultaneous deterministically; covered by the repository interleaving test and the concurrent API test. The Run-side E2E (SPL-UX-81/82) belongs to PBI-SPL-010.
- Fixture: add `keeperNotesSectionEditor(page)` (textbox named "Keeper notes"); the create form keeps "Keeper notes (optional)".

## ADR
- [ADR 0037](../../adr/0037-keeper-notes-carry-their-own-version-checked-by-a-conditional-update.md) (written with this record): "Keeper notes carry their own version, checked by a conditional update beside the Scene version". Status Accepted; complements ADR 0025 (not edited). Context: spec lines 25-29, PBI Context. Decision: D1 A and its invariants. Considered: D1 B and C. Consequences: one `ExecuteUpdateAsync` exception to change tracking, confined to `TryReplaceKeeperNotesAsync`; a title/location response may carry a notesVersion that is already stale (live refresh corrects it); given up: one technique for all Scene writes.

## Phases
- Phase 1: backend domain, persistence, API, and tests; checkpoint: `feat(spl-009): Keeper notes endpoint with notesVersion (PBI-SPL-009)`.
- Phase 2: frontend section, autosave, Scene page, stories, and unit tests; checkpoint: `feat(spl-009): autosaved Keeper notes on the Scene page (PBI-SPL-009)`.
- Phase 3: E2E, CONTEXT.md, spec traceability; checkpoint: `test(spl-009): Keeper notes E2E and glossary (PBI-SPL-009)`.

## Human decisions
- 2026-11-24 UX gate: Option A selected; Finish with unsaved notes follows (i), "Finish first saves any pending notes, then finishes whatever the notes outcome". No adjustments.
- 2026-11-24, first relay: the prototype was to stay uncommitted (no answer yet on committing it).
- 2026-11-24, plan gate: the human replied "approved commit prototype", relayed by the Orchestrator as (1) the plan is approved as drafted, with no changes, and (2) the prototype may be committed as evidence. The prototype is committed on the throwaway branch `prototype/spl-009-keeper-notes` (commit 554378e, `specs/scene-play/prototype/keeper-notes-prototype.html`), never merged; its verdict is in specs/scene-play/ux.md section 25.7.

## Revisions

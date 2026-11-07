# Design: PBI-SPL-004: Scene History for every Campaign Member, filtered to their Investigator's Reveals for a Player

## Triggers
- 2 (shared interface / data model): a new read across the Scenario Preparation boundary (all played Scenes in start order), a new Scene Play port, and a change to the closed live topic set.
- 3 (new cross-layer pattern element): the `sceneHistory` topic and a new consumer-owned port with its adapter.
- 7 (UX): a new screen and a new Campaign tab.

## Constraints
- ADR 0008 / ADR 0024: Scene Play reaches the Scene aggregate only through consumer-owned ports implemented by Scenario Preparation providers; Scene Play holds the authorization (`ScenePlayRevealPorts.cs:54-58`, `SceneRevealService.cs:3-9`).
- ADR 0009: one Campaign hub, invalidation topics only, closed topic set, audience decided by `CampaignLivePublicationPolicy`; a topic sent to a group must be one every member may know changed (`CampaignLivePublicationPolicy.cs:3-7`).
- ADR 0011 / ADR 0024: signals after commit, best-effort (`ActiveSceneService.cs:146-150`, `RevealService.cs:177-187`).
- ADR 0013: non-member and missing Campaign answer 404.
- ADR 0014: prepared order lives in one repository method (`EfSceneRepository.cs:112-118`); it does not cover start order, which this PBI adds as its own single method.
- ADR 0023: every Scene Play endpoint has a row in `ScenePlayAuthorizationMatrixTests` (`ScenePlayAuthorizationMatrixTests.cs:37-45, 211-229`).
- ADR 0026: revealed files are served only by `GET reveals/{revealId}/file`, recipient-only (`RevealService.cs:124-147`); reused unchanged.
- specs/scene-play/spec.md: API line 31, Live line 35, DoD line 67 and 69, Regression Guardrails lines 73-82, Scenarios lines 192-201 and 214-217.
- CONTEXT.md lines 146-148: "Scene History"; avoid timeline, log, play order. "Investigators present", "Reveal", "Clue".
- specs/scene-play/ux.md section 23 (new) and specs/navigation/ux.md sections 2 and 5.
- No game rule applies (docs/game-rules/README.md lists none for Scene History; the PBI-SPL-002 record cites none).
- CLAUDE.md: cyclomatic complexity at most 10; unit tests for all new logic; E2E for user-visible change; ASCII.

## UX
- Selected option: Option A (Campaign tab, one page, every Scene a section, Reveals closed until "Show") - `specs/scene-play/ux.md` section 23 (new), linked from `spec.md` line 40; amends `specs/navigation/ux.md` section 2 and NAV-UX-1.

## Decisions

### D1: Where the cross-context Scene History read lives
| Metric | Option A: new port `ISceneHistory` + provider method on `SceneLifecycleService` | Option B: add `ListPlayedAsync` to `IPlayableScenes` |
| --- | --- | --- |
| Consistency | + same consumer-owned-port-plus-adapter shape as `ISceneReveals`/`ScenarioPreparationSceneReveals`; `SceneLifecycleService` already builds `PlayableSceneView` with `FinishedAt` and `ScenarioTitle` (`SceneLifecycleResults.cs:7-17`) | 0 reuses an existing port, but `IPlayableScenes` is documented as the command port (`ScenePlayPorts.cs:79-82`) |
| Modifiability | + a later History addition (Roll Records) extends one small port | - every `IPlayableScenes` fake (`ScenePlayFakes.cs`) must implement a read it never uses |
| Testability | + `SceneHistoryService` tests fake one method | 0 same tests, larger fakes |
| Simplicity | 0 one interface, one adapter class | + no new interface |
| Reversibility | + removable without touching the Active Scene path | 0 easy, but entangled with the command port |
| Security and correctness | + authorization stays in Scene Play before the port call; provider has no auth (as `SceneRevealService.cs:4-6`) | + same |
| Performance | + one query for played Scenes with present and Reveal children, one Scenario list query; no per-Scene Scenario lookup (unlike `SceneLifecycleService.ToViewAsync`, `SceneLifecycleService.cs:156-158`) | + same query possible |

- **Chosen:** A, because of Consistency and Modifiability (interface segregation from the command port) - giving up one more interface and adapter.
- **Rejected:** B - mixes a read into the command port and widens every fake. The Developer must not reintroduce it.
- **Rejected (not an option):** Scene Play reading `ScenarioPreparationDbContext` directly - violates ADR 0024 and the backend hexagon rules.

### D2: When `sceneHistory` fires and how Reveals reach the page
| Metric | Option A: `sceneHistory` beside `activeScene` on every Active Scene change; Reveals via existing `myClues`/`sceneReveals` mappings | Option B: `sceneHistory` only on finish (spec literal); client maps `activeScene` to the history query for start and present changes | Option C: no new topic; client maps `activeScene`, `myClues`, `sceneReveals` to the history query |
| --- | --- | --- | --- |
| Consistency | + ADR 0009: "a new Campaign feature adds a topic name and a client mapping"; one publication, same audience (`CampaignLivePublicationPolicy.cs:29-30`) | - two topics carry overlapping meaning; finish emits both | - drops the `sceneHistory` topic named in spec line 35 and the PBI scope |
| Modifiability | + history-only events later (e.g. Roll Records) already have a topic | 0 needs a second policy method and publisher path for finish | 0 a later history-only event must add the topic anyway |
| Testability | + one policy unit test change, one hub test | 0 extra policy method and publisher tests | + nothing new server-side |
| Simplicity | + one enum member, one policy line, one client entry | - separate finish-only publication through `ActiveSceneService` | + least code |
| Reversibility | + trivially removable | 0 | 0 needs spec and PBI change now |
| Security and correctness | + Campaign group already hears `activeScene` for the same events; every member sees every played Scene's title in history, so the signal leaks nothing new. Reveals never signal the Campaign (`CampaignLivePublicationPolicy.cs:39-47`) | + same audience | + same |

- **Chosen:** A, because of Consistency (ADR 0009 extension point, one publication) and Simplicity over B - giving up strict adherence to spec line 35's "when a Scene finishes"; the spec line is amended to "starts or finishes or the Investigators present change", because the Keeper's history shows the Investigators present and a newly Active Scene (both change on those events).
- **Rejected:** B - redundant double signal on finish and a second publication path. Must not be reintroduced.
- **Rejected:** C - removes a topic the spec and PBI require; would need a human scope change.

### D3: Reveal row in the UI
| Metric | Option A: extract `reveal-disclosure` from `clues-list` `ClueItem` (`clues-list.tsx:53-77`) and use it in both | Option B: a new history-only Reveal item |
| --- | --- | --- |
| Consistency | + one disclosure behavior for Clues and Scene History (ux.md section 23.2 says "exactly as a Clue") | - second copy of the same interaction |
| Modifiability | + SPL-002 separator follow-up and disclosure changes land once | - must be changed twice |
| Testability | + existing Clues tests keep covering it; one new component test | 0 |
| Simplicity | 0 small refactor of `clues-list` | + no change to existing code |
| Reversibility | + easy | + easy |
| Security and correctness | N/A - presentation only; data is already filtered server-side |

- **Chosen:** A, because of Consistency and DRY - giving up a touch on a working component (Clues tests must stay green unchanged).
- **Rejected:** B - duplication the CLAUDE.md DRY rule forbids without a reason.

### Single-option decisions
- **Endpoint:** new `SceneHistoryController : ScenePlayControllerBase`, `[Route("api/campaigns/{campaignId:guid}/scene-history")]`, `GET`, 401 without an account (as `CluesController.cs:22-26`), 404 for a non-member or missing Campaign, 200 otherwise.
- **Application:** new `SceneHistoryService` in ScenePlay.Application. Order: `ICampaignRoles.RoleOfAsync` first; null -> `NotAMember` read and no port call. Then `IApprovedInvestigators.ListAsync`, then `ISceneHistory.ListPlayedAsync`, then project. Read result is a small closed hierarchy like `ActiveSceneRead` (`ActiveSceneViews.cs:50-64`): `NotAMemberHistoryRead`, `KeeperSceneHistoryRead`, `PlayerSceneHistoryRead`.
- **Projection:** new internal static `SceneHistoryProjection` reusing `RevealProjection.ForKeeper`/`ForPlayer` (`RevealProjection.cs:9-20`). The present-list resolution in `ActiveSceneProjection.Present` (`ActiveSceneProjection.cs:43-51`) is moved to an internal static helper used by both projections (name then id order; unnamed -> null name).
- **Player filter:** a Reveal is in the Player view only when `RecipientIds` contains the caller's own Approved Investigator id (same rule as `ActiveSceneProjection.cs:30-31`). A Player without an Approved Investigator gets every Scene with an empty `reveals` and `investigatorName: null`.
- **Shapes (JSON, camelCase):**
  - Keeper: `{scenes: [{sceneId, scenarioId, scenarioTitle, title, startedAt, finishedAt, investigatorsPresent: [{id, name}], reveals: [KeeperRevealView]}]}`.
  - Player: `{investigatorName, scenes: [{sceneId, scenarioTitle, title, startedAt, finishedAt, reveals: [PlayerRevealView]}]}`. No `scenarioId`, no `location`, no `investigatorsPresent`, no recipients or subject ids. `sceneId` is already given to Players by Clues (`ActiveSceneViews.cs:27`).
  - `finishedAt` is present and null for the Active Scene; `startedAt` is always set for a listed Scene.
  - The client tells them apart with strict zod schemas in a union, as `activeSceneApi.ts:8-35` does (the Player shape always has `investigatorName`).
- **Order (newest started first, human decision):** `StartedAt` descending, then the Active Scene before a Finished one, then `FinishedAt` descending, then `Id`. Ties are real: a finish-then-start uses one `now` for both (`SceneLifecycleService.cs:73, 137-138`), and tests freeze time. Implemented once, in a new `EfSceneRepository` method (the only start-order sort), with the same comment style as `EfSceneRepository.cs:112`. Reveals inside a Scene are newest first, as `Scene.Reveals` (`Scene.cs:41`).
- **Investigators present of a Finished Scene:** as they were at finish; `Scene.Finish` keeps them (`Scene.cs:135-147`).
- **Provider:** `SceneLifecycleService.ListPlayedAsync(campaignId)` returns `PlayableSceneView` records (it already carries `Status`, `FinishedAt`, `ScenarioTitle`) for Scenes whose status is not Prepared, loading Scenario titles with one `IScenarioRepository.ListForCampaignAsync` call. Repository method `ISceneRepository.ListPlayedAsync(campaignId)` includes only Investigators present and Reveals with recipients (not Handouts or links).
- **Adapter:** `ScenarioPreparationSceneHistory : ISceneHistory` in ScenePlay.Infrastructure, mapping Reveals with the existing `ScenarioPreparationSceneReveals.ToRecord` (`ScenarioPreparationSceneReveals.cs:44-55`); registered in `ScenePlayInfrastructureServiceCollectionExtensions`.
- **Port record:** `PlayedScene(SceneId, ScenarioId, ScenarioTitle, Title, StartedAt, FinishedAt, InvestigatorsPresent, Reveals)` in ScenePlay.Application; `PlayableScene` is not widened.
- **Live:** `CampaignDataTopic.SceneHistory` (wire `sceneHistory`); `ForActiveSceneChanged` returns one publication to the Campaign with `[ActiveScene, SceneHistory]`. No change to `ActiveSceneService`. Client: `sceneHistory -> [sceneHistoryQueryKeys.detail]`, and `myClues` and `sceneReveals` also include `sceneHistoryQueryKeys.detail` (`liveTopics.ts:22-33`).
- **Authorization matrix seed:** the matrix's Active Scene sits in the secret-titled prepared Scenario (`PreparedScenarioSeed` line 35, matrix lines 134-146), so a Player's history would carry `prepared-secret-scenario-title` and fail the no-secret assertion (matrix line 116). The seed moves the Active Scene into its own plain-titled Scenario; the secret Scenario keeps only Prepared Scenes, which proves an unplayed Scenario's title never reaches a Player. The new row is `GET {campaign}/scene-history` with Player status 200.
- **Frontend:** route `routes/campaigns.$campaignId.scene-history.tsx`; `CampaignSection` (`campaignSection.ts:2`) gains `'scene-history'`; `campaign-header` adds the tab between Active Scene and Wall (`campaign-header.tsx:53-66`, `to` union line 78); slice files per ux.md section 23.6.
- **No ADR:** see ADR section.

## Patterns
- **Used:** Adapter at `ScenarioPreparationSceneHistory` - force: Scenario Preparation's `PlayableSceneView` is not Scene Play's port shape (same as `ScenarioPreparationSceneReveals`).
- **Used (existing):** Observer via the Campaign hub invalidation topics - force: several pages react to one Scene change; extended with one topic, not a new mechanism.
- **Rejected:** Strategy for Keeper vs Player projection - two static methods selected by role, as `ActiveSceneProjection`, stay well under complexity 10; a strategy object adds a layer for two fixed variants.
- **Rejected:** State for Active vs Finished rendering - one nullable `finishedAt` and one conditional; no lifecycle behavior.
- **Rejected:** Facade over `ISceneReveals` + `ISceneHistory` - no caller needs both.
- **Rejected:** Decorator for the live signal - nothing new is wrapped; the publication policy already centralizes audience.

## Invariants
- A Prepared Scene, its title, or its Scenario's title (when no Scene of that Scenario has started) never appears in any Scene History response.
- A Player response never contains a Reveal that did not reach the caller's own Approved Investigator, nor recipients, subject ids, Investigator ids or names of Investigators present, `scenarioId`, or `location`.
- Authorization runs in `SceneHistoryService` before any port call; the provider and repository do no authorization; non-member and missing Campaign are both 404.
- Every query is filtered by `CampaignId`; no Scene History data crosses Campaigns.
- The order is total and deterministic (D-order above) and implemented in exactly one repository method.
- `sceneHistory` goes only to `campaign:{campaignId}` and only with `activeScene`; no Reveal ever produces a Campaign-wide signal.
- Revealed files are served only by the existing Reveal file endpoint; no new file route.
- Every new method stays at cyclomatic complexity 10 or below; no new suppression.

## Implementation plan
1. `specs/scene-play/spec.md`, `specs/navigation/ux.md`, `specs/campaign-play/spec.md` - already edited on the branch with this record (see Phase 0); read them first.
2. ScenarioPreparation.Application: `ISceneRepository.ListPlayedAsync`; `SceneLifecycleService.ListPlayedAsync` - provider read with one Scenario list lookup.
3. ScenarioPreparation.Infrastructure: `EfSceneRepository.ListPlayedAsync` with the start-order sort and narrow includes.
4. ScenePlay.Application: `PlayedScene`, `ISceneHistory`, history view records, `SceneHistoryProjection`, shared present-list helper (moved from `ActiveSceneProjection`), `SceneHistoryService`.
5. ScenePlay.Infrastructure: `ScenarioPreparationSceneHistory` + DI registration.
6. ScenePlay.Controllers: `SceneHistoryController`, response contracts and mapping (reuse `RevealMapping` for Reveal views).
7. CampaignPlay.Application: `CampaignDataTopic.SceneHistory`; `ForActiveSceneChanged` adds it.
8. Integration tests: `SceneHistoryApiTests`, matrix row and seed change, hub test for the topic.
9. Frontend: `reveal-disclosure` extraction (Clues unchanged in behavior), `sceneHistoryApi.ts`, `useSceneHistory`, `scene-history-scene`, `scene-history-page`, route, `CampaignSection`, `campaign-header`, `liveTopics.ts`, stories.
10. E2E: `e2e/tests/scene-history.spec.ts`, updated tab assertions, fixture helpers in `e2e/fixtures/scene-play.ts`.

## Reuse
- Using: `RevealProjection.ForKeeper`/`ForPlayer` for Reveal views; `ScenarioPreparationSceneReveals.ToRecord` for Reveal mapping; `ICampaignRoles`, `IApprovedInvestigators`; `ScenePlayControllerBase`; `RevealMapping`; `PlayableSceneView`; `CampaignLivePublicationPolicy`; `revealed-content`, `useRevealFile`, `scene-times`, `scene-status-badge`, `revealPresentation` helpers (`joinNames`, `revealKindLabel`, `recipientNames`, `formatClueTime`), `Collapsible`; `ScenePlayFakes`, `ScenePlaySeed`, `PreparedScenarioSeed`, `e2e/fixtures/scene-play.ts`.
- Not using: `ISceneReveals.ListCluesAsync` - per-Investigator, not per-Scene, and has no times or present list. `SceneLifecycleService.ToViewAsync` per Scene - one Scenario lookup per Scene. `CluesList` as a whole - it groups by newest Clue and has its own empty copy; only the item is shared (D3). Side panel - navigation ux section 5 maps "browse a whole list" to a full page.

## TDD units
Backend (ScenePlay.Tests, `Given_..._When_..._Then_...`):
- Non-member -> NotAMember read and the port is not called.
- Keeper -> every listed Scene with every Reveal (Keeper view with recipient names), Investigators present by name then id, unnamed -> null name.
- Player -> only Reveals whose recipients include their Approved Investigator; a Scene with none is still listed with empty `reveals`; no present list in the view type.
- Player without an Approved Investigator -> every Scene, empty `reveals`, `investigatorName` null.
- Scene order is passed through unchanged; Reveals newest first inside a Scene.
- Active Scene -> `finishedAt` null.
- Shared present-list helper keeps `ActiveSceneProjection` behavior (existing `ActiveSceneServiceTests` stay green).
Backend (ScenarioPreparation.Tests):
- `SceneLifecycleService.ListPlayedAsync` excludes Prepared Scenes, includes Active and Finished across Scenarios, maps Scenario titles with one Scenario lookup.
Backend (CampaignPlay.Tests):
- `ForActiveSceneChanged` -> one publication to the Campaign with `[ActiveScene, SceneHistory]` (updates `ActiveSceneSupportTests.cs:18-22`).
Integration (`SceneHistoryApiTests`):
- Order newest started first across two Scenarios, including the finish-then-start tie (frozen time) -> new Scene before finished one.
- Prepared Scenes are absent for the Keeper and the Player, and the title of a Scenario with only Prepared Scenes is absent from the Player's response.
- Player sees one of two Reveals (spec Scenario lines 192-196); an unrevealed Player-facing Handout is absent (lines 198-201).
- Another Campaign's member gets 404 (lines 214-217); no token 401.
- Matrix row and seed change (ADR 0023).
- Hub: finishing a Scene delivers `sceneHistory` to a connected Player; a Reveal does not deliver it to an untargeted Player.
Frontend (Vitest, colocated):
- `sceneHistoryApi` parses Keeper and Player shapes, rejects unknown fields (strict), maps 404 to an error.
- `scene-history-scene`: Keeper meta with "to {names}" and "Investigators present: {names}"; Player without them; "Active" badge and "Open Active Scene" link; empty sentences per role (SPL-UX-62 to 65, 67).
- `scene-history-page`: description by viewer, no-Investigator note, empty, loading (`aria-busy`), error with "Try again" refetch (SPL-UX-69, SPL-A11Y-25).
- `reveal-disclosure`: "Show"/"Hide" with `aria-expanded` and title in the accessible name; content renders on open (SPL-A11Y-24); `clues-list` tests unchanged.
- Open state survives a refetch with the same Reveal id (SPL-UX-68).
- `campaign-header`: tab order and `aria-current` on `scene-history` (SPL-UX-61).
- `liveTopics`: `sceneHistory`, `myClues`, `sceneReveals` include the history key.
- Headings: one h1, h2 Scenes, h3 Reveals (SPL-A11Y-23).

## E2E coverage
- New `e2e/tests/scene-history.spec.ts`:
  - spec Scenario "Players see the Scene History filtered to their Clues" (spec.md 192-196) + SPL-UX-62, 64 -> Player sees Scenes newest first with dates, only Harvey's Reveal, and no Prepared Scene.
  - spec Scenario "A Finished Scene with unrevealed material keeps it Keeper-only" (198-201) -> the never-revealed Handout is absent for the Player.
  - SPL-UX-63 -> Keeper sees every Reveal with "to {names}" and Investigators present.
  - SPL-UX-64 (empty Scene) -> "Nothing from this Scene reached {name}."
  - SPL-UX-66 -> "Show" renders a revealed Map/Document via the file endpoint.
  - SPL-UX-68 + DoD line 69 -> Keeper finishes the Scene; the connected Player's page shows "Finished" without reload; a Reveal to Lucy only does not appear on Harvey's page.
  - SPL-UX-61 -> "Scene History" tab current on the page.
  - Spec Scenario "Scene Play stays within its Campaign" (214-217) for Scene History stays in the integration tests (API-only, no UI path).
- Changed tab assertions (exact `toHaveText` lists; they encode NAV-UX-1 and CO-UX-2 as amended by navigation ux section 2): `e2e/tests/campaign-overview.spec.ts:58, 84`, `e2e/tests/campaign-wall.spec.ts:29`, `e2e/tests/navigation.spec.ts:53, 58, 145` -> insert "Scene History" after "Active Scene". Check: CO-UX-2 text in `specs/campaign-overview/ux.md:276` still lists only Overview, Wall, Settings; it was already superseded by navigation ux section 2 ("amends campaign-overview ux section 2") for Active Scene and is not edited here.

## ADR
- none: the port and adapter repeat the ADR 0008 / ADR 0024 pattern, the topic is the ADR 0009 extension point, and the start order is one easily reversible repository method recorded here. Note for reviewers: ADR 0009's topic list is a historical list (it already omits `myItems`); the authoritative set is `specs/campaign-play/spec.md` line 56, updated in this PBI.

## Phases
- Phase 0: design artifacts (this record, ux.md section 23 and its spec link, spec and navigation edits, `specs/scene-play/prototype/scene-history.html`); checkpoint: `docs(design): Scene History design and UX (PBI-SPL-004)`.
- Phase 1: backend (provider, port, service, controller, topic, unit and integration tests); checkpoint: `feat(scene-play): Scene History API and sceneHistory topic (PBI-SPL-004)`.
- Phase 2: frontend (reveal-disclosure extraction, page, tab, live mapping, stories, tests); checkpoint: `feat(scene-play): Scene History page (PBI-SPL-004)`.
- Phase 3: E2E (new spec, tab assertion updates); checkpoint: `test(e2e): Scene History (PBI-SPL-004)`.

## Human decisions
- 2026-11-07, UX gate: prototypes of Options A, B, C requested before selecting; then "1. Option A, 2. newest first, 3. add them for keeper only, 4. yes 5. yes" - Option A; newest started first (my oldest-first recommendation and its "Jump to the latest Scene" link are dropped); Investigators present for the Keeper only (Player projection unchanged); an empty Scene stays listed for a Player; prototype recorded in ux.md section 23.9 without a prototype branch.
- 2026-11-07, plan gate: "accept the D2 spec amendment, I want prototype commited" - D2 Option A and the `spec.md` line 35 amendment are accepted; the prototype is committed as `specs/scene-play/prototype/scene-history.html` (navigation precedent, `specs/navigation/prototype/active-scene.html`), and ux.md section 23.9 links it.
- 2026-11-07, plan gate: "approved, keep the guardrail" - the plan is approved, and the Regression Guardrail "A Scenario's title reaches a Player only through the Scene History, and only once one of its Scenes has started." is added to `specs/scene-play/spec.md`.

## Revisions

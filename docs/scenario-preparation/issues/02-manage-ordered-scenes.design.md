# Design: PBI-SP-002: Keeper creates, edits, reorders, and removes Scenes with rich-text Keeper notes in a Scenario

## Triggers
- 1 New dependency: Lexical (`lexical`, `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/link`, plus helper packages only if needed).
- 2 Shared data model: new Scene aggregate, table, and API.
- 3 New cross-layer pattern: rich-text editor, read-only renderer, and server validator sharing one allowed-node definition, reused by PBI-SP-004, PBI-SP-005, PBI-SP-008, and Scene Play.
- 4 ADR: ADR 0015 is amended (size unit, document shape, unknown properties, heading levels, line break, version pin); ADR 0016 records that a Scene carries its Campaign id, which binds PBI-SPL-001.
- 6 Explorer open questions with competing answers: CI test loop, payload shape, ADR 0015 gaps, Campaign relation, rich-text placement, ordering reuse, "Keeper notes" terminology.
- 7 UX: Scenes section on the Scenario page, Create Scene page, Scene page, rich-text editor and view.
- Not 5: everything stays in Scenario Preparation; the Scene Play boundary is decided before PBI-SPL-001 (`specs/scene-play/spec.md` line 10).

## Constraints
- ADR 0013: own `ScenarioPreparationDbContext`; Campaign referenced by id only; Keeper check through `ICampaignKeepers`.
- ADR 0014: non-unique `Position`; one sort place (Position, CreatedAt, Id); reorder submits the complete id list (different set 409, duplicates 400); edits never write Position; line 20: Scenes follow the same contract.
- ADR 0015: Lexical JSON stored unchanged; server validates allow-list, http/https links, 200 KB; renderer registers the same nodes; one allowed-node definition.
- ADR 0003: filtered unique index, cited only as what ADR 0016 keeps possible for PBI-SPL-001.
- Parity-fixture precedent: `specs/character-sheet/validation-fixtures.json` read by backend tests (`backend/tests/CampaignPlay/CocAssistant.CampaignPlay.Tests/CocAssistant.CampaignPlay.Tests.csproj:25-26`) and frontend tests (`frontend/src/campaign-play/services/characterSheetValidation.test.ts:40`), with CI path filters (`.github/workflows/ci.yml:48-53`).
- `specs/scenario-preparation/spec.md`: Scene API (lines 17-23), Scene status (24), Rich text (25), Scene fields (38), editing/removal/Finished (40-41), allowed nodes (43), Guardrails (69, 71, 75).
- `specs/scene-play/spec.md`: Scene aggregate stays in Scenario Preparation (line 10); Scenes addressed by Campaign and sceneId; at most one Active Scene per Campaign under concurrent starts (line 35); a Prepared Scene never reaches a Player (line 62).
- `CONTEXT.md`: Scene, Prepared Scene, Active Scene, Finished Scene (lines 71-85) and their Avoid lists. New entries for "Keeper notes" and "Location" (Human decisions, Q3).
- Game rules: none apply.
- Existing patterns: `Scenario.cs` (private setters, `Create` result, `Edit` outcome, internal `MoveTo`); `ScenarioService.cs:24-27` (Keeper check first, NotFound); `ScenariosController.cs:81,98-100,113-117` (order route, 409 Problem, 400 keyed ValidationProblem); `EfScenarioRepository.cs:32-38` (single sort place); `ScenarioPreparationDbContext.cs:25-29` (UTC conversion); statuses stored as strings (`CampaignPlayDbContext.cs:91`) and sent as strings (`CampaignListItemResponse.cs:52-56`); frontend `scenario-page.tsx:96-114` (view/Edit toggle), `useScenarioReordering.ts`, `scenario-list-section.tsx`, `remove-wall-entry-dialog.tsx`, `investigator-status-badge.tsx`, `wall-entry-time.tsx`.
- Cyclomatic complexity 10 or below (ESLint `complexity`, CA1502); no new suppressions or baseline entries.

## UX
- Selected option: A, a Scene page with a view and an Edit toggle, mirroring the Scenario page - `specs/scenario-preparation/ux.md` (updated: sections 11-20, SP-UX-15 to SP-UX-27, SP-A11Y-10 to SP-A11Y-17).

## Decisions

### D1: How a Scene relates to its Campaign
| Metric | Option A: Scene stores CampaignId and ScenarioId | Option B: ScenarioId only, Campaign through the Scenario |
| --- | --- | --- |
| Consistency | + Scenario stores CampaignId (`Scenario.cs:13`); one-table lookups like `EfScenarioRepository.cs:20-23` | 0 normalized, but every Scene query joins |
| Modifiability | + PBI-SPL-001 can resolve (campaign, sceneId) and add a filtered unique index for one Active Scene per Campaign without touching this data | - one Active Scene per Campaign cannot be a database constraint |
| Testability | + a three-id filter is trivially testable | 0 |
| Simplicity | 0 one redundant column plus an invariant | + no redundancy |
| Reversibility | 0 dropping the column is a simple migration | - adding it later needs a backfill |
| Security and correctness | + every lookup filters campaign, scenario, and scene ids, so a foreign Scene is a 404 | 0 same guarantee only if every query remembers the join |

- **Chosen:** A, because Modifiability and Security and correctness keep Scene Play's concurrency guardrail enforceable in storage - giving up one redundant column guarded by an invariant. Recorded in ADR 0016.
- **Rejected:** B - makes "at most one Active Scene" impossible to enforce with an index. The Developer must not reintroduce it.

### D2: Backend placement of the rich-text validator
| Metric | Option A: `RichTextDocument` in ScenarioPreparation.Domain | Option B: new shared-kernel project | Option C: request validation attribute in Controllers |
| --- | --- | --- | --- |
| Consistency | + field rules live in the Domain (`Scenario.cs:60-70`) | - no shared project exists in `backend/src` | - field rules are not validated in attributes here |
| Modifiability | + every specced consumer (Handouts, Items, NPE links) is in Scenario Preparation (spec line 25); Scene Play only copies JSON | 0 ready for unspecced consumers | - other entry points (later extraction) bypass it |
| Testability | + pure, unit-tested in ScenarioPreparation.Tests | 0 plus a new test project | 0 |
| Simplicity | + no new project | - new project and wiring for one consumer | 0 |
| Reversibility | + can move later without API change | 0 | 0 |
| Security and correctness | + aggregate invariant, cannot be bypassed | + | - bypassable |

- **Chosen:** A, because of Consistency, Simplicity, and Security and correctness - giving up a cross-functionality home nothing needs today.
- **Rejected:** B - speculative. C - bypassable. The Developer must not reintroduce either.

### D3: Frontend placement of rich text
| Metric | Option A: `src/shared/` | Option B: `src/scenario-preparation/`, moved later |
| --- | --- | --- |
| Consistency | 0 `frontend/CLAUDE.md` puts code used by 2+ slices in shared; the second slice (scene-play renderer, ADR 0015 and `specs/scene-play/spec.md` line 31) is specced but not built | + literal reading: one slice today |
| Modifiability | + Scene Play PBIs import it without moving a security-relevant module | - a later PBI moves the allow-list and changes imports |
| Testability | 0 same | 0 same |
| Simplicity | 0 same code | 0 same code |
| Reversibility | + cheap | + cheap |
| Security and correctness | + one allow-list location from day one | 0 |

- **Chosen:** A, because the second consumer is a written requirement, not a guess (a documented deliberate reading of the placement rule) - giving up literal compliance until Scene Play lands.
- **Rejected:** B - plans a move of the allow-list.

### D4: Realizing one allowed-node definition across TypeScript and C#
| Metric | Option A: per-stack code plus parity fixture `specs/scenario-preparation/rich-text-fixtures.json` | Option B: one JSON config embedded in the backend and imported by the frontend |
| --- | --- | --- |
| Consistency | + matches the character-sheet parity fixtures and CI filters | 0 ADR 0006 embeds catalogs, but the frontend does not read them at runtime |
| Modifiability | + changing the list changes the fixture; both suites fail until both sides agree | - node classes and transforms are code anyway; the config covers only constants |
| Testability | + concrete documents accepted or refused in both stacks; the editor's own serialization of every allowed node is compared to the fixture, catching Lexical upgrades | 0 |
| Simplicity | + no runtime config loader | - embedded resource plus a Vite JSON import |
| Reversibility | + | 0 |
| Security and correctness | + server checks are explicit code | 0 |

- **Chosen:** A, because of Consistency and Testability - giving up a literal single file; "one definition" is the fixture contract, stated in the ADR 0015 amendment.
- **Rejected:** B.

### D5: Wire shape of rich-text Keeper notes
| Metric | Option A: nested JSON value (`keeperNotes: {"root": ...}` or `null`); server reads `JsonElement?`, stores `GetRawText()` | Option B: JSON string holding serialized JSON |
| --- | --- | --- |
| Consistency | + natural REST payload, zod-parsed at the boundary | - double encoding |
| Modifiability | + Handouts and Items reuse the shape | 0 |
| Testability | + fixtures are plain JSON | - fixtures need escaping |
| Simplicity | 0 `JsonElement` in request and response | + plain string |
| Reversibility | 0 | 0 |
| Security and correctness | + the raw received text is measured and stored unchanged | + |

- **Chosen:** A, because of Consistency and Testability - giving up the plain-string simplicity.
- **Rejected:** B.

### D6: Representing "no Keeper notes"
| Metric | Option A: `null` in API and database; the editor sends `null` when empty | Option B: an empty Lexical document |
| --- | --- | --- |
| Consistency | 0 Scenario plain notes use `""` (`Scenario.cs:63`); rich text has no meaningful empty string | 0 |
| Modifiability | 0 | 0 |
| Testability | + null is simple to assert | - emptiness needs a document walk |
| Simplicity | + | - |
| Reversibility | 0 | 0 |
| Security and correctness | + one `isEmptyRichText` helper decides empty for sending and for showing; the view also treats an empty document from another client as empty | 0 |

- **Chosen:** A, because of Simplicity and Testability.
- **Rejected:** B.

### D7: Reusing the reorder logic
Frontend:

| Metric | Option A: generalize into `services/preparedOrder.ts`, `hooks/usePreparedOrderReordering.ts`, `components/move-controls/` | Option B: Scene copies |
| --- | --- | --- |
| Consistency | + DRY by default (CLAUDE.md) | - two copies of about 150 lines of focus and announcement logic tied to SP-A11Y-9 |
| Modifiability | + one fix serves both lists | - copies drift |
| Testability | + existing Scenario tests keep guarding it | 0 |
| Simplicity | 0 parameter object for the hook | + no refactor |
| Reversibility | + | + |
| Security and correctness | N/A: client-side presentation only | N/A: client-side presentation only |

Backend:

| Metric | Option A: copy `ScenarioOrder` as `SceneOrder` (about 15 lines) | Option B: generic order helper |
| --- | --- | --- |
| Consistency | 0 deliberate DRY exception, documented here | 0 |
| Modifiability | 0 | 0 |
| Testability | + each has its own tests | + |
| Simplicity | + | - needs a public `MoveTo` or an internal helper plus outcome mapping, longer than the copy |
| Reversibility | + | + |
| Security and correctness | + `MoveTo` stays internal ("only the order operation writes Position", ADR 0014) | - risk of a public `MoveTo` |

- **Chosen:** frontend A and backend A (copy), because the frontend duplication is large and accessibility-critical while the backend duplication is small and generalizing it weakens encapsulation - giving up strict DRY on the backend.
- **Rejected:** frontend copies and a backend generic order helper. The Developer must not add either.

### D8: Validator policy for node properties
| Metric | Option A: validate security- and meaning-relevant properties; ignore and keep the rest | Option B: whitelist every property of every node |
| --- | --- | --- |
| Consistency | + ADR 0015 names nodes, formats, schemes, size | 0 |
| Modifiability | + Lexical releases that add properties (for example `textFormat`, `textStyle`) do not break saves | - every upgrade breaks saves |
| Testability | + | 0 |
| Simplicity | + table-driven rule per node | - |
| Reversibility | + | 0 |
| Security and correctness | + checks everything that can inject or change meaning; the renderer's `importJSON` reads only known fields | + |

Validated: node `type`; allowed children per type; heading `tag` (`h3`, `h4`); list `listType` (`bullet`, `number`); text `format` (only bits 1, 2, 4, 8) and `style` (must be `""`); link `url` (absolute http or https), `target` (`_blank`), `rel` (`noopener noreferrer`).

- **Chosen:** A, because of Modifiability and Simplicity with the same security coverage - giving up rejection of unknown harmless properties.
- **Rejected:** B.

### Single-option decisions
- Link target and rel: stored and validated (`target="_blank"`, `rel="noopener noreferrer"` required; the editor sets them through a transform), because the Player-facing renderer then never trusts the client and Lexical's LinkNode renders what is stored. Rejected: forcing them only in the renderer (needs a node override per renderer and cannot be checked on the server).
- Size unit: 200 KB is 204,800 bytes of UTF-8 in the raw JSON text of `keeperNotes` as received. The client measures `TextEncoder` bytes of `JSON.stringify(state)`, which is what it sends.
- Headings: the editor offers Heading (`h3`) and Subheading (`h4`); the validator refuses other tags (Human decisions, Q1).
- Line break: `linebreak` is an allowed node (Human decisions, G2).
- Wire names: request `{title, location, keeperNotes}` with `location: string | null`; detail `{id, title, location, keeperNotes, status, startedAt, finishedAt}`; list `{scenes: [{id, title, status, startedAt, finishedAt}]}`; order request `{sceneIds: [...]}`. `location` is returned as `""` when empty. `status` is `Prepared`, `Active`, or `Finished` via `.ToString()`. Dates are ISO 8601 or `null`.
- Status before fields: a PUT on a Finished Scene is 409 even when the body is also invalid.
- 409 titles: "A Finished Scene can't be changed." (PUT), "Only a Prepared Scene can be removed." (DELETE). 400 keys: `title`, `location`, `keeperNotes`, `sceneIds`.
- Storage: table `Scenes` (Id; CampaignId; ScenarioId FK to Scenarios with Restrict; Title nvarchar(200); Location nvarchar(200) not null; KeeperNotes nvarchar(max) null; Position; Status string(20); StartedAt and FinishedAt nullable UTC; CreatedAt UTC); non-unique index (ScenarioId, Position); migration `AddScene`. The FK is allowed because both tables share one DbContext (ADR 0013 forbids only cross-context keys). No Active-Scene index now; PBI-SPL-001 decides it.
- Routes: rename `routes/campaigns.$campaignId.scenarios.$scenarioId.tsx` to `routes/campaigns.$campaignId.scenarios.$scenarioId.index.tsx` (precedent `routes/campaigns.$campaignId.index.tsx`); add `...scenarios.$scenarioId.scenes.new.tsx` and `...scenarios.$scenarioId.scenes.$sceneId.tsx`. The header keeps Overview current with no change (`routes/campaigns.$campaignId.tsx:20-21,33-39`).
- Query keys: `['campaigns', campaignId, 'scenarios', scenarioId, 'scenes', ...]`; the Scenario detail key (`scenarioApi.ts:19`) is a prefix, so invalidating a Scenario also refetches its Scenes. Accepted.
- No SignalR and no domain events: the `scenes` topic is out of scope.
- CI: add `backend/tests/ScenarioPreparation/CocAssistant.ScenarioPreparation.Tests` to the unit-test loop (`.github/workflows/ci.yml:92-94`), and `specs/scenario-preparation/rich-text-fixtures.json` to the backend and frontend path filters (`ci.yml:44-54`).
- Lexical version: install the current release, pinned exactly (no caret) and identical across `lexical` and every `@lexical/*` package. Serialized `version` fields are not validated.
- Editor plugins: RichTextPlugin, HistoryPlugin, ListPlugin, LinkPlugin. Not registered: MarkdownShortcutPlugin (creates h1/h2 and code), TabIndentationPlugin (keyboard trap, WCAG 2.1.2), CheckListPlugin, AutoLinkPlugin.
- Remove confirmation: `AlertDialog`, following `remove-wall-entry-dialog.tsx`.

## Patterns
- **Used:** Strategy (table-driven) at `backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Domain/RichTextNodeRules.cs` - force: the validator switches on node `type`; nine types with their own child and property checks would break complexity 10. A dictionary from type to `RichTextNodeRule(allowed child types, property check)` is walked by a small recursive walker in `RichTextDocument`.
- **Used:** composition (hook plus `move-controls`) for the two ordered lists - force: shared reorder behavior across two list components.
- **Rejected:** State for Scene status - three states with three short guards do not justify state classes, and EF mapping of state objects adds friction.
- **Rejected:** Template Method for the list sections - composition through the hook already shares the behavior.
- **Rejected:** Composite for rich text - the validator walks JSON and never builds node objects.
- **Rejected:** Observer (domain events, SignalR) - the `scenes` topic is out of scope.
- **Rejected:** Adapter or port to Scene Play - decided before PBI-SPL-001.
- **Rejected:** Command - nothing is queued, logged, or undone.

## Invariants
- `Scene.CampaignId` equals its Scenario's CampaignId, set only in `Scene.Create(Scenario, ...)`, never changed.
- Every SceneService operation checks the Keeper first. A Player, another Keeper, a missing Campaign, a missing Scenario, or a Scene of another Scenario or Campaign all end as NotFound (404) before anything is read or written.
- Scene lookups always filter by campaignId, scenarioId, and sceneId. List, create, and reorder first confirm the Scenario exists in the Campaign.
- Status moves only Prepared -> Active -> Finished through `Start(now)` and `Finish(now)`, which set `StartedAt` and `FinishedAt`. No endpoint calls them in this PBI.
- A Finished Scene refuses edit, start, finish, and removal. Only a Prepared Scene is removable. A reorder may move Active and Finished Scenes; position is not Scene content (Human decisions, G1).
- Only `SceneOrder.Apply` writes Position (through internal `MoveTo`); edits never write Position; `EfSceneRepository.InPreparedOrder` (Position, CreatedAt, Id) is the only Scene sort place; a new Scene gets max + 1, starting at 1.
- Position never appears in a response. Frontend zod schemas for Scene objects are strict; only the inside of `keeperNotes` is loose.
- Stored Keeper notes are exactly the raw JSON text the validator accepted; the server never re-serializes them.
- The allowed lists are identical in the frontend constants, the backend rules, the parity fixture, the ADR 0015 amendment, and spec line 43.
- No Scene data reaches a Player; nothing is published.
- Scenario behavior and tests stay unchanged after the reorder generalization, except imports. Move button ids keep the format `move-scenario-{direction}-{id}`.
- Complexity 10 or below, no new suppressions or baseline entries.
- Lexical packages are pinned to one exact version.

## Implementation plan
1. Docs - in `specs/scenario-preparation/spec.md`: line 43 becomes "paragraph, heading (two levels), quote, bulleted and numbered list, list item, line break, link, and text with ..."; add to Constraints "The prepared order belongs to the Scenario: reordering may move Active and Finished Scenes, and a Scene's position is not part of its content." and to Regression Guardrails "A Finished Scene's content never changes; its position in the prepared order may." replacing "A Finished Scene never changes."; Gherkin edits listed under E2E coverage. In `CONTEXT.md` under Scenario Preparation add **Keeper notes** ("The Keeper's own notes on a Scenario, a Scene, or an Item; never shown to Players. Plain text on a Scenario, rich text on a Scene or an Item.") and **Location** ("Where a Scene takes place, as free text."). Why: the PBI Refinement Protocol changes spec, ADR, editor, renderer, and validator together.
2. CI - unit-test loop and path filters as above - so the new domain tests run.
3. Parity fixture `specs/scenario-preparation/rich-text-fixtures.json`: `{maxBytes, cases: [{name, expected: "accepted" | "refused", document}]}` with an "every allowed node" case (including `linebreak`) and refused cases: image node, code node, h1, h2, check list, code/subscript/superscript/highlight format bits, non-empty style, `javascript:`, `mailto:` and relative URLs, link without target or rel, missing root, non-object, text node with children. Linked from `CocAssistant.ScenarioPreparation.Tests.csproj` as in the CampaignPlay precedent.
4. Backend Domain: `RichTextDocument` (`Validate(string json)` -> `RichTextOutcome {Accepted, TooLarge, Malformed, DisallowedContent}`), `RichTextNodeRule`, `RichTextNodeRules`; `Scene`, `SceneStatus`, `SceneCreation`, `SceneFieldsOutcome {Accepted, InvalidTitle, InvalidLocation, InvalidKeeperNotes, SceneFinished}`, `SceneTransitionOutcome`, `SceneOrder`, `SceneOrderOutcome {Reordered, DuplicateIds, DoesNotMatchScenes}`.
5. Backend Application: `ISceneRepository` (Add, Remove, ListForScenarioAsync, ListTrackedForScenarioAsync, FindByIdAsync(campaignId, scenarioId, sceneId), MaxPositionAsync(scenarioId), SaveChangesAsync); `SceneService` (uses `ICampaignKeepers`, `IScenarioRepository.FindByIdAsync`, `TimeProvider`); `SceneResults.cs`; `SceneView.cs` (summary and detail).
6. Backend Infrastructure: Scenes mapping in `ScenarioPreparationDbContext`, `EfSceneRepository`, DI registration, migration `AddScene`.
7. Backend Controllers: `ScenesController` at `api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes` with `[HttpPut("order")]` beside `{sceneId:guid}`; `SceneRequest(string? Title, string? Location, JsonElement? KeeperNotes)`; `SceneOrderRequest([Required] Guid[] SceneIds)`; `SceneResponses.cs` (response `keeperNotes` is `JsonElement?` parsed from the stored text).
8. Backend tests: unit, integration, and the `ScenarioPreparationMigrationTests` update.
9. Frontend dependency: the Lexical packages, exact-pinned.
10. Frontend shared rich text: `src/shared/types/RichText.ts` (`RichTextDocument`); `src/shared/services/richText.ts` (node list, `RICH_TEXT_MAX_BYTES`, heading tags, theme, `isEmptyRichText`, `richTextByteLength`, `isAllowedLinkUrl`); `src/shared/services/richTextNormalization.ts` (transforms: h1/h2 -> h3, h5/h6 -> h4; clear disallowed format bits and style; set link target and rel; unwrap non-http(s) links; check list -> bulleted list; tab nodes -> spaces); components `src/shared/components/rich-text-editor/`, `rich-text-toolbar/`, `rich-text-link-dialog/`, `rich-text-view/`, each with tests and stories. Verify which core nodes the pinned Lexical version can create and normalize away any outside the allowed list.
11. Frontend reorder generalization: `services/scenarioOrder.ts` -> `services/preparedOrder.ts`; `hooks/useScenarioReordering.ts` -> `hooks/usePreparedOrderReordering.ts` (parameters: items, dataUpdatedAt, headingRef, reorder mutation, isStale, staleMessage, buttonIdPrefix); extract `components/move-controls/`; `scenario-list-section` uses them with existing tests green; extract `readErrorKeys(response)` to `services/validationProblem.ts` for both API modules.
12. Frontend Scene slice: `types/Scene.ts`; `services/sceneApi.ts` (`sceneQueryKeys`; `SceneNotFoundError`, `SceneValidationError`, `StaleSceneOrderError`, `SceneFinishedError`, `SceneNotRemovableError`); `services/sceneForm.ts`; `services/sceneTime.ts`; `hooks/useScenes.ts`; components `scene-list-section`, `scene-status-badge`, `scene-times`, `scene-form`, `create-scene-page`, `scene-page`, `scene-not-found`, `remove-scene-dialog`; mount `scene-list-section` in `scenario-page` below the view or form; routes, then `npm run generate-routes`.
13. E2E: `e2e/fixtures/scenes.ts`, `e2e/tests/scenes.spec.ts`.

## Reuse
- Using: `ICampaignKeepers`, `IScenarioRepository.FindByIdAsync`, `ScenarioPreparationControllerBase.ResolveCallerAccountIdAsync` for authorization and caller resolution.
- Using: the `ValidationProblem` and `Problem` result patterns from `ScenariosController`.
- Using: `FakeCampaignKeepers`, `FakeTimeProvider`, `ScenarioPreparationTestBuilder` (extended with Scene builders), `SqliteScenarioPreparationDbContextFixture` for backend tests.
- Using: `useCampaign` (role check), `useScenario`, `useUnsavedChangesPrompt`, navigation `statusMessage` for pages.
- Using: shared `Badge`, `Button`, `Input`, `Label`, `Alert`, `AlertDialog`, `Dialog`, `Card`, `Skeleton`; `ScenarioNotFound` for the Create Scene page; the `FieldError` pattern; `routerMock`; `storyProviders`.
- Not using: `wallEntryTime.ts` - its relative "today" logic is Wall-specific; Scenes show an absolute date and time.
- Not using: `ScenarioForm` - different fields; `scene-form` follows its structure.
- Not using: `Textarea` for Scene Keeper notes - they are rich text.

## TDD units
- Backend Domain, `Scene.Create`: trims; title 1-200 accepted, empty, whitespace, or over 200 -> InvalidTitle; location over 200 -> InvalidLocation; null or empty location stored as `""`; invalid notes -> InvalidKeeperNotes; null notes accepted; copies CampaignId and ScenarioId from the Scenario; status Prepared, no dates; given position.
- Backend Domain, `Scene.Edit`: accepted while Prepared or Active; SceneFinished when Finished; a refused edit changes nothing; never changes Position.
- Backend Domain, transitions: `Start` only from Prepared (sets StartedAt); `Finish` only from Active (sets FinishedAt); every other transition refused with no change.
- Backend Domain, Finished refuses edit, start, finish, and removal; `IsRemovable` only for Prepared.
- Backend Domain, `SceneOrder`: reorders to 1..n, including Active and Finished Scenes; duplicates -> DuplicateIds; missing, extra, or foreign id -> DoesNotMatchScenes; refused requests change no position.
- Backend Domain, `RichTextDocument`: every fixture case gives its expected outcome; 204,800 bytes accepted and 204,801 refused, counting multi-byte characters as bytes; malformed JSON, non-object, missing root, wrong root type refused; unknown extra properties on allowed nodes accepted.
- Backend Application, `SceneService`: Player, other Keeper, missing Campaign -> NotFound with the repository untouched; Scenario of another Campaign -> NotFound; Scene of another Scenario -> NotFound; create appends at max + 1; edit of a Finished Scene -> Finished; removal of Active or Finished -> NotPrepared without calling Remove; reorder returns the new order.
- Backend Integration, `SceneApiTests`: 404 matrix on all six endpoints (Player, other Keeper, foreign Scenario, foreign Scene); 401 without token; 400 keyed `title`, `location`, `keeperNotes` (image node, `javascript:` link, oversize), `sceneIds` (duplicates); 409 stale order; 409 PUT on Finished and DELETE on Active or Finished (seeded through `ScenarioPreparationDbContext` with domain `Start` and `Finish`); `keeperNotes: null` and absent both mean no notes; notes round-trip byte for byte; stable order with equal positions; new Scenes last. Migration test covers the Scenes table.
- Frontend shared: `isEmptyRichText`, `richTextByteLength`, `isAllowedLinkUrl`; each normalization transform with a headless `createEditor` and the shared nodes; the editor's serialization of every allowed node deep-equals the fixture's "every allowed node" case; every accepted fixture document parses into the editor.
- Frontend shared, toolbar (SP-A11Y-13): roving tabindex with Arrow, Home, End; `aria-pressed` follows the selection; each button applies its format or block; an active block button returns the block to a paragraph.
- Frontend shared, link dialog (SP-UX-19, SP-A11Y-15): refuses non-http(s) with the message; adds, edits, removes a link; focus returns to the editor.
- Frontend shared, view (SP-UX-18, SP-A11Y-10): renders strong, em, u, s, h3, h4, ul, ol, blockquote, br, and `a[target=_blank][rel="noopener noreferrer"]`; not editable.
- Frontend shared, editor (SP-A11Y-12, SP-A11Y-14): label, hint, error, `aria-invalid`; Tab leaves the editor.
- Frontend slice: `preparedOrder` (former `scenarioOrder` tests); `usePreparedOrderReordering` for both kinds; `scene-list-section` (SP-UX-15, SP-UX-21, SP-UX-24, SP-A11Y-10, SP-A11Y-11, SP-A11Y-16); `scene-form` (SP-UX-17, SP-A11Y-12, including focus on the editor when notes are the first invalid field); `create-scene-page` (SP-UX-16, SP-UX-27); `scene-page` (SP-UX-20 to SP-UX-23, SP-UX-26, SP-A11Y-15, SP-A11Y-16, the Active and Finished views, 409 on save, 409 on remove); `scene-status-badge` (text plus `aria-hidden` icon); `scene-times` (`time` elements and format); `sceneApi` (strict schemas reject `position`; each error class from its status). `scenario-list-section` tests stay unchanged.

## E2E coverage
- New `e2e/tests/scenes.spec.ts` with `test.step` titles carrying SP-UX ids, and API helpers in `e2e/fixtures/scenes.ts`.
- "Keeper prepares a Scene" (SP-UX-15, SP-UX-16, SP-UX-21, SP-UX-25) -> Create Scene with title and location; it is listed last as "Prepared"; Overview stays the current tab.
- SP-UX-17 -> an empty title shows "Enter a title." and focuses Title.
- SP-UX-18, SP-UX-19 -> format notes (bold, Heading, bulleted list, link), save, reload, check the rendered elements and the link's target and rel; a `javascript:` address is refused in the link dialog.
- "Keeper edits a Scene" (SP-UX-20) -> Edit, Save, "Scene saved.", survives a reload; Cancel discards.
- "Keeper reorders the Scenes" (SP-UX-24) -> Move up, announcement, focus, order survives a reload.
- "Keeper removes a Prepared Scene" (SP-UX-23) -> dialog Cancel keeps the Scene; Remove returns to the Scenario page with "Scene removed." and the Scene gone.
- "Scenes are the Keeper's alone" (SP-UX-26) -> Player and other-Keeper UI show not found; their bearers get 404 on all six endpoints; a Scene id from another Scenario of the same Keeper shows "We couldn't find that Scene".
- New "Scene Keeper notes outside the allowed nodes are refused" -> API step: POST with an image node and with a `javascript:` link gets 400; integration tests cover the full matrix.
- Exception: "A played Scene cannot be removed", "A Finished Scene is read-only", and the new "The Keeper edits an Active Scene's Keeper notes" (SP-UX-22 and the Active and Finished parts of SP-UX-21 and SP-UX-23) cannot be reached end to end: no endpoint starts or finishes a Scene until PBI-SPL-001, and the E2E harness has no database seeding. Domain, service, integration (seeded), and component tests cover them. PBI follow-up: add them to E2E in PBI-SPL-001.
- Spec Gherkin edits (plan step 1): trace comment `# Scene scenarios trace to ux.md section 18 (SP-UX-n).` (committed with this record); SP-UX tags on each Scene scenario; add "The Keeper edits an Active Scene's Keeper notes" (Given the Scene "The Corbitt House" is Active / When the Keeper changes its Keeper notes / Then the Scene shows the new Keeper notes); add "Scene Keeper notes outside the allowed nodes are refused" (Given a Keeper is editing a Scene / When the Keeper saves Keeper notes that contain an image node or a "javascript:" link / Then the save is refused with 400 and the Scene is unchanged); comment that the Handout parts of "The Keeper edits an Active Scene", "A Finished Scene is read-only", and "Rich text outside the allowed nodes is refused" are covered by PBI-SP-004 and PBI-SP-005.

## ADR
- ADR 0015 amendment (2026-10-17, PBI-SP-002): size unit, document shape, heading levels, line break, validated and ignored properties, null for no document, editor normalization, version pin, parity fixture as the single definition.
- ADR 0016: A Scene stores its Campaign id beside its Scenario id.

## Phases
- Phase 1: docs, CI, parity fixture, Domain and its tests; checkpoint: `feat(scenario-preparation): Scene aggregate and rich-text validator (PBI-SP-002)`
- Phase 2: Application, Infrastructure, migration, Controllers, integration tests; checkpoint: `feat(scenario-preparation): Scene API (PBI-SP-002)`
- Phase 3: Lexical, shared editor and view, reorder generalization; checkpoint: `feat(frontend): shared rich-text editor and view (PBI-SP-002)`
- Phase 4: Scene UI, stories, tests; checkpoint: `feat(frontend): Scenes on the Scenario page (PBI-SP-002)`
- Phase 5: E2E; checkpoint: `test(e2e): Scene preparation (PBI-SP-002)`

## Human decisions
- 2026-10-17, UX selection: "Choose design A, use your reccomended answers for questions". Option A selected. Rejected: Option B (Scene page as an always-on editor) - inconsistent with the Scenario page and risks accidental edits while reading at the table; Option C (expandable Scene list) - dense rows at 320px, a fetch per row, and a Scene page needed later anyway.
  - Q1: two heading levels stored as `h3` and `h4`; the spec Constraint and ADR 0015 are narrowed together.
  - Q2: a status badge on every row including Prepared; "Started {date, time}" and "Finished {date, time}" only once played.
  - Q3: "Keeper notes" is the label for both Scenario and Scene; CONTEXT.md gains "Keeper notes" and "Location"; the format difference is only in the field hint.
- 2026-10-17, plan approval: "approved with recommended".
  - G1: yes. A reorder may move Active and Finished Scenes. The spec gains "The prepared order belongs to the Scenario: reordering may move Active and Finished Scenes, and a Scene's position is not part of its content." Rejected: refusing a reorder that moves a Finished Scene (409) and hiding its move controls.
  - G2: yes. `linebreak` is an allowed node; spec line 43, ADR 0015, the parity fixture, and the node rules change together. Rejected: converting line breaks into paragraph splits in the editor.

## Revisions

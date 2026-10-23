# Design: PBI-SP-008: Keepers prepare Campaign Items with Handouts and link them to Scenes

## Triggers
- 2 (shared interface or data model): `Handouts` gains a second owner. The Scene GET response and the strict frontend `sceneSchema` gain `itemLinks`. `HandoutService` and `HandoutFileService` change their signatures.
- 4 (ADR): ADR 0022 records a holder port, an Item-link table that departs from ADR 0019, and an Item-owned file deletion rule that extends ADR 0021.
- 6 (open questions with competing answers): the seven open questions from the Explorer report (API contract, link shape, Item Handout rules, required description, Handout owner generalization, live topic, terminology).
- 7 (UX): new screens and a changed Scene page. Option A was selected at the UX gate on 2026-10-23.

## Constraints
- ADR 0013, ADR 0016:
  - the Keeper check runs first;
  - an id from another Campaign, or a Player, gets NotFound (404);
  - there is no foreign key to Campaign.
- ADR 0014: Handout order is a stored Position with a tie-break; Position is never exposed.
- ADR 0015: rich text is stored as validated Lexical JSON.
- ADR 0018: a 400 is keyed by the camelCase request path.
- ADR 0019: a link is a Scene child entity, changed only through Scene methods that refuse a Finished Scene first, with cascading in-context foreign keys and a usage port checked before delete.
- ADR 0020:
  - there is one `Handouts` table;
  - SP-008 adds a nullable `ItemId`, makes `SceneId` nullable, and adds a check that exactly one owner is set (l.7);
  - each aggregate changes only its own rows (l.15).
- ADR 0021:
  - files use immutable keys, are stored before the commit, and a failed commit deletes the new file as compensation;
  - a Scene's files are deleted only while the Scene is Prepared (l.11).
- ADR 0008: cross-functionality reads go through a consumer-owned port; `CampaignPlayCampaignKeepers` is the precedent.
- ADR 0009 and `specs/scenario-preparation/spec.md` l.32: Scenario Preparation publishes nothing over SignalR.
- `specs/scenario-preparation/spec.md` (line numbers on `master` before this design's edits):
  - l.49: a Finished Scene is read-only;
  - l.52: material linked to an Active or Finished Scene, or a held Item, cannot be deleted;
  - l.53: the allowed rich-text nodes and the 200 KB limit;
  - l.62: Items are scoped to one Campaign;
  - l.65: the Item fields.
- `specs/scene-play/spec.md`:
  - l.10: Scene Play owns who holds an Item;
  - l.16: a Reveal subject `{type: Item, id}` must belong to the Active Scene;
  - l.39: a Reveal is a snapshot.
- `CONTEXT.md`: Item (l.125-127) and its avoided words (Gear, loot, inventory, artifact); a Handout is "on a Scene or an Item" (l.114).
- Game rules: none apply. Items have no coverage in `docs/game-rules/`, and none is needed.
- Complexity: at most 10 per method. There is no ScenarioPreparation `GlobalSuppressions.cs` (only the CampaignPlay ones exist), and the `frontend/eslint.config.js` baseline (l.42-56) lists no scenario-preparation file. Both stay that way.
- Existing behavior to preserve:
  - every Scene Handout rule: Finished refuses writes (`Scene.cs:188`, `:258`), delete only while Prepared (`Scene.cs:280-284`), a replaced file is returned for deletion only while Prepared (`Scene.cs:250`);
  - the existing E2E specs `scene-handouts.spec.ts`, `scene-file-handouts.spec.ts` and `scene-links.spec.ts`.
- Do not touch `backend/src/CocAssistant.Api/Program.cs`; it has an unrelated local change.

## UX
- Selected option: A, a page per step, which mirrors the Non-Player Entity and Scene-link patterns. `specs/scenario-preparation/ux.md` is updated with new sections 59 to 70.
- Rejected: B (create and link in one step from the Scene) and C (a multi-select link dialog). The reasons are in the ux.md header.

## Decisions

### D1: How Scenario Preparation learns who holds an Item
| Metric | A: consumer-owned port `IItemHolders` | B: nullable holder column on `Items` |
| --- | --- | --- |
| Consistency | + matches ADR 0008 and 0013 (`ICampaignKeepers`, adapter `CampaignPlayCampaignKeepers`) and Scene Play spec l.10, where Scene Play owns the holder | - Scene Play would write a Scenario Preparation table, which settles the SPL boundary before its ADR |
| Modifiability | + SPL-003 swaps one adapter registration and leaves Scenario Preparation code alone | - SPL-003 edits the Item aggregate and its migration from another functionality |
| Testability | + a fake port covers the "held Item" Gherkin today | 0 needs seeding through the DbContext |
| Simplicity | 0 one interface, one null adapter, one record | + one column |
| Reversibility | + no schema to undo | - a column to migrate away if SPL picks another boundary |
| Security and correctness | 0 the server-side check holds either way; the give-versus-delete race is left to SPL-003 | 0 same |

- **Chosen:** A, because of consistency and modifiability. Giving up: a placeholder adapter (`NoItemHolders`, which always answers "no holder") until PBI-SPL-003.
- **Rejected:** B. It pre-decides the Scene Play boundary that the spec says needs its own ADR. The Developer must not add a holder column.

### D2: Where Item links are stored
| Metric | A: a new `ItemLinks` table and `ItemLink` child entity | B: widen `NonPlayerEntityLinks` with `ItemId` (ADR 0019 Consequences) |
| --- | --- | --- |
| Consistency | 0 same shape as ADR 0019 (Scene child, in-context cascading foreign keys, usage port) but a separate table, which is the documented departure | - an Item is not a Non-Player Entity (CONTEXT.md); the table and type names would mislead |
| Modifiability | + Item links have no fields and are unique per Scene, which a plain unique index `(SceneId, ItemId)` enforces | - `PlayerFacingName` (required, `ScenarioPreparationDbContext.cs:84`) would become nullable and conditional, and uniqueness would need a filtered index |
| Testability | + its own tests, separate from the NPE link tests | - every NPE link test would be at risk |
| Simplicity | + 4 columns and no check constraint | - widened check constraint, conditional validation in `NonPlayerEntityLink` |
| Reversibility | 0 one table | - harder to split later |
| Security and correctness | + the unique index makes duplicates impossible | 0 |

- **Chosen:** A, because of consistency with CONTEXT.md, modifiability, and simplicity. Giving up: ADR 0019's "adds a column" note, which ADR 0022 amends.
- **Rejected:** B. Item links carry no Player-facing fields, because a Reveal of an Item names the Item, not a link (Scene Play spec l.16). The Developer must not widen `NonPlayerEntityLinks`.

### D3: How Handout code serves a second owner (backend and frontend)
| Metric | A: one owner abstraction (shared domain helper, application owner adapters, frontend owner strategy) | B: Item-specific copies (`ItemHandoutService`, `ItemHandoutFileService`, item-handout components and api) |
| --- | --- | --- |
| Consistency | + ADR 0020 rejected per-owner tables because "every Handout change is made twice"; A applies the same reasoning to code | - duplicates about 300 backend lines, including store-before-commit and blob compensation (`HandoutFileService.cs:94-151`) |
| Modifiability | + a future Handout rule or kind changes one place | - every change made twice, and the blob-safety logic can drift |
| Testability | + existing Scene Handout tests keep guarding the shared path; Item tests add only the owner rules | 0 the tests are duplicated too |
| Simplicity | 0 refactors existing signatures and adds one interface plus two adapters per layer | 0 no refactor but more code |
| Reversibility | 0 | 0 |
| Security and correctness | + one Keeper-checked locator and one blob-deletion path | - two places to get file deletion wrong |

- **Chosen:** A, because of modifiability and the correctness of file deletion. Giving up: existing Handout service and API signatures change (callers and tests are updated, with no behavior change).
- **Rejected:**
  - B. The Developer must not create Item copies of the Handout services, the controllers' logic, the API module, the hooks, or the pages.
  - A generic `HandoutService<TOwner>`: more type machinery than the adapter needs for two owners.
  - A shared base controller class (Template Method): it would deepen the inheritance under `ScenarioPreparationControllerBase`. Outcome mapping is a static helper instead.
- **Shape of A:**
  - Domain:
    - `internal static class HandoutCollection` (Add, AddFile, Edit, EditFile, Remove, Reorder, NextPosition over a `List<Handout>`) becomes the only writer of `Handout.Position`. This keeps SP-002 D7's "Position writable in one place per type" (`Scene.cs:297-299`), now for the one Handout type.
    - `Handout` gets `Guid? SceneId` and `Guid? ItemId`, created through a `HandoutOwner` value (`ForScene(id)` or `ForItem(id)`).
    - `Scene` keeps its status guards and delegates the rest to the helper.
    - `Item` gets `RemoveHandout(handoutId, isInPlay)` and `EditFileHandout(..., isInPlay)`. These refuse, or withhold the replaced file key, when the Item is in play. The rule lives in the domain; the service supplies the fact.
  - Application:
    - `HandoutOwnerReference` is either `SceneHandoutOwnerReference(ScenarioId, SceneId)` or `ItemHandoutOwnerReference(ItemId)`.
    - `IHandoutOwner` is implemented by the adapters `SceneHandoutOwner` and `ItemHandoutOwner`; the Item adapter carries the in-play fact. It exposes `Handouts`, the six write methods, and `SaveChangesAsync`.
    - `HandoutOwnerLocator` runs the Keeper check first, then loads the owner, with one branch per reference type.
    - `HandoutService` and `HandoutFileService` take a reference in place of `(scenarioId, sceneId)` (`HandoutService.cs:26-134`, `HandoutFileService.cs:27-171`).
  - Controllers:
    - the Scene routes are unchanged;
    - new `ItemHandoutsController` and `ItemHandoutFilesController` at `api/campaigns/{campaignId:guid}/items/{itemId:guid}/handouts`, keeping `[Consumes]` on the multipart actions only (`HandoutFilesController.cs:7-9`);
    - outcome-to-result mapping moves into `internal static class HandoutActionResults` (extension methods on `ControllerBase`), shared by all four Handout controllers;
    - `ParseKind`, `ParseVisibility`, `ToResponse` and `ToSummaryResponse` are reused (`HandoutsController.cs:130-160`).
  - Frontend:
    - `services/handoutOwner.ts` defines `type HandoutOwner = {type: 'scene', campaignId, scenarioId, sceneId} | {type: 'item', campaignId, itemId}` and one strategy object per type, providing the API base URL, the query-key base, the owner detail key to invalidate, and the owner page link options.
    - `handoutApi.ts` (l.52-57, l.103-104) and `useHandouts.ts` (l.43, `useInvalidateScene`) take an `owner`.
    - `handout-page`, `add-handout-page`, `handout-not-found`, `delete-handout-dialog`, `handout-content`, `handout-image` and `handout-document` take `owner` plus a `HandoutOwnerContext` (`{ownerLabel, ownerName, backLabel, canChange, canDelete, lockedMessage}`), built by `useSceneHandoutContext` or `useItemHandoutContext`. This removes their Scene coupling (`handout-page.tsx:23-26, 38, 134-139, 225-236`).
    - `scene-handout-section` (props `status` and `sceneId`, l.15-19 and l.47) is renamed with `git mv` to `handout-section`, with props `{owner, canChange, ...}`.
    - Thin route components `scene-handout-route` and `item-handout-route` load the owner and pass the context.

### D4: Item link API addressing and duplicate links
| Metric | A: `POST .../scenes/{sceneId}/item-links {itemId}` and `DELETE .../item-links/{linkId}`; an already-linked Item answers 200 with the existing link | B: `PUT` and `DELETE .../scenes/{sceneId}/items/{itemId}` with no link id |
| --- | --- | --- |
| Consistency | + mirrors `NonPlayerEntityLinksController.cs:7, 19, 79`; ADR 0019 says each link has its own id | - a second addressing style for links |
| Modifiability | + room for link fields later if the spec adds them | 0 |
| Testability | + same test shapes as `NonPlayerEntityLinkApiTests` | + |
| Simplicity | 0 | + slightly fewer concepts |
| Reversibility | 0 | 0 |
| Security and correctness | + idempotent re-linking makes the two-tab race harmless, with no extra 409 title to map | + |

- **Chosen:** A, because of consistency. Giving up: a link id that no client strictly needs.
- **Rejected:**
  - B.
  - A 409 for a duplicate link: the picker already disables linked Items, so a duplicate only comes from a race, and success is the useful answer.

### D5: Item edit, Handout, and file rules (human-confirmed 2026-10-23)
"In play" means that a Scene linking the Item is Active or Finished, or that an Investigator holds the Item. It is a design and code term only; UI copy never uses it, and it is not added to the glossary.

- The Item and its Handouts stay editable whatever the status of the linked Scenes: add, edit, reorder, and replace a file.
- While the Item is in play:
  - deleting the Item is refused with 409;
  - deleting one of its Handouts is refused with 409;
  - replacing a Handout's file keeps the old stored file.
- While the Item is not in play:
  - deleting the Item cascades its Prepared links and its Handouts, then deletes their files after the commit;
  - deleting one Handout deletes its file after the commit.
- A held Item counts as in play for its Handouts too, not only for the Item. This was added at the plan gate and approved; it has no effect until PBI-SPL-003.
- Recorded gap: unlinking an Item from an Active Scene is allowed (spec l.49; the Scene-link pattern at `Scene.cs:165-167`), and an unlinked Item could have a file deleted that a Reveal used. There are no Reveals before PBI-SPL-002. ADR 0022 obliges PBI-SPL-002 to close this before Items or Item Handouts become revealable, for example by counting "has a Reveal" as in play through a port.

### Single-option decisions
- Player-facing description: required, with visible text, using the same rule as rich-text Handouts (`RichTextDocument.Validate` plus `HasVisibleText`). Decided by the human.
- Item name: the name is what Players see, so an Item has no separate Player-facing name. This assumption was accepted; spec l.65 gives an Item one name.
- Item API: the full list is in the spec.md API section, edited with this design.
  - The 400 keys are `name`, `playerFacingDescription`, and `keeperNotes`, per ADR 0018.
  - A Player, another Keeper, or a foreign or unknown id gets 404.
- 409 titles:
  - on Item `DELETE`, checked in this order: "An Item linked to an Active or Finished Scene can't be deleted.", then "An Item held by an Investigator can't be deleted.";
  - on Item Handout `DELETE`: "An Item linked to an Active or Finished Scene, or held by an Investigator, keeps its Handouts.".
- Check order on link:
  - the service resolves "is this Item in the Campaign", then calls `Scene.LinkItem(itemId, itemInCampaign, now)`, which refuses a Finished Scene before it looks at the Item fact;
  - this deliberately avoids the known Non-Player Entity link follow-up, where a Finished Scene with an out-of-Campaign entity answers 400;
  - a missing or foreign Item answers 400 keyed `itemId` with "Choose an Item of this Campaign.";
  - a Finished Scene answers 409 with `SceneProblemTitles.Finished`.
- Scene GET:
  - gains `itemLinks: [{id, item: {id, name}}]` in the order linked (CreatedAt, then Id);
  - the name is the live Item name, and the response stays Keeper-only;
  - the frontend `sceneSchema` (`sceneApi.ts:44-48`, strict) changes in the same phase as the backend.
- Items list: `GET /items` returns `{items: [{id, name, sceneCount}]}`, ordered by name then id, through `IItemDirectory`, which mirrors `INonPlayerEntityDirectory`. `SceneService` uses it for Item names and the link check uses it for Campaign membership.
- Item GET returns `{id, name, playerFacingDescription, keeperNotes, holder: null, handouts: [{id, kind, visibility, title}], scenes: [{scenarioId, scenarioTitle, id, title, status}]}`:
  - `scenes` comes from `IItemUsage.ListLinkedScenesAsync`, ordered by Scenario position then Scene position, with the positions never sent;
  - `holder` comes from `IItemHolders.FindHolderAsync`. It is always null now, and the frontend schema is `z.null()` until PBI-SPL-003 widens it.
- Persistence: one migration, `AddItems`.
  - New table `Items (Id, CampaignId, Name nvarchar(200), PlayerFacingDescription not null, KeeperNotes null, CreatedAt)`, indexed on `CampaignId`.
  - New table `ItemLinks (Id, SceneId FK cascade, ItemId FK cascade, CreatedAt)`, with a unique index on `(SceneId, ItemId)` and an index on `ItemId`.
  - `Handouts` changes:
    - `SceneId` becomes nullable;
    - new nullable `ItemId` FK with cascade;
    - new check `CK_Handouts_OneOwner`: `(SceneId IS NOT NULL AND ItemId IS NULL) OR (SceneId IS NULL AND ItemId IS NOT NULL)`;
    - new index on `(ItemId, Position)`.
- Live updates: none. The Scene Play `scenes` topic (Scene Play spec l.30) is published by Scene Play once it exists; Scenario Preparation publishes nothing today (spec l.32).
- Duplicate and Scene removal:
  - duplicating a Non-Player Entity (PBI-SP-010) is unaffected;
  - removing a Prepared Scene cascades its `ItemLinks`, and the Items stay.

## Patterns
- **Used:**
  - Adapter (backend) at `IHandoutOwner`, `SceneHandoutOwner`, and `ItemHandoutOwner` in Application. Force: two aggregates with different guard rules (Scene status against Item in-play) behind one Handout service.
  - Strategy (frontend) at the owner strategy objects in `services/handoutOwner.ts`. Force: URLs, query keys, invalidation, and routes would otherwise switch on the owner type across about 8 components.
  - Adapter at the functionality boundary: `IItemHolders` with `NoItemHolders` now and a Scene Play adapter in PBI-SPL-003 (ADR 0008).
- **Rejected:**
  - State for in-play: it is a computed fact, not a lifecycle the Item moves through.
  - Template Method base controller: see D3.
  - Observer or domain events on link changes: there is no consumer, and Scene Play owns the topic.
  - A generic service over the owner type: see D3.
  - Builder or Factory for Items: creation has one variant.

## Invariants
- Every `Handouts` row has exactly one owner (`CK_Handouts_OneOwner`). Each aggregate loads and changes only its own Handout rows.
- `Handout.Position` is written only in `HandoutCollection`.
- Scene Handout behavior and the Scene Handout API are unchanged:
  - the existing Scene Handout unit and integration tests pass with only call-site changes;
  - `scene-handouts.spec.ts`, `scene-file-handouts.spec.ts`, and `scene-links.spec.ts` pass unmodified.
- A stored file is deleted only after a successful commit:
  - a Scene's file only while the Scene is Prepared;
  - an Item's file only while the Item is not in play.
- On every Item, Item-link, and Item-Handout endpoint, the Keeper check runs first and any id outside the Campaign is 404. The one exception is the linked `itemId`, which is a 400 keyed by path.
- A Scene links an Item at most once. A Finished Scene's Item links never change.
- Scenario Preparation never references Scene Play code. The holder is read only through `IItemHolders`.
- Complexity stays at 10 or below. No suppression and no ESLint baseline entry is added.
- UI copy never says Gear, loot, inventory, or artifact.
- `backend/src/CocAssistant.Api/Program.cs` is not modified.

## Implementation plan
1. Domain (first, so the domain tests drive the refactor):
   - `HandoutOwner`, and `Handout` with two nullable owner ids;
   - `HandoutCollection`, with `Scene` refactored to delegate to it;
   - `Item` and `ItemCreation` with its outcomes;
   - `ItemLink`, plus `Scene.LinkItem` and `Scene.UnlinkItem`;
   - `HandoutRemovalOutcome.ItemInPlay` and the `ItemLinkOutcome` values.
2. Application:
   - ports `IItemRepository`, `IItemDirectory`, `IItemUsage`, and `IItemHolders` (with `ItemHolder`);
   - `ItemService` and `ItemLinkService`;
   - `HandoutOwnerReference`, `IHandoutOwner`, `SceneHandoutOwner`, `ItemHandoutOwner`, and `HandoutOwnerLocator`;
   - `HandoutService` and `HandoutFileService` moved to owner references;
   - `HandoutRemoveOutcome.InPlay`;
   - `SceneService` and `SceneDetailView.ItemLinks`.
3. Infrastructure:
   - the `ScenarioPreparationDbContext` mapping;
   - `EfItemRepository` (includes Handouts), `EfItemDirectory`, `EfItemUsage`, and `NoItemHolders`;
   - `EfSceneRepository` includes `ItemLinks`;
   - DI in `AddScenarioPreparationInfrastructure`;
   - migration `AddItems`.
4. Controllers:
   - `ItemsController` with requests, responses, problem messages, and titles;
   - `ItemLinksController`;
   - `ItemHandoutsController` and `ItemHandoutFilesController`;
   - `HandoutActionResults`;
   - `SceneResponse.ItemLinks`.
5. Backend unit and integration tests (see TDD units).
6. Frontend Handout refactor, with no behavior change:
   - `handoutOwner.ts`;
   - `handoutApi.ts` and `useHandouts.ts` take an owner;
   - the Handout components take an owner and a context;
   - `scene-handout-section` is renamed to `handout-section`;
   - the Scene Handout routes pass an owner;
   - `sceneSchema` gains `itemLinks`.
7. Frontend Items:
   - services and types: `types/Item.ts`, `services/itemApi.ts`, `services/itemForm.ts`, `services/itemInPlay.ts`, and `services/itemLinkApi.ts`;
   - hooks: `hooks/useItems.ts` and `hooks/useItemLinks.ts`. They invalidate the Scene detail, the Item detail, and the Items list.
   - components: `item-summary-section`, `item-list-page`, `create-item-page`, `item-form`, `item-page`, `item-scenes-section`, `delete-item-dialog`, `item-not-found`, `scene-item-section`, `link-item-page`, `item-picker`, and `unlink-item-dialog`;
   - routes: `campaigns.$campaignId.items.index.tsx`, `.items.new.tsx`, `.items.$itemId.tsx`, `.items.$itemId.handouts.new.tsx`, `.items.$itemId.handouts.$handoutId.tsx`, and `...scenes.$sceneId.item-links.new.tsx`;
   - wiring:
     - `campaign-page.tsx` renders `ItemSummarySection` after `NonPlayerEntitySummarySection` (l.37-38);
     - `scene-page` renders `SceneItemSection` after the Non-Player Entity section.
   - tests: each new component gets Vitest tests and stories, with fixtures in `test-support/itemFixtures.ts`.
8. E2E (see E2E coverage).

## Reuse
- Using:
  - Backend:
    - the `HumanNpc` aggregate, service, repository, and controller shapes for Items;
    - the `INonPlayerEntityDirectory` and `INonPlayerEntityUsage` shapes for `IItemDirectory` and `IItemUsage`;
    - the `NonPlayerEntityLinkService` and controller shape for Item links;
    - `RichTextDocument` and `RichTextJson`;
    - `HandoutFileStoreExtensions.TryDeleteAsync`.
  - Tests:
    - integration seeding with `PlayAsync(sceneId, SceneStatus)` (`NonPlayerEntityLinkApiTests` l.107-119);
    - `FakeCampaignKeepers`, `FakeHandoutFileStore`, and `FakeTimeProvider`.
  - Frontend:
    - the structures of `non-player-entity-summary-section`, `non-player-entity-list-page`, and `non-player-entity-picker`;
    - the name matcher in `nonPlayerEntityFilter.ts`, extracted to `services/nameSearch.ts` with no behavior change;
    - `useFilterAnnouncement`, `rich-text-editor`, `rich-text-view`, `useUnsavedChangesPrompt`, `validationProblem.ts`, `SceneFinishedError`, `move-controls`, `scene-status-badge`, and the shadcn `ui` components.
- Not using:
  - the `NonPlayerEntityLinks` table (D2);
  - the `nonPlayerEntityFilter` type filter, because Items have no types;
  - `sticky-form-actions` and `form-error-summary`: the Item form has three fields, and inline errors as on the create page are enough (ux.md section 62).

## TDD units
- Item domain:
  - Create and Edit trim the name, which must be 1-200 characters (otherwise `InvalidName`);
  - a missing, empty, too-large, or invalid description gives `MissingDescription` or `InvalidDescription`;
  - invalid Keeper notes give `InvalidKeeperNotes`, and null Keeper notes are allowed.
- Item Handouts (domain):
  - add, edit, reorder, and remove act on the Item's own list;
  - `RemoveHandout(isInPlay: true)` gives `ItemInPlay`, and the Handout stays;
  - `EditFileHandout` returns a replaced key only when the Item is not in play.
- `HandoutCollection`:
  - next position;
  - reorder is all or nothing (duplicates, mismatch);
  - removing an unknown id;
  - position is kept on edit;
  - the Scene's existing Handout domain tests still pass.
- `Scene.LinkItem` and `Scene.UnlinkItem`:
  - Finished gives `SceneFinished` before the Item fact is checked;
  - an Item not in the Campaign is refused;
  - linking the same Item twice returns the existing link, with no second row;
  - `UnlinkItem` refuses a Finished Scene, and an unknown link gives NotFound.
- `ItemService`:
  - the Keeper check runs first: a non-Keeper gets NotFound with no repository call;
  - a foreign id is NotFound;
  - delete is refused when a linked Scene is Active or Finished (`LinkedToPlayedScene`), checked before the holder;
  - delete is refused when `IItemHolders` reports a holder (`Held`; Gherkin "A held Item cannot be deleted");
  - a deleted Item's file keys are deleted only after the commit;
  - GET returns its Scenes in Scenario order, then Scene order.
- `ItemLinkService`:
  - the Keeper check runs first;
  - a foreign Item gives a 400 outcome;
  - a Finished Scene gives Finished even with a foreign Item;
  - re-linking is idempotent.
- `HandoutOwnerLocator` and the adapters:
  - Scene and Item references resolve to the right adapter;
  - a non-Keeper gets null;
  - `ItemHandoutOwner` computes in-play from the linked Scenes and the holder.
- `HandoutService` and `HandoutFileService` with an Item owner:
  - delete in play gives `InPlay`, and no file is deleted;
  - replace in play keeps the old file;
  - replace when not in play deletes the old file after the commit;
  - a failed commit deletes the new file.
- Persistence:
  - `CK_Handouts_OneOwner` rejects a row with no owner or two owners;
  - deleting an Item cascades its links and Handouts;
  - removing a Prepared Scene cascades `ItemLinks` and keeps the Item;
  - the unique `(SceneId, ItemId)` index holds;
  - there are no pending model changes.
- Frontend services:
  - `itemForm` validation messages and their order;
  - `itemApi` and `itemLinkApi`: strict schemas, 404 to null, 400 to field errors, and the two 409 titles to `ItemNotDeletableError` with a `reason`;
  - `isItemInPlay`;
  - the `handoutOwner` strategies;
  - the owner-aware `handoutApi` URLs and keys for both owners;
  - `nameSearch`.
- Frontend components: every SP-UX-90 to SP-UX-103 and SP-A11Y-51 to SP-A11Y-58 criterion in ux.md sections 68 and 69 has at least one component test.

## E2E coverage
- `e2e/tests/items.spec.ts`:
  - the Overview section, then the list, then create; the Item page shows "Held by no one." (Gherkin "Keeper prepares an Item"; SP-UX-90, 92, 93);
  - list search and its count (SP-UX-91);
  - validation of a missing Player-facing description (SP-UX-92);
  - edit (SP-UX-94);
  - delete an Item linked to a Prepared Scene, after which the Scene no longer lists it (Gherkin "Deleting an Item linked only to Prepared Scenes removes its links"; SP-UX-95, 101);
  - a Player gets `item-not-found` (SP-UX-102).
- `e2e/tests/scene-item-links.spec.ts`:
  - link from the Scene page; the Scene lists the Item and the Item page's Scenes section lists the Scene (Gherkin "Keeper prepares an Item"; SP-UX-96, 97, 98);
  - "Already in this Scene" cannot be chosen (SP-UX-98);
  - unlink (SP-UX-99);
  - the picker in Campaign B does not offer Campaign A's Item (Gherkin "Campaign boundaries isolate Scenario material"; SP-UX-51, 102).
- `e2e/tests/item-handouts.spec.ts`: add a Text Handout and an Image Handout to an Item, move one, open its page with "Back to the Item", and delete it (Gherkin "Keeper gives an Item a Handout"; SP-UX-100).
- Regression: `scene-handouts.spec.ts`, `scene-file-handouts.spec.ts`, and `scene-links.spec.ts` are unchanged and must pass.
- Exceptions, recorded in each spec's doc comment:
  - Active and Finished Scenes cannot be seeded in E2E until PBI-SPL-001. Those cases (delete refused with 409, Finished link refused, Item Handout delete hidden while in play) are covered by integration tests that seed through the DbContext (`ItemApiTests`, `ItemLinkApiTests`, `ItemHandoutApiTests`, `ItemHandoutFileApiTests`) and by component tests.
  - A held Item cannot exist before PBI-SPL-003. That case is covered by `ItemService` unit tests with a fake `IItemHolders`.
- Integration test files:
  - `ItemApiTests`: CRUD, the 400 keys, 404 for a Player, another Keeper, or a foreign id, 409 on Active and Finished, and the Prepared cascade with its files deleted;
  - `ItemLinkApiTests`: 201, 200 on re-link, 400 `itemId`, 409 Finished, unlink, `itemLinks` in the Scene GET, and the Scene removal cascade;
  - `ItemHandoutApiTests` and `ItemHandoutFileApiTests`: CRUD, delete refused while in play, and replace while in play keeps the old file;
  - `ScenarioPreparationMigrationTests` updated.

## ADR
- ADR 0022: Items are guarded by play usage read through ports (`docs/adr/0022-items-are-guarded-by-play-usage-read-through-ports.md`). It amends ADR 0019 (Item link storage) and ADR 0021 (deletion of Item-owned files).

## Phases
- Phase 1: steps 1-5, the backend and its tests.
  - Checkpoint: `feat(backend): Campaign Items with Scene links and Item Handouts (PBI-SP-008)`.
  - The behavior-preserving Handout owner refactor may be committed first, as `refactor(backend): address Handouts through their owner (PBI-SP-008)`.
- Phase 2: step 6, with no behavior change; all existing Vitest and E2E tests pass.
  - Checkpoint: `refactor(frontend): address Handouts through their owner (PBI-SP-008)`.
- Phase 3: step 7.
  - Checkpoint: `feat(frontend): Items list, Item page and Scene Item links (PBI-SP-008)`.
- Phase 4: step 8.
  - Checkpoint: `test(e2e): cover Campaign Items (PBI-SP-008)`.

## Human decisions
- 2026-10-23, UX gate: Option A, a page per step.
- 2026-10-23, UX gate: the Player-facing description is required, with visible text, using the rule for rich-text Handouts.
- 2026-10-23, UX gate: confirmed:
  - the Item and its Handouts stay editable when a linked Scene is Active or Finished;
  - deleting an Item Handout is refused while the Item is linked to an Active or Finished Scene;
  - when a file is replaced in that case, the old file is kept;
  - deleting an Item linked only to Prepared Scenes removes those links and its Handout files.
- 2026-10-23, UX gate: the assumptions were accepted:
  - Players see the Item name;
  - links have no fields and there is at most one per Scene;
  - the Item page shows "Held by no one.";
  - the Item page has a read-only Scenes section;
  - Item Handouts reuse the Scene Handout UI;
  - Edit is a whole-Item toggle;
  - Players get `item-not-found`.
- 2026-10-23, plan gate: "Approve as written". This covers D1-D5, including the held-Item addition in D5, the PBI-SPL-002 obligation in ADR 0022, and the CONTEXT.md sentence on the Item entry.

## Revisions

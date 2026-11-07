# Design: PBI-SPL-003: Keeper gives, takes back, and reveals Items; a Player sees their Investigator's Items

## Triggers
- **2. Shared interface or data model change:**
  - `Items` gets holder columns and a version.
  - The Reveal subject Item is enabled.
  - The Keeper Scene read gains each linked Item's holder and Handouts.
  - `IItemHolders` is removed.
- **3. New cross-layer pattern:** the `myItems` topic, a new provider command service, and new ports.
- **4. ADR needed:** where an Item's holder lives, superseding part of ADR 0022.
- **5. More than one bounded context:** Scene Play, Scenario Preparation, and Campaign Play (topics).
- **6. Open question with competing answers:**
  - the Refinement Protocol, settled at the UX gate;
  - where holder rows live.
- **7. UX:** new controls, dialogs, a new panel, and Player sections.

## Constraints
- **ADR 0022:**
  - An Item is in play while it is linked to an Active or Finished Scene, or held.
  - "Has a Reveal" must count as in play (l.30).
  - A give racing a delete must fail safely (l.29).
  - No blob is deleted while the Item is in play.
- **ADR 0024:** Scene Play state lives as children of Scenario Preparation aggregates and changes through provider services that perform no authorization.
- **ADR 0025:** an optimistic version guards races.
  - The Scene token is at `ScenarioPreparationDbContext.cs:89`.
  - `SceneSaveChanges.cs:39-43` maps a conflict to `SceneConcurrencyException`.
- **ADR 0008:** cross-functionality calls go through consumer-owned ports with Adapters.
- **ADR 0009:**
  - The topic set is closed (`CampaignDataTopic.cs:7-16`).
  - Audiences come from `CampaignLivePublicationPolicy`.
- **ADR 0023:** the authorization matrix; the Scene Play rows live in `ScenePlayAuthorizationMatrixTests`.
- **ADR 0026:** revealed files are served from the Reveal snapshot.
- **ADR 0027 and ADR 0028:** panels are URL search params; panel bodies live in the subject's slice and hosts adapt them.
- **Spec:** `specs/scene-play/spec.md` l.9-10, 16, 20-22, 29-30, and 40-44, plus the Refinement Protocol answers (Human decisions).
- **CONTEXT.md:** Item (l.128-129), Reveal (l.139), and Clue. UI copy never says "inventory", "loot", "object", or "Gear".
- **UX acceptance criteria to keep:**
  - SPL-UX-40: Run shows no Item.
  - SPL-UX-45: Keeper reference offers no "Reveal...".
  - Navigation ux section 3: one context action per panel footer.
  - SP-UX-107: an Item looks the same on the Scene page and on the Active Scene.
- **Existing code this design builds on:**
  - **Reveal chain:**
    - `RevealService.cs:72-96`;
    - `SceneRevealService.cs:21-37`;
    - `Scene.Reveal` (`Scene.cs:174-194`);
    - `SceneRevealChecks.CheckSubject` refuses Item at `SceneRevealChecks.cs:31`.
  - **Reveal storage:** `CK_Reveals_Subject` has no Item branch (`ScenarioPreparationDbContext.cs:144-147`).
  - **Deleting an Item:** the delete races a start through `ItemService.cs:130-140`.
  - **In-play reads:** `HandoutOwnerLocator.cs:54-55`.
  - **Scene read:** `ItemLinkView` carries only the Item's id and name (`ItemLinkView.cs:4-7`).
- Cyclomatic complexity stays at or below 10, with no new suppressions.
- No `docs/game-rules/` section applies.

## UX
- **Selected option:** Keeper option A (Give and Take back on the material entry), with Player option P1 (Items on the Clues page and panel, and on the Player's Active Scene).
- **Specification:** `specs/scene-play/ux.md` section 22 (new), linked from `spec.md`.
- **Amended:**
  - scene-play ux sections 11, 19, 21.4, and 21.5;
  - navigation ux sections 1, 3, 4, and 7;
  - scenario-preparation ux sections 63.1, 64.1, 70, and 72.
- **Prototype:** none, by the human's decision.

## Decisions

### D1: Where the holder is stored
| Metric | A: holder columns on `Items`, changed only through a Scenario Preparation provider service | B: `ItemHolders` table in a new Scene Play DbContext behind the `IItemHolders` port (ADR 0022 as written) |
| --- | --- | --- |
| Consistency | + the ADR 0024 pattern: Scene Play state on Scenario Preparation aggregates, changed through a provider service | - Scene Play's first DbContext and migrations assembly; a second persistence pattern |
| Modifiability | + holder, version, and give Reveal in one row; history (PBI-SPL-004) reads Reveals | 0 the port isolates it, but every holder rule spans two databases |
| Testability | + domain unit tests on `Item` and `Scene`; one integration database | - cross-context transaction tests |
| Simplicity | + three columns and one migration | - new context, migrations, registration, and adapter |
| Reversibility | 0 moving the columns out later is one migration | - removing a DbContext is costly |
| Security and correctness | + the give's Reveal and the holder change commit in one transaction | - two commits: a crash between them leaves a Reveal without a holder; the version cannot guard across contexts |

- **Chosen:** A, because of correctness (one transaction), consistency (ADR 0024), and simplicity.
- **Given up:**
  - The `IItemHolders` port and `NoItemHolders` are deleted.
  - `ItemService` and `HandoutOwnerLocator` read `Item.HolderInvestigatorId` directly.
  - Scene Play's holder rules are coded in the Scenario Preparation domain, as ADR 0024 already does for presence and Reveals.
- **Why ADR 0022's rejection no longer holds:**
  - ADR 0022 rejected "a nullable holder column on Items, written by Scene Play" because it "decides the Scene Play boundary before its own ADR" and because Scene Play would write a Scenario Preparation table.
  - ADR 0024 has since decided that boundary: Scene Play changes Scenario Preparation aggregates only through provider services, so Scene Play never writes the table itself.
  - ADR 0029 records this and supersedes ADR 0022's "Holder port" decision.
- **Rejected:** B. The Developer must not reintroduce it.
- **Rejected variant:** a separate `ItemHolders` table in Scenario Preparation's database. It adds a table and a key, and the version must sit on `Items` anyway (D2), so it gains nothing.

### D2: Race safety and the blob guard
| Metric | A: `Items.Version` concurrency token | B: per-Item application lock (`sp_getapplock`) or a serializable transaction |
| --- | --- | --- |
| Consistency | + mirrors `Scene.Version` (ADR 0025) and the existing `SceneConcurrencyException` catches (`ItemService.cs:137`, `HandoutService.cs:86`, `HandoutFileService.cs:116`) | - a new mechanism, SQL Server specific (tests use SQLite) |
| Modifiability | + any new play-usage write only bumps the version | - every path must take the lock |
| Testability | + SQLite and SQL Server integration tests can force the conflict | - hard to test on SQLite |
| Simplicity | + one property and bumps in a few domain methods | - transaction scope plumbing |
| Reversibility | + drop a column | 0 |
| Security and correctness | + of a give or Reveal and a delete or blob-deleting write, whichever saves second fails | + also safe |

- **Chosen:** A, because of consistency and testability. Given up: a refused write is reported after a version conflict, and the client refetches.
- **Rules:**
  - **These increment `Item.Version` in the same save:**
    - `Item.GiveTo`;
    - `Item.TakeBack`;
    - `Item.MarkInPlay`, called after any Reveal of the Item or of one of its Handouts;
    - `Item.RemoveHandout`, when it removes;
    - `Item.EditFileHandout`, when it returns a replaced key.
  - **Item delete:** checks the token in its DELETE.
  - **What the existing catches then cover:**
    - give versus delete;
    - Item or Item-Handout Reveal versus delete;
    - Item-Handout Reveal versus Handout delete or file replace.
  - This closes the PBI-SPL-002 follow-up "extend the blob guard to Item-Handout Reveals".
- **Rejected:** B, and also relying on foreign-key violations alone: no foreign key covers a Reveal's file key (`Reveals.SubjectId` has no FK, PBI-SPL-002 design record l.232).

### D3: How a give commits
| Metric | A: one provider command, `Scene.GiveItem(item, investigatorId, now)`, one save | B: Scene Play calls `ISceneReveals.RevealAsync(Item, [investigator])`, then a separate set-holder call |
| --- | --- | --- |
| Consistency | + like start-with-finish in one transaction (ADR 0024) | - PBI-SPL-001 D4 rejected failures reported after a commit |
| Modifiability | + give rules in one domain method | - rules split across two calls |
| Testability | + one domain unit covers the check order | - needs partial-failure tests |
| Simplicity | + | 0 reuses the reveal call |
| Reversibility | + | + |
| Security and correctness | + Reveal and holder are all or nothing | - a Reveal without a holder is possible |

- **Chosen:** A.
- **Rejected:** B, because of correctness. The Developer must not reintroduce it.

### D4: Where the Active Scene lists get each Item's Handouts and holder
| Metric | A: extend the Keeper Scene read's `ItemReference` with `holder` and `handouts` | B: client calls `GET items/{id}` per linked Item | C: a new Scene Play read |
| --- | --- | --- | --- |
| Consistency | + the To reveal and Keeper reference lists already come from the Scene read (ux 21.10) | 0 reuses an endpoint | - a second source for the same lists |
| Modifiability | + one schema change | - N loading and error states feed the counts | - |
| Testability | + one fixture | - | 0 |
| Simplicity | + | - per-Item loading merged into counts | - new endpoint, service, and port |
| Reversibility | + additive fields | + | 0 |
| Security and correctness | + Keeper-only read | + | + |
| Performance | + one request | - N requests | + |

- **Chosen:** A.
- **Rejected:**
  - B, because of per-Item loading states and requests;
  - C, because it duplicates the source.

### D5: What a Player's "Items {name} holds" shows
| Metric | A: the give Reveal's snapshot (`Items.HolderRevealId`) | B: the Item's current name and description |
| --- | --- | --- |
| Consistency | + spec l.40: what an Investigator received never changes | - Keeper edits would reach the Player |
| Security and correctness | + a later edit never leaks unrevealed Player-facing changes | - |
| Simplicity | 0 one FK and a join | + |
| Testability | 0 | 0 |
| Modifiability | 0 | 0 |
| Reversibility | 0 | 0 |

- **Chosen:** A.
- **Rejected:** B.

### Single-option decisions
- **Refinement Protocol (human, 2026-11-06):**
  - Giving needs an Active Scene, the Item linked to it, and the Investigator present. It creates one Reveal of subject Item (name and Player-facing description) whose only recipient is the new holder.
  - Taking back needs neither an Active Scene nor anyone present, and creates no Reveal.
  - Giving a held Item to another Investigator moves it. The former holder keeps the Clue, and both accounts get `myItems`.
  - Giving an Item to its current holder is refused.
- **Item Handout Reveals are in scope (human):**
  - A Player-facing Handout of an Item linked to the Active Scene is revealed with `type` `Handout` and its id.
  - A Keeper-facing one is refused with the existing `SubjectKeeperFacing` 400.
  - Giving never reveals Handouts.
- **API (Scene Play controllers):** every call answers a non-member with 404; Keeper-only calls answer a Player with 404.
  - **`POST items/{itemId}/give`** with body `{investigatorId}`. Checks run in this order:
    1. The caller is the Keeper.
    2. The Item is in the Campaign (404 otherwise).
    3. A Scene is Active (409 otherwise; nothing is given).
    4. The Active Scene links the Item (400 at `itemId` otherwise).
    5. The Investigator is present (400 at `investigatorId` otherwise).
    6. The Investigator is not already the holder (400 at `investigatorId` otherwise).
    - A version conflict answers 409.
    - 200 returns the created Keeper Reveal view, like `POST reveals` after its D5 revision.
  - **`POST items/{itemId}/take-back`:**
    - 404 when the Item is not in the Campaign.
    - 204 whether or not anyone held it. Taking back an unheld Item changes nothing and signals nothing.
    - A version conflict answers 409.
  - **`GET investigators/mine/items`:**
    - Player only; 404 for a Keeper or for a Player without an Approved Investigator.
    - Shape: `{investigatorName, items: [{revealId, name, description, givenAt}]}`, newest first.
    - No Item id or subject id reaches a Player.
  - **`GET investigators/{investigatorId}/items`:**
    - Keeper only; 404 for an Investigator who is not Approved.
    - Same shape, plus `itemId`.
    - This is a new contract line, needed for "Take back" on the Keeper's Clues page.
  - **`POST active-scene/reveals`:**
    - Accepts `type` `Item`.
    - `RevealContracts.ItemMessage` and its refusal path are removed.
    - `Unknown` keeps `RefuseUnknownSubjectAsync`.
- **Item snapshot:**
  - `Reveal.FromItem` stores the name in `Title` and the Player-facing description in `Content`. Kind, file, and image description are null.
  - `CK_Reveals_Subject` gains `SubjectType = 'Item' AND HandoutKind IS NULL AND FileKey IS NULL AND ImageDescription IS NULL AND Content IS NOT NULL`.
  - A name of up to 200 characters fits `Handout.TitleMaxLength` = 200.
- **Columns:**
  - `Items.HolderInvestigatorId`: nullable, no FK (ADR 0013).
  - `Items.HolderRevealId`: nullable FK to `Reveals`, `NoAction`.
  - `Items.Version`: int, concurrency token.
  - Check `CK_Items_Holder`: both holder columns are null, or both are set.
  - Index on `(CampaignId, HolderInvestigatorId)`.
  - One migration, `AddItemHolders`, in Scenario Preparation's migrations.
- **In play:**
  - `IItemUsage.IsLinkedToPlayedSceneAsync` becomes `IsPlayedAsync`. An Item is played when it is linked to an Active or Finished Scene, or when a Reveal exists with `SubjectType = Item` and the Item's id, or with `SubjectType = Handout` and one of the Item's Handout ids.
  - Callers OR it with `HolderInvestigatorId != null`.
  - A delete keeps the "played" refusal for played or revealed Items, and the "held" refusal for a held Item.
  - On a version conflict, the delete re-reads the Item and answers `Held` when it is held, otherwise `LinkedToPlayedScene`.
- **Live updates:**
  - New topic `CampaignDataTopic.MyItems` (wire name `myItems`).
  - `CampaignLivePublicationPolicy.ForItemHolderChanged(campaignId, gainedAccountId?, lostAccountId?)`:
    - the Keeper hears `sceneReveals`;
    - the account that gained the Item hears `myItems` and `myClues`;
    - the account that lost it hears `myItems`;
    - the whole Campaign hears nothing.
  - The publisher is `PublishItemHolderChanged`; the adapter is `CampaignPlayItemHolderSignals`. Delivery is best-effort after commit, like `RevealService.cs:176-186`.
  - `scenes` is not published: it is not in `CampaignDataTopic.cs`, and spec l.29 covers holder changes with `sceneReveals`.
- **Frontend invalidation:**
  - `sceneReveals` adds the Scene detail (`sceneQueryKeys.inCampaign`), the Item detail, and the Keeper held-Items keys.
  - `myItems` invalidates the mine held-Items key.
- **Item page holder name:** resolved on the client from the Approved Investigators query. No name is added to the server response.
- **PBI-SPL-001 follow-up:** the Item delete-versus-start race was re-checked and is covered (`ItemService.cs:130-140`). E2E coverage for the Active and Finished Item cases is added here.
- **Authorization matrix:**
  - Four new rows: give, take-back, `mine/items`, and `{investigatorId}/items`.
  - `SnapshotAsync` adds the `Items` holder columns.

## Patterns
- **Used: Adapter.**
  - New adapters: `ScenarioPreparationSceneItemHolders` and `CampaignPlayItemHolderSignals`.
  - Force: incompatible interfaces at the functionality boundary (ADR 0008), as with `ScenarioPreparationSceneReveals`.
- **Used: Factory Method.** `Reveal.FromItem`, next to `FromHandout` and `FromNonPlayerEntityLink` (`Reveal.cs:58-74`).
- **Rejected: Strategy per subject type in `SceneRevealChecks`.**
  - Three arms of one call each stay under complexity 10. The PBI-SPL-002 design record (l.279) says to revisit only if an arm grows.
  - The Handout arm checks the Scene's Handouts, then the linked Items' Handouts, in a private helper.
- **Rejected: State for held or not held.** There are two states and one nullable column.
- **Rejected: Command or an event log of holder changes.** There is no undo or audit requirement, and history reads Reveals.
- **Observer:** the existing SignalR publication policy is reused. There are no domain events (ADR 0024).

## Invariants
- **Holding:**
  - An Item has at most one holder.
  - A give creates exactly one Item Reveal to the new holder only, and commits it in the same save as the holder change. A refused give changes nothing.
  - A give needs an Active Scene that links the Item and the Investigator present. A take back needs neither.
  - Taking back or moving an Item never changes or removes a Reveal. The former holder keeps the Clue.
- **What Players receive:**
  - Only an Item's name and Player-facing description, and only Player-facing Handouts, ever reach Players.
  - Keeper notes and Keeper-facing Handouts never do.
- **In play and races:**
  - An Item is in play when it is linked to an Active or Finished Scene, revealed (the Item or one of its Handouts), or held.
  - While it is in play, deleting the Item or its Handouts and deleting a blob are refused.
  - Every holder change, every Reveal of an Item or Item Handout, and every blob-deleting or Handout-removing Item write changes `Item.Version` in the same save.
- **Authorization:**
  - Keeper checks run first in Scene Play application services.
  - A Player gets 404 on every Keeper call.
  - A Player read returns only their own Approved Investigator's Items, without Item or subject ids.
- **Live updates:** `myItems` and `myClues` go only to the affected accounts, never to the whole Campaign.
- **UX:** Run shows no Item (SPL-UX-40). Keeper reference offers no "Reveal..." (SPL-UX-45).
- **Complexity:** at or below 10, with no new suppressions.

## Implementation plan
1. **Domain (Scenario Preparation):**
   - `Item`:
     - `HolderInvestigatorId`, `HolderRevealId`, and `Version`;
     - internal `GiveTo`, which returns the former holder, `TakeBack`, and `MarkInPlay`;
     - version bumps in `RemoveHandout` and `EditFileHandout`.
   - `Reveal.FromItem`.
   - `SceneRevealChecks`: the Item arm, and the Item-Handout lookup over the linked Items it is given.
   - `Scene.Reveal(..., IReadOnlyCollection<Item> linkedItems)` returns the owning Item.
   - `Scene.GiveItem`.
   - The outcome `AlreadyHolder`.
2. **Infrastructure (Scenario Preparation):**
   - DbContext mapping, the check constraints, the `Version` token, and the `AddItemHolders` migration.
   - `EfItemUsage.IsPlayedAsync`.
   - Repository reads: an Active Scene's linked Items with their Handouts, and an Investigator's held Items joined to their give Reveal.
   - Delete `NoItemHolders` and its registration.
3. **Application (Scenario Preparation):**
   - `SceneRevealService` loads the linked Items for an Item or Handout subject and calls `MarkInPlay`.
   - New provider `ItemHolderCommandService` with `GiveAsync`, `TakeBackAsync`, and `ListHeldAsync`; it performs no authorization.
   - `ItemService` and `HandoutOwnerLocator` drop `IItemHolders`.
   - `ItemLinkViews` and the Scene read add `holder` and `handouts`.
   - Delete `IItemHolders`.
4. **Campaign Play:** the `MyItems` topic, `ForItemHolderChanged`, and `PublishItemHolderChanged`.
5. **Scene Play:**
   - Ports `ISceneItemHolders` and `IItemHolderSignals`.
   - `ItemHolderService`, with the Keeper and Player checks and the signals.
   - Adapters and their registration.
   - `ItemHolderController` with give and take-back, and the Items reads modelled on `CluesController`.
   - Remove the Item refusal from `RevealController` and `RevealContracts`.
6. **Frontend, shared types and live updates:**
   - `RevealSubjectType` gains `'Item'`.
   - `revealed-content` and the meta label "Item".
   - The Scene schema gains `holder` and `handouts` on Item links.
   - `itemHolderApi.ts` (zod) and its query keys.
   - `liveTopics.ts`.
7. **Frontend, Keeper:**
   - `subTabGrouping.ts`:
     - `item` and `itemHandout` join the union;
     - `toRevealSubjects`, `keeperReferenceSubjects`, and `revealTargetOf` handle them;
     - the holder status.
   - Items groups in `to-reveal-section` and `keeper-reference-section`.
   - New `give-item-dialog` and `take-back-item-dialog`.
   - New `item-panel-body` (scenario-preparation), hosted by `item-panel` and `scene-panel`.
   - `handout-panel-body` accepts an Item owner.
   - `sidePanelSearchSchema` gains `item`.
   - The Item page holder line and its `from` back link.
8. **Frontend, Player and Clues:**
   - `held-items-section` in Player and Keeper variants, on the Clues page, in the `clues` panel, and on the Player's Active Scene.
   - `useHeldItemsAnnouncement`.
9. **Tests and E2E:** as listed below, with a story for each new component.

## Reuse
- **Using:**
  - `RevealService.cs:80-96`: the Keeper check, outcome mapping, and best-effort signal shape.
  - `ListMyCluesAsync` and `ListInvestigatorCluesAsync` (`RevealService.cs:99-120`) for the Items reads.
  - `ScenePlayControllerBase`, `CampaignPlayApprovedInvestigators`, and `ICampaignRoles`.
  - `SceneSaveChanges` for the conflict mapping.
  - The `material-entry`, `reveal-dialog`, and `useRevealFlow` patterns.
  - The `investigators-present-fieldset` style for the radio group.
  - `AlertDialog`, as in `finish-scene-dialog`.
  - `side-panel-content`, `clues-list`, and `usePlayerRevealAnnouncement`.
  - The E2E fixtures `scene-play.ts` and `items.ts`.
- **Not using:**
  - `LinkedSceneGuard` for give: the given Item's Scene is Active, so the guard has no Prepared Scene to protect, and D2 covers the rest.
  - The existing `reveal-dialog` for give: a give chooses one Investigator (radio), not several.

## TDD units
- **`Item`:**
  - `GiveTo` sets the holder and the Reveal id, returns the former holder, and bumps the version.
  - `TakeBack` clears both and bumps the version.
  - `MarkInPlay` bumps the version.
  - `RemoveHandout` and `EditFileHandout` with a replaced key bump the version.
- **`Scene.GiveItem` check order:**
  - not Active: NotActive;
  - the Item is not linked: SubjectNotFound;
  - the Investigator is not present: RecipientNotPresent;
  - the Investigator is the current holder: AlreadyHolder, with no Reveal and no holder change;
  - success: one Item Reveal to the holder only. A move returns the former holder.
- **`Scene.Reveal`:**
  - an Item reveals its name and description;
  - a Player-facing Handout of a linked Item is revealed;
  - a Keeper-facing Item Handout gives SubjectKeeperFacing;
  - a Handout of an unlinked Item gives SubjectNotFound;
  - the owning Item is returned.
- **Scenario Preparation application:**
  - The provider maps every outcome, and a version conflict surfaces as a conflict.
  - `ItemService.DeleteAsync` refuses a revealed Item (as played) and a held Item, and re-reads the Item after a conflict.
  - `HandoutOwnerLocator` counts a revealed Item as in play.
- **Scene Play application:**
  - A Player or a non-member gets NotFound before any port call.
  - A give signals `sceneReveals` to the Keeper, `myItems` and `myClues` to the account that gained the Item, and `myItems` to the account that lost it.
  - Taking back an unheld Item signals nothing.
  - A failed signal is logged and never fails the call.
  - `mine/items` answers a Keeper with 404 and carries no Item id.
- **Publication policy:** `ForItemHolderChanged` never targets the Campaign, and lists an account that both gained and lost only once.
- **Integration (`CocAssistant.Api.IntegrationTests`):**
  - Every give and take-back status code above, and the check order.
  - The migration's constraints.
  - Give versus delete in both orders: exactly one wins, and the Item is held or deleted, never both.
  - Item-Handout Reveal versus Handout delete.
  - A held-Item delete is refused (closes the PBI-SP-008 follow-up).
  - An unlinked Item with a Reveal cannot be deleted.
  - Over the hub, `myItems` reaches only the holder's and the former holder's accounts.
  - The authorization matrix rows.
- **Frontend:**
  - `subTabGrouping`:
    - the Items group order, with Item Handouts after their Item;
    - an entry leaves once it has reached everyone present;
    - the holder status line;
    - Keeper reference lists Items and Keeper-facing Item Handouts.
  - `give-item-dialog`:
    - the error when nobody is chosen;
    - the current holder shown as "(holds it)" and disabled;
    - the busy state;
    - each refusal message;
    - where focus returns.
  - `take-back-item-dialog`.
  - `held-items-section`: the Player and Keeper variants, the empty state, and "Take back".
  - The held-Items announcement: a gain, a loss, several changes, and silence on first load.
  - The `item-panel-body` states.
  - The `liveTopics` mappings.
  - The zod schemas.
- **UX and accessibility criteria:** SPL-UX-51 to SPL-UX-60 and SPL-A11Y-19 to SPL-A11Y-22 are each a component test wherever they can be observed in a component.

## E2E coverage
New `e2e/tests/items-in-play.spec.ts`, with a 240s timeout as in `active-scene.spec.ts`. Each test is named after its Gherkin scenario.
- **"Keeper gives an Item to an Investigator"** (SPL-UX-52, SPL-UX-57):
  - The Keeper gives the Item from To reveal.
  - Harvey's connected Player sees it under "Items Harvey Walters holds" and among the Clues, without reloading.
- **"Keeper takes an Item back"** (SPL-UX-54): "Take back" on Keeper reference. The Item leaves the Player's list live, and the Clue stays.
- **"Giving a held Item to another Investigator moves it"** (SPL-UX-53): both Players' views update, and Harvey keeps the Clue.
- **"Taking an Item back needs no Active Scene"** (SPL-UX-55): after "Finish Scene", "Take back" from the Keeper's Clues page.
- **"Keeper reveals an Item without giving it"** and **"Keeper reveals an Item's Handout"** (SPL-UX-51): the To reveal Items group, the dialog, and the Players' Active Scene.
- **"A Player cannot give an Item"**: an API call as a Player returns 404.
- **"A held Item cannot be deleted"**: Delete on the Item page shows the held message. This closes the PBI-SP-008 and PBI-SP-006 E2E exception.
- **"An Item in a played Scene cannot be deleted"**: the PBI-SPL-001 follow-up.
- **Updated:** `reveals.spec.ts` and `active-scene.spec.ts` expectations now account for the Items group: To reveal counts the linked Item and its Player-facing Handouts (ux 22.1), Keeper reference counts the Item and its Keeper-facing Handouts with the amended hint (ux 22.2), and the Clues page lists the Items section above the per-Scene groups (ux 22.7). Checked against SPL-UX-40, SPL-UX-42, SPL-UX-45, and SPL-UX-48. `scene-item-links.spec.ts` and `manual-preparation.spec.ts` follow the PBI-SPL-003 item-panel contract: the Scene page lists each Item title as a panel-opening button (ux section 72 amendment), so the shared `item-link-{id}` title id is the locator and the panel's "Open full page" reaches the Item page (B6).

## ADR
- **ADR 0029**, "Item holders live on the Item and change through a provider service":
  - it supersedes ADR 0022's "Holder port" decision and its PBI-SPL-003 consequence;
  - it adds `Items.Version`, amending the blob-guard rules of ADR 0021 and ADR 0022;
  - ADR 0022's status line now points to it.

## Phases
- **Phase 1: domain, persistence, and the migration**, with unit and integration tests for in play and the races.
  - Checkpoint: `feat(scene-play): Item holders, Item Reveals, and Item version (PBI-SPL-003)`.
- **Phase 2: the provider and Scene Play services, controllers, and the `myItems` topic**, with integration and hub tests.
  - Checkpoint: `feat(scene-play): give, take-back, and held-Items API with live updates (PBI-SPL-003)`.
- **Phase 3: the Keeper frontend**: the lists, the dialogs, the `item` panel, and the Item page.
  - Checkpoint: `feat(scene-play): Keeper gives and takes back Items (PBI-SPL-003)`.
- **Phase 4: the Player and Clues frontend, and E2E.**
  - Checkpoint: `feat(scene-play): Players see their Investigator's Items (PBI-SPL-003)`.

## Human decisions
- **2026-11-06, UX gate:** "A + P1, 2a-c as recommended, yes to Handouts, no prototype" (relayed by the coordinator).
  - Keeper option A and Player option P1 were selected.
  - Refinement Protocol: (a) giving needs an Active Scene, the Item linked to it, and the Investigator present; (b) taking back needs neither; (c) giving a held Item moves it, and giving it to its current holder is refused.
  - Reveals of an Item's Player-facing Handouts are in scope.
  - No prototype.
- **2026-11-06, plan gate:** "approve" (relayed by the coordinator), covering D1-D5, the single-option decisions, ADR 0029, and the phases, with no changes.

## Revisions

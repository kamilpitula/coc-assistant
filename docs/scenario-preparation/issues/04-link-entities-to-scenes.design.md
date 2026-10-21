# Design: PBI-SP-004: Link Human NPCs and Mythos Creatures to a Scene with a Player-facing name and description

## Triggers
- 2 (shared aggregate / data model): the Scene aggregate gains a child collection and a new table (`Scene.cs:13-26` has no collections today); the `ScenarioPreparationDbContext.cs:10-16` model gains a table; the Human NPC and Mythos Creature delete outcomes change.
- 6 (competing open questions): link ownership, how a link refers to its entity, cascade behavior, 409 contracts, SignalR.
- 7 (UX): two new pages, a new Scene page section, an unlink dialog, and the profile-page delete refusal. Option B selected (H1).

## Constraints
- `specs/scenario-preparation/spec.md`: line 9 (a Non-Player Entity may appear in many Scenes within one Campaign), line 21 (PUT Scene 409 when Finished), line 29 (DELETE 409 when linked to an Active or Finished Scene), line 30 (profiles are not pushed over SignalR; Keeper-only), line 31 (the Scene aggregate owns status and editing rules), line 47 (links are edited while Prepared or Active; Finished is read-only), line 50 (material linked only to Prepared Scenes can be deleted freely), line 59 (Duplicate never copies Scene links), line 61 (the link carries the Player-facing name and rich-text description, the only parts a Player ever receives); Regression Guardrails at lines 86, 91, 93.
- `specs/scene-play/spec.md`: line 9 (a Reveal's subject is "a Non-Player Entity link", with a snapshot), line 10 (the cross-functionality boundary is decided before PBI-SPL-001), line 16 (Reveal body `subject: {type, id}`), line 39 (a Reveal is a snapshot).
- ADR 0013 (Keeper check first, 404 for everyone else; no foreign key across DbContexts); ADR 0015 and its amendment (validated Lexical JSON, 204,800 bytes, headings only h3/h4, `null` means no document); ADR 0016 (Scene stores CampaignId; the Scene-to-Scenario key is allowed inside one context); ADR 0018 (400 keyed by camelCase request path, server-owned messages); ADR 0009 and ADR 0012 (the hub and topics live in Campaign Play only); ADR 0011 (domain events after commit, not used here).
- Game rules: `docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#57-step-7--add-spells-and-special-powers` keeps spells apart from "powers/special abilities"; `docs/game-rules/project_ruleset.md#56-spells-and-powers-without-a-catalog` stores Powers as their own list. No missing or conflicting rule.
- CONTEXT.md: Scene, Non-Player Entity, Human NPC, Mythos Creature, NPC Profile, Monster Profile, Keeper, Player-facing, Reveal. CONTEXT.md has no glossary entry for "Non-Player Entity link"; both specs already use the phrase (spec.md:162, scene-play spec:9). This design uses it; a follow-up adds the glossary entry.
- Existing patterns:
  - `Scene.Edit` checks Finished before the fields and returns `SceneFieldsOutcome.SceneFinished` (`Scene.cs:63-68`); the service maps it to `Finished` and the controller to 409 "A Finished Scene can't be changed." (`SceneService.cs:160-166`, `ScenesController.cs:149`).
  - 409 with an RFC 7807 title (`ScenesController.cs:110`).
  - Repository lookups always filter by Campaign and id (`EfSceneRepository.cs:22-25`).
  - The Non-Player Entity directory lists one Campaign's id, type, and name without profiles (`EfNonPlayerEntityDirectory.cs:17-33`).
  - Rich text arrives as a request `JsonElement?`, is stored via `GetRawText()`, and is parsed back for the response (`ScenesController.cs:48`, `:167-176`).
  - The frontend `failWrite` maps every 409 to `SceneFinishedError` (`sceneApi.ts:100-111`).
  - The delete dialog already takes `refused` (`delete-non-player-entity-dialog.tsx:19,49,56`) with the copy in ux.md 25.3.
  - Deletes have no in-use check today (`HumanNpcService.cs:97-109`, `HumanNpcResults.cs:15-19`, `HumanNpcsController.cs:93`; mirrored at `MythosCreatureService.cs:97-107`, `MythosCreaturesController.cs:94`).
  - Respawn ignores only the migration history tables (`AccountApiTests.cs:22`), so the new table is reset automatically.
- Cyclomatic complexity 10 or below. Scenario Preparation has no `GlobalSuppressions.cs`, so no new suppression is allowed.
- Background only (not binding): the PBI-SP-010 design notes that Scene links live outside the copied fields.

## UX
- Selected option: B, dedicated link pages (H1) - `specs/scenario-preparation/ux.md` (updated): new sections 31 to 39 with SP-UX-50 to SP-UX-63 and SP-A11Y-30 to SP-A11Y-36; amendments to sections 14, 25.3, 26, and 30.
- Q1 yes (the same entity can be linked more than once, H2); Q2 (i) (reference only, H3); Q3 the Player-facing name starts empty (H4).

## Decisions

### D1: Where links live, and where the Finished rule is enforced
| Metric | A: child entities of the Scene aggregate | B: a separate link aggregate with its own repository |
| --- | --- | --- |
| Consistency | + spec.md:31 and ADR 0016: the Scene owns its editing rules; the rule sits beside `Scene.Edit` (`Scene.cs:63-68`) | - the Finished check moves into a service; the aggregate no longer guards its own content |
| Modifiability | + Handouts (PBI-SP-005) and Item links (PBI-SP-008) copy the same shape; a status change is one guard | 0 each link kind adds an aggregate and a repository |
| Testability | + pure domain tests of link, edit, and unlink per status | 0 the rule needs service tests with fakes |
| Simplicity | 0 a backing-field collection and an `Include` | 0 one more repository and port |
| Reversibility | 0 extracting later is a refactor with no schema change | 0 the same in reverse |
| Security and correctness | + no path that loads the aggregate can change a Finished Scene | - a new code path can forget the status check |

- **Chosen:** A, because Consistency (spec.md:31) and correctness decide it - giving up loading links with every `FindByIdAsync` (few rows).
- **Rejected:** B. The Developer must not introduce a separate link repository or link aggregate.

### D2: How a link refers to its Non-Player Entity
| Metric | A: two nullable foreign-key columns `HumanNpcId` and `MythosCreatureId`, a check constraint that exactly one is set, ON DELETE CASCADE | B: `NonPlayerEntityType` plus `NonPlayerEntityId`, no foreign key, cascade in code |
| --- | --- | --- |
| Consistency | + an in-context foreign key is the Scene-to-Scenario precedent (`ScenarioPreparationDbContext.cs:41-48`); Human NPC and Mythos Creature stay separate tables (spec.md:30) | 0 mirrors the wire `{type, id}`, but no table does this today |
| Modifiability | 0 a third entity type adds a column and widens the check | + a third type adds an enum value |
| Testability | + the database proves integrity; SQLite and SQL Server both enforce foreign keys and checks | 0 needs orphan tests |
| Simplicity | 0 the domain exposes computed `Type` and `NonPlayerEntityId` over two private columns | - every delete path must remove links itself, and a concurrent link insert during a delete leaves an orphan |
| Reversibility | 0 a migration either way | 0 the same |
| Security and correctness | + no dangling link can exist; deleting a profile linked only to Prepared Scenes removes its links atomically (spec.md:50, 93) | - integrity rests on application code |

- **Chosen:** A, because correctness and Testability decide it - giving up a single-column reference and accepting a small mapping wrinkle (EF ignores the computed `Type` and `NonPlayerEntityId`) (H8).
- **Rejected:** B (polymorphic id without a foreign key). The Developer must not reintroduce it, nor delete links in application code.

### D3: Cascade when a profile linked only to Prepared Scenes is deleted, and when a Prepared Scene is removed
| Metric | A: cascade; the links go with the profile or the Scene | B: refuse while any link exists |
| --- | --- | --- |
| Consistency | + spec.md:50 "can be deleted freely"; spec.md:48 a Prepared Scene can be removed | - contradicts spec.md:50 |
| Modifiability | + no new outcome for Scene removal | - new refusal paths and copy |
| Testability | + persistence tests assert the rows are gone | 0 |
| Simplicity | + database cascade (D2); `SceneService.RemoveAsync` (`SceneService.cs:97-114`) is unchanged | - checks on both deletes |
| Reversibility | 0 lost Player-facing text cannot be restored; the delete dialog warns (H6) | + nothing is lost |
| Security and correctness | + the profile delete refuses Active and Finished first (D5), so only Prepared links cascade | 0 |

- **Chosen:** A, because Consistency with spec.md:50 decides it - giving up the Player-facing text of Prepared links when their profile is deleted; ux.md 25.3 gains "It is also removed from any Prepared Scene it is part of." (H6).
- **Rejected:** B. The Developer must not add a "has links" refusal.
- All three link foreign keys (Scene, Human NPC, Mythos Creature) cascade. There are no multiple cascade paths, because Scene-to-Scenario stays Restrict (`ScenarioPreparationDbContext.cs:48`).

### D4: Link identity and routes
| Metric | A: a link id; `.../scenes/{sceneId}/non-player-entity-links[/{linkId}]` with POST, PUT, DELETE | B: replace the whole collection with `PUT .../scenes/{sceneId}/non-player-entity-links` |
| --- | --- | --- |
| Consistency | + one resource per page action (UX Option B); matches Scene and profile endpoints | - suits the rejected UX Option C |
| Modifiability | + a Reveal (PBI-SPL-002) can name a link by id | - a replaced collection gets new ids and breaks Reveal subjects |
| Testability | + one test per verb | 0 |
| Simplicity | + three small actions | - diffing and collection-level validation |
| Reversibility | + additive | 0 |
| Security and correctness | + with Q1 yes only a link id is unambiguous | - concurrent edits overwrite each other |

- **Chosen:** A, because Q1 and the Reveal subject decide it - giving up a batch call.
- **Rejected:** B, and addressing a link by entity id (ambiguous under Q1). The Developer must not reintroduce either.
- Routes: `POST api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}/non-player-entity-links` answers 201 with the link; `PUT .../{linkId}` answers 200 with the link; `DELETE .../{linkId}` answers 204. No GET for one link: the edit page reads it from GET Scene.

### D5: Delete refusal and 409 contracts
| Metric | A: a new outcome `LinkedToPlayedScene` on both delete enums, checked through a narrow port `INonPlayerEntityUsage` | B: inject `ISceneRepository` into the profile services |
| --- | --- | --- |
| Consistency | + the consumer-owned port style (ADR 0008, `ICampaignKeepers`) | 0 |
| Modifiability | + Items (PBI-SP-008) add their own usage check the same way | - the profile services depend on the whole Scene repository |
| Testability | + a one-method fake | 0 a large fake |
| Simplicity | 0 one interface and one EF class | + no new interface |
| Reversibility | + local | + local |
| Security and correctness | + order: Keeper check, find (404), usage check (409), remove | 0 the same |

- **Chosen:** A, because interface segregation and Testability decide it - giving up one small extra interface.
- **Rejected:** B. The Developer must not inject `ISceneRepository` into the profile services.
- Port: `Task<bool> IsLinkedToPlayedSceneAsync(Guid campaignId, NonPlayerEntityType type, Guid nonPlayerEntityId, CancellationToken cancellationToken)`; "played" means Active or Finished.
- 409 titles: every link write (POST, PUT, DELETE) on a Finished Scene answers 409 "A Finished Scene can't be changed.", the same title as `ScenesController.cs:149`, from one shared constant used by both controllers. A refused profile delete answers 409 "A Non-Player Entity linked to an Active or Finished Scene can't be deleted."

### D6: SignalR
| Metric | A: no live updates for links | B: a Keeper-group invalidation topic for Scene links |
| --- | --- | --- |
| Consistency | + spec.md:30: Keeper-only data has no other viewer; Player-facing content reaches Players only through Reveals, which bring their own topic (scene-play spec, `sceneReveals`) | - widens the closed `CampaignDataTopic` (ADR 0009) into Scenario Preparation for one viewer |
| Modifiability | + PBI-SPL-002 adds the real-time rule where Players are affected | 0 |
| Testability | + nothing to test | - hub tests for no user benefit |
| Simplicity | + none | - a publisher port in a functionality that has none (ADR 0012) |
| Reversibility | + additive later | 0 |
| Security and correctness | + nothing Player-facing leaves the server | 0 |

- **Chosen:** A, because Consistency and Simplicity decide it - giving up live refresh across the Keeper's own tabs. This is the documented exception to the CLAUDE.md SignalR rule that PBI-SP-001 to PBI-SP-010 used: no user-visible change reaches a second person.
- **Rejected:** B. The Developer must not add a hub topic.

### D7: Request and response shape, and validation
Single sane option: a nested reference mirroring the list item and the Reveal subject.
- POST request: `{nonPlayerEntity: {type: "HumanNpc" | "MythosCreature", id}, playerFacingName, playerFacingDescription: <Lexical JSON> | null}`. PUT request: `{playerFacingName, playerFacingDescription}`; the entity is fixed after linking.
- Link response: `{id, nonPlayerEntity: {id, type, name}, playerFacingName, playerFacingDescription}`; `name` is the live profile name (Keeper-only). `SceneResponse` gains `nonPlayerEntityLinks: [...]`, ordered by the link's CreatedAt, then Id.
- Validation: the Player-facing name is trimmed and 1-200 characters (the Scene title and profile name limit, `Scene.cs:10`); the description is optional, `null` means none (ADR 0015 amendment), and is checked with `RichTextDocument.Validate` when present.
- 400 keys and server-owned messages (ADR 0018):
  - `nonPlayerEntity`: "Choose a Non-Player Entity from this Campaign." for a missing or unknown type, a missing id, an entity that does not exist, or an entity of another Campaign. One message for all, so nothing leaks about other Campaigns. It is 400, not 404, because 404 means the Scene was not found (ADR 0013).
  - `playerFacingName`: "Enter a Player-facing name." / "Player-facing name must be 200 characters or fewer."
  - `playerFacingDescription`: "This Player-facing description can't be saved. Shorten it or remove unsupported content."
- Reveal readiness: a link exposes `Id`, `PlayerFacingName`, and `PlayerFacingDescription` (raw Lexical JSON) as public read-only members on `Scene.NonPlayerEntityLinks`. PBI-SPL-002 snapshots those values and names the link id as the Reveal subject. No cross-functionality port is added now; scene-play spec line 10 leaves it to the PBI-SPL-001 design.

### D8: How Verification item 3 ("retained in Scene results") is met under Q2 (i)
| Metric | A: reference only; the profile is read through its own endpoint (H3) | B: embed the profile or a summary in GET Scene |
| --- | --- | --- |
| Consistency | + the Scene response stays Scene-shaped; profiles keep one read path | - `SceneService` would pull in `INonPlayerEntityRuleData` and both profile views |
| Modifiability | + a profile change never ripples into the Scene contract | - two response shapes for one profile |
| Testability | + the integration test compares the profile before and after linking | 0 |
| Simplicity | + none | - large |
| Reversibility | + B can be added later as an extension | 0 |
| Security and correctness | + the profile never travels in a Scene payload that PBI-SPL-002 may later project for Players | - raises the risk of a Keeper-only leak into Player projections |

- **Chosen:** A, by the human (H3). Reading of the Verification item (H5): "retain" means that linking never copies, reshapes, or changes the profile. A Scene's link reference resolves to the unchanged Monster Profile: Combat attacks, Defenses armor points, Powers (special abilities, per the game-rules sections in Constraints), and Sanity loss (`MythosCreatureResponses.cs:35-40`). Proof: an integration test creates a Mythos Creature with all four, links it, sees GET Scene return a link with `type: "MythosCreature"` and its id, and sees GET Mythos Creature return all four unchanged; E2E follows the profile link from the Scene page and sees them.
- **Rejected:** B (H3). The Developer must not embed profile data in the Scene response.

### D9: Link operations service and controller
Single sane option: a new `NonPlayerEntityLinkService` in the Application project with `LinkAsync`, `EditAsync`, and `UnlinkAsync`, depending on `ICampaignKeepers`, `ISceneRepository`, `INonPlayerEntityDirectory`, and `TimeProvider`, so `SceneService` stays focused; and a new `NonPlayerEntityLinksController`, so the `ScenesController.Failure` switch (`ScenesController.cs:141-151`) does not grow (CA1502). `SceneService` gains `INonPlayerEntityDirectory` only to resolve entity names for the `GetAsync` and `EditAsync` responses (`ToDetail`, `SceneService.cs:157-158`).

### D10: spec.md edits (H7)
1. Architecture, Scene API: GET Scene also returns the Non-Player Entity links `{id, nonPlayerEntity: {id, type, name}, playerFacingName, playerFacingDescription}` in the order linked; new bullet for POST, PUT, and DELETE of `non-player-entity-links`, 409 when Finished, 400 for an entity not in the Campaign.
2. Architecture, UX specification: "and linking Non-Player Entities on the Scene page in sections 31 to 39".
3. Constraints, after the Player-facing link constraint: a Non-Player Entity may be linked to a Scene more than once; each link has its own id, a required Player-facing name (1-200 characters), and an optional Player-facing description; a Reveal of a Non-Player Entity names the link; deleting a Non-Player Entity linked only to Prepared Scenes removes those links, and removing a Prepared Scene removes its links.
4. Gherkin: SP-UX tags on "Keeper links a Mythos Creature to a Scene", "Material a played Scene refers to cannot be deleted", and "Campaign boundaries isolate Scenario material"; new scenarios "Keeper edits and unlinks a Non-Player Entity link", "A Non-Player Entity can be linked to a Scene twice", and "Deleting a profile linked only to Prepared Scenes removes its links".

### Single-option decisions
- Cardinality: no uniqueness rule on (Scene, entity) (H2). Each link has a `Guid` id with `ValueGeneratedNever`, like every table (`ScenarioPreparationDbContext.cs:24,46,69,94`).
- EF mapping: `NonPlayerEntityLink` is a regular entity (not an owned type) mapped with `HasMany` from Scene through a backing field `_nonPlayerEntityLinks`, because it is the dependent of two other entity tables, which is simpler to express as a regular entity.
- `EfSceneRepository.FindByIdAsync` always includes the links; the list reads (`EfSceneRepository.cs:16-20`) do not.
- Link validation and name resolution reuse `INonPlayerEntityDirectory.ListForCampaignAsync` (`INonPlayerEntityDirectory.cs:13`), because a Campaign's list is small and reads no profiles; no new directory method.
- Duplicate: no change. `Duplicate` builds a new aggregate from Campaign, name, and profile only, and links live on the Scene; new tests prove Verification item 5.
- `ScenesController.ParseNotes` (`:167-176`) moves to a shared `RichTextJson.Parse(string?)` in the Controllers project, used by both controllers (DRY).
- Migration `AddNonPlayerEntityLinks` (required by `ScenarioPreparationMigrationTests`).
- Frontend routes: the Scene route becomes the parent `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.index.tsx` (as the Scenario route did, ux.md section 17); new leaves `...scenes.$sceneId.non-player-entity-links.new.tsx` and `...scenes.$sceneId.non-player-entity-links.$linkId.tsx`.
- Frontend errors: the link API maps 409 to the existing `SceneFinishedError` (for link writes it only means Finished), and 400 through the existing `validationProblem.ts` reader (ADR 0018). The profile APIs map a delete 409 to a new `NonPlayerEntityInUseError`; the profile pages pass `refused` to the dialog.
- `RichTextView` gains an optional `headingOffset?: 0 | 1` (default 0), applied only in the read-only view through a Lexical node replacement; stored JSON and the editor are unchanged (ADR 0015 amendment: h3 and h4). The link section passes 1, so description headings render as h4 and h5 under the link's h3. If Lexical makes this infeasible, the Developer escalates.

## Patterns
- **Used:** Facade (a narrow consumer-owned port) at `INonPlayerEntityUsage` (Application) with `EfNonPlayerEntityUsage` (Infrastructure) - force: the profile services need one cross-aggregate question at the boundary, not the Scene repository; the codebase resolves the same force with `ICampaignKeepers`.
- **Used:** a table lookup instead of conditionals at a frontend `NON_PLAYER_ENTITY_PROFILE_PATHS` keyed by type, beside `NON_PLAYER_ENTITY_TYPE_LABELS` in `types/NonPlayerEntity.ts` - force: a type switch for the profile link. Two entries make a map, not a Strategy.
- **Rejected:** State for Scene status - the guards are one-line checks (`Scene.cs:65,84,97`); a State hierarchy is speculative until PBI-SPL-001 adds transitions.
- **Rejected:** Strategy per entity type - the two types differ only in which foreign-key column is set and which profile route is linked.
- **Rejected:** Observer (domain events to cascade links on delete) - the database cascade (D2) is atomic and simpler; ADR 0011 events are for after-commit side effects.
- **Rejected:** Chain of Responsibility for delete checks - there is a single refusal reason.
- **Rejected:** Command (no undo or queue), Composite (no part-whole structure), Builder (a link has four fields).

## Invariants
- Every link write loads the Scene through `FindByIdAsync(campaignId, scenarioId, sceneId)` after the Keeper check and goes through a Scene method that refuses a Finished Scene before checking the fields.
- A linked entity always belongs to the Scene's Campaign; exactly one of `HumanNpcId` and `MythosCreatureId` is set (database check).
- A profile linked to an Active or Finished Scene is never deleted. Links to Prepared Scenes disappear with their profile, and links disappear with their removed Prepared Scene, both by database cascade.
- Duplicating a profile never creates links.
- Scene and link responses never carry profile data beyond the profile `name`.
- The Player-facing name and description are the only Player-facing parts of a link; nothing Scenario-related reaches Players in this PBI.
- Cyclomatic complexity 10 or below, with no new suppressions.
- Accepted limitation: a Scene started between the delete's usage check and the delete could lose a link. Starting a Scene does not exist until PBI-SPL-001, which must re-check this; escalate if it becomes reachable sooner.

## Implementation plan
1. Domain: `NonPlayerEntityLink.cs` (new: Id, SceneId, private `HumanNpcId?` and `MythosCreatureId?`, computed `Type` and `NonPlayerEntityId`, PlayerFacingName, PlayerFacingDescription, CreatedAt, `PlayerFacingNameMaxLength = 200`); `NonPlayerEntityLinkOutcome.cs` (Accepted, SceneFinished, LinkNotFound, InvalidPlayerFacingName, InvalidPlayerFacingDescription); `Scene.cs`: the backing collection, `NonPlayerEntityLinks`, `LinkNonPlayerEntity(type, id, name, description, now)` returning a result record (outcome plus link), `EditNonPlayerEntityLink(linkId, name, description)`, `UnlinkNonPlayerEntity(linkId)`; Finished first - the aggregate owns the rule (D1).
2. Persistence: `ScenarioPreparationDbContext` link mapping with the three cascading foreign keys, the check constraint `CK_NonPlayerEntityLinks_OneNonPlayerEntity` written as `(HumanNpcId IS NOT NULL AND MythosCreatureId IS NULL) OR (HumanNpcId IS NULL AND MythosCreatureId IS NOT NULL)` (portable to SQLite and SQL Server), the CreatedAt UTC conversion, and the Scene `HasMany` through the backing field; `EfSceneRepository.FindByIdAsync` includes the links; migration `AddNonPlayerEntityLinks` - D2, D3.
3. Application: `INonPlayerEntityUsage` (new) and `EfNonPlayerEntityUsage` (Infrastructure) registered in DI; both delete services check usage after the find, with the new enum value `LinkedToPlayedScene`; `NonPlayerEntityLinkService` (new) with its results file and `NonPlayerEntityLinkView`; `SceneDetailView` gains links; `SceneService` resolves names through the directory - D5, D9.
4. Controllers: `NonPlayerEntityLinksController`, `NonPlayerEntityLinkRequests.cs`, `NonPlayerEntityLinkResponses.cs`, `NonPlayerEntityLinkProblemMessages.cs`; the shared `RichTextJson` helper and the shared Finished title constant; `SceneResponse` gains links; both profile controllers map `LinkedToPlayedScene` to 409; register the new service - D4, D5, D7.
5. Backend tests: see TDD units (domain, service, persistence, integration, and the migration test).
6. Frontend data: `types/Scene.ts` and the strict `sceneSchema` gain links; `services/nonPlayerEntityLinkApi.ts` and `hooks/useNonPlayerEntityLinks.ts` (mutations invalidate the `sceneQueryKeys` detail); `humanNpcApi` and `mythosCreatureApi` delete map 409 to `NonPlayerEntityInUseError`; the profile path map in `types/NonPlayerEntity.ts`.
7. `RichTextView` `headingOffset`.
8. Components with stories and tests per ux.md section 36: `scene-link-section`, `unlink-non-player-entity-dialog`, `non-player-entity-picker`, `scene-link-form`, `link-non-player-entity-page`, `edit-non-player-entity-link-page`, `non-player-entity-link-not-found`; `scene-page` mounts the section in view mode only; both profile pages pass `refused`; the delete dialog description gains its second sentence.
9. Routes: rename the Scene route to `.index.tsx` and add the two leaves.
10. E2E: new `e2e/tests/scene-links.spec.ts` (see E2E coverage); update the "linked to no Scene" notes in `non-player-entities.spec.ts` and `mythos-creatures.spec.ts`.
11. Close the PBI: tick the Verification items (item 3 under the H5 reading). Follow-ups: the CONTEXT.md glossary entry "Non-Player Entity link"; PBI-SPL-001 re-checks the delete-versus-start race; PBI-SPL-002 must not let a Reveal block unlinking or a cascade (the snapshot keeps the content); showing on a profile page which Scenes link it; reordering links.

## Reuse
- Using: `RichTextDocument.Validate` for the description; `INonPlayerEntityDirectory.ListForCampaignAsync` for validation and names; `ICampaignKeepers`; the `SceneApiTests.PlayAsync` seeding for Active and Finished; `nonPlayerEntityFilter.ts` and the list page's search and type `RadioGroup` for the picker; `rich-text-editor`, `rich-text-view`, `useUnsavedChangesPrompt`, `validationProblem.ts`, `SceneFinishedError`, `scene-not-found`; `delete-non-player-entity-dialog` with `refused`; `AlertDialog` as in `remove-scene-dialog`; `NON_PLAYER_ENTITY_TYPE_LABELS` and `useNonPlayerEntities`.
- Not using: `form-error-summary` - three fields use inline errors and focus the first invalid field, like `scene-form`. A SignalR publisher - D6. `HumanNpcService.ToView` and `MythosCreatureService.ToView` - D8. Moving the campaign-play hooks to `src/shared/` (PBI-SP-003/009 follow-up) - not needed.

## TDD units
- Scene: linking on a Prepared or Active Scene adds a link with a new id, the trimmed name, and CreatedAt; link, edit, and unlink on a Finished Scene return SceneFinished, checked before the fields; an empty, whitespace, or over-200-character name returns InvalidPlayerFacingName; a malformed or oversize description returns InvalidPlayerFacingDescription; a `null` description is accepted; the same entity can be linked twice; editing or unlinking an unknown link returns LinkNotFound; a refused change leaves the links unchanged.
- NonPlayerEntityLink: exactly one foreign key is set for each type; `Type` and `NonPlayerEntityId` are computed from it.
- Link service: a non-Keeper gets NotFound with no repository read; an entity of another Campaign, an unknown entity, or the wrong type returns NonPlayerEntityNotInCampaign; Finished is mapped; Saved returns a view with the profile name.
- Delete services: a link to an Active or Finished Scene returns LinkedToPlayedScene and removes nothing; Prepared-only links return Deleted; NotFound comes before the usage check.
- Persistence: removing a Prepared Scene deletes its links; deleting a Human NPC or Mythos Creature deletes its links; the check constraint rejects zero or two foreign keys; a link added to a tracked Scene is inserted; the usage query ignores Prepared Scenes and other Campaigns.
- API: status codes, 400 keys and messages (D7), 409 titles (D5), GET Scene link order and shape, Verification item 3 (D8), and Verification item 5 (a duplicate of a linked profile is in no link).
- Frontend: schema parse of links; API error mapping (400 by path, 404, 409 to `SceneFinishedError`, delete 409 to `NonPlayerEntityInUseError`); picker filtering, the count announcement, "Already in this Scene", the "Selected:" line, and "Clear filters"; form validation messages and focus on the first invalid field; every SP-UX-50 to SP-UX-63 and SP-A11Y-30 to SP-A11Y-36 behavior at component level, including the Active (all actions) and Finished (no actions) section states and the refused delete dialog on the profile pages; `RichTextView` with `headingOffset` renders h4 and h5.

## E2E coverage
- New `e2e/tests/scene-links.spec.ts`, with a header tracing to the spec Scenarios and ux.md SP-UX ids, and `test.step('SP-UX-nn: ...')`:
  - "Keeper links a Mythos Creature to a Scene" -> link "Ghoul" as "A shape in the cellar" with a formatted description; the Scene page shows it after a reload; following the profile link shows its attacks, armor, Powers, and Sanity loss (SP-UX-50, 51, 52, 63).
  - "Keeper edits and unlinks a Non-Player Entity link" -> edit, cancel, save; unlink with cancel and confirm (SP-UX-55, 56).
  - "A Non-Player Entity can be linked to a Scene twice" (SP-UX-54).
  - Validation: no entity, empty name, name over 200 characters (SP-UX-53).
  - "Campaign boundaries isolate Scenario material" -> an entity of the Keeper's other Campaign is not offered (SP-UX-51).
  - "Deleting a profile linked only to Prepared Scenes removes its links" (SP-UX-58, Prepared part).
  - "Keeper duplicates a profile" -> a copy of a linked profile is absent from the Scene page (SP-UX-59).
  - A Player opening the link URLs sees not found (SP-UX-60); empty Campaign picker (SP-UX-62).
- Exception: Active and Finished Scenes cannot be seeded in E2E until PBI-SPL-001 (ux.md section 20). "Material a played Scene refers to cannot be deleted", the link part of "A Finished Scene is read-only", SP-UX-57, and the refused-dialog part of SP-UX-58 are covered by integration tests (`PlayAsync`) and component tests, and the exception is noted in the spec file header.
- Checked against existing criteria: SP-UX-37 keeps "This can't be undone." as the first sentence (the Developer updates any exact-text assertion in `non-player-entities.spec.ts`); SP-UX-22 holds (no actions when Finished); SP-UX-38 is unchanged; SP-UX-20 holds (the section is hidden in Scene Edit mode).

## ADR
- ADR 0019 to write: Scene links are child entities of the Scene aggregate with in-context foreign keys (`docs/adr/0019-scene-links-are-child-entities-with-in-context-foreign-keys.md`).

## Phases
- Phase 1: domain, persistence, migration, and their tests; checkpoint: `feat(backend): link Non-Player Entities to Scenes in the domain (PBI-SP-004)`.
- Phase 2: service, controllers, delete refusal, and integration tests; checkpoint: `feat(backend): add the Scene link API and refuse deleting played material (PBI-SP-004)`.
- Phase 3: frontend data layer, components, routes, stories, and tests; checkpoint: `feat(frontend): link Non-Player Entities on the Scene page (PBI-SP-004)`.
- Phase 4: E2E and closing the PBI; checkpoints: `test(e2e): cover Scene links (PBI-SP-004)` and `docs(backlog): close PBI-SP-004 with its follow-ups`.

## Human decisions
- H1 (2026-10-21): UX Option B, dedicated link pages.
- H2: Q1 yes - the same Non-Player Entity can be linked to one Scene more than once; links have their own id and no uniqueness rule.
- H3: Q2 (i) - the Scene page shows only a link to the profile page; the Scene response carries a reference with no embedded profile summary.
- H4: Q3 - the Player-facing name is not prefilled; it starts empty.
- H5 to H9 (2026-10-21, "approve"): the D8 reading of Verification item 3 (H5); the delete dialog warning sentence (H6); the spec.md edits in D10 (H7); D2 option A (H8); ADR 0019 (H9).

## Revisions

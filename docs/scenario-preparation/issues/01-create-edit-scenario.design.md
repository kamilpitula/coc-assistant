# Design: PBI-SP-001: A Keeper creates, edits, and reorders the ordered Scenarios of a Campaign they own

## Triggers
- 2 (data model): new `Scenario` aggregate, table, and migration.
- 3 (cross-layer pattern): a new functionality reads Campaign ownership through a consumer-owned port (the first consumer of Campaign Play data); the first stored order for preparation records.
- 4 (ADR): placement of the functionality and the order storage, both likely to be copied by PBI-SP-002 to PBI-SP-005.
- 5 (more than one bounded context): Scenario Preparation, Campaign Play (ownership; Overview UI), Identity (caller resolution).
- 6 (open questions): placement, create semantics, fields, non-Keeper response, live updates, nav entry, order.
- 7 (UX): new screens and journey.

## Constraints
- ADR-0008: cross-functionality reads go through a consumer-owned port; the adapter is in the consumer's Infrastructure; the provider exposes an application operation.
- ADR-0005 / ADR-0003: a separate aggregate references its Campaign by id; the database enforces per-Campaign invariants where one exists.
- ADR-0009: live updates are invalidation topics owned by Campaign Play. ADR-0011 applies only if events are raised (none in this PBI).
- `backend/CLAUDE.md`: `CocAssistant.<Functionality>.{Domain,Application,Infrastructure,Controllers}`; boundaries independent through ports; composition only in `CocAssistant.Api`; Given_When_Then tests.
- `frontend/CLAUDE.md`: slice `src/scenario-preparation/`; one kebab-case folder per component with test and story; strict zod at the API boundary; a query-key factory per slice.
- `specs/scenario-preparation/spec.md` Architecture, Dependencies: depends on Campaign Play for ownership and Keeper authorization, and Campaign Play depends on it.
- `specs/campaign-play/spec.md:17,22`: anything outside the caller's visibility is 404.
- `specs/campaign-overview/ux.md` section 2 (at most three tab labels, l.44; sub-pages belong to Overview, l.42), section 4.1, CO-UX-4, CO-UX-5, CO-UX-11, CO-A11Y-1, -7, -8, -9.
- CONTEXT.md: Scenario, Campaign, Keeper, Campaign Member. Never "adventure" or "module" in identifiers or copy.
- Game rules: none apply. Nothing here restates a rule.
- Cyclomatic complexity at most 10; no new baseline in `frontend/eslint.config.js` or `GlobalSuppressions.cs`.
- Existing behavior relied on (verified):
  - Keeper-only 404: `CampaignService.GetForKeeperAsync` (`CampaignService.cs:48-52`), `WallEntryService.RemoveAsync` (`WallEntryService.cs:84-88`).
  - Outcome switch to 201/404/ValidationProblem: `WallEntriesController.cs:65-71`. Domain factory returning an outcome: `WallEntry.Author` (`WallEntry.cs:35-61`). 409 Problem shape: `InvestigatorControllerBase.cs:15-22`.
  - Separate-aggregate FK and UTC datetime2 conversion: `CampaignPlayDbContext.cs:104-111,124-128`; server-side concurrency token only: `CampaignPlayDbContext.cs:93`.
  - Caller resolution: `CallerAccountResolver.cs:7-27`, built in `CampaignPlayControllerBase.cs:10-13`, registered at `CampaignLiveUpdatesExtensions.cs:8`.
  - Migrations and connection strings in tests and E2E: `IdentityApiFactory.cs:15,34-42`; `e2e/globalSetup.ts:58-74`; `e2e/playwright.config.ts:83`.
  - Respawn ignore lists: `CampaignPlayApiRequests.cs:132-136`, `AccountApiTests.cs:22`, `CampaignApiTests.cs:22`.
  - Non-Settings, non-Wall routes already count as Overview: `routes/campaigns.$campaignId.tsx:32-38`.
  - Cross-slice imports exist: `campaign-list/services/campaignListApi.ts` imports `campaign-play/services/authHeaders`.
  - The default `QueryClient` (`main.tsx:12`) refetches on window focus.
  - Overview E2E assertions affected by the new attention item: `e2e/tests/campaign-overview.spec.ts:148,201`; unit test `attentionItems.test.ts:39`.

## UX
- Selected option: B (Overview "Scenarios" section plus a dedicated Scenario page) - `specs/scenario-preparation/ux.md` (new, linked from `spec.md`); `specs/campaign-overview/ux.md` (updated: sections 1, 2, 3, 4.1, 9, 10, 11).
- Reorder control: Move up / Move down buttons, saved per move (D9).
- Rejected: A (header tab: breaks the three-label limit, `campaign-overview/ux.md:44`, CO-A11Y-9) and C (Settings section: configuration, not preparation; Scenes would force a move). The Developer must not reintroduce them.

## Decisions

### D1: Where Scenario Preparation lives
| Metric | Option A: new ScenarioPreparation functionality (own projects and DbContext) | Option B: inside Campaign Play |
| --- | --- | --- |
| Consistency | + matches `backend/CLAUDE.md`, the spec's separate feature with a two-way dependency, and the ADR-0008 port shape | - mixes two CONTEXT.md sections (Campaign Structure, Scenario Preparation) in one functionality |
| Modifiability | + PBI-SP-002 to -005 (Scenes, NPEs, Blob Handouts, extraction) grow outside Campaign Play behind one port | - Campaign Play absorbs all preparation; its DbContext and DI keep growing |
| Testability | + unit tests use a fake ownership port, no Campaign Play database | + reuses `SqliteCampaignPlayDbContextFixture` |
| Simplicity | - 4 projects, a test project, a DbContext, a history table, test and E2E wiring | + one entity, one migration |
| Reversibility | 0 merging back moves rows across contexts (same database today) | - splitting later moves tables and history and rewrites FKs once Scenes and NPEs exist |
| Security and correctness | 0 no FK to `Campaigns`; orphans are possible only once Campaign deletion exists (none today) | + FK cascade |

- **Chosen:** A, because of consistency with the spec and backend conventions, modifiability for PBI-SP-002 to -005, and the cost of reversing B - giving up simplicity now and a database FK.
- **Rejected:** B - its simplicity holds only for this PBI. The Developer must not put Scenario types in Campaign Play.

### D2: How a Scenario's place in the Campaign's order is stored
| Metric | Option A: `Position` int, non-unique; read order (Position, CreatedAt, Id) | Option B: `Position` with unique index (CampaignId, Position) | Option C: no Position; order by CreatedAt |
| --- | --- | --- | --- |
| Consistency | 0 a total order with a tie-break like the Wall's (CreatedAt, Id) index (`CampaignPlayDbContext.cs:136`) | + database-enforced per-Campaign rule like ADR-0003/0005 | - order is not an explicit domain property |
| Modifiability | + reorder rewrites 1..n in one save, no constraint swaps | - SQL Server checks unique indexes per statement; swaps need a workaround | - reorder needs a migration and backfill |
| Testability | + tie-break unit-testable with equal positions | 0 needs a race test for the conflict path | + trivial |
| Simplicity | + no conflict handling | - a racing create needs exception translation | + least code |
| Reversibility | + a unique index can be added later | 0 | - Position later means a backfill |
| Security and correctness | + always deterministic; duplicates only from the same Keeper creating twice at once, still sorted deterministically | + no duplicates | 0 deterministic, not Keeper-controlled |

- **Chosen:** A, because of modifiability toward reordering and simplicity while keeping a deterministic order - giving up a database guarantee of distinct positions.
- **Rejected:** B and C. The Developer must not add a unique position index or drop Position.
- Rules: append at max(Position)+1 within the Campaign, starting at 1; every reorder renumbers to 1..n (D10); Position is never sent to clients, who use list order. Recorded in ADR-0014.

### D3: API shape
Single sane option, following `WallEntriesController` (`api/campaigns/{campaignId:guid}/...`, outcome switch, wrapper list response):
- `GET /api/campaigns/{campaignId}/scenarios` -> 200 `{ scenarios: [ScenarioResponse] }` in Campaign order.
- `POST /api/campaigns/{campaignId}/scenarios`, body `ScenarioRequest { [Required] title, keeperNotes? }` -> 201 `ScenarioResponse`.
- `GET /api/campaigns/{campaignId}/scenarios/{scenarioId:guid}` -> 200 `ScenarioResponse`.
- `PUT /api/campaigns/{campaignId}/scenarios/{scenarioId:guid}`, body `ScenarioRequest` -> 200 `ScenarioResponse`.
- `PUT /api/campaigns/{campaignId}/scenarios/order` (D10).
- `ScenarioResponse { id, title, keeperNotes }`; `keeperNotes` is `""` when empty. 400 is a `ValidationProblem` keyed `title` or `keeperNotes`; 404 per D5; 401 when the caller cannot be resolved.

### D4: Concurrent edits
| Metric | Option A: last write wins | Option B: client-sent version, 409 on mismatch |
| --- | --- | --- |
| Consistency | + no client-sent version exists today; Investigator `Version` guards server-side races only (`CampaignPlayDbContext.cs:93`) | - a new wire contract and conflict UI |
| Modifiability | + B can be added later as an optional field | 0 |
| Testability | + nothing extra | - conflict paths in API, UI, E2E |
| Simplicity | + none | - version field, 409 mapping, copy |
| Reversibility | + additive later | 0 |
| Security and correctness | 0 only the Keeper writes; risk is one Keeper in two tabs | + no lost update |

- **Chosen:** A, because one writer makes lost updates unlikely (simplicity, consistency) - giving up protection across two open tabs. The order request (D10) is also last-write-wins over the whole order; Edit never writes Position and Reorder writes only Position.
- **Rejected:** B. The Developer must not add a concurrency token or a 409 for Scenario edits.

### D5: What a non-Keeper gets
Single sane option: 404 with no detail for a missing Campaign, a Player, another Campaign's Keeper, an unknown Scenario id, or a Scenario id from another Campaign, decided by the ownership check before any Scenario read or write. Follows `specs/campaign-play/spec.md:17,22` and `CampaignService.cs:48-52`.

### D6: Live updates for Scenario changes
| Metric | Option A: none | Option B: a `scenarios` topic through the Campaign hub |
| --- | --- | --- |
| Consistency | 0 deliberate exception to CLAUDE.md "SignalR for user-visible real-time updates": the only viewer is the acting Keeper | - `CampaignDataTopic` is Campaign Play's closed set (ADR-0009); needs a cross-functionality publisher port |
| Modifiability | + add a topic when Players see Scenario data | - couples Scenario Preparation to the hub now |
| Testability | + no hub tests | - hub and topic tests |
| Simplicity | + none | - port, handler, events, topic, client mapping |
| Reversibility | + additive later | 0 |
| Security and correctness | + nothing Scenario-related reaches a Player connection | 0 needs a Keeper-only audience or it leaks |

- **Chosen:** A, because of security, simplicity, and reversibility; a second tab of the same Keeper refetches on focus (`main.tsx:12`), and a stale reorder is refused (D10) - giving up instant sync between one Keeper's tabs.
- **Rejected:** B. The Developer must not raise Scenario domain events or add a topic in this PBI.

### D7: How Scenario Preparation controllers resolve the caller's Account
| Metric | Option A: move `CallerAccountResolver` to `CocAssistant.Identity.Application` | Option B: reference Campaign Play Controllers | Option C: copy the resolution into a Scenario Preparation base |
| --- | --- | --- | --- |
| Consistency | + Identity owns the Entra-to-Account mapping (`EntraIdentity`, `AccountService` are there) | - Controllers-to-Controllers dependency between functionalities | - a second copy of "provision on first contact" |
| Modifiability | + one place to change claim mapping | - sees Campaign Play's whole HTTP surface | - two places drift |
| Testability | + existing resolver tests move with it | 0 | 0 |
| Simplicity | 0 namespace and reference changes in `CampaignHub`, `CampaignPlayControllerBase`, `CampaignLiveUpdatesExtensions` | + no move | + no move |
| Reversibility | + trivial | 0 | + trivial |
| Security and correctness | + one mapping for every functionality | 0 | - divergent mapping |

- **Chosen:** A, because of consistency and correctness - giving up a small refactor of Campaign Play files. Name and behavior unchanged; registration stays at `CampaignLiveUpdatesExtensions.cs:8`; the new `ScenarioPreparationControllerBase` (`[ApiController][Authorize]`) constructs it like `CampaignPlayControllerBase.cs:12`.
- **Rejected:** B and C. The Developer must not reference Campaign Play Controllers from Scenario Preparation or copy the resolver.

### D8: How the ownership port is provided
| Metric | Option A: adapter calls existing `CampaignService.GetForKeeperAsync` | Option B: new provider query `CampaignKeeperQuery` |
| --- | --- | --- |
| Consistency | 0 ADR-0008 asks for a provider application operation; an existing one fills that role | + mirrors `AccountDisplayNameQuery` |
| Modifiability | 0 `CampaignService` changes reach the adapter | + narrow published surface |
| Testability | + covered by existing `CampaignService` tests plus one adapter integration test | + one more unit test |
| Simplicity | + no new provider code | - duplicates `CampaignService.cs:48-52` |
| Reversibility | + extracting a query later is local | + |
| Security and correctness | + reuses the exact Keeper rule of the Campaign Play endpoints | + same rule, second copy |

- **Chosen:** A, because of simplicity and reuse of the authoritative Keeper check - giving up a dedicated published query. Port `ICampaignKeepers.IsKeeperAsync(Guid campaignId, Guid accountId, CancellationToken)` in Scenario Preparation Application; adapter `CampaignPlayCampaignKeepers` in Scenario Preparation Infrastructure.
- **Rejected:** B - revisit if PBI-SP-002 to -005 need more than an ownership check.

### D9: How the Keeper changes the order
| Metric | Option A: Move up / Move down, saved per move | Option B: drag and drop with keyboard alternative | Option C: "Change order" mode with position selects and Save |
| --- | --- | --- | --- |
| Consistency | + plain `Button`s, confirmed updates like the Wall composer, no new primitive | - needs a new drag-and-drop package (trigger 1) | 0 existing `select`, but a mode switch no other screen has |
| Modifiability | + Scenes (PBI-SP-002) can reuse the same row controls | 0 | 0 |
| Testability | + `getByRole('button', { name: 'Move X up' })` in unit and E2E | - drag gestures are flaky in Playwright, keyboard path still needed | + selects are easy to drive |
| Simplicity | + one pure helper, one mutation | - library, sensors, keyboard announcer | - mode state, per-row selects, duplicate-position validation |
| Reversibility | + drag can be added later | - removing the library touches every list | 0 |
| Security and correctness | + each request is a full checked order (D10) | 0 same API | 0 same API |

- **Chosen:** A, because of consistency (no dependency), testability, and simplicity, meeting WCAG 2.5.7 without dragging - giving up efficiency for long jumps (sixth to first takes 5 activations), acceptable for a few linked Scenarios.
- **Rejected:** B and C. The Developer must not add a drag-and-drop dependency or an order-editing mode.

### D10: Reorder API
| Metric | Option A: `PUT .../scenarios/order` with the full ordered id list | Option B: `POST .../scenarios/{id}/move` with `{direction}` | Option C: `PUT .../scenarios/{id}/position` with `{position}` |
| --- | --- | --- | --- |
| Consistency | + resource replacement like `PUT .../allowed-creation-methods` (`specs/campaign-play/spec.md:23`) | - verb-shaped, tied to one UI control | 0 resource-shaped, one item at a time |
| Modifiability | + every future control and PBI-SP-002 Scenes use the same shape (ADR-0014) | - drag or select needs another endpoint | 0 server shifts every other position |
| Testability | + one permutation rule, idempotent | + simple | 0 range and shift edge cases |
| Simplicity | 0 permutation check and a stale-order 409 path | + no set check | 0 shift logic |
| Reversibility | + | 0 | 0 |
| Security and correctness | + refuses any order that would drop, duplicate, or add a Scenario; result is always 1..n | 0 composes, but the client cannot state the order it saw | 0 same ambiguity |

- **Chosen:** A, because of modifiability and correctness (all or nothing, renumbered 1..n) - giving up a stale-order 409 path the client must handle.
- **Rejected:** B and C. The Developer must not add per-Scenario move or position endpoints.
- Contract: `PUT /api/campaigns/{campaignId:guid}/scenarios/order`, body `ScenarioOrderRequest { [Required] scenarioIds: Guid[] }` (the literal `order` segment does not collide with `{scenarioId:guid}`).
  - 200 `ScenarioListResponse` in the new order; the client replaces its list cache with it.
  - 404: the D5 cases, decided before anything is read.
  - 400 (`ValidationProblem` keyed `scenarioIds`): missing body or duplicate ids.
  - 409 (`Problem`, shape of `InvestigatorControllerBase.cs:15-22`): a duplicate-free list that is not exactly the Campaign's current set of Scenario ids (missing, extra, or another Campaign's id). The response does not say which ids differ.
  - An empty list for a Campaign with no Scenarios is a no-op 200.

### Single-option decisions
- Create semantics: explicit create, no uniqueness rule (human, gate 1).
- Fields: `Title` trimmed 1-200; `KeeperNotes` trimmed 0-10,000, stored non-null (`""` when empty). Validation in the domain returning an outcome like `WallEntry.Author`; limits as constants `TitleMaxLength`, `KeeperNotesMaxLength`.
- Domain shape: `Scenario { Id, CampaignId, Title, KeeperNotes, Position, CreatedAt }`, private constructor, static `Scenario.Create(campaignId, title, keeperNotes, position, now)` and `Edit(title, keeperNotes)` returning outcomes, internal `MoveTo(int position)`. No `AggregateRoot` (it lives in Campaign Play Domain) and no events (D6).
- `ScenarioOrder.Apply(IReadOnlyList<Scenario> current, IReadOnlyList<Guid> requested)`: a static domain operation returning `Reordered`, `DuplicateIds`, or `DoesNotMatchScenarios`; only on `Reordered` it calls `MoveTo(index + 1)` for every Scenario.
- `ScenarioService.ReorderAsync`: ownership check, then load all the Campaign's Scenarios tracked, `ScenarioOrder.Apply`, one save, return the list in the new order; the controller maps to 200/400/409/404. Create still appends at max+1.
- Persistence: `ScenarioPreparationDbContext`, connection string `ScenarioPreparationDb`, history `__ScenarioPreparationMigrationsHistory`, migration `<yyyyMMddHHmmss>_CreateScenario`; table `Scenarios`; non-unique index `(CampaignId, Position)`; `CreatedAt` as UTC datetime2 as in `CampaignPlayDbContext.cs:124-128`.
- Ordering in reads: one repository method orders by Position, CreatedAt, Id; nothing else sorts Scenarios.
- Frontend data: `scenarioQueryKeys` nested under `['campaigns', campaignId, 'scenarios']`; fetch with `campaign-play/services/authHeaders`; zod form and response schemas share the limits.
- Frontend move helper: pure `moveScenario(ids, index, direction)` in `services/scenarioOrder.ts`; `useReorderScenarios` in `hooks/useScenarios.ts` sets the list cache on success and invalidates it on 409. Focus and announcement logic in `scenario-list-section` within complexity 10; extract `focusTargetAfterMove` if needed (like `focusTargetAfterRemoval`).

## Patterns
- **Used:** Adapter at `CampaignPlayCampaignKeepers` (Scenario Preparation Infrastructure) - force: Campaign Play's `CampaignService` interface does not match the ownership port (existing ADR-0008 pattern).
- **Used:** Factory Method at `Scenario.Create` returning an outcome - force: construction with validation variants (existing `WallEntry.Author` pattern).
- **Rejected:** State (no lifecycle in this PBI; the reorder "saving" phase is one mutation boolean).
- **Rejected:** Strategy for validation (one rule set).
- **Rejected:** Observer / domain events (no consumer, D6).
- **Rejected:** Command for edits or moves (no undo or history; each move is one confirmed request).
- **Rejected:** Chain of Responsibility for authorization (one check).
- **Rejected:** a generic repository or base aggregate shared with Campaign Play (speculative; couples Domains).
- **Rejected:** Decorator for authorization (the service-level check is the existing convention).

## Invariants
- Every Scenario read and write is scoped by the route's `campaignId`; a Scenario id from another Campaign is NotFound.
- `ICampaignKeepers.IsKeeperAsync` runs before any repository call; every non-Keeper case gives the same 404 with no write and no Scenario lookup.
- No Scenario data in any Player-visible response, hub message, or Player client query; `useScenarios` is enabled only for `role === 'Keeper'`.
- Scenario Preparation Domain and Application reference nothing outside Scenario Preparation; only its Infrastructure references `CocAssistant.CampaignPlay.Application`; its Controllers reference `CocAssistant.Identity.Application` and its Application only.
- No EF mapping or FK across DbContexts; no `Campaign` entity in `ScenarioPreparationDbContext`.
- Read order is (Position, CreatedAt, Id); append is max+1; Position is not on the wire.
- A reorder either changes no row or leaves the Campaign's Scenarios at exactly positions 1..n; no Scenario is ever added, dropped, or duplicated by it. A 409 never reveals which ids differ.
- Move buttons use `aria-disabled` while saving, never `disabled`; no new order is shown before the server confirms it.
- Every Respawn ignore list includes `__ScenarioPreparationMigrationsHistory`.
- Cyclomatic complexity at most 10; no new suppressions or baselines. `KeeperAttention` in `attention-list.tsx` stays at most 10 after the second query (extract a hook if needed).
- All docs and code are ASCII ("..." not the ellipsis character).

## Implementation plan
1. Move `CallerAccountResolver` to `backend/src/Identity/CocAssistant.Identity.Application/` (namespace `CocAssistant.Identity.Application`); update `CampaignHub.cs`, `CampaignPlayControllerBase.cs`, `CampaignLiveUpdatesExtensions.cs` and global usings; move any resolver tests. Behavior unchanged (D7).
2. `backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Domain/`: `Scenario`, its outcome types, `ScenarioOrder`, `ScenarioOrderOutcome`, `GlobalUsings.cs` (D2, D10).
3. Application: `ICampaignKeepers`; `IScenarioRepository` (`ListForCampaignAsync`, a tracked list for reorder, `FindByIdAsync(campaignId, scenarioId)`, `MaxPositionAsync`, `Add`, `SaveChangesAsync`); `ScenarioService` (`ListAsync`, `GetAsync`, `CreateAsync`, `EditAsync`, `ReorderAsync`); `ScenarioView` and result types (D3, D5, D10).
4. Infrastructure: `ScenarioPreparationDbContext`, `EfScenarioRepository`, `CampaignPlayCampaignKeepers`, `AddScenarioPreparationInfrastructure(IServiceCollection, IConfiguration)`, migration via `dotnet ef migrations add CreateScenario` (D1, D8).
5. Controllers: `ScenarioPreparationControllerBase`, `ScenariosController`, `ScenarioRequest`, `ScenarioOrderRequest`, `ScenarioResponse`, `ScenarioListResponse`; outcome switches within complexity 10 (D3, D10).
6. Composition: `Program.cs` (`AddApplicationPart(typeof(ScenariosController).Assembly)`, `AddScenarioPreparationInfrastructure`); `CocAssistant.Api.csproj` references; `backend/CocAssistant.slnx` (4 projects plus the test project); `appsettings.json` (`"ScenarioPreparationDb": ""`) and `appsettings.Development.json` (same LocalDB database as the others).
7. Tests: new `backend/tests/ScenarioPreparation/CocAssistant.ScenarioPreparation.Tests/` (SQLite fixture, fake `ICampaignKeepers`, builder `ScenarioPreparationTestBuilder`); `IdentityApiFactory` connection string and migration of the new context; the new history table in the Respawn ignore lists of `CampaignPlayApiRequests.cs`, `AccountApiTests.cs`, `CampaignApiTests.cs`; new `ScenarioApiTests.cs`, `CampaignKeepersAdapterTests.cs`, `ScenarioPreparationMigrationTests.cs` (no pending model changes).
8. E2E wiring: `e2e/globalSetup.ts` third `dotnet ef database update --context ScenarioPreparationDbContext` and `ConnectionStrings__ScenarioPreparationDb`; the same variable in the API web server env in `e2e/playwright.config.ts`.
9. Frontend slice `frontend/src/scenario-preparation/`: `types/Scenario.ts`; `services/scenarioApi.ts` (`scenarioQueryKeys`, zod schemas, `reorderScenarios`); `services/scenarioForm.ts`; `services/scenarioOrder.ts`; `hooks/useScenarios.ts` (list, detail, create, edit, reorder; Keeper-gated); components of ux.md section 7, each with test and story.
10. Routes: `routes/campaigns.$campaignId.scenarios.new.tsx`, `routes/campaigns.$campaignId.scenarios.$scenarioId.tsx`. No header or `sectionOf` change (`campaigns.$campaignId.tsx:32-38`).
11. Overview: `campaign-page.tsx` renders `ScenarioListSection` for the Keeper after `CampaignTable` (update `campaign-page.test.tsx`); `attentionItems.ts` adds `{ kind: 'createScenario' }` with `keeperAttentionItems(members, scenarioCount)` appending it last when the count is 0; `attention-list.tsx` covers loading and errors for both queries; update `attentionItems.test.ts:39` and the attention-list tests. `scenario-list-section` includes the move controls, live region, and alert.
12. E2E: new `e2e/tests/scenario-preparation.spec.ts` and `e2e/fixtures/scenarios.ts`; amend `e2e/tests/campaign-overview.spec.ts:148,201` (see E2E coverage).

## Reuse
- Using: `WallEntry` / `WallEntryService` / `WallEntriesController` for the outcome and 404 shape; `CampaignService.GetForKeeperAsync` for ownership; `CallerAccountResolver` (moved); the `IdentityAccountDisplayNames` adapter shape; `InvestigatorControllerBase` 409 Problem shape; Respawn `ResetDatabaseAsync`, `TestAuthHandler`, the `CampaignPlayApiRequests.BuildRequest` style, `FakeTimeProvider`.
- Using: `create-campaign-form` validation (`toFieldErrors`), `useUnsavedChangesPrompt`, `authHeaders`, the attention-item rendering and action class, the `investigator-not-found` layout, `navigationState.statusMessage`, the `focusTargetAfterRemoval` approach.
- Using (E2E): `newAccount`, `signIn`, `createCampaignViaUi`, `issueInviteViaUi`, `joinAsNewPlayer`, `openAndCaptureBearer`, `API_ORIGIN`, `attentionList`, `campaignNav`.
- Not using: `CampaignDataTopic` and the hub (D6); `AggregateRoot` and `DomainEventDispatchInterceptor` (no events, Campaign Play-owned); the `CampaignPlayScenario` test builder (Campaign Play-specific, and a third meaning of "Scenario"); a form library (none exists); a drag-and-drop library (D9).

## TDD units
- Domain: `Scenario.Create` trims title and notes; rejects empty or whitespace and 201-character titles, accepts 200; rejects 10,001-character notes, accepts 10,000; `Edit` applies the same rules and leaves the Scenario unchanged when refused.
- Domain: `ScenarioOrder.Apply` renumbers to 1..n in the requested order, including from duplicate starting positions; refuses duplicate ids, a missing id, and an extra or foreign id, leaving positions untouched; an empty list with no Scenarios is `Reordered`.
- Service: create appends at max+1 (1 for the first); list orders by Position, CreatedAt, Id, including equal positions; get, edit, or reorder of another Campaign's Scenario is NotFound; a non-Keeper (fake port false) is NotFound for list, get, create, edit, and reorder with no repository read or write; edit persists both fields; edit after a reorder keeps the position; create after a reorder appends at n+1; a reorder persists and the next list returns it.
- Integration (`ScenarioApiTests`): Keeper create 201, then list order, get, edit 200; reorder 200 with the new order, persisted; 400 for the three field cases keyed by field and for duplicate ids in a reorder; 409 for a reorder with a missing id, an extra id, and an id from the same Keeper's other Campaign; 404 for a Player, another Campaign's Keeper, a missing Campaign, and a Scenario id from another Campaign of the same Keeper on every endpoint; 401 without identity.
- `CampaignKeepersAdapterTests`: Keeper true; Player, non-member, and missing Campaign false. Migration test: no pending model changes for `ScenarioPreparationDbContext`.
- Frontend services: `scenarioApi` parses strictly, rejects unknown shapes, maps 404 to not-found, 400 to field errors, and 409 on reorder to a stale error; `scenarioForm` messages match ux.md section 6; `moveScenario` moves up and down, first-up and last-down are no-ops; `keeperAttentionItems` appends `createScenario` only when the count is 0, after `invitePlayers`.
- Components: SP-UX-1, -2, -3, -5, -6, -7, -9, -11, -12, -13, -14 (unit level; SP-UX-9 includes no fetch for a Player) and SP-A11Y-1 to -5, -8, -9 (roles, labels, `aria-invalid` / `aria-describedby`, status and alert regions, focus after Edit, Save, Cancel, and moves, `aria-disabled` while saving, the stale path refetching with its alert).

## E2E coverage
- New `e2e/tests/scenario-preparation.spec.ts`. The header traces to the spec Scenarios "Keeper creates a Scenario", "New Scenarios follow the existing ones", "Keeper edits a Scenario", "Keeper reorders the Scenarios", and "Scenarios are the Keeper's alone", and to SP-UX-1 to SP-UX-14; step names are prefixed with IDs. SP-UX-13 (failure, stale) and SP-UX-14 are covered by component tests only, stated in the header: forcing a server failure or a second window in E2E adds flake without more contract coverage.
  - Test "Keeper creates two Scenarios in order, reorders them, and edits one": SP-UX-1/2 empty section and attention item; SP-UX-5 empty-title error and focus; SP-UX-3 create through the attention item, the page shows "Scenario created."; SP-UX-2 the item is gone; SP-UX-4 a second Scenario through the section, the list reads [first, second]; SP-UX-11/12 move "Edge of Darkness" up, the list reads ["Edge of Darkness", "The Haunting"] and the status region says "Edge of Darkness moved to position 1 of 2."; SP-UX-11 the order survives a reload; SP-UX-6 edit title and notes, "Scenario saved.", the reload persists; SP-UX-8 Overview `aria-current`.
  - Test "A Player and another Campaign's Keeper cannot see or change a Campaign's Scenarios": SP-UX-9 a Player's Overview has no section or item, the Scenario URL shows not-found; with the Player's bearer, list, get, create, edit, and `PUT .../scenarios/order` are 404; with another Keeper's bearer the same are 404 and the UI URL shows not-found; SP-UX-10 a Scenario id from the Keeper's other Campaign shows not-found.
- Amend `e2e/tests/campaign-overview.spec.ts:148` to expect two items, [the review sentence, "This Campaign has no Scenario yet."], and `:201` to assert `attentionList(page).getByText('No Players have joined yet.')` has count 0 instead of the whole list being absent.
- Checked against CO-UX-4, CO-UX-5 (both amended in `specs/campaign-overview/ux.md`), CO-UX-6 (Players unaffected, `:217`, `:242`), CO-UX-11, CO-A11Y-1, -8, -9. `campaign-live-updates.spec.ts:168,228` and `campaign-presence.spec.ts:284` use specific locators and stay valid.

## ADR
- ADR-0013: Scenario Preparation is its own functionality and checks Campaign ownership through a consumer-owned port (D1, D7, D8).
- ADR-0014: Order Campaign preparation records by a stored position with a deterministic tie-break (D2, D10).

## Phases
- Phase 1: backend, plan steps 1-8 with backend tests; checkpoint: `feat(scenario-preparation): Scenario aggregate, API and Keeper ownership port (PBI-SP-001)`.
- Phase 2: frontend, steps 9-11 with unit tests and stories; checkpoint: `feat(scenario-preparation): Keeper Scenario pages, order controls and Overview section (PBI-SP-001)`.
- Phase 3: E2E, step 12; checkpoint: `test(e2e): Scenario preparation journeys and overview attention update (PBI-SP-001)`.

## Human decisions
- 2026-10-16, gate 1 (relayed): "B, Q1: use recommendation Q2: explicit create 3. yes" - Option B; Title required, trimmed, 1-200; Keeper notes optional, up to 10,000; Keeper-only; explicit create; include the attention item.
- 2026-10-16, domain correction: "Campaign can have more then one scenario". Update spec and PBI with the design: "yes". Zero Scenarios: "campaign can have zero Scenarios but it's not ready to play, it can happen while players creates their characters etc.". Ordered: "Yes they're ordered linked adventures". A Non-Player Entity in Scenes of different Scenarios of one Campaign: "yes".
- 2026-10-16, gate 2: "1. part of SP-001, 2. confirm 3. approve, 4. approve, 5, both".
  - 1: reordering is part of PBI-SP-001. The recommended append-only scope with reorder deferred is rejected by the human: reordering is in scope.
  - 2: "not ready to play" has no effect beyond the Keeper attention item; no gating, no Player indicator, no CONTEXT.md term.
  - 3: CONTEXT.md wording for Scenario and Campaign approved as proposed.
  - 4: CO-UX-4 and CO-UX-5 amendments and the two `campaign-overview.spec.ts` assertion changes approved.
  - 5: both ADR-0013 and ADR-0014.
- 2026-10-16, gate 2 revision (D9, D10, reorder UX, 409 stale-order behavior): "accept". The PBI title stays "Create and Edit a Campaign Scenario".

## Revisions

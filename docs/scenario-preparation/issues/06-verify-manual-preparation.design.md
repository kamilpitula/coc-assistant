# Design: PBI-SP-006: Verify manual Scenario Preparation end to end, without extraction

## Triggers
- 6, Explorer open questions with competing answers: Q1 to Q4 (D1 to D4).
- 4, ADR: the endpoint-list authorization matrix binds every future Scenario Preparation endpoint (D3, ADR 0023).
- 2, shared aggregate change (small): `Scene.LinkNonPlayerEntity` gains a "Non-Player Entity is in the Campaign" parameter (D4).
- Not 7 (UX): no new screen, journey, or component. The D4 refusal cannot be reached from the UI, because the picker offers only this Campaign's entities (ux.md SP-UX-51).

## Constraints
- `specs/scenario-preparation/spec.md`: Definition of Done "A Finished Scene and everything on it refuses every change with 409."; Architecture "Scene status" (the Scene aggregate owns the editing rules); Regression Guardrails on Players and other Keepers, Keeper-facing material, Player-visible APIs, and "Manual preparation remains valid without an LLM or uploaded source document".
- ADR 0013 and ADR 0016 (Keeper check first, 404); ADR 0018 (400 keys follow the request path); ADR 0021 (immutable Handout files); ADR 0022 (Items guarded by play usage).
- Existing pattern for D4 (PBI-SP-008 D4): `ItemLinkService.cs:6-7` (the service resolves whether the Item is in the Campaign, the Scene decides, Finished first) and `Scene.cs:191-199` (`LinkItem(itemId, itemInCampaign, now)` checks Finished before the Campaign check). The Non-Player Entity link breaks the pattern: `NonPlayerEntityLinkService.cs:42-46` refuses an outside entity before `Scene.LinkNonPlayerEntity` checks Finished at `Scene.cs:128`.
- `e2e/CLAUDE.md`: section 1 (one test per journey, no mega-tests), section 2 (create data through the API before UI actions), section 5 (no sleeps), section 7 (small helpers).
- Hub: `AssertNothingElseBeforeSentinelAsync` at `backend/tests/CocAssistant.Api.IntegrationTests/CampaignHubTests.cs:264`; the hub client contract is `ICampaignClient.cs:4-9`; Scenario Preparation has no hub code.
- UX acceptance criteria used by E2E assertions: Keeper SP-UX-15, 21, 50, 64, 67, 81, 83, 96, 97; Player SP-UX-9, 26, 28, 39, 74, 90, 102.
- Cyclomatic complexity 10 or below; follow-up rules in `docs/backlog.md` (Done PBIs, Deferred items, and Follow-ups); `CONTEXT.md` terms Keeper-facing, Player-facing, Handout, Item, Non-Player Entity.
- No game rules are involved.

## Explorer report corrections
- The SP-008 LocalDB memory stall is already fixed by PBI-WF-005 (commit 2b4d088, `e2e/localDbMemory.ts`, `e2e/globalSetup.ts:61`).
- Gap 5 (SQL Server Non-Player Entity link cascade) is already covered: `NonPlayerEntityLinkApiTests.cs:422` checks over the API on LocalDB that deleting a profile linked only to Prepared Scenes removes its links. No new test.
- The rule data adapter is `CampaignPlayNonPlayerEntityRuleData` (`backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Infrastructure/CampaignPlayNonPlayerEntityRuleData.cs`); adapter tests live in the integration project (`CampaignKeepersAdapterTests.cs`, `AccountDisplayNamesAdapterTests.cs`).

## Decisions

### D1 (Q1): Evidence for Verification item 1, "a Keeper can prepare a Scenario with ..."
| Metric | A: one long UI-driven E2E test | B: per-feature specs only, plus filling gaps | C: data created through the API, then UI checks for Keeper and Player |
| --- | --- | --- | --- |
| Consistency | - breaks "no mega-tests" | + current structure | + follows section 2 and keeps one result per test |
| Modifiability | - any UI change in any feature breaks it | + | 0 depends on API shapes, which the spec fixes |
| Testability | - long run, timeout risk at the 90 s limit | 0 never shows all parts together on one Scene | + quick and deterministic |
| Simplicity | - a lot of new step code | + least code | 0 one fixture and one spec |
| Reversibility | + | + | + |
| Security and correctness | 0 | - no Player check on fully prepared material | + Keeper sees everything, Player sees none of it |

- **Chosen:** C, because of Consistency, Testability, and Security - giving up a UI proof of each preparation step inside one test; each step stays proven by its own feature spec, linked in the PBI Evidence section.
- **Rejected:** A - a mega-test, slow, and repeats UI steps already tested. The Developer must not reintroduce it.
- **Rejected:** B on its own - leaves the Gherkin "Manual preparation works without extraction" without a test and never shows everything prepared together. The Developer must not reintroduce it.
- Every kind with both visibilities (5 kinds x 2 visibilities, on a Scene and on an Item) is checked in integration tests (plan step 7). E2E covers each kind with a mix of visibilities, including Keeper-facing file Handouts.

### D2 (Q2): What counts as "passes without an LLM or source document"
| Metric | A: all three test levels count; a named test plus a note on what each test setup configures | B: only unit and API tests count, plus a guard test that no LLM is registered |
| --- | --- | --- |
| Consistency | + uses the existing setups as they are | - checks for something that does not exist |
| Modifiability | 0 | - must change when extraction is added |
| Testability | + the E2E test is named after the Gherkin | 0 |
| Simplicity | + | - a speculative guard |
| Reversibility | + | + |
| Security and correctness | 0 | 0 |

- **Chosen:** A. The E2E API sets only the database and `HandoutFiles__LocalDirectory` (`e2e/playwright.config.ts:88`); integration tests use the same filesystem store. Azurite emulates Azure Blob Storage, the v1 storage in the spec (Architecture, File storage); it is neither a source document nor an LLM, so the Azure store tests still count. Giving up an automatic check against an LLM added later; extraction is a planned, spec'd change.
- **Rejected:** B - speculative, nothing to detect today. The Developer must not add a "no LLM" guard test.

### D3 (Q3): Campaign boundaries and Keeper authorization across every operation
| Metric | A: one table-driven matrix test, checked against the app's endpoint list | B: fill the gaps in each feature's own tests |
| --- | --- | --- |
| Consistency | - a second style beside the per-feature tests (reason: only a central list can prove every endpoint is covered) | + same style |
| Modifiability | + a new endpoint fails the completeness check until it has a row | - relies on someone remembering |
| Testability | + one table; the failure lists every wrong endpoint | 0 |
| Simplicity | 0 one new file; request bodies must be valid | - about 10 files changed, more hand-written checks |
| Reversibility | + only a test | + |
| Security and correctness | + 401 and 404 on every endpoint, no secret in the response, nothing changed | 0 gaps closed only where someone looked |

- **Chosen:** A, because of Modifiability and Security - giving up a single test style (deliberate exception, recorded in ADR 0023). The per-feature tests stay as they are; do not refactor them.
- **Rejected:** B - cannot prove "every operation". The Developer must not spread matrix rows into the feature test classes.
- Not in the matrix: id swaps inside the same Campaign (a foreign Scenario, a wrong profile type) stay in the per-feature tests that cover them.

### D4 (Q4): A Finished Scene answers 400 instead of 409 for a link with an outside entity
| Metric | A: move the Campaign check into the Scene, Finished first, as `LinkItem` does | B: check Finished in the service before the entity lookup | C: change the spec to say this 400 is correct |
| --- | --- | --- | --- |
| Consistency | + same as `Scene.cs:191-199` and PBI-SP-008 D4 | - a Scene rule outside the aggregate | - contradicts the Definition of Done and the Item link behavior |
| Modifiability | + one place decides | 0 | - two link types behave differently |
| Testability | + domain unit and integration tests | + | + |
| Simplicity | 0 one new parameter, as for Items | + one if-statement | + spec edit only |
| Reversibility | + | + | + |
| Security and correctness | + Definition of Done holds | + | - |

- **Chosen:** A, because of Consistency and Correctness - giving up a small aggregate signature change.
- **Rejected:** B - the editing rule would live outside the Scene aggregate. C - breaks the Definition of Done. The Developer must not reintroduce either.

### D5: Keeper-facing material never reaches Players through live updates
| Metric | A: live hub test with a sentinel message | B: test that Scenario Preparation assemblies do not reference SignalR | C: rely on there being no hub code |
| --- | --- | --- | --- |
| Consistency | + reuses `AssertNothingElseBeforeSentinelAsync` | 0 | 0 |
| Testability | + tests behavior, no timeout | 0 misses publishing through a Campaign Play port | - no test |
| Simplicity | 0 one test | + | + |
| Reversibility | + | + | + |
| Security and correctness | + | 0 | - |

- **Chosen:** A.
- **Rejected:** B - can be bypassed through a Campaign Play port. C - leaves the guardrail without a regression test. The Developer must not reintroduce either.

### Single-option decisions
- SP-UX completeness (gap 7): search each id SP-UX-1 to SP-UX-103 across `e2e/tests` and the frontend tests; every id with no hits gets its recorded exception or a new follow-up, listed in the PBI Evidence section. A check, not new tests.
- Absorbed follow-ups: PBI-SP-004 400 vs 409 (D4); PBI-SP-003 and PBI-SP-009 `NonPlayerEntityRuleDataAdapterTests`; PBI-SP-002 CS8604 at `SceneServiceTests.cs:105`; PBI-SP-002 flaky E2E "Scene Keeper notes outside the allowed nodes are refused": run `scenes.spec.ts` with `--repeat-each=10`; if green, close it and record the run; if it flakes, find the cause, fix it only when the cause is in the test, otherwise escalate.
- Closed as already fixed: PBI-SP-008 LocalDB stall, linked `-> PBI-WF-005`, no code change.
- Recorded as coverage exceptions: PBI-SP-008 held-Item delete has no E2E until PBI-SPL-003; PBI-SP-001 SP-UX-13 and SP-UX-14 are component-only, as already recorded.
- Left open, unchanged: PBI-SP-002 `keeperNotes` re-serialization (the contract does not require identical response bytes); PBI-SP-005 repeated Finished-Scene sentence in frontend code (production clean-up, not verification).

## Patterns
- **Used:** none new. D4 follows the `LinkItem` shape: the service resolves the facts and the aggregate decides.
- **Rejected:** Builder or Object Mother for matrix data - the existing request helpers and samples are enough. Strategy per caller type - a data table is enough. Page Object for the E2E test - `e2e/CLAUDE.md` section 7 prefers small helpers.

## Invariants
- No production behavior change except the D4 order. When the Scene is not Finished, existing link 400 rules and keys stay the same: the Campaign check still runs before name validation.
- Matrix rows never mutate: each check asserts that Scenario Preparation row counts and the Handout file directory are unchanged. Rows carry valid bodies, so a 404 comes from the Keeper check, not model validation.
- E2E: no `waitForTimeout`, no `.first()` or `.nth()`, unique test data, each test creates its own data.
- No new suppressions and no raised complexity baseline.
- No Scene Play behavior.

## Implementation plan
Phase 1: contract and D4
1. `specs/scenario-preparation/spec.md` (spec first):
   - Scene API, Non-Player Entity links: "409 when the Scene is Finished, before any 400".
   - Scene API, Item links: the same phrase.
   - Gherkin "Manual preparation works without extraction": When becomes "the Keeper enters Scenes, Non-Player Entities, Handouts of every kind, and Items manually"; add trace tags SP-UX-15, SP-UX-50, SP-UX-64, SP-UX-67, SP-UX-97.
   - New Gherkin "Prepared material stays hidden from Players" (SP-UX-9, SP-UX-26, SP-UX-28, SP-UX-39, SP-UX-74, SP-UX-90, SP-UX-102): Given a Keeper has prepared a Scenario with Scenes, Non-Player Entity links, Handouts, and Items / When a Player of the Campaign opens the Campaign and those pages / Then the Player sees none of it / And the Player receives no live update about it.
2. `Scene.LinkNonPlayerEntity(type, id, bool entityInCampaign, name, description, now)`: Finished, then Campaign, then name. Add a domain outcome for "not in the Campaign".
3. `NonPlayerEntityLinkService.LinkAsync`: pass the Campaign check in (a missing type or id counts as not in the Campaign, as `ItemLinkService.cs:40-42`); map to the existing write outcomes.
4. Tests: domain order unit tests, service test, integration "Finished Scene plus outside entity gives 409 and nothing changes"; update any test that expected 400 for that case.

Phase 2: integration coverage
5. New `backend/tests/CocAssistant.Api.IntegrationTests/ScenarioPreparationAuthorizationMatrixTests.cs`. Seed one Campaign with everything prepared and a unique secret in every text field. Tests:
   - Completeness: the table equals the (method, route) list from `EndpointDataSource` filtered to the ScenarioPreparation.Controllers assembly, both directions.
   - Without a token, every endpoint answers 401.
   - A Player of the Campaign, another Campaign's Keeper, and the Keeper with a missing Campaign id each get 404 on every endpoint.
   - Each test loops the table, collects failing endpoints, asserts once with the full list, and checks no response contains a secret and nothing changed.
6. `CampaignHubTests`: one test. The Player subscribes; the Keeper makes one write of each kind over HTTP (Scenario, Scene, Non-Player Entity link, Scene Handout text and file, Item, Item link, Item Handout, Human NPC, Mythos Creature); then adds a public Wall entry as the sentinel; `AssertNothingElseBeforeSentinelAsync`.
7. Kinds and visibilities: a `[Theory]` over 5 kinds x 2 visibilities in `HandoutApiTests` / `HandoutFileApiTests` and in `ItemHandoutApiTests` / `ItemHandoutFileApiTests`: create, then GET returns the same kind and visibility.
8. `NonPlayerEntityRuleDataAdapterTests.cs` in the integration project; fix CS8604 at `SceneServiceTests.cs:105`.

Phase 3: E2E
9. `e2e/fixtures/prepared-scenario.ts`, `prepareScenarioViaApi`, using the existing bearer and `API_ORIGIN` helpers and `PNG_BYTES` / `PDF_BYTES`. Creates: a Scenario with secret Keeper notes; two Scenes reordered through the order endpoint; a Human NPC and a Mythos Creature linked to one Scene; Handouts on that Scene (Read-aloud Player-facing, Text Keeper-facing, Image Player-facing, Map Keeper-facing, Document Keeper-facing); an Item with a Player-facing Text Handout and a Keeper-facing Image Handout, linked to the Scene.
10. `e2e/tests/manual-preparation.spec.ts`; the header traces to both Gherkin scenarios and notes D2. Two tests, each creating its own data:
    - "Keeper opens a Scenario prepared by hand, without a source document, and finds every part in place": Scenes in the reordered order with status (SP-UX-15, SP-UX-21); Non-Player Entity links (SP-UX-50); Items (SP-UX-97); Handouts in order with kind and visibility text (SP-UX-64, SP-UX-67); Map page (SP-UX-81); Document page (SP-UX-83); the Item page Scenes section (SP-UX-96).
    - "A Player of the Campaign finds none of the prepared Scenario": no Scenarios, Non-Player Entities, or Items section on the Overview (SP-UX-9, SP-UX-28, SP-UX-90); deep links to the Scene, a Handout, the Item, and a profile show their not-found message (SP-UX-26, SP-UX-74, SP-UX-102, SP-UX-39); no secret string on any page.
11. Run `scenes.spec.ts` with `--repeat-each=10`.

Phase 4: evidence
12. PBI-SP-006: add `## Evidence` linking each Verification item to its tests, the SP-UX search result, the coverage exceptions, and the repeat run; tick the Verification items.
13. Spec Definition of Done: tick each item whose evidence holds.
14. Follow-ups: add `-> PBI-SP-006` to the absorbed entries (04 400 vs 409; 03 and 09 adapter tests; 02 CS8604 and flake); add `-> PBI-WF-005` to the 08 LocalDB entry.
15. Run `node tools/ascii-check/src/cli.ts` and `node tools/backlog/src/cli.ts --check`.

## Reuse
- Using (integration): `BuildRequest`, `CreateCampaignAsync`, `JoinAsPlayerAsync`, `ResetDatabaseAsync`, `CountAsync`, `TestAuthHandler` with `X-Test-Unauthenticated`, `ItemApiRequests`, `CampaignPlayApiRequests`, `NpcProfileSamples`, `MonsterProfileSamples`, `HandoutFileSamples`, `CampaignHubTestClient`, the sentinel helper.
- Using (E2E): auth fixture, campaigns fixture (`joinAsNewPlayer`, bearer capture), `scene-handouts` (`PNG_BYTES`, `PDF_BYTES`, `handoutLinks`), items (`sceneItemNames`).
- Not using: UI `create*ViaUi` helpers for arranging data (D1); Azurite in the new tests (the filesystem store is the harness default).

## TDD units
- `Scene.LinkNonPlayerEntity`: Finished plus outside entity gives SceneFinished; Prepared plus outside entity gives not in the Campaign; Prepared plus valid entity plus invalid name gives the name outcome.
- Service: a missing type or id counts as not in the Campaign.
- API: Finished Scene plus outside entity gives 409 and nothing changes.
- Matrix: completeness, 401, three 404 checks.
- Hub: nothing before the sentinel.
- Kinds and visibilities: 20 round-trips.
- Adapter: characteristics pass through; Fighting and Firearms specializations match case-insensitively and are empty when unknown.
- E2E: the two tests and their UX criteria above.

## E2E coverage
- "Manual preparation works without extraction" -> `e2e/tests/manual-preparation.spec.ts`, Keeper test.
- "Prepared material stays hidden from Players" -> `e2e/tests/manual-preparation.spec.ts`, Player test; the live-update clause is covered by the hub integration test (the UI cannot observe that nothing arrived).
- D4 precedence: E2E exception, unreachable from the UI (SP-UX-51); covered by integration tests.
- Held-Item delete: E2E exception until PBI-SPL-003.

## ADR
- ADR 0023: Scenario Preparation endpoints are covered by an endpoint-list authorization matrix (`docs/adr/0023-scenario-preparation-endpoint-authorization-matrix.md`).

## Phases
- Phase 1: spec and D4; checkpoint: `fix(scenario-preparation): refuse links on a Finished Scene with 409 first (PBI-SP-006)`
- Phase 2: integration coverage; checkpoint: `test(scenario-preparation): add authorization matrix and live-update guard (PBI-SP-006)`
- Phase 3: E2E; checkpoint: `test(e2e): verify a hand-prepared Scenario for Keeper and Player (PBI-SP-006)`
- Phase 4: evidence; checkpoint: `docs(scenario-preparation): record SP-006 evidence and close absorbed follow-ups (PBI-SP-006)`

## Human decisions
- 2026-10-23: "approved" (exact reply, no changes requested). Covers D1 to D5, ADR 0023, and leaving the `keeperNotes` re-serialization and PBI-SP-005 repeated-sentence follow-ups open.

## Revisions

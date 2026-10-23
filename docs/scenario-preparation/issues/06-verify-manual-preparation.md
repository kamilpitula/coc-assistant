---
id: PBI-SP-006
status: done
blocked_by: [PBI-SP-001, PBI-SP-002, PBI-SP-003, PBI-SP-004, PBI-SP-005, PBI-SP-007, PBI-SP-008, PBI-SP-009, PBI-SP-010]
---

# PBI-SP-006: Verify Manual Scenario Preparation

## Directive
Complete and verify the full manual Scenario Preparation workflow across schema, API, UI, authorization, persistence, and tests. Confirm that the workflow is usable without an uploaded source document or LLM extraction.

**Scope:**
- Cross-feature integration and regression coverage for PBI-SP-001 through PBI-SP-005 and PBI-SP-007 through PBI-SP-010.
- End-to-end Keeper workflow and Campaign isolation checks.
- Do not implement structured extraction, agentic orchestration, or unrelated Campaign Play or Scene Play behavior.

## Dependencies
- Blocked by: PBI-SP-001: Create and Edit a Campaign Scenario; PBI-SP-002: Manage Ordered Scenes; PBI-SP-003: Create Human NPC Profiles; PBI-SP-004: Link Non-Player Entities to Scenes; PBI-SP-005: Rich-Text Scene Handouts; PBI-SP-007: File, Image, and Map Handouts; PBI-SP-008: Prepare Campaign Items; PBI-SP-009: Create Mythos Creature Profiles; PBI-SP-010: Duplicate Non-Player Entity Profiles
- Must merge before: None

## Context
Read: `specs/scenario-preparation/spec.md`
- Contract: Definition of Done and Scenarios.
- Regression Guardrails: Campaign isolation, visibility protection, manual preparation without extraction, and shared domain concepts.

## Verification
- [x] A Keeper can prepare a Scenario with ordered Scenes, linked Non-Player Entities, Player-facing and Keeper-facing Handouts of every kind, and linked Items.
- [x] Campaign boundaries and Keeper authorization hold across every preparation operation.
- [x] The complete manual workflow passes focused unit, integration, and E2E regression coverage without an LLM or source document.

## Evidence

Design record: [06-verify-manual-preparation.design.md](06-verify-manual-preparation.design.md); ADR 0023.

### Verification 1: a Keeper can prepare a Scenario with ordered Scenes, links, Handouts of every kind, and Items
- Together, on one Scene (data created through the API, UI checked): `e2e/tests/manual-preparation.spec.ts`, "Keeper opens a Scenario prepared by hand, without a source document, and finds every part in place" (SP-UX-15, 21, 50, 64, 67, 81, 83, 96, 97).
- Each preparation step through the UI, one feature spec each: `scenario-preparation.spec.ts` (Scenarios), `scenes.spec.ts` (ordered Scenes), `non-player-entities.spec.ts` and `mythos-creatures.spec.ts` (profiles), `scene-links.spec.ts` (links), `scene-handouts.spec.ts` and `scene-file-handouts.spec.ts` (Scene Handouts), `items.spec.ts`, `item-handouts.spec.ts`, and `scene-item-links.spec.ts` (Items).
- Every kind with both visibilities (5 kinds x 2): `HandoutApiTests` and `HandoutFileApiTests` (Scene), `ItemHandoutApiTests` and `ItemHandoutFileApiTests` (Item), the `..._kind_and_visibility_...` theories: 20 round-trips.
- Hub: `CampaignHubTests` "...the keeper prepares scenario material..." sends one write of every kind and proves the Players hear nothing before the next public signal.

### Verification 2: Campaign boundaries and Keeper authorization hold across every preparation operation
- `ScenarioPreparationAuthorizationMatrixTests` (ADR 0023): the table equals the 44 registered (method, route) pairs of the ScenarioPreparation.Controllers assembly in both directions; no token gives 401; a Player of the Campaign, another Campaign's Keeper, and the Keeper with a missing Campaign id each give 404; no response contains seeded text; no table row or stored file changes.
- Player UI: `manual-preparation.spec.ts`, "A Player of the Campaign finds none of the prepared Scenario" (SP-UX-9, 26, 28, 39, 74, 90, 102).
- D4: a Finished Scene answers 409 before any 400 for an entity outside the Campaign, as for Items: `SceneLinkTests`, `NonPlayerEntityLinkServiceTests`, `NonPlayerEntityLinkApiTests` (spec.md Scene API wording updated first). Absorbs the PBI-SP-004 follow-up.

### Verification 3: the complete workflow passes without an LLM or source document
- The E2E API sets only the database and `HandoutFiles__LocalDirectory`; the integration factory sets the same and the filesystem store (design record D2). Azurite, used by `AzureBlobHandoutFileStoreTests` only, emulates the v1 storage and is neither an LLM nor a source document.
- Unit: 833 `CocAssistant.ScenarioPreparation.Tests`; integration: 375 `CocAssistant.Api.IntegrationTests`; E2E: the new spec (2 tests) and the Scenario Preparation specs.
- Absorbed unit/adapter gaps: `NonPlayerEntityRuleDataAdapterTests` (PBI-SP-003, PBI-SP-009 follow-ups); the CS8604 warnings at `SceneServiceTests.cs:105` (and the same one at `ScenarioServiceTests.cs:77`) are fixed (PBI-SP-002).
- The PBI-SP-002 flake: `npx playwright test tests/scenes.spec.ts --repeat-each=10 --retries=0` gave 40 passed (6.6 min), so the follow-up is closed.

### SP-UX completeness
Each id SP-UX-1 to SP-UX-103 was searched across `e2e/tests` and the frontend tests and stories (ranges such as "SP-UX-50 to SP-UX-56" expanded). Every id has at least one hit; none is missing. SP-UX-44 has a component test only (weapon Skill options on unsaved rows), SP-UX-13 and SP-UX-14 are component-only (exception recorded in `scenario-preparation.spec.ts`). A hit means a mention, not proof of the whole criterion.

### Coverage exceptions
- Active and Finished Scene E2E, Reveals, and giving Items: owned by PBI-SPL-001, PBI-SPL-002, and PBI-SPL-003; seeded integration tests and component tests cover them now.
- Held-Item delete has no E2E until PBI-SPL-003 (PBI-SP-008 follow-up).
- D4 precedence has no E2E: unreachable from the UI (SP-UX-51); integration tests cover it.
- "The Player receives no live update": the UI cannot observe an absence; the hub integration test covers it.

## Refinement Protocol
If verification exposes a domain or contract gap, update the Scenario Preparation specification first, then revise the smallest blocked ticket needed to restore traceability. Keep structured extraction out of this manual-preparation ticket.

## Follow-ups
- Left open by design: the GET Scene response re-serializes `keeperNotes` (PBI-SP-002); the repeated Finished-Scene sentence in three frontend files (PBI-SP-005); Storybook accessibility runs, the `src/shared/` move, Terraform, and the orphaned-blob sweep (PBI-SP-003, 004, 005, 007, 009, 010).
- Adopt the endpoint-list matrix for Scene Play endpoints in PBI-SPL-001 (ADR 0023 allows it; every Scene Play endpoint must be covered by a table of its own).

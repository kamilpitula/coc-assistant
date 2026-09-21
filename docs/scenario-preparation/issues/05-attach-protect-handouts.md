# PBI-SP-005: Attach and Protect Scene Handouts

## Directive
Build the end-to-end ability for a Keeper to attach durable Handouts to Scenes and mark each Handout as player-facing or Keeper-facing. Prevent Keeper-facing material from appearing in Player-visible responses by default.

**Scope:**
- Handout metadata, durable storage integration, Scene association, API, preparation UI, and focused unit, integration, and E2E coverage.
- Visibility enforcement for read paths and any user-visible delivery path.
- Do not implement uploaded Scenario source-document extraction.

## Dependencies
- Blocked by: PBI-SP-002: Manage Ordered Scenes
- Must merge before: PBI-SP-006

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Handouts and Azure Blob Storage.
- Constraints: player-facing and Keeper-facing visibility.
- Contract: durable Scene association and explicit visibility.
- Regression Guardrails: Keeper-facing material is not exposed to Players by default.

## Verification
- [ ] A Keeper can attach and manage a durable Handout on a Scene.
- [ ] Each Handout has explicit player-facing or Keeper-facing visibility.
- [ ] Player-visible API and E2E flows exclude Keeper-facing Handouts; focused tests cover authorization and storage failure handling.

## Refinement Protocol
If storage or visibility requirements change, update the Contract and Regression Guardrails together. Never weaken the default exclusion of Keeper-facing material from Player responses.

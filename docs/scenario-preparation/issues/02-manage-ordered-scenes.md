# PBI-SP-002: Manage Ordered Scenes

## Directive
Build the end-to-end ability for a Keeper to create, edit, reorder, and remove Scenes within a Campaign's Scenario. Persist an unambiguous stable order and show that order in the preparation experience.

**Scope:**
- Scene domain behavior, persistence, API, preparation UI, and focused unit, integration, and E2E coverage.
- Ordering rules and validation within one Scenario.
- Do not implement Handouts, Non-Player Entity profiles, or source-document extraction.

## Dependencies
- Blocked by: PBI-SP-001: Create and Edit a Campaign Scenario
- Must merge before: PBI-SP-004, PBI-SP-005, PBI-SP-006

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Scene relationships and manual preparation constraints.
- Contract: ordered Scene creation, editing, and removal.
- Regression Guardrails: Scene order is stable and unambiguous within a Scenario.

## Verification
- [ ] A Keeper can create, edit, reorder, and remove Scenes in the owned Scenario.
- [ ] Scene title and Keeper-facing description or read-aloud text are persisted and returned in order.
- [ ] Unit, integration, and E2E tests prove stable ordering and Campaign authorization.

## Refinement Protocol
If the ordering model needs clarification, update the Contract and Regression Guardrails before changing persistence or API behavior. Preserve a deterministic order within each Scenario.

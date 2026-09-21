# PBI-SP-001: Create and Edit a Campaign Scenario

## Directive
Build the end-to-end ability for a Keeper to create and edit the single Scenario belonging to a Campaign. Enforce Campaign ownership and preserve the Scenario's Campaign scope across persistence, API responses, UI, and tests.

**Scope:**
- Scenario domain, persistence, API, Keeper-facing preparation UI, and focused unit, integration, and E2E coverage.
- Campaign ownership and Keeper authorization integration needed by Scenario Preparation.
- Do not implement Scenes, Handouts, Non-Player Entities, or source-document extraction.

## Dependencies
- Blocked by: Campaign Play Campaign persistence and Keeper authorization contract
- Must merge before: PBI-SP-002, PBI-SP-003, PBI-SP-004, PBI-SP-005

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: domain relationships, manual preparation, and Campaign dependency.
- Contract: Scenario creation and editing, Campaign scoping, and manual preparation.

## Verification
- [ ] An authorized Keeper can create and edit the Scenario for an owned Campaign.
- [ ] A Player or Keeper from another Campaign cannot create, read, or edit the Scenario.
- [ ] Unit, integration, and E2E tests cover persistence, authorization, and the manual workflow.

## Refinement Protocol
If the Campaign Play authorization contract changes, update the integration boundary and this ticket before implementation. Keep Scenario ownership aligned with the authoritative glossary and avoid introducing a second Campaign identity model.

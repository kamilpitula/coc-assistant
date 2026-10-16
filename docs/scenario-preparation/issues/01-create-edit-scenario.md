---
id: PBI-SP-001
status: done
blocked_by: [PBI-CP-001]
---

# PBI-SP-001: Create and Edit a Campaign Scenario

## Directive
Build the end-to-end ability for a Keeper to create, edit, and reorder the Scenarios belonging to a Campaign, kept in a set order. Enforce Campaign ownership and preserve each Scenario's Campaign scope across persistence, API responses, UI, and tests.

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
- [x] An authorized Keeper can create, edit, and reorder Scenarios for an owned Campaign; new Scenarios are appended to its order.
- [x] A Player or Keeper from another Campaign cannot list, create, read, edit, or reorder them.
- [x] Unit, integration, and E2E tests cover persistence, authorization, and the manual workflow.

## Refinement Protocol
If the Campaign Play authorization contract changes, update the integration boundary and this ticket before implementation. Keep Scenario ownership aligned with the authoritative glossary and avoid introducing a second Campaign identity model.

## Follow-ups
- Remove (delete) a Scenario: deliberately out of scope here (specs/scenario-preparation/ux.md section 10); needs a rule for the Campaign's order and for Scenes that belong to it.
- Show Scenario information to Players, with a live-update topic and a Keeper-only audience if needed: out of scope here (design record D6); until then nothing Scenario-related reaches a Player connection.
- Scenarios hold no database foreign key to their Campaign (ADR 0013); when Campaign deletion exists, delete or archive that Campaign's Scenarios with it.
- Failure and stale-order reorder states (SP-UX-13) and the single-Scenario case (SP-UX-14) are covered by component tests only, not E2E (the E2E spec header says why); revisit if a deterministic way to force a server failure or a second window is added.
- Research gap from specs/scenario-preparation/ux.md section 10: whether Keepers find the "no Scenario yet" attention item useful or nagging when they deliberately start without a Scenario.
- The Scenario create/edit request (`ScenarioRequest`) leaves `Title` unvalidated at the model-binding layer so a missing, empty, or blank title is a 400 keyed `title` (the `[Required]` attribute keyed it `Title`); align the 400 key casing across Campaign Play and Scenario Preparation endpoints if a shared convention is wanted.

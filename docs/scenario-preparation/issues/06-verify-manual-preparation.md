---
id: PBI-SP-006
status: todo
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
- [ ] A Keeper can prepare a Scenario with ordered Scenes, linked Non-Player Entities, Player-facing and Keeper-facing Handouts of every kind, and linked Items.
- [ ] Campaign boundaries and Keeper authorization hold across every preparation operation.
- [ ] The complete manual workflow passes focused unit, integration, and E2E regression coverage without an LLM or source document.

## Refinement Protocol
If verification exposes a domain or contract gap, update the Scenario Preparation specification first, then revise the smallest blocked ticket needed to restore traceability. Keep structured extraction out of this manual-preparation ticket.

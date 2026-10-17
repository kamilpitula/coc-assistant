---
id: PBI-SP-010
status: todo
blocked_by: [PBI-SP-003, PBI-SP-009]
---

# PBI-SP-010: Duplicate Non-Player Entity Profiles

## Directive
Let a Keeper duplicate a Human NPC or Mythos Creature within its Campaign, so variant specimens and similar NPCs start from an existing profile (the template method of the NPC ruleset, as applied by project_ruleset.md section 5.1).

**Scope:**
- **Domain and API:** the duplicate operation for both profile types; the copy keeps the type and Campaign, is named "<name> (copy)" truncated to 200 characters, and copies every profile field including overrides and their reasons.
- **UI:** a Duplicate action, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** copying Scene links, copying across Campaigns, published templates.

## Dependencies
- Blocked by: PBI-SP-003 (Human NPCs); PBI-SP-009 (Mythos Creatures).
- Must merge before: PBI-SP-006.

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Non-Player Entity API (duplicate endpoints).
- Constraints: duplicating a profile.
- Scenarios: Keeper duplicates a profile; Keeper-only profiles.
Read: `docs/game-rules/project_ruleset.md` section 5.1.

## Verification
- [ ] A Keeper can duplicate a Human NPC and a Mythos Creature; the copy has the same type, Campaign, and profile, and no Scene links.
- [ ] Duplicating a profile of another Campaign or as a Player is reported as not found, with unit, integration, and E2E coverage.

## Refinement Protocol
If duplication should cover Scene links or other Campaigns, update the spec Constraints first; Non-Player Entities stay scoped to one Campaign in v1.

## Follow-ups

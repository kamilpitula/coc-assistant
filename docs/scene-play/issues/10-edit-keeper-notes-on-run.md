---
id: PBI-SPL-010
status: todo
blocked_by: [PBI-SPL-009]
---

# PBI-SPL-010: Edit Keeper notes on Run with autosave

## Directive
Let the Keeper add to a Scene's Keeper notes from Run during play without leaving the Active Scene. "Edit" opens the editor, changes save as the Keeper types, and "Done" returns to the read-only notes.

**Scope:**
- **Run:** the Keeper notes section gains "Edit" and "Done", with autosave through the Keeper notes endpoint, the save status, and the conflict prompt, all as recorded by the PBI-SPL-009 UX pass.
- **Live:** another Keeper tab's save refreshes the notes, without discarding the Keeper's unsaved typing.
- **Tests:** unit, Storybook, and E2E.
- **Out of scope:** Mentions (PBI-MEN-001); Beats (PBI-BEAT-002).

## Dependencies
- Blocked by: PBI-SPL-009 (the endpoint and the UX specification).
- Must merge before: None.

## Context
Read: [scene-play spec](../../../specs/scene-play/spec.md), Context (Run edits Keeper notes through Scenario Preparation's endpoint), Definition of Done, and the Keeper notes scenarios; [scene-play ux](../../../specs/scene-play/ux.md) section 21.3 and the section added by the PBI-SPL-009 UX pass.
- Keeper notes and their live signal never reach a Player.

## Verification
- [ ] Run follows the UX specification for edit, autosave, Done, save status, failure, and conflict.
- [ ] Unit tests cover autosave timing, the conflict choices, and the live refresh.
- [ ] Storybook stories cover the reading, editing, saving, failed, and conflict states.
- [ ] Playwright E2E covers the scene-play scenarios "The Keeper adds to the Keeper notes during play", "Keeper notes edited in another tab conflict on Run", and "Keeper notes reach the Keeper's other tabs live".

## Refinement Protocol
A change to editing on Run updates scene-play ux.md, the scene-play spec, and tests together.

## Follow-ups

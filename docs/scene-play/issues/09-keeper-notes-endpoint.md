---
id: PBI-SPL-009
status: todo
blocked_by: [PBI-SPL-008]
---

# PBI-SPL-009: Save Keeper notes through their own endpoint

## Directive
Give a Scene's Keeper notes their own save, guarded by a notes version and allowed in every Scene status, so the Keeper can add notes after a Scene is Finished and never silently overwrites a newer save.

**Scope:**
- **UX pass first:** follow the UX/UI designer skill (`.claude/commands/ux-ui-designer-skill/SKILL.md`) for Keeper notes in play and after finishing, covering this PBI and PBI-SPL-010. Cover the Run "Edit" -> autosave -> "Done" pattern, the save status text, offline and failed saves, the "reload / keep mine" conflict prompt, and how a Finished Scene's preparation page offers notes editing. Present 2-3 options, let the human choose, and record the result in the scene-play and scenario-preparation ux.md files, linked from their specs.
- **Domain and API:** the Keeper notes endpoint with `notesVersion`, a 409 carrying the current notes, the Scene PUT replacing only title and location, and notes saves never touching the Scene version. Each save publishes `scenes`.
- **Decision record:** a new ADR beside ADR 0025 for the separate notes version.
- **Preparation Scene page:** notes save through the new endpoint, with the conflict prompt. On a Finished Scene only the Keeper notes section is editable.
- **Glossary:** update **Finished Scene** in CONTEXT.md to "A Scene that has been played. It is read-only for everyone and is never reopened, except that the Keeper may still edit its Keeper notes. Returning to a place is a new Scene."
- **Tests:** unit, integration, Storybook, and E2E.
- **Out of scope:** editing on Run (PBI-SPL-010); Mentions (PBI-MEN-001).

## Dependencies
- Blocked by: PBI-SPL-008 (notes saves publish the `scenes` topic).
- Must merge before: PBI-SPL-010 (Run uses this endpoint) and PBI-MEN-001 (Mentions are saved through it).

## Context
Read: [scenario-preparation spec](../../../specs/scenario-preparation/spec.md), Scene API (the Keeper notes endpoint and the deprecated Scene PUT), Constraints (the Finished Scene exception and optimistic notes saves), and the new Keeper notes scenarios; [ADR 0025](../../adr/0025-one-active-scene-per-campaign-through-a-filtered-index-and-a-scene-version.md).
- A Keeper notes save must never make a start or finish fail.
- Everything else on a Finished Scene still refuses with 409.

## Verification
- [ ] The UX specification is recorded and linked from the specs before UI work starts.
- [ ] A save with the current `notesVersion` succeeds in Prepared, Active, and Finished; a stale one is refused with 409 and the current notes.
- [ ] The Scene PUT no longer changes Keeper notes.
- [ ] Saving notes while finishing the Scene leaves the Scene Finished with the new notes.
- [ ] On a Finished Scene's preparation page only the Keeper notes are editable.
- [ ] CONTEXT.md and the new ADR are updated.
- [ ] Unit and integration tests cover the version check, every status, and the Scene version staying unchanged.
- [ ] Playwright E2E covers the scenario-preparation scenarios "The Keeper edits a Finished Scene's Keeper notes" and "A stale Keeper notes save is refused".

## Refinement Protocol
A change to the notes save updates the scenario-preparation spec, its ux.md, the notes-version ADR, CONTEXT.md if the Finished exception changes, and tests together.

## Follow-ups
- Prototype: `prototype/spl-009-keeper-notes` (`554378e`, local, never merged); verdict in [specs/scene-play/ux.md](../../../specs/scene-play/ux.md) section 25.7. Design: [09-keeper-notes-endpoint.design.md](09-keeper-notes-endpoint.design.md).

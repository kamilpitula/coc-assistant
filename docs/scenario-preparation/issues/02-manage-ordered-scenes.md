---
id: PBI-SP-002
status: todo
blocked_by: [PBI-SP-001]
---

# PBI-SP-002: Manage Ordered Scenes

## Directive
Build the end-to-end ability for a Keeper to create, edit, reorder, and remove Scenes within a Campaign's Scenario, with a title, location, and rich-text Keeper notes. Persist a stable prepared order, store each Scene's status (always Prepared until Scene Play exists), and show Scenes with their status on the Scenario page.

**Scope:**
- **Domain:** Scene aggregate with title, location, Keeper notes, position, status (Prepared, Active, Finished) with started and finished times, and the editing rules that follow from the status: edit while Prepared or Active, remove only while Prepared, Finished is read-only. The transitions are domain operations; no endpoint triggers them yet.
- **Rich text:** the Lexical editor and read-only renderer in the frontend and the server-side validator from [ADR 0015](../../adr/0015-store-rich-text-as-validated-lexical-json.md), first used for Scene Keeper notes. Later PBIs reuse them.
- **API and persistence:** the Scene API in the spec, following [ADR 0014](../../adr/0014-order-preparation-records-by-stored-position-with-tie-break.md).
- **UI:** Scenes on the Keeper's Scenario page in prepared order with their status and dates, and a Scene create/edit page, designed through the UX designer skill first (`specs/scenario-preparation/ux.md` or a linked Scene UX section).
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** Handouts, Non-Player Entity links, Items, starting or finishing a Scene (PBI-SPL-001), Duplicate Scene, and source-document extraction.

## Dependencies
- Blocked by: PBI-SP-001 (Scenarios and the Scenario page must exist).
- Must merge before: PBI-SP-004, PBI-SP-005, PBI-SP-006, PBI-SP-008 (they attach material to Scenes); PBI-SPL-001 (it changes Scene status).

## Context
Read: `specs/scenario-preparation/spec.md`
- Blueprint: Scene API, Scene status, Rich text.
- Constraints: Scene fields (the replacement of the deprecated Scene constraint), the prepared order is a suggestion, editing and removal by status, allowed Lexical nodes.
- Regression Guardrails: Scene order is stable; Scenes never reach Players; a Finished Scene never changes.
Read: `docs/adr/0014-order-preparation-records-by-stored-position-with-tie-break.md`, `docs/adr/0015-store-rich-text-as-validated-lexical-json.md`, `CONTEXT.md` (Scene, Prepared Scene, Active Scene, Finished Scene).

## Verification
- [ ] A Keeper can create, edit, reorder, and remove Prepared Scenes in the owned Scenario; new Scenes are last in the prepared order.
- [ ] Scene title, location, and Keeper notes are persisted and returned in prepared order with status and dates.
- [ ] Domain tests prove that a Finished Scene refuses every change and that only a Prepared Scene can be removed.
- [ ] Rich text outside the allowed Lexical nodes, links, or size is refused with 400.
- [ ] Unit, integration, and E2E tests prove stable ordering and Campaign authorization (404 for Players and other Keepers).

## Refinement Protocol
If the ordering model or status rules need clarification, update the spec's Contract and Regression Guardrails before changing persistence or API behavior. Preserve a deterministic order within each Scenario. A change to the allowed Lexical nodes updates ADR 0015, the spec Constraint, the editor, the renderer, and the validator together.

## Follow-ups
- Duplicate Scene, so a Keeper can return to a place as a new Prepared Scene copied from a Finished one.
- A Campaign-scoped Location record shared by Scenes (location is free text in v1).

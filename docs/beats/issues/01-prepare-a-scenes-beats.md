---
id: PBI-BEAT-001
status: todo
blocked_by: [PBI-SPL-008]
---

# PBI-BEAT-001: Prepare a Scene's Beats

## Directive
Let the Keeper write a Scene's Beats on the preparation Scene page, as the ordered steps the Keeper expects to happen in the Scene.

**Scope:**
- **UX pass first:** follow the UX/UI designer skill (`.claude/commands/ux-ui-designer-skill/SKILL.md`) for Beats, covering this PBI, PBI-BEAT-002, and PBI-BEAT-003. Cover the preparation Beats section, the Run Beat rows with one-action Reached, Skipped, and reset, the progress summary, and the Scene History line. Present 2-3 options, let the human choose, and record the result in `specs/beats/ux.md`, linked from the spec.
- **Domain and API:** the Beat as a child entity of the Scene, with add, edit, remove, and reorder; the 50-Beat limit; the title and detail limits; and the rules by Scene status. Beats are included in the Scene read, and each change publishes `scenes`.
- **Preparation Scene page:** a Beats section, editable while Prepared or Active and read-only when Finished.
- **Glossary:** add **Beat** to CONTEXT.md: "A Keeper-only step the Keeper expects or wants to happen in a Scene, marked as reached during play." _Avoid_: objective, checkpoint, task.
- **Tests:** unit, integration, Storybook, and E2E.
- **Out of scope:** marking (PBI-BEAT-002) and the Scene History (PBI-BEAT-003).

## Dependencies
- Blocked by: PBI-SPL-008 (Beat changes publish the `scenes` topic).
- Must merge before: PBI-BEAT-002.

## Context
Read: [beats spec](../../../specs/beats/spec.md), Architecture (Domain and Beat API), Constraints, and Regression Guardrails; [ADR 0014](../../adr/0014-order-preparation-records-by-stored-position-with-tie-break.md); [ADR 0019](../../adr/0019-scene-links-are-child-entities-with-in-context-foreign-keys.md).
- Beat changes never touch the Scene version.
- A Finished Scene refuses every Beat change with 409.

## Verification
- [ ] The UX specification is recorded and linked from the spec before UI work starts.
- [ ] The Keeper can add, edit, reorder, and remove Beats on a Prepared Scene; a 51st Beat and an empty title are refused with 400.
- [ ] On an Active Scene only Pending Beats can be removed; a Finished Scene refuses every change with 409.
- [ ] A Player and another Campaign's Keeper get 404 from every Beat endpoint.
- [ ] CONTEXT.md is updated.
- [ ] Unit and integration tests cover the status rules, the limits, and ordering.
- [ ] Playwright E2E covers the beats scenarios "The Keeper prepares Beats", "A Beat needs a title", "A Scene has at most 50 Beats", and "A Finished Scene's Beats are read-only".

## Refinement Protocol
A change to the Beat model or rules updates the beats spec, its ux.md, CONTEXT.md, and tests together.

## Follow-ups

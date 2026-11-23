---
id: PBI-MEN-001
status: todo
blocked_by: [PBI-SPL-009]
---

# PBI-MEN-001: Mention this Scene's material

## Directive
Let the Keeper type "@" in a Scene's Keeper notes to mention this Scene's Investigators, Non-Player Entities, Items, and Handouts. Each Mention shows the target's current name, or "Removed: <last known name>" once the target is deleted.

**Scope:**
- **UX pass first:** follow the UX/UI designer skill (`.claude/commands/ux-ui-designer-skill/SKILL.md`) for Mentions, covering this PBI and PBI-MEN-002 to PBI-MEN-004. Cover the "@" typeahead and its grouping, how a Mention looks in the editor and in the read-only notes, the hover summary with its keyboard and touch fallback, and the Removed state. Present 2-3 options, let the human choose, and record the result in `specs/mentions/ux.md`, linked from the spec.
- **Rich text:** the Mention node in the frontend and backend allowlists, accepted only in Scene Keeper notes and checked for shape only, with an amendment to ADR 0015.
- **Resolution:** the Scene read returns `keeperNotesMentions` with current names, scoped to the Campaign, and null for missing targets. Investigator names are read from Campaign Play through a port.
- **Typeahead:** this Scene's material only: the Investigators present (or the Approved Investigators while Prepared), the linked Non-Player Entities and Items, and the Scene's Handouts and its linked Items' Handouts.
- **Glossary:** add **Mention** to CONTEXT.md: "A reference in Scene Keeper notes to an Investigator, Non-Player Entity, Item, or Handout, shown with its current name." _Avoid_: tag, reference, link.
- **Tests:** unit, integration, Storybook, and E2E.
- **Out of scope:** the rest of the Campaign (PBI-MEN-002), clicking (PBI-MEN-003), hover summaries (PBI-MEN-004), and Mentions outside Scene Keeper notes.

## Dependencies
- Blocked by: PBI-SPL-009 (Mentions are saved through the Keeper notes endpoint).
- Must merge before: PBI-MEN-002, PBI-MEN-003, and PBI-MEN-004 (they build on the node and resolution).

## Context
Read: [mentions spec](../../../specs/mentions/spec.md), Architecture (Scope, Mention targets, Mention node, Save, Resolution, Suggestions) and Constraints; [scenario-preparation spec](../../../specs/scenario-preparation/spec.md), the rich-text constraint; [ADR 0015](../../adr/0015-store-rich-text-as-validated-lexical-json.md).
- Frontend and backend validators must agree on the node; extend the shared rich-text fixtures.
- A save is never refused because a target no longer exists.

## Verification
- [ ] The UX specification is recorded and linked from the spec before UI work starts.
- [ ] A Mention of this Scene's material is inserted, saved, and shown with the target's current name.
- [ ] A renamed target shows its new name; a deleted target shows "Removed: <last known name>".
- [ ] Any other rich-text field refuses the Mention node with 400.
- [ ] Resolution never returns a name from another Campaign.
- [ ] CONTEXT.md and ADR 0015 are updated.
- [ ] Unit and integration tests cover node validation, resolution, and Campaign scoping.
- [ ] Playwright E2E covers the mentions scenarios "The Keeper mentions a linked Non-Player Entity", "A Mention shows the target's current name", "A Mention of a deleted target shows as removed", "A save with a Mention of a deleted target is accepted", "Mentions are refused outside Scene Keeper notes", and "Mentions never resolve across Campaigns".

## Refinement Protocol
A change to the Mention node or resolution updates the mentions spec, its ux.md, ADR 0015, CONTEXT.md, the shared rich-text fixtures, and tests together.

## Follow-ups
- Mentions in Item and NPC Profile Keeper notes.
- Mentions in Beats.

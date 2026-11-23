---
id: PBI-MEN-004
status: todo
blocked_by: [PBI-MEN-001]
---

# PBI-MEN-004: Mention hover summaries

## Directive
Show a Keeper-only summary of a Mention's target when the Keeper hovers over or focuses it, and when they tap it on touch screens, so the Keeper can check a detail without leaving the notes.

**Scope:**
- **UI primitives:** add Radix HoverCard and Popover to the shared UI components.
- **Summaries:** the content per target type listed in the mentions spec, as laid out by the PBI-MEN-001 UX pass: Investigator values from the Character Sheet and presence, Non-Player Entity details and the Player-facing name when linked here, an Item's holder and whether it is in play, and a Handout's owner and Reveal status. A removed target shows "Removed: <last known name>".
- **Tests:** unit, Storybook, and E2E.
- **Out of scope:** editing anything from the summary.

## Dependencies
- Blocked by: PBI-MEN-001 (the node and resolution).
- Must merge before: None.

## Context
Read: [mentions spec](../../../specs/mentions/spec.md), Architecture (Hover summary) and Constraints; [mentions ux](../../../specs/mentions/ux.md).
- Summaries are Keeper-only and read through the Keeper's existing reads, or a summary read if the design adds one.
- Reveal status counts only the Investigators present.

## Verification
- [ ] Hover, keyboard focus, and tap each open the summary; Escape closes it.
- [ ] Each target type shows the fields the spec lists.
- [ ] Unit tests cover each summary and the removed state.
- [ ] Storybook stories cover each target type.
- [ ] Playwright E2E covers the mentions scenarios "Hovering over a Mention shows its summary" and "A Handout summary shows its Reveal status".

## Refinement Protocol
A change to summary content updates the mentions spec, its ux.md, and tests together.

## Follow-ups

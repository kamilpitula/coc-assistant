---
id: PBI-MEN-003
status: todo
blocked_by: [PBI-MEN-001]
---

# PBI-MEN-003: Open a Mention

## Directive
Make a Mention open its target. On the Keeper's Active Scene page, a Mention of linked material opens the matching side panel. Anywhere else it opens the target's page, and a modifier click or middle-click always opens a new tab.

**Scope:**
- **Click:** the side-panel mapping and page routes from the mentions spec. A Non-Player Entity linked more than once opens its first link's panel.
- **Removed:** a Mention of a removed target is not a link.
- **Accessibility:** keyboard activation, following the PBI-MEN-001 UX record.
- **Tests:** unit, Storybook, and E2E.
- **Out of scope:** hover summaries (PBI-MEN-004).

## Dependencies
- Blocked by: PBI-MEN-001 (the node and resolution).
- Must merge before: None.

## Context
Read: [mentions spec](../../../specs/mentions/spec.md), Architecture (Click); [mentions ux](../../../specs/mentions/ux.md); [ADR 0027](../../adr/0027-side-panels-and-origins-are-url-search-params.md) (side panels as URL search params).
- Opening a side panel keeps Run open.

## Verification
- [ ] Each target type opens its side panel when one fits on the Active Scene page, and its page otherwise.
- [ ] A modifier click and a middle-click open the page in a new tab.
- [ ] A removed Mention is not a link.
- [ ] Unit tests cover the mapping for every target type and context.
- [ ] Playwright E2E covers the mentions scenarios "Clicking a Mention on the Active Scene opens its side panel" and "Clicking a Mention of unlinked material opens its page".

## Refinement Protocol
A change to click targets updates the mentions spec, its ux.md, and tests together.

## Follow-ups

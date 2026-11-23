---
id: PBI-MEN-002
status: todo
blocked_by: [PBI-MEN-001]
---

# PBI-MEN-002: Mention anything in the Campaign

## Directive
Extend the "@" typeahead beyond this Scene, so the Keeper can mention any Approved Investigator, Non-Player Entity, Item, or Handout in the Campaign. This Scene's material stays listed first.

**Scope:**
- **API:** the Keeper-only `mention-targets` endpoint, with Handouts carrying their owning Scene or Item.
- **Typeahead:** a second group for the rest of the Campaign, with Handouts grouped by owner, as recorded by the PBI-MEN-001 UX pass.
- **Tests:** unit, integration, and E2E.
- **Out of scope:** clicking and hover summaries.

## Dependencies
- Blocked by: PBI-MEN-001 (the node, resolution, and typeahead).
- Must merge before: None.

## Context
Read: [mentions spec](../../../specs/mentions/spec.md), Architecture (Suggestions), Constraints, and Regression Guardrails; [mentions ux](../../../specs/mentions/ux.md).
- Only Approved Investigators are offered.
- A Player or another Campaign's Keeper gets 404.

## Verification
- [ ] The typeahead lists this Scene's material first, then the rest of the Campaign, filtered by the typed name.
- [ ] A Submitted Investigator is never offered.
- [ ] `mention-targets` answers 404 to a Player and to another Campaign's Keeper.
- [ ] Unit and integration tests cover ranking, grouping, and authorization.
- [ ] Playwright E2E covers the mentions scenarios "This Scene's material is suggested first", "Only Approved Investigators can be mentioned", and "Mention targets are the Keeper's alone".

## Refinement Protocol
A change to the candidate set or ranking updates the mentions spec, its ux.md, and tests together.

## Follow-ups

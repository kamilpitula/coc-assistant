---
id: PBI-SPL-003
status: todo
blocked_by: [PBI-SPL-001, PBI-SP-008]
---

# PBI-SPL-003: Give and Take Back Items

## Directive
Build the end-to-end ability for a Keeper to give an Item to an Investigator, take it back, and reveal an Item to Investigators present, and for a Player to see the Items their Investigator holds.

**Scope:**
- **Domain, API, persistence:** give, take back, and Item Reveals, as in the spec; giving reveals the Item to the holder.
- **Live updates:** `myItems` to the holder's Player and `sceneReveals` to the Keeper group.
- **UI:** give and take-back controls for the Keeper and the Investigator's Items for the Player, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** Players passing, dropping, or destroying Items; Gear on the Character Sheet.

## Dependencies
- Blocked by: PBI-SPL-001 (Active Scene); PBI-SP-008 (Items).
- Must merge before: None.

## Context
Read: `specs/scene-play/spec.md`
- API Contracts: give, take-back, mine/items, reveals with subject type Item.
- Scenarios: giving and taking back an Item.
Read: `CONTEXT.md` (Item, Reveal, Clue).

## Verification
- [ ] The Keeper can give an Item to an Approved Investigator and take it back; only the Keeper can.
- [ ] The holder's Player sees the Item among their Investigator's Items and Clues, and keeps the Clue after it is taken back.
- [ ] Unit, integration, and E2E tests cover holder changes, live updates, and authorization.

## Refinement Protocol
Before implementation, decide and record in the spec whether giving or taking back an Item requires an Active Scene and an Investigator present; the grilling session on 2026-10-17 left this open.

## Follow-ups

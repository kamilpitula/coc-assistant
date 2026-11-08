---
id: PBI-DICE-008
status: todo
blocked_by: [PBI-DICE-005]
---

# PBI-DICE-008: Roll Requests in the Scene History

## Directive
Show each Scene's Roll Requests inside that Scene in the Scene History, so Campaign Members can look back at what was rolled where.

**Scope:**
- **Scene History:** Roll Request cards listed within their Scene; the Keeper sees all, a Player sees Public ones only.
- **UI:** follows the roll-requests ux.md and the Scene History section of the scene-play ux.md.
- **Out of scope:** treating Roll Requests as Clues.

## Dependencies
- Blocked by: PBI-DICE-005 (Roll Requests and the card).
- Must merge before: None.

## Context
Read: [roll-requests spec](../../../specs/roll-requests/spec.md), Scene History; [scene-play spec](../../../specs/scene-play/spec.md), `GET .../scene-history`; the [PBI-SPL-004 design record](../../scene-play/issues/04-scene-history.design.md).

## Verification
- [ ] The Scene History lists each Scene's Roll Requests within its visibility.
- [ ] A Player never receives a Keeper-only Roll Request through the Scene History.
- [ ] Unit tests cover the projection per role; Playwright E2E covers a Public Roll Request appearing in the Scene History for a Player and a Keeper-only one appearing only for the Keeper.

## Refinement Protocol
A change here updates the roll-requests and scene-play specs, the scene-play ux.md Scene History section, and tests together.

## Follow-ups

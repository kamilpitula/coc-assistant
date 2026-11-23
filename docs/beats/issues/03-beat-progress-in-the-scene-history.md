---
id: PBI-BEAT-003
status: todo
blocked_by: [PBI-BEAT-002]
---

# PBI-BEAT-003: Beat progress in the Scene History

## Directive
Show the Keeper each played Scene's Beat progress in the Scene History, such as "3 reached, 1 skipped, of 6", without Players ever receiving it.

**Scope:**
- **API:** Keeper-only Beat counts per Scene in the Scene History response.
- **Scene History page:** the Keeper's summary line on each Scene, as recorded by the PBI-BEAT-001 UX pass.
- **Tests:** unit, integration, Storybook, and E2E.
- **Out of scope:** showing individual Beats in the Scene History.

## Dependencies
- Blocked by: PBI-BEAT-002 (Beats get their states during play).
- Must merge before: None.

## Context
Read: [beats spec](../../../specs/beats/spec.md), Architecture (Scene History, Live updates); [scene-play spec](../../../specs/scene-play/spec.md), the Scene History API contract; [beats ux](../../../specs/beats/ux.md); the [PBI-SPL-004 design record](../../scene-play/issues/04-scene-history.design.md).
- A Player's Scene History never carries Beat counts.

## Verification
- [ ] The Keeper's Scene History shows each Scene's reached, skipped, and total counts, updated live after marking.
- [ ] A Player's Scene History response has no Beat counts.
- [ ] Unit and integration tests cover the counts and their absence for Players.
- [ ] Playwright E2E covers the beats scenarios "The Keeper sees Beat progress in the Scene History" and "Players never see Beats".

## Refinement Protocol
A change to the Scene History Beat line updates the beats spec, the scene-play spec Scene History contract, its ux.md, and tests together.

## Follow-ups

---
id: PBI-SPL-001
status: todo
blocked_by: [PBI-SP-002]
---

# PBI-SPL-001: Start and Finish a Scene

## Directive
Build the end-to-end ability for a Keeper to start any Prepared Scene with chosen Approved Investigators present, change who is present, and finish it, with at most one Active Scene per Campaign. Players see that a Scene is in progress, and present Players see its title and location.

**Scope:**
- **Design record first:** an architect decision record (`01-start-and-finish-a-scene.design.md`) for how Scene Play reaches the Scene aggregate in Scenario Preparation, where Investigators present and Reveals are stored, how one Active Scene per Campaign holds under concurrency, and how Reveal snapshots (rich text and files) are stored, so PBI-SPL-002 builds on it.
- **Domain, API, persistence:** start (with "finish the Active Scene first" in the same transaction), finish, change Investigators present, and read the Active Scene, as in the spec.
- **Campaign Wall:** Public Wall Entries for Scene started and Scene finished.
- **Live updates:** the `activeScene` topic, with ADR 0009's topic list updated.
- **UI:** the Keeper's run controls, the Player's Active Scene view, and the Active Scene card on the Campaign overview, designed through the UX designer skill first (`specs/scene-play/ux.md`, linked from the spec).
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** Reveals and Clues (PBI-SPL-002), Items (PBI-SPL-003), Scene History (PBI-SPL-004), Roll Requests, Combat.

## Dependencies
- Blocked by: PBI-SP-002 (Scenes and their status).
- Must merge before: PBI-SPL-002, PBI-SPL-003.

## Context
Read: `specs/scene-play/spec.md`
- Blueprint: Ownership, API Contracts (start, finish, present-investigators, active-scene), Campaign Wall, Live updates.
- Constraints: one Active Scene, Approved Investigators only, starting reveals nothing.
- Scenarios: starting, out-of-order start, second Active Scene refused, finish and start, concurrent starts, non-present Player view.
Read: `specs/scenario-preparation/spec.md` (Scene status), `docs/adr/0008-cross-functionality-reads-through-a-consumer-owned-port.md`, `docs/adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md`, `CONTEXT.md` (Active Scene, Investigators present).

## Verification
- [ ] The Keeper can start a Prepared Scene of any Scenario with Approved Investigators present, change who is present, and finish it.
- [ ] A second start is refused with 409 unless the Keeper finishes the Active Scene first; concurrent starts leave exactly one Active Scene.
- [ ] Present Players see the title and location; other Players see only that the Scene is in progress; both update live.
- [ ] Starting and finishing create Public Wall Entries naming the Scene title.
- [ ] Unit, integration, and E2E tests cover the lifecycle, concurrency, authorization, and Campaign isolation.

## Refinement Protocol
If the design record changes the ownership split, update both specs' Architecture sections before implementation.

## Follow-ups

---
id: PBI-SPL-001
status: done
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
- [x] The Keeper can start a Prepared Scene of any Scenario with Approved Investigators present, change who is present, and finish it.
- [x] A second start is refused with 409 unless the Keeper finishes the Active Scene first; concurrent starts leave exactly one Active Scene.
- [x] Present Players see the title and location; other Players see only that the Scene is in progress; both update live.
- [x] Starting and finishing create Public Wall Entries naming the Scene title.
- [x] Unit, integration, and E2E tests cover the lifecycle, concurrency, authorization, and Campaign isolation.

## Refinement Protocol
If the design record changes the ownership split, update both specs' Architecture sections before implementation.

## Follow-ups
- Any future PBI that adds un-approving an Investigator or removing a Player must define the effect on Investigators present (spec: "An unapproved Investigator is never present"). Approved is terminal today, so no behavior was designed.
- Residual race: a Scene child write allowed on an Active Scene (link, edit link, add or edit Handout) that races a Finish can land on a Finished Scene. Decide whether those writes touch `Version`.
- PBI-SPL-002: build Reveals on D3, and extend the D6 guards so that a blob or link a Reveal references is never deleted (ADR 0021/0022). This includes a Scene file-Handout replace on a Prepared Scene, which does not touch `Version` in PBI-SPL-001: a Reveal that snapshots the old file key between a start and the replace's commit would lose its file.
- The Storybook stories of the `scene-play` slice are type-checked and linted but were not rendered or run in Storybook in this PBI. Run them once in Storybook before relying on them.
- E2E: the first tests of a full run can fail at sign-in under LocalDB memory pressure (PBI-WF-005); the new journeys sign in a Keeper and two Players, so `e2e/tests/active-scene.spec.ts` sets a 240 second timeout. Revisit when the harness is faster.
- An Item file replace that loses the race with the Item coming into play returns 409 with the "keeps its Handouts" title; the UI shows the generic save failure for it. A dedicated message could be designed if Keepers meet it.

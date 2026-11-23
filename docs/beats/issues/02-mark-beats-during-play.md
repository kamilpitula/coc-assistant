---
id: PBI-BEAT-002
status: todo
blocked_by: [PBI-BEAT-001]
---

# PBI-BEAT-002: Mark Beats during play

## Directive
Let the Keeper track a Scene's progress on Run by marking Beats Reached or Skipped in one action, resetting mistakes, and adding Beats on the fly, with a "3 of 6 reached" summary.

**Scope:**
- **API:** the Beat state endpoint. It works only on an Active Scene, setting the same state again changes nothing, and each change publishes `scenes`.
- **Run:** a Beats section with marking, reset, add, removal of Pending Beats, and the summary, as recorded by the PBI-BEAT-001 UX pass.
- **Tests:** unit, integration, Storybook, and E2E.
- **Out of scope:** the Scene History (PBI-BEAT-003).

## Dependencies
- Blocked by: PBI-BEAT-001 (the Beat model and the UX specification).
- Must merge before: PBI-BEAT-003.

## Context
Read: [beats spec](../../../specs/beats/spec.md), Architecture (Beat API, Views), Constraints, and Regression Guardrails; [beats ux](../../../specs/beats/ux.md); [scene-play ux](../../../specs/scene-play/ux.md) section 21.3 (the Run layout).
- Marking creates no Wall Entry or Reveal, and nothing reaches a Player.

## Verification
- [ ] On Run the Keeper marks a Beat Reached or Skipped and resets it; the summary updates.
- [ ] Marking a Prepared or Finished Scene's Beat is refused with 409.
- [ ] A Reached or Skipped Beat cannot be removed during play.
- [ ] A change in one Keeper tab appears in the other without reloading, and no Player receives a signal.
- [ ] Unit and integration tests cover the state rules and the audience of the live signal.
- [ ] Playwright E2E covers the beats scenarios "The Keeper marks a Beat Reached during play", "The Keeper marks a Beat Skipped", "The Keeper resets a Beat marked by mistake", "The Keeper improvises a Beat during play", "A Reached Beat cannot be removed during play", "Beats cannot be marked before the Scene starts", and "Marking a Beat leaves no trace on the Wall".

## Refinement Protocol
A change to marking updates the beats spec, its ux.md, and tests together.

## Follow-ups

---
id: PBI-SPL-002
status: done
blocked_by: [PBI-SPL-001, PBI-SP-004, PBI-SP-005]
---

# PBI-SPL-002: Reveal to Investigators and Clues

## Directive
Build the end-to-end ability for a Keeper to reveal Player-facing Handouts and Non-Player Entity descriptions of the Active Scene to all or chosen Investigators present, and for each Player to see what reached their Investigator in the Active Scene and as Clues.

**Scope:**
- **Domain, API, persistence:** Reveals with snapshots, targeting, and Clue reads for the Player and the Keeper, as in the spec and the PBI-SPL-001 design record.
- **Live updates:** `myClues` to each targeted Player's account group and `sceneReveals` to the Keeper group.
- **UI:** reveal controls for the Keeper, revealed content in the Player's Active Scene view (Map shown prominently, Read-aloud styled), and an Investigator's Clues, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage, including no signal or data reaching untargeted Players.
- **Out of scope:** revealing Items and giving them (PBI-SPL-003), Scene History (PBI-SPL-004). File Handouts are revealed once PBI-SP-007 has merged; until then only rich-text Handouts can be revealed.

## Dependencies
- Blocked by: PBI-SPL-001 (Active Scene and the design record); PBI-SP-004 (Player-facing Non-Player Entity descriptions); PBI-SP-005 (Handouts).
- Must merge before: PBI-SPL-004.

## Context
Read: `specs/scene-play/spec.md`
- API Contracts: reveals, clues, active-scene.
- Constraints and Regression Guardrails: snapshots, targeting, Keeper-facing Handouts and profiles never revealed, Clues belong to the Investigator.
Read: `CONTEXT.md` (Reveal, Clue), `docs/adr/0015-store-rich-text-as-validated-lexical-json.md`.
Design record: `docs/scene-play/issues/02-reveal-to-investigators-and-clues.design.md`.

## Verification
- [x] The Keeper can reveal a Player-facing Handout or Non-Player Entity description to all or chosen Investigators present; Keeper-facing Handouts are refused.
- [x] A Player receives only Reveals that reached their Investigator, unchanged by later edits, in the Active Scene and as Clues.
- [x] The Keeper can read every Investigator's Clues.
- [x] Untargeted Players receive no data and no live signal for a Reveal, proven by integration and E2E tests.

## Refinement Protocol
Never weaken the targeting guardrail. If snapshot storage changes, update the design record and both specs together.

## Follow-ups
- PBI-SPL-003: count "has a Reveal" as in play for Items, through a port, before accepting `subject.type = Item` (ADR 0022), and extend the blob guard to Item-Handout Reveals.
- PBI-SPL-004: Scene History reuses the Reveal views and the Reveal file endpoint.
- The Storybook stories added by this PBI (`scene-play`, and the image-description field and the Handout image and document stories of `scenario-preparation`) are type-checked and linted but were not rendered or run in Storybook. Run them once in Storybook before relying on them.
- The reveal dialog's summary line uses a middle dot between kind and visibility, where the UX sketch writes a full stop; confirm the intended separator with the UX owner.
- E2E: the journeys of `e2e/tests/reveals.spec.ts` sign in a Keeper and two Players, so the file sets a 240 second timeout, like `active-scene.spec.ts`; LocalDB memory pressure (PBI-WF-005) can still fail a sign-in. Revisit when the harness is faster.
- Image, Map, and Document Reveals fetch their file once per Reveal and keep it for the session (the snapshot never changes); there is no eviction. Revisit if a long session holds many large images.

---
id: PBI-SPL-002
status: todo
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

## Verification
- [ ] The Keeper can reveal a Player-facing Handout or Non-Player Entity description to all or chosen Investigators present; Keeper-facing Handouts are refused.
- [ ] A Player receives only Reveals that reached their Investigator, unchanged by later edits, in the Active Scene and as Clues.
- [ ] The Keeper can read every Investigator's Clues.
- [ ] Untargeted Players receive no data and no live signal for a Reveal, proven by integration and E2E tests.

## Refinement Protocol
Never weaken the targeting guardrail. If snapshot storage changes, update the design record and both specs together.

## Follow-ups

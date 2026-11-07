---
id: PBI-SPL-004
status: done
blocked_by: [PBI-SPL-002]
---

# PBI-SPL-004: Scene History

## Directive
Build the Scene History for every Campaign Member: Active and Finished Scenes of all Scenarios in the order they were started, with each Player seeing only what reached their Investigator.

**Scope:**
- **API:** `GET /api/campaigns/{campaignId}/scene-history` with Keeper and Player projections, as in the spec.
- **Live updates:** the `sceneHistory` topic.
- **UI:** a Scene History page, designed through the UX designer skill first.
- **Tests:** unit, integration, and E2E coverage.
- **Out of scope:** Roll Requests and Combat records.

## Dependencies
- Blocked by: PBI-SPL-002 (Reveals filter the Player projection).
- Must merge before: None.

## Context
Read: `specs/scene-play/spec.md`
- API Contracts: scene-history.
- Scenarios: Scene History filtered to Clues; unrevealed material stays Keeper-only; no Prepared Scene listed.
Read: `CONTEXT.md` (Scene History).

## Verification
- [x] Every Campaign Member sees Active and Finished Scenes across Scenarios in start order, and no Prepared Scene.
- [x] A Player sees only Reveals that reached their Investigator; the Keeper sees all.
- [x] Unit, integration, and E2E tests cover ordering, filtering, and Campaign isolation.

## Refinement Protocol
If the Player projection changes, update the spec's Regression Guardrails first.

## Follow-ups
- Navigation UX tab diagram: `specs/navigation/ux.md` section 2 names the amended tab order (with Scene History) on line 50, but its ASCII tab diagram still omits Scene History. Left untouched as a Phase 0 design artifact; update the diagram.
- Roll Requests: needs a skill-roll rules document in `docs/game-rules/` first; results are Roll Records, rolled by the server with Keeper-entered physical results allowed, visible to the roller and the Keeper and optionally shared, with secret Keeper rolls.
- Combat: needs a combat rules document in `docs/game-rules/` first; v1 direction is a DEX-order turn tracker with damage and Hit Point changes.
- Sanity rolls during play: needs its rules document first.

---
id: PBI-DICE-005
status: todo
blocked_by: [PBI-DICE-001, PBI-DICE-002]
---

# PBI-DICE-005: Request a roll in the Active Scene

## Directive
Let the Keeper ask one or more Investigators present to roll a skill, a characteristic, or Luck, let each targeted Player roll from the Active Scene, and record the request and its results live on the Campaign Wall.

**Scope:**
- **UX first:** run the UX designer skill for Roll Requests (the Keeper's request form, the waiting-rolls panel, the badge, the Wall card, and hidden, cancelled, and pushed states for later PBIs), present 2-3 options, and record the chosen one in `specs/roll-requests/ux.md`, linked from its spec.
- **Design record:** an Architect design record decides where Roll Requests are stored and how the Wall reads a Roll Request card.
- **Dice:** the percentile roll resolver.
- **Roll Requests:** creating a Public Roll Request with a target, an optional message, and Difficulty and Bonus and Penalty Dice per Investigator; rolling by the Investigator's Player or by the Keeper; the experience-check flag on each skill Roll Record.
- **Wall:** the `RollRequest` Wall Entry kind and card with live results; the card cannot be removed.
- **Notification:** the waiting-rolls panel, the badge on the Campaign navigation, and the assertive announcement, through the new live topics.
- **Out of scope:** hidden rolls (PBI-DICE-006), cancelling (PBI-DICE-007), the Scene History (PBI-DICE-008), pushing (PBI-DICE-009), and the Opposing Value helper (PBI-DICE-010).

## Dependencies
- Blocked by: PBI-DICE-001 (the rules the resolver implements), PBI-DICE-002 (the Dice module and Roll Record shape).
- Must merge before: PBI-DICE-006, PBI-DICE-007, PBI-DICE-008, PBI-DICE-009, PBI-DICE-010.

## Context
Read: [roll-requests spec](../../../specs/roll-requests/spec.md); [dice spec](../../../specs/dice/spec.md), percentile roll resolver; [campaign-play spec](../../../specs/campaign-play/spec.md), Wall Entry kinds and the live connection contract; [scene-play spec](../../../specs/scene-play/spec.md); [ADR 0009](../../adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md); [ADR 0024](../../adr/0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md); the skill rolls document from PBI-DICE-001; [character rules section 16.1](../../game-rules/coc7_character_creation_and_development_rules.md#161-skill-experience-tick-during-play).
- Values come from the Approved Character Sheet; a skill the Investigator lacks uses its catalog base value.
- Live updates use the closed topic set; no new hub methods.

## Verification
- [ ] The UX specification and the design record are recorded and linked.
- [ ] The resolver has unit tests for every Success Level, Difficulty, and Bonus and Penalty Dice, named after their rule sections.
- [ ] The Keeper creates a Public Roll Request; targeted Players see it in the panel, the badge, and an announcement without reloading.
- [ ] The Player or the Keeper rolls it once; a second roll returns 409; the card shows every face, the target values, and the Success Level to every connected Campaign Member without reloading.
- [ ] Removing a `RollRequest` Wall Entry returns 409.
- [ ] Unit tests cover the use cases, authorization, and projections; Storybook covers the panel and card; Playwright E2E covers the roll-requests scenarios "Keeper requests a skill roll from two Investigators", "A Player rolls a Requested Roll", "The Keeper rolls for an absent Player", "Per-Investigator Difficulty and Penalty Die", "A skill the Investigator lacks uses its catalog base value", "A Player cannot roll for another Investigator", "A Requested Roll is rolled only once", "A successful skill roll earns an experience check", "A success with a Bonus Die earns no experience check", "A Roll Request needs an Active Scene", "Only Investigators present can be targeted", "A Roll Request card cannot be removed", and "Players cannot create Roll Requests".

## Refinement Protocol
A change to Roll Requests updates the roll-requests spec and ux.md, the campaign-play Wall Entry contract when the card changes, the design record, and tests together.

## Follow-ups

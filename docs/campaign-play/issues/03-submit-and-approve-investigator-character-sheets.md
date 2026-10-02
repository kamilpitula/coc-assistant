# PBI-CP-003: Submit and Approve Investigator Character Sheets

## Directive
Build the end-to-end ability for a Player to submit a Character Sheet for an Investigator and for the Keeper to approve it. Preserve the rule that an Investigator is not ready for play until explicit Character Approval.

**Scope:**
- Investigator and Character Sheet domain behavior, Azure SQL persistence, API, Player and Keeper experiences, and focused unit, integration, and E2E coverage.
- Campaign ownership, one-Investigator-per-Player behavior, submission, approval, and readiness authorization.
- Do not implement Wall Entries, Presence, or live updates.

## Dependencies
- Blocked by: PBI-CP-002: Manage Campaign Invites and Player Membership
- Must merge before: PBI-CP-006

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Campaign Structure, Character Readiness, and Persistence.
- Constraints: Investigator Campaign ownership and Character Approval.
- Contract: Investigator submission and approval.
- Regression Guardrails: Investigators never cross Campaign boundaries and unapproved Investigators are not ready for play.

Read: `docs/game-rules/coc7_character_creation_and_development_rules.md`
- Section 1: Investigator data model, which defines the Character Sheet content.

## Verification
- [ ] A Player can submit a Character Sheet for an Investigator in the Player's Campaign.
- [ ] The Keeper can approve the submitted Character Sheet and the Investigator becomes ready for play.
- [ ] Cross-Campaign access, duplicate ownership, and Player approval attempts are rejected.
- [ ] Unit, integration, and E2E tests cover submission, approval, authorization, and readiness state.

## Refinement Protocol
If the Character Sheet needs a rule or field not covered by `docs/game-rules/`, add it there first and reference it; do not define it in the spec or code. If the Character Sheet vocabulary or readiness states change, update the domain state transition and acceptance scenarios together. Keep Investigator ownership exclusive to one Campaign and one Player.

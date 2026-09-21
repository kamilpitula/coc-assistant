# PBI-CP-001: Create a Campaign and Establish Keeper Membership

## Directive
Build the end-to-end ability for an authenticated Account to create a persistent Campaign and become its Keeper. Establish the Campaign ownership and authorization boundary required by the rest of Campaign Play.

**Scope:**
- Campaign domain model, Azure SQL persistence, API, Keeper-facing Campaign experience, and focused unit, integration, and E2E coverage.
- Campaign ownership, Keeper authorization, and the relationship needed to support multiple Play Sessions.
- Do not implement Campaign Invites, Players, Investigators, Wall Entries, Presence, or live updates.

## Dependencies
- Blocked by: None
- Must merge before: PBI-CP-002, PBI-CP-004

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Campaign Structure, Identity and access, Persistence, and Dependencies.
- Contract: Keeper creates a persistent Campaign.
- Regression Guardrails: Campaign data remains within its Campaign boundary.

## Verification
- [ ] An authenticated Account can create a Campaign and is recorded as its Keeper.
- [ ] Campaign ownership and Keeper authorization prevent access through an unrelated Campaign.
- [ ] Unit, integration, and E2E tests cover persistence, authorization, and the creation workflow.

## Refinement Protocol
If the Identity and Access contract changes, update the Account-to-Keeper boundary before implementation. Keep Campaign ownership aligned with the authoritative glossary and do not introduce a second identity model.

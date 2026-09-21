# PBI-CP-005: Show Campaign Presence

## Directive
Build the end-to-end Presence experience for connected Campaign members. Presence must be scoped to Campaign membership and must reflect connection and disconnection without exposing unrelated Campaign members.

**Scope:**
- Presence domain and connection lifecycle, live collaboration integration, API or hub authorization, Campaign UI, and focused unit, integration, and E2E coverage.
- Member connection, disconnection, Campaign-scoped Presence state, and authorized rendering.
- Do not implement Wall Entry updates or Investigator stat updates.

## Dependencies
- Blocked by: PBI-CP-002: Manage Campaign Invites and Player Membership
- Must merge before: PBI-CP-006

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Live collaboration, Presence, and Identity and access.
- Contract: Player joining makes Presence available to connected Campaign members.
- Regression Guardrails: Campaign data remains within its Campaign boundary.

## Verification
- [ ] Connected Campaign members can see Presence for members of their Campaign.
- [ ] Presence changes on connection and disconnection without manually reloading the Campaign view.
- [ ] Non-members cannot subscribe to or receive a Campaign's Presence.
- [ ] Unit, integration, and E2E tests cover connection lifecycle, authorization, and Campaign scoping.

## Refinement Protocol
If the live collaboration transport or Presence states change, update the connection contract and the Campaign membership authorization together. Keep Presence limited to the v1 live collaboration scope.

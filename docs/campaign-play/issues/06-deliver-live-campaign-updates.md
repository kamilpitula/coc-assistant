# PBI-CP-006: Deliver Live Campaign Updates

## Directive
Build the end-to-end live update path for Campaign Play. Connected members receive authorized Wall Entry changes, a Player's own Investigator stat changes, and Presence changes without manually reloading the Campaign view.

**Scope:**
- Azure SignalR integration, server-side publication and authorization, Campaign UI update handling, and focused unit, integration, and E2E coverage.
- Public Wall Entry delivery, Keeper-only filtering, own-Investigator stat updates, Presence updates, reconnect behavior, and Campaign scoping.
- Do not implement offline notifications, scheduling, dice automation, billing, or unrelated real-time features.

## Dependencies
- Blocked by: PBI-CP-003: Submit and Approve Investigator Character Sheets; PBI-CP-004: Author and Protect Campaign Wall Entries; PBI-CP-005: Show Campaign Presence
- Must merge before: None

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Live collaboration and Identity and access.
- Constraints: v1 live updates and Presence only.
- Contract: Connected members receive Wall Entry, own-Investigator stat, and Presence changes.
- Regression Guardrails: Keeper-only Wall Entries never appear in Player live updates.

## Verification
- [ ] Connected Campaign members receive new Public Wall Entries without reloading.
- [ ] Players receive only their own Investigator stat changes, and Keeper-only Wall Entries remain excluded from Player updates.
- [ ] Presence changes and reconnect behavior preserve Campaign membership authorization.
- [ ] Unit, integration, and E2E tests cover publication, filtering, reconnect behavior, and end-to-end live updates.

## Refinement Protocol
If the SignalR contract or event payloads change, update the server publication policy, client handling, and live-update acceptance scenarios together. Keep authorization server-side and preserve the Keeper-only visibility invariant.

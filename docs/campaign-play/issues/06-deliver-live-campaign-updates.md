# PBI-CP-006: Deliver Live Campaign Updates

## Directive
Extend the live update foundation from PBI-CP-005 so that connected members receive authorized Wall Entry changes and changes to a Player's own Investigator without manually reloading the Campaign view. In v1 an own-Investigator change is a status change (Approved or Changes Requested); in-play stat changes will reuse the same `myInvestigator` topic once a play feature produces them.

**Scope:**
- Domain events and handlers for Wall Entry and Investigator changes, published through the existing publication policy ([ADR 0009](../../adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md), [ADR 0011](../../adr/0011-dispatch-domain-events-after-commit.md)).
- The `CampaignDataChanged` topics and their audiences:
  - `wallEntries`: Public changes go to `campaign:{id}`, and Keeper-only changes go to `campaign:{id}:keeper`.
  - `investigators` goes to `campaign:{id}:keeper`, so the Keeper sees submissions and resubmissions.
  - `myInvestigator` goes to the owning Player's `account:{accountId}`, so the Player sees Approved and Changes Requested.
- The Campaign overview's roster ([specs/campaign-overview/spec.md](../../../specs/campaign-overview/spec.md), Live updates):
  - `investigators` and `myInvestigator` also invalidate the members query;
  - an Investigator becoming Approved also publishes `members` to `campaign:{id}`.
- Client mappings from these topics to their queries, the Campaign UI update handling, and focused unit, integration, and E2E coverage.
- Reconnect behavior and Campaign scoping for the new topics.
- Do not implement offline notifications, scheduling, dice automation, billing, in-play stat tracking, or unrelated real-time features.

## Dependencies
- Blocked by: PBI-CP-003: Submit and Approve Investigator Character Sheets; PBI-CP-004: Author and Protect Campaign Wall Entries; PBI-CP-005: Show Campaign Presence
- Must merge before: None

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Live connection contract, Live collaboration, and Identity and access.
- Constraints: v1 live updates and Presence only.
- Contract: Connected members receive Wall Entry, own-Investigator, and Presence changes.
- Regression Guardrails: Keeper-only Wall Entries never appear in Player live updates. A Keeper-only change never produces a signal to `campaign:{id}`.

## Verification
- [ ] Connected Campaign members receive new Public Wall Entries without reloading.
- [ ] Players receive live changes only for their own Investigator, and no signal for a Keeper-only Wall Entry reaches a Player.
- [ ] The Keeper sees Investigator submissions without reloading.
- [ ] Presence changes and reconnect behavior preserve Campaign membership authorization.
- [ ] Unit, integration, and E2E tests cover publication, audience routing, reconnect behavior, and end-to-end live updates.

## Refinement Protocol
If the SignalR contract or event topics change, update the server publication policy, client topic mapping, and live-update acceptance scenarios together. Keep authorization server-side and preserve the Keeper-only visibility invariant.

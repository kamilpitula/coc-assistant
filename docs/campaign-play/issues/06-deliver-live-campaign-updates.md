---
id: PBI-CP-006
status: done
blocked_by: [PBI-CP-003, PBI-CP-004, PBI-CP-005]
pr: 19
---

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
  - an Investigator becoming Approved also publishes `members` to `campaign:{id}`;
  - the Investigator change announcements of [specs/campaign-overview/ux.md](../../../specs/campaign-overview/ux.md) section 5.2 (deferred here from PBI-CP-012, because without these topics they would fire only on a refetch after reconnect).
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
- [x] Connected Campaign members receive new Public Wall Entries without reloading.
- [x] Players receive live changes only for their own Investigator, and no signal for a Keeper-only Wall Entry reaches a Player.
- [x] The Keeper sees Investigator submissions without reloading.
- [x] Presence changes and reconnect behavior preserve Campaign membership authorization.
- [x] Unit, integration, and E2E tests cover publication, audience routing, reconnect behavior, and end-to-end live updates.

## Refinement Protocol
If the SignalR contract or event topics change, update the server publication policy, client topic mapping, and live-update acceptance scenarios together. Keep authorization server-side and preserve the Keeper-only visibility invariant.

## Follow-ups
- Add a CONTEXT.md note that the UI label 'Keeper only' is the Keeper-Only Wall Entry visibility.
- Announcement detection breaks a same-instant tie between two Wall Entries by comparing ids as text, while the server orders by the database's Guid order, so an entry created in the same instant as the previous newest may not be announced.
- A Wall Entry added in this tab is excluded from announcements by remembering its id when the confirmed response arrives; if the live signal and its refetch ever win the race against that response, the viewer's own post would be announced once.
- E2E "Campaign Presence Scenario 8" failed once and passed on retry in a full-suite run with 2 workers (three isolated repeats passed); its reconnect timing under load deserves a look.

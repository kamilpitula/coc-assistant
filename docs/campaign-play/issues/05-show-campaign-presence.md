# PBI-CP-005: Show Campaign Presence

## Directive
Build the end-to-end Presence experience for connected Campaign members, and the reusable live update foundation that PBI-CP-006 extends. Presence must be scoped to Campaign membership and must reflect connection and disconnection without exposing unrelated Campaign members.

**Scope:**
- Presence domain and connection lifecycle, live collaboration integration, API or hub authorization, Campaign UI, and focused unit, integration, and E2E coverage.
- Member connection, disconnection, Campaign-scoped Presence state, and authorized rendering.
- Live update foundation ([ADR 0009](../../adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md)):
  - the `/hubs/campaign` hub with `SubscribeToCampaign`;
  - the `campaign:{id}`, `campaign:{id}:keeper`, and `account:{accountId}` groups;
  - connections closing when the token expires;
  - the publication policy;
  - `PresenceChanged`, and `CampaignDataChanged` with the `members` topic, published from the `PlayerJoinedCampaign` handler;
  - Azure SignalR Service enabled only by configuration.
- Presence tracking: the `CampaignPresence` model and the in-memory `IPresenceTracker` ([ADR 0010](../../adr/0010-in-memory-presence-tracker-with-single-api-replica.md)).
- The `GET /api/campaigns/{campaignId}/members` roster endpoint.
- Frontend:
  - `shared/services/liveConnection.ts`;
  - the `CampaignLiveConnection` provider in the Campaign layout route;
  - the topic-to-query mapping in `liveTopics.ts`;
  - refetching every Campaign query after a reconnect;
  - the `/hubs` Vite proxy with WebSockets.
- The "At the table" UI from [specs/campaign-play/ux.md](../../../specs/campaign-play/ux.md).
- Do not implement Wall Entry updates or Investigator updates (topics `wallEntries`, `investigators`, `myInvestigator`).
- Do not provision Azure resources.

## Dependencies
- Blocked by: PBI-CP-002: Manage Campaign Invites and Player Membership; PBI-CP-011: Dispatch Domain Events After Commit
- Must merge before: PBI-CP-006

## Context
Read: `specs/campaign-play/spec.md` and `specs/campaign-play/ux.md`
- Blueprint: Presence, Campaign members API, Live connection contract, Live collaboration, and Identity and access.
- Contract: Player joining makes Presence available to connected Campaign members.
- Regression Guardrails: Campaign data remains within its Campaign boundary; roster and Presence never include Account ids or Investigator data.

## Verification
- [ ] Connected Campaign members can see Presence for members of their Campaign.
- [ ] Presence changes on connection and disconnection without manually reloading the Campaign view.
- [ ] Non-members cannot subscribe to or receive a Campaign's Presence.
- [ ] A Player joining sends `CampaignDataChanged` with `members` to `campaign:{id}` only.
- [ ] An expired token closes the connection, and the client reconnects and subscribes again.
- [ ] Unit, integration, and E2E tests cover connection lifecycle, authorization, and Campaign scoping, traced to the Presence scenarios in `spec.md`.

## Refinement Protocol
If the live collaboration transport or Presence states change, update the connection contract and the Campaign membership authorization together. Keep Presence limited to the v1 live collaboration scope.

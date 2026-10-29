# Deliver live updates through one Campaign hub with invalidation topics

Status: Accepted

Campaign Play needs live updates for Presence (PBI-CP-005), Wall Entries, and Investigators (PBI-CP-006), and later Campaign features will need more. The data they touch is protected by role: Keeper-only Wall Entries never reach Players, and a Player reads only their own Investigator. These read rules are already enforced by the REST read models. A live update path that carried full data would need a second, audience-specific copy of every rule.

Campaign Play hosts one authenticated, strongly typed SignalR hub, `Hub<ICampaignClient>` at `/hubs/campaign`, in `CocAssistant.CampaignPlay.Controllers`. The contract is in [specs/campaign-play/spec.md](../../specs/campaign-play/spec.md), Live connection contract.

- **Transport:** `AddSignalR()` always runs. Azure SignalR Service in Default mode is added only when `Azure:SignalR:ConnectionString` is configured. Local development, integration tests, and E2E run SignalR in-process with no emulator and no secrets.
- **Subscription:** a client calls `SubscribeToCampaign(campaignId)`. The hub checks membership through Campaign Play's Application layer and adds the connection to groups.
- **Groups:**
  - `campaign:{id}` holds every subscribed member;
  - `campaign:{id}:keeper` holds the Keeper's connections;
  - `account:{accountId}` holds all connections of one Account.

  The hub resolves the Account id once on connect, because `IUserIdProvider` is synchronous and cannot run the Account lookup.
- **Events:**
  - `PresenceChanged` carries the member's state, because Presence is ephemeral and has no REST read model.
  - Persisted data uses one invalidation event, `CampaignDataChanged {campaignId, topics}`, with a closed set of topics (`members`, `wallEntries`, `investigators`, `myInvestigator`, and `activeScene` from PBI-SPL-001, [ADR 0024](0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md)). The client refetches the affected queries through REST.
- **Audience:** one publication policy in `CocAssistant.CampaignPlay.Application` maps each event to its group. A Keeper-only change never produces a signal to `campaign:{id}`, because even an invalidation would reveal that a secret entry exists and when it was written.
- **Delivery:** best-effort. Events come from domain events dispatched after commit ([ADR 0011](0011-dispatch-domain-events-after-commit.md)), and a failed publish never fails the request. After a reconnect, the client subscribes again and refetches every query of the Campaign.
- **Token lifetime:** connections close when the access token expires (`CloseOnAuthenticationExpiration`). The client reconnects with a fresh token and subscribes again, which re-checks membership.
- **Reuse:** the SignalR plumbing has no Campaign concepts in it, so a later extraction does not need a rewrite. This covers the client wrapper (`frontend/src/shared/services/liveConnection.ts`), group naming, and connection lifecycle. A new Campaign feature adds a topic name and a client mapping from that topic to its query keys, with no new hub method.

## Considered Options
- Azure SignalR Service in Serverless mode. Rejected: Presence needs connect and disconnect events and a client-to-server subscribe call, which serverless mode delivers only through upstream webhooks and extra plumbing.
- Plain ASP.NET Core SignalR without Azure SignalR Service. Rejected as the production target, because the spec names Azure SignalR Service. Kept as the in-process mode for local development and tests.
- Full payloads per audience. Rejected: it duplicates the Keeper-only and Investigator visibility rules in the publication path, where a mistake leaks data.
- A hub method per event type. Rejected: every feature would extend the hub contract; topics keep it closed.
- A shared `LiveUpdates` functionality. Deferred: Campaign Play is the only consumer. Extract when something outside the Campaign needs live updates.

## Consequences
- Each data change costs the client one extra REST request. This is negligible at Campaign scale.
- Topics must stay coarse enough not to leak: a topic sent to a group must be one that every member of that group is allowed to know changed.
- Missed events are recovered only by the refetch after a reconnect; there is no replay or sequence number.
- Production hosting must allow cross-origin negotiate and WebSocket requests from Static Web Apps to the API, or use a linked backend. This is decided with the infrastructure, not here.
- Removing a member from a Campaign, when introduced, must also remove their connections from that Campaign's groups.

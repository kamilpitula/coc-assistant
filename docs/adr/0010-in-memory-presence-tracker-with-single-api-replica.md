# Track Presence in API memory and run a single API replica

Status: Accepted

Presence ([specs/campaign-play/spec.md](../../specs/campaign-play/spec.md), Presence) is derived by counting each member's open, subscribed connections per Campaign. A member is Connected from their first connection until their last one closes. The count must be correct across tabs and devices. Presence is not persisted and has no history. Azure SignalR Service ([ADR 0009](0009-live-updates-through-campaign-hub-with-invalidation-topics.md)) fans messages out across replicas, but it does not track which Accounts are connected to which Campaign. That state is ours to keep.

Presence rules live in a pure, side-effect-free `CampaignPresence` model. It turns connection opened and closed into member transitions, and it is unit-tested without SignalR. The `IPresenceTracker` port is declared in `CocAssistant.CampaignPlay.Application`. Its first adapter, in `CocAssistant.CampaignPlay.Infrastructure`, holds the state in memory and adds only thread safety. **The API therefore runs as a single replica** (Container Apps max replicas = 1) until the adapter is replaced.

## Considered Options
- A SQL table of connections. Rejected for now: a crashed replica leaves stale rows, which need a server-instance heartbeat and a cleanup job.
- Redis. Rejected for now: new infrastructure, while no Azure resources are provisioned yet (`infrastructure/terraform/main.tf`).
- In-memory behind a port, with a single replica (chosen).

## Consequences
- A restart clears all Presence. Clients reconnect, subscribe again, and rebuild it, so members briefly show as Not connected.
- Scaling out is blocked until the tracker is replaced. **Revisit when** the API needs more than one replica. The swap path is a Redis or SQL adapter for `IPresenceTracker`. `CampaignPresence`, the hub, and the clients do not change.
- Deployment must enforce max replicas = 1. This is a requirement for the infrastructure work that provisions Container Apps.

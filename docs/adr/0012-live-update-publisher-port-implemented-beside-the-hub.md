# Implement the live update publisher port beside the hub

Status: Accepted

Campaign Play publishes live updates through an Application port, `ICampaignLiveUpdates`, chosen by the publication policy in `CocAssistant.CampaignPlay.Application` ([ADR 0009](0009-live-updates-through-campaign-hub-with-invalidation-topics.md)). The adapter that sends them needs `IHubContext<CampaignHub, ICampaignClient>`, and the hub must live in `CocAssistant.CampaignPlay.Controllers` (spec, Live connection contract). The backend conventions say Infrastructure implements ports and Controllers only call Application services.

The adapter, `HubCampaignLiveUpdates`, lives in `CocAssistant.CampaignPlay.Controllers`, next to the hub type it needs. It holds no rules: the policy decides the audience, the adapter only maps the audience to a group name and sends. It is best-effort and logs failures. `AddCampaignPlayLiveUpdates()` in the same project registers it, and the composition root calls that alongside `AddCampaignPlayInfrastructure`.

## Considered Options
- Adapter in Infrastructure. Rejected: Infrastructure would have to reference Controllers to reach the hub type, which reverses the dependency direction.
- Adapter in the `CocAssistant.Api` composition root. Rejected: the Api project holds only startup and cross-cutting configuration.
- Adapter beside the hub in Controllers (chosen). A deliberate, documented exception to "Infrastructure implements ports", limited to the transport adapter of a hub.

## Consequences
- Controllers now implement one Application port. New hubs follow the same shape: the hub, its client interface, group naming, and the publisher adapter sit together in the functionality's Controllers project.
- Application stays free of SignalR; handlers and use cases are unit-tested with a recording `ICampaignLiveUpdates`.
- If live updates are extracted into a shared functionality later (ADR 0009, Considered Options), the adapter moves with the hub.

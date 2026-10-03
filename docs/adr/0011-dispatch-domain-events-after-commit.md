# Dispatch domain events after commit

Status: Accepted

Live updates ([ADR 0009](0009-live-updates-through-campaign-hub-with-invalidation-topics.md)) must react to domain changes: a Player joining, a Wall Entry being created, an Investigator changing status. Application services today load an aggregate, change it, and call `SaveChangesAsync`, so they have no way to announce what happened. Publishing from each service would put "who hears about it" into every use case. Ticket 06 would also have to edit each service again.

Aggregates record what happened as domain events. An `AggregateRoot` base in `CocAssistant.CampaignPlay.Domain` holds a list of events and exposes methods to raise and clear them; `Campaign` and `Investigator` (and later `WallEntry`) derive from it. Events are immutable records in the Domain, for example `PlayerJoinedCampaign`. `CocAssistant.CampaignPlay.Application` declares `IDomainEventDispatcher` and `IDomainEventHandler<TEvent>`, and handlers are registered through DI. An EF Core `SaveChangesInterceptor` in `CocAssistant.CampaignPlay.Infrastructure` collects events from tracked aggregates, and dispatches them only **after** the commit succeeds. It then clears them. Handlers run in-process. A handler exception is logged and swallowed, so the user's request still succeeds and the other handlers still run.

## Considered Options
- Each application service publishes explicitly after saving. Rejected: every new reaction edits use cases, and a service can forget to publish.
- MediatR. Rejected: it is commercially licensed from v13, and the dispatcher needed here is a few dozen lines.
- A transactional outbox with a background worker. Rejected: live updates are best-effort, and clients refetch after a reconnect. Revisit if an at-least-once reaction (for example, email) is introduced.
- Domain events dispatched after commit by an interceptor (chosen).

## Consequences
- Events are lost if the process stops between commit and dispatch. This is acceptable only for best-effort reactions.
- Handlers must not change aggregates in the same unit of work; a handler that needs to write starts its own use case.
- Handler tests use an in-memory dispatcher and need no database. Aggregate tests assert on raised events.
- Delivered by PBI-CP-011, before PBI-CP-005.

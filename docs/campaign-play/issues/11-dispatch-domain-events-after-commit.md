# PBI-CP-011: Dispatch Domain Events After Commit

## Directive
Introduce domain events in Campaign Play so that aggregates record what happened and in-process handlers react after the change is committed. This is internal infrastructure with no user-visible behavior; it is the publication source for live updates in PBI-CP-005 and PBI-CP-006.

**Scope:**
- An `AggregateRoot` base in `CocAssistant.CampaignPlay.Domain` with raise and clear operations, adopted by `Campaign` and `Investigator`.
- `IDomainEventDispatcher` and `IDomainEventHandler<TEvent>` in `CocAssistant.CampaignPlay.Application`, with handlers registered through DI.
- An EF Core `SaveChangesInterceptor` in `CocAssistant.CampaignPlay.Infrastructure` that dispatches collected events only after a successful commit, then clears them.
- Handler failures are logged and swallowed; they never fail the request or stop other handlers.
- A first event, `PlayerJoinedCampaign`, raised by `Campaign` when a Player joins through the Campaign Invite.
- Do not add live updates, SignalR, an outbox, or any handler with user-visible effects.

## Dependencies
- Blocked by: None
- Must merge before: PBI-CP-005: Show Campaign Presence

## Context
Read: [ADR 0011](../../adr/0011-dispatch-domain-events-after-commit.md) and [ADR 0009](../../adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md).
- `specs/campaign-play/spec.md`, Live connection contract: Publication.
- Conventions: `backend/CLAUDE.md` (Domain references nothing outside Domain; Application references only its Domain).

## Verification
- [ ] Joining a Campaign raises exactly one `PlayerJoinedCampaign`; an already-member join and a refused join raise none.
- [ ] Events are dispatched only after a successful commit; a failed or concurrency-retried save dispatches nothing for the failed attempt.
- [ ] A throwing handler is logged, does not fail the request, and does not prevent other handlers from running.
- [ ] Events are cleared after dispatch and never dispatched twice.
- [ ] Unit tests cover aggregates and the dispatcher; integration tests cover the interceptor through the assembled API.
- [ ] E2E exception: no user-visible behavior changes, so no E2E is added; existing E2E suites must still pass.

## Refinement Protocol
If delivery must become at-least-once (for example, for email or other reactions that cannot be recovered by refetching), replace after-commit dispatch with a transactional outbox and update ADR 0011.

# Scenario Preparation publishes Keeper-only live updates through a consumer-owned signal port after commit

Status: Accepted

The Keeper's other open tabs must refresh when Scene content changes ([specs/scene-play/spec.md](../../specs/scene-play/spec.md), Live updates, `scenes`). Those changes are committed by Scenario Preparation's application services: Scenes, Handouts, Non-Player Entity links, Item links, and Items. Scenario Preparation has no domain-event dispatcher; the dispatcher of [ADR 0011](0011-dispatch-domain-events-after-commit.md) serves only Campaign Play aggregates. Live updates go only through Campaign Play's publication policy and hub ([ADR 0009](0009-live-updates-through-campaign-hub-with-invalidation-topics.md), [ADR 0012](0012-live-update-publisher-port-implemented-beside-the-hub.md)). The design is in the [PBI-SPL-008 design record](../scene-play/issues/08-publish-the-scenes-live-topic.design.md), D1 and D3.

## Decision
- Campaign Play adds the topic `scenes` to `CampaignDataTopic` and `CampaignLivePublicationPolicy.ForScenesChanged`, which always targets `campaign:{id}:keeper`. A public publisher, `PublishScenesChanged`, sends it through `LivePublicationSender`.
- Scenario Preparation declares the port `ISceneContentSignals.ScenesChangedAsync(campaignId)` in its Application. It is best-effort and never throws except on cancellation.
- The adapter `CampaignPlaySceneContentSignals` lives in ScenarioPreparation.Infrastructure. It calls the publisher and catches and logs failures. This extends the read port of [ADR 0013](0013-scenario-preparation-functionality-with-campaign-ownership-port.md) to signals, with no new project reference.
- Each Scenario Preparation write path that changes Scene content calls the port once, immediately after its own successful commit. It never calls it on a refusal, a failed save, or a refused concurrency branch. This applies the after-commit second path of [ADR 0024](0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md) to a second functionality.

## Considered Options
- An EF SaveChanges interceptor on `ScenarioPreparationDbContext`. Rejected for three reasons:
  - it fires per save, not per transaction, so a finish-then-start could signal before its commit ([ADR 0025](0025-one-active-scene-per-campaign-through-a-filtered-index-and-a-scene-version.md));
  - it also signals every Scene Play write;
  - ADR 0024 already rejected it.
- Domain events and a dispatcher in Scenario Preparation. Rejected, as in ADR 0024: this needs a shared kernel or a copy of Campaign Play's.
- Publishing from Scenario Preparation controllers. Rejected: controllers call Application services only (`backend/CLAUDE.md`).
- A try/catch in every service, as in Scene Play's `ActiveSceneService`. Rejected: it duplicates the catch in six services. The port's adapter owns the best-effort guarantee, as `ICampaignLiveUpdates` adapters do.
- A consumer-owned port called explicitly after each commit (chosen).

## Consequences
- Every new Scenario Preparation write path that changes Scene content must call the port, and its unit test must prove it. Coverage is not automatic. PBI-SPL-009 (Keeper notes) and PBI-BEAT-001 (Beats) follow this shape.
- The Keeper sometimes refetches when nothing it shows changed, for example on an Item Handout of an Item linked to no Scene. This is Keeper-only and cheap.
- A signal is lost if the process stops after the commit; the client recovers on its next refetch or reconnect (ADR 0009).
- Scenario Preparation Domain and Application still reference nothing outside Scenario Preparation.

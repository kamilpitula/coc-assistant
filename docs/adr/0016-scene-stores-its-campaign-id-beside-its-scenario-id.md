# A Scene stores its Campaign id beside its Scenario id

Status: Accepted

A Scene belongs to a Scenario, and a Scenario to a Campaign ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Architecture). The Scenario Preparation API addresses a Scene through its Campaign and Scenario, while Scene Play addresses it by Campaign and Scene id only (`POST /api/campaigns/{campaignId}/scenes/{sceneId}/start`) and requires at most one Active Scene per Campaign, including under concurrent start requests ([specs/scene-play/spec.md](../../specs/scene-play/spec.md), Constraints). Scenarios already store their Campaign id without a foreign key ([ADR 0013](0013-scenario-preparation-functionality-with-campaign-ownership-port.md)).

Each Scene stores both `CampaignId` and `ScenarioId`. `CampaignId` is copied from the Scenario when the Scene is created and never changes. `ScenarioId` has a foreign key to the Scenario with restricted delete; both tables live in `ScenarioPreparationDbContext`, so the key does not cross a `DbContext`. Every Scene lookup in Scenario Preparation filters by Campaign, Scenario, and Scene id, so a Scene of another Scenario or Campaign is not found.

## Considered Options
- Store only `ScenarioId` and reach the Campaign through the Scenario. Rejected: every Scene query needs a join, and "at most one Active Scene per Campaign" cannot be enforced by an index, so PBI-SPL-001 would need locking or a later schema change with a backfill.
- Store `CampaignId` and `ScenarioId` (chosen).

## Consequences
- PBI-SPL-001 can resolve a Scene by Campaign and id in one table, and can enforce one Active Scene per Campaign with a filtered unique index on `CampaignId` where the status is Active, following [ADR 0003](0003-single-active-campaign-invite-via-filtered-unique-index.md). That index is not added before PBI-SPL-001 decides it.
- The Campaign id is stored twice for a Scene. The Scene aggregate keeps them consistent by taking the Campaign id only from its Scenario at creation.
- Moving a Scene to another Scenario is not specified; if it is added, it must stay within the Campaign.
- Scenarios cannot be deleted while they have Scenes; removing a Scenario is deferred and must remove its Scenes first.

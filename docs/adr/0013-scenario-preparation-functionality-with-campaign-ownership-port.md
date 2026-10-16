# Scenario Preparation is its own functionality and checks Campaign ownership through a consumer-owned port

Status: Accepted

Scenario Preparation lets a Keeper prepare the Scenarios of a Campaign, and later their Scenes, Non-Player Entities, Handouts, and extracted source material (PBI-SP-001 to PBI-SP-005). The spec makes it a feature of its own that depends on Campaign Play for Campaign ownership and Keeper authorization, while Campaign Play depends on it for prepared Scene and Non-Player Entity context ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Architecture, Dependencies). The backend keeps functionality boundaries independent through ports (`backend/CLAUDE.md`), and Campaign Play and Identity already have separate `DbContext`s that may live in separate databases ([ADR 0008](0008-cross-functionality-reads-through-a-consumer-owned-port.md)).

Scenario Preparation is a new functionality under `backend/src/ScenarioPreparation/` with the projects `CocAssistant.ScenarioPreparation.{Domain,Application,Infrastructure,Controllers}`, its own `ScenarioPreparationDbContext`, the connection string `ScenarioPreparationDb`, and the migration history table `__ScenarioPreparationMigrationsHistory`. It declares the port it needs, `ICampaignKeepers.IsKeeperAsync(campaignId, accountId)`, in its Application project. The adapter `CampaignPlayCampaignKeepers` in its Infrastructure project implements the port by calling Campaign Play's existing `CampaignService.GetForKeeperAsync`, so both functionalities use the same Keeper rule. Scenario rows reference their Campaign by id only: there is no foreign key or EF mapping across `DbContext`s. `CallerAccountResolver` moves from `CocAssistant.CampaignPlay.Controllers` to `CocAssistant.Identity.Application`, next to `EntraIdentity` and `AccountService`, so every functionality maps the caller's Entra identity to an Account the same way.

## Considered Options
- Scenario Preparation inside Campaign Play. Rejected: simpler for one PBI, but Scenes, Non-Player Entities, Handouts, and extraction would all grow Campaign Play, and splitting it later would move tables, migration history, and foreign keys.
- A dedicated provider query (`CampaignKeeperQuery`) in Campaign Play Application, mirroring `AccountDisplayNameQuery`. Rejected for now: it would duplicate `CampaignService.GetForKeeperAsync`. Revisit when Scenario Preparation needs more than an ownership check.
- Scenario Preparation Controllers referencing Campaign Play Controllers to reuse `CallerAccountResolver`, or copying the resolver. Rejected: a Controllers-to-Controllers dependency between functionalities, or two claim mappings that can drift.
- Separate functionality with a consumer-owned port (chosen).

## Consequences
- Scenario Preparation Domain and Application reference nothing outside Scenario Preparation. Only its Infrastructure references `CocAssistant.CampaignPlay.Application`, and its Controllers reference `CocAssistant.Identity.Application`.
- Scenario Preparation tests replace the port with an in-memory fake and do not need Campaign Play's database.
- Each Scenario request loads the Campaign once to check the Keeper.
- There is no database cascade from Campaigns to Scenarios. No Campaign deletion exists today; when one is added, Scenario Preparation data must be removed through an event or port.
- The integration test factory, the Respawn ignore lists, and the E2E global setup and web server configuration must cover a third `DbContext`.
- Campaign Play now takes `CallerAccountResolver` from Identity; its behavior is unchanged.

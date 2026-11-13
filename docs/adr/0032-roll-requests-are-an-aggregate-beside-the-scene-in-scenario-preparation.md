# Roll Requests are an aggregate beside the Scene in Scenario Preparation

Status: Accepted

Roll Requests let the Keeper ask Investigators present in the Active Scene to roll, and let each Requested Roll be rolled once on the server ([specs/roll-requests/spec.md](../../specs/roll-requests/spec.md)). Scene Play owns their use cases, API, and rules. Scene Play has no `DbContext` ([ADR 0024](0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md)). The Item holder aggregate already lives beside the Scene in `ScenarioPreparationDbContext` and changes through a provider service ([ADR 0029](0029-item-holders-live-on-the-item-and-change-through-a-provider-service.md)). The spec requires two things: that finishing the Scene or removing an Investigator present cancels their waiting rolls in the same transaction (PBI-DICE-007), and that a Requested Roll is rolled at most once, even when the Player and the Keeper roll at the same time. The design is recorded in the [PBI-DICE-005 design record](../dice/issues/05-request-a-roll-in-the-active-scene.design.md), D1.

## Decision
- **The aggregate:**
  - A `RollRequest` is an aggregate root in `CocAssistant.ScenarioPreparation.Domain/RollRequests/`, with `RequestedRoll` children.
  - It is stored in `ScenarioPreparationDbContext` as `RollRequests` (foreign key to `Scenes`, cascade) and `RequestedRolls` (Investigator id without a foreign key, per ADR 0013).
  - Roll Records are a JSON column on `RequestedRolls`, mapped like the Character Sheet's Roll Records.
- **Concurrency:** each Requested Roll has a `Version` concurrency token. A roll on anything but a Waiting Requested Roll, or a lost race, is refused, and no Roll Record is added.
- **Access:**
  - Scenario Preparation exposes a provider service, `SceneRollRequestService`. It creates on the Active Scene, reads, lists, and rolls through `IDiceRoller`, and performs no authorization.
  - Scene Play reaches it through consumer-owned ports and adapters in `ScenePlay.Infrastructure`, as in ADR 0024.
- **Target values:** snapshotted on each Requested Roll when the request is created. They come from Campaign Play through a read port.
- **After the commit:** Scene Play adds the Wall Entry and publishes the live topics, best-effort, as in ADR 0024.

## Considered Options
- **Requested Rolls as children of the Scene aggregate, like Reveals:** rejected. Every roll would load and save the whole Scene, and concurrent rolls would contend on it.
- **A Scene Play domain with its own `ScenePlayDbContext`:** rejected for the reasons in ADR 0024. Finishing the Scene and cancelling its waiting rolls could not be one transaction without a cross-context transaction, and "the Scene is still Active" would be checked across contexts.
- **An aggregate beside the Scene in `ScenarioPreparationDbContext`, through a provider service (chosen).**

## Consequences
- Scenario Preparation's Domain and database carry play-time Roll Request state that they don't interpret. This extends the consequence ADR 0024 accepted.
- `ScenarioPreparation.Domain` uses the Dice value objects of `CocAssistant.GameRules.Domain`, which it already references.
- Hidden rolls, cancelling, and pushing (PBI-DICE-006, 007, and 009) change only this aggregate. Finishing a Scene and cancelling its rolls can share one `SaveChanges`.
- Moving Roll Requests to their own context later means a data move. The API does not change.

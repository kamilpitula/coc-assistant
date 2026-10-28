# Scene Play runs the Scene aggregate through a provider command service

Status: Accepted

Scene Play lets the Keeper start a Prepared Scene with chosen Investigators present, change who is present, finish it, and later reveal material to those Investigators ([specs/scene-play/spec.md](../../specs/scene-play/spec.md)). The Scene aggregate, its status, and its content belong to Scenario Preparation ([ADR 0016](0016-scene-stores-its-campaign-id-beside-its-scenario-id.md), [ADR 0019](0019-scene-links-are-child-entities-with-in-context-foreign-keys.md)). The spec's domain relationships hang the Investigators present and the Reveals off the Scene: "An Active or Finished Scene has a set of Investigators present and a list of Reveals". Starting a Scene must finish the Active one, start the new one, and record who is present as one change. Every functionality so far has its own `DbContext`, and [ADR 0008](0008-cross-functionality-reads-through-a-consumer-owned-port.md) covers only reads across functionalities. The design is recorded in the [PBI-SPL-001 design record](../scene-play/issues/01-start-and-finish-a-scene.design.md), D1, D3, D4, and D5.

## Decision
- **Scene Play is its own functionality.**
  - It lives in `backend/src/ScenePlay/` with `CocAssistant.ScenePlay.{Application,Infrastructure,Controllers}`.
  - A `Domain` project is added only once Scene Play has a domain type of its own.
  - It has no `DbContext` of its own.
- **Storage:** the Investigators present, and from PBI-SPL-002 the Reveals, are child entities of the Scene aggregate in `ScenarioPreparationDbContext`.
  - Investigators present are stored in `SceneInvestigatorsPresent(SceneId, InvestigatorId)`.
  - Investigator ids have no foreign key, because Investigators live in another context ([ADR 0013](0013-scenario-preparation-functionality-with-campaign-ownership-port.md)).
  - The present set stays after Finish.
- **Commands across the boundary (extends ADR 0008 from reads to commands):**
  - Scene Play declares consumer-owned ports in its Application.
  - Scenario Preparation exposes a provider application service, `SceneLifecycleService`, which finds, starts, finishes, and re-staffs Scenes.
  - The adapter in ScenePlay.Infrastructure calls that service.
  - The provider service performs no authorization. Only Scene Play calls it, after checking the Keeper through its own port onto Campaign Play.
  - Finishing, starting, and recording who is present are one `SaveChanges`.
- **Reveal snapshots:**
  - A `Reveals` child table with typed snapshot columns that mirror the `Handouts` table ([ADR 0020](0020-handouts-are-child-entities-of-their-owner-in-one-table.md), [ADR 0021](0021-handout-files-are-immutable-blobs-behind-a-storage-port.md)):
    - subject type and subject id, with no foreign key;
    - title;
    - Handout kind;
    - Lexical JSON content;
    - the file key, name, media type, and size;
    - the time revealed.
  - A `RevealRecipients(RevealId, InvestigatorId)` table records which Investigators a Reveal reached.
  - A file is read through `IHandoutFileStore` by its snapshotted key, and Scene Play never copies or deletes it.
- **Wall Entries:**
  - After the Scene change commits, Scene Play adds the Public Wall Entries "Scene started: {title}" and "Scene finished: {title}" through Campaign Play's `WallEntryService.AddAsync`, with the Keeper as author, behind a Scene Play port.
  - A failure is logged and does not fail the request.
- **Live updates:**
  - After the commit, Scene Play publishes the `activeScene` topic through a port onto a public Campaign Play publisher.
  - The audience still comes from `CampaignLivePublicationPolicy` (`campaign:{id}`; [ADR 0009](0009-live-updates-through-campaign-hub-with-invalidation-topics.md)).
  - This is a deliberate second path next to the domain events of [ADR 0011](0011-dispatch-domain-events-after-commit.md). The change is committed by a context that has no dispatcher, and one Scene Play service performs every transition.

## Considered Options
- **A `ScenePlayDbContext` joined to Scenario Preparation's context in one database transaction.** Rejected: it forces both onto one database and introduces the first cross-context transaction.
- **A `ScenePlayDbContext` with two ordered commits.** Rejected: a failure between commits leaves an Active Scene with no Investigators present, and concurrent starts of one Scene can pair one request's status with the other's present list.
- **Scene Play controllers inside Scenario Preparation.** Rejected: Scenario Preparation's endpoints are Keeper-only by design ([ADR 0023](0023-scenario-preparation-endpoint-authorization-matrix.md)), while the Active Scene read is member-visible, and the spec makes Scene Play a feature of its own.
- **A JSON snapshot column per Reveal.** Rejected: stored file keys must stay queryable, so that a file a Reveal reads is never deleted.
- **Failing the request when the Wall Entry fails, or an outbox for Wall Entries.** Rejected: the first reports failure for a Scene that did start; the second is new infrastructure for a best-effort record.
- **Domain events on the Scene with an interceptor on `ScenarioPreparationDbContext`.** Rejected for now: the `AggregateRoot` base and the dispatcher live in Campaign Play, so this would need a shared kernel or a copy.
- **Scene Play state as children of the Scene, reached through a provider command service (chosen).**

## Consequences
- The spec's Ownership changes in storage only. Scene Play still owns the use cases, the API, and the rules that decide the Investigators present and the Reveals. The data is stored with the Scene in Scenario Preparation's database and migrations.
- Scenario Preparation's Domain carries Investigator ids it does not interpret, and its `Scene` grows play-time children.
- Scene Play Application and Controllers reference nothing in Scenario Preparation or Campaign Play. Only ScenePlay.Infrastructure references `CocAssistant.ScenarioPreparation.Application` and `CocAssistant.CampaignPlay.Application`.
- A Wall Entry or a live update can be lost if the process stops after the commit. Both are best-effort, like ADR 0011 reactions.
- Moving Scene Play state into its own context later means a data move. The API does not change.
- Who holds an Item (PBI-SPL-003) is decided in that PBI's design record, within this boundary.

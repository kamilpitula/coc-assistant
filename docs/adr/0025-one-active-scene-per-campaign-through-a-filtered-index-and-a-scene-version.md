# One Active Scene per Campaign through a filtered index and a Scene version

Status: Accepted; amends [ADR 0019](0019-scene-links-are-child-entities-with-in-context-foreign-keys.md) and [ADR 0022](0022-items-are-guarded-by-play-usage-read-through-ports.md)

A Campaign has at most one Active Scene, including under concurrent start requests, and starting may finish the Active Scene first in the same transaction ([specs/scene-play/spec.md](../../specs/scene-play/spec.md), Constraints and API Contracts). [ADR 0016](0016-scene-stores-its-campaign-id-beside-its-scenario-id.md) stored `CampaignId` on each Scene so that an index could enforce this, following [ADR 0003](0003-single-active-campaign-invite-via-filtered-unique-index.md). An index across Scenes cannot stop two requests from starting the *same* Scene, because both update one row.

Material that an Active or Finished Scene refers to must never be deleted. The deletes of Human NPCs, Mythos Creatures, Items, and Item Handouts check usage first and then delete, with no transaction, so a Scene started in between could lose a link, a Handout, or an Item (ADR 0019 and ADR 0022 left this for PBI-SPL-001). The design is recorded in the [PBI-SPL-001 design record](../scene-play/issues/01-start-and-finish-a-scene.design.md), D2 and D6.

## Decision
- **One Active Scene per Campaign:**
  - A unique filtered index `IX_Scenes_CampaignId_Active` on `Scenes(CampaignId)` where `[Status] = 'Active'`.
  - `EfSceneRepository` maps its violation to a conflict, and the request answers 409.
- **Scene version:**
  - `Scene` gets an `int Version` concurrency token, incremented in one private method.
  - `Start`, `Finish`, changing the Investigators present, removing a Handout, and the removal guard below increment it.
  - EF also checks the token when a Scene row is updated or deleted.
  - A lost race answers 409. Nothing retries a finish-then-start, because a retry could finish a Scene the Keeper never saw.
- **Finish-then-start:** a unique index is checked per statement and EF Core orders unrelated updates by key, so the finish and the start cannot share one `SaveChanges`.
  - `EfSceneRepository.SaveFinishThenStartAsync` saves the finish, then the start with its present rows, in one transaction at default isolation.
  - The start is validated before anything is written, and any failure rolls back both.
  - This is the only explicit transaction in the codebase. The index and the version, not locks, decide concurrency.
  - A violation of the present rows' primary key in a same-Scene race is mapped like a version conflict.
- **Removal guard:**
  - A delete whose guard depends on linked Scenes keeps its usage check. It then loads the Prepared Scenes that link its target and calls `Scene.GuardLinkedMaterialRemoval()` on each, in the same `SaveChanges`.
  - The guard refuses unless the Scene is Prepared, and otherwise increments the version.
  - A Scene started meanwhile makes the delete fail with its existing 409. A delete that commits first makes the start fail instead.
- **Edits:** a Scene edit that loses to a start or finish reloads once. It answers the existing "finished" outcome if the Scene is now Finished, and otherwise reapplies the edit once.

## Considered Options
- **A per-Campaign "active scene" pointer row.** Rejected: a second record of the fact in `Scene.Status`.
- **One `SaveChanges` for finish-then-start.** Rejected: it fails whenever EF orders the start's update first.
- **A nullable `ActiveCampaignId` column with a not-null-filtered unique index**, so that EF orders the release first. Rejected: a second record of the Active fact, and it depends on unverified EF ordering behavior.
- **A serializable transaction around check-then-act.** Rejected: there are no transactions in the codebase today, lock behavior differs between SQLite and SQL Server, and an index plus a token suffice.
- **Accepting the delete-versus-start race.** Rejected: it breaks ADR 0019's rule that played material is never deleted.
- **A filtered unique index plus a Scene version (chosen).**

## Consequences
- Tests and seed helpers can no longer leave two Active Scenes in one Campaign.
- Each guarded delete loads the Prepared Scenes that link its target.
- Scene child writes allowed on an Active Scene (link, edit link, add or edit Handout) do not touch the version. One that races a Finish can still land on a Finished Scene. This is a recorded residual.
- **ADR 0019 and ADR 0022 are amended:** their "PBI-SPL-001 must re-check" consequences are resolved by the removal guard.
- PBI-SPL-002 extends the guard so that material and files a Reveal references are never deleted.
- One repository method opens a transaction. A new need for a transaction must justify itself, not reuse this method.
- **Given up:** one column on `Scenes` and a concurrency outcome on a few Scenario Preparation writes.

# Keeper notes carry their own version, checked by a conditional update beside the Scene version

Status: Accepted; complements [ADR 0025](0025-one-active-scene-per-campaign-through-a-filtered-index-and-a-scene-version.md)

A Scene's Keeper notes are saved through their own endpoint in every Scene status, Finished included. A save names the `notesVersion` it was based on, and a stale save is refused with 409 and the current notes ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Scene API and Constraints). A notes save must never change the Scene version, and must never make a start or finish fail (PBI-SPL-009).

ADR 0025 made `Scene.Version` an EF concurrency token. EF puts the original value of every concurrency token of an entity into the WHERE clause of every update of its row. So a second token on the `Scenes` row would make a finish that read the row before a notes save lose with 409 (`SceneLifecycleService.FinishActiveAsync`), and ADR 0025 declines to retry lifecycle writes. The design is in the [PBI-SPL-009 design record](../scene-play/issues/09-keeper-notes-endpoint.design.md), D1.

## Decision
- **The column:** `Scenes` gets `NotesVersion` (`int`, not null, default 0). `Scene.NotesVersion` is read-only in the domain and is never incremented in memory. It is **not** an EF concurrency token.
- **The domain check:** `Scene.CheckKeeperNotesSave(keeperNotes, notesVersion)` checks the version, then the rich text, and changes nothing, like `CheckStart`. Every status is allowed.
- **The write:** `ISceneRepository.TryReplaceKeeperNotesAsync` is one conditional statement (`ExecuteUpdateAsync`):
  - it sets `KeeperNotes` and `NotesVersion = NotesVersion + 1`;
  - it filters on the Campaign, Scenario, and Scene ids and on `NotesVersion = @expected`;
  - zero affected rows means stale or gone, and the service re-reads without tracking to answer 409 with the current notes, or 404.
- **Other writes:** a finish, a start, and a title and location edit write other columns and check only `Version`. No change-tracked write sets `KeeperNotes` after the Scene is created. So a notes save and a finish commit in either order, and the Scene ends Finished with the new notes.
- **The Scene PUT** replaces only the title and location.

## Considered Options
- **`NotesVersion` as a second EF concurrency token on the `Scenes` row**, as `Item.Version` is on Items. Rejected: a notes save would make a racing start or finish fail, and avoiding that would mean retrying lifecycle writes.
- **A 1:1 child table `SceneKeeperNotes` with its own token.** Rejected: it gives the same guarantee only at the cost of a new table, a data migration that moves `KeeperNotes`, and a join on every Scene read.
- **A plain column checked by a conditional single-statement update (chosen).**

## Consequences
- This is the codebase's only `ExecuteUpdateAsync` and the only Scene write outside change tracking. It is confined to `TryReplaceKeeperNotesAsync`. A new use must justify itself, not copy this one.
- A repository test must prove that a finish, and a title and location edit, commit after an interleaved notes save. Making `NotesVersion` a concurrency token, or writing `KeeperNotes` through change tracking, breaks that test and this decision.
- A Scene loaded before a notes save holds stale `KeeperNotes` and `NotesVersion`. The notes service never relies on a tracked Scene after its update. A title and location response can carry an already stale `notesVersion`; the `scenes` live refresh ([ADR 0036](0036-scenario-preparation-publishes-keeper-only-live-updates-through-a-signal-port.md)) corrects it. Clients rebase a notes editor only on their own confirmed saves or a 409 body.
- Mentions (PBI-MEN-001) live inside the notes text, so they are saved by the same statement.
- **Given up:** a single persistence technique for every Scene write.

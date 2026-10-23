# Scene links are child entities of the Scene aggregate with in-context foreign keys

Status: Accepted; amended for Items by [ADR 0022](0022-items-are-guarded-by-play-usage-read-through-ports.md)

A Scene links the Non-Player Entities present or relevant there, and later the Items that matter there ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Architecture and Constraints). The Scene aggregate owns its status and the editing rules that follow from it, so a Finished Scene's links never change ([ADR 0016](0016-scene-stores-its-campaign-id-beside-its-scenario-id.md)). Material that an Active or Finished Scene refers to must never be deleted, while material linked only to Prepared Scenes can be deleted freely. Human NPCs and Mythos Creatures are separate aggregates in separate tables, and a Non-Player Entity may be linked to the same Scene more than once. A Reveal in Scene Play names a link and snapshots its Player-facing content ([specs/scene-play/spec.md](../../specs/scene-play/spec.md)). The first link kind, Non-Player Entity links, is designed in the [PBI-SP-004 design record](../scenario-preparation/issues/04-link-entities-to-scenes.design.md).

A link is a child entity of the Scene aggregate, stored in its own table with its own id, and created, changed, and removed only through Scene methods that refuse a Finished Scene before anything else. It refers to its target through one nullable foreign-key column per target table, with a check constraint that exactly one is set. Every foreign key of the link cascades on delete, and all of them stay inside `ScenarioPreparationDbContext`, as [ADR 0013](0013-scenario-preparation-functionality-with-campaign-ownership-port.md) requires. Before deleting a target, its service asks a narrow consumer-owned usage port whether an Active or Finished Scene links it, and refuses with 409 when one does; otherwise the delete cascades to the links on Prepared Scenes. Removing a Prepared Scene cascades to its links.

## Considered Options
- A separate link aggregate with its own repository. Rejected: the Finished rule would leave the Scene aggregate and every new code path would have to repeat it.
- A polymorphic reference (type plus id) without a foreign key. Rejected: integrity would rest on application code, every delete path would have to remove links itself, and a link inserted during a concurrent delete would be orphaned.
- Child entities with one foreign key per target table, a check constraint, and cascading deletes (chosen).

## Consequences
- Item links (PBI-SP-008) follow the same shape.
- A new target type adds a column and widens the check constraint.
- The Player-facing text of a Prepared Scene's link is lost when its target is deleted; the delete dialog warns about it.
- Loading a Scene for a write loads its links.
- Reveals (PBI-SPL-002) name a link id and snapshot its content, so they never need the link to outlive an unlink or a cascade.
- A Scene started between a delete's usage check and the delete could lose a link; PBI-SPL-001, which adds starting a Scene, must re-check this.

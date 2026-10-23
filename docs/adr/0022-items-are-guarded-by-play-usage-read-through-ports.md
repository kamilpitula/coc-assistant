# Items are guarded by play usage read through ports

Status: Accepted

An Item belongs to its Campaign, may be linked to the Scenes where it matters, and may have its own Handouts ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Architecture and Constraints). Unlike a Scene, an Item has no status, and later Scenes may still use it after an earlier Scene is Finished. Scene Play owns who holds an Item ([specs/scene-play/spec.md](../../specs/scene-play/spec.md), Ownership), and PBI-SPL-003 depends on PBI-SP-008, so Scenario Preparation cannot call Scene Play code. A Reveal of an Item names the Item, not a link (Scene Play spec, Active Scene API). [ADR 0019](0019-scene-links-are-child-entities-with-in-context-foreign-keys.md) expected Item links to widen the link table. [ADR 0021](0021-handout-files-are-immutable-blobs-behind-a-storage-port.md) deletes stored files only while their Scene is Prepared, a rule that cannot apply to an Item. The design is recorded in the [PBI-SP-008 design record](../scenario-preparation/issues/08-prepare-campaign-items.design.md).

## Decision
- **Holder port:** Scenario Preparation reads an Item's holder through a consumer-owned port, `IItemHolders`, in its Application layer ([ADR 0008](0008-cross-functionality-reads-through-a-consumer-owned-port.md)). The `Items` table has no holder column. Until PBI-SPL-003 registers a Scene Play adapter, the `NoItemHolders` adapter answers that no one holds any Item.
- **In play:** an Item is in play while a Scene that links it is Active or Finished, or while an Investigator holds it. In play is a design and code term only, never UI copy.
- **Item links:**
  - Item links are child entities of the Scene in their own `ItemLinks` table, with cascading in-context foreign keys to the Scene and to the Item.
  - A unique index on `(SceneId, ItemId)` allows one link per Scene and Item, and a link has no fields of its own.
  - The rest of ADR 0019 applies unchanged: Scene methods refuse a Finished Scene first, and a usage check runs before a delete.
- **Item Handouts and their files:**
  - An Item and its Handouts stay editable whatever the status of its Scenes; a Reveal is a snapshot.
  - While the Item is in play, deleting the Item or one of its Handouts is refused with 409, and replacing a Handout's file keeps the old stored file.
  - While the Item is not in play, an Item's stored files are deleted only after the commit. This applies when deleting a Handout, replacing its file, or deleting the Item.

## Considered Options
- **A nullable holder column on `Items`, written by Scene Play.** Rejected: it decides the Scene Play boundary before its own ADR, and Scene Play would write a Scenario Preparation table.
- **Widening `NonPlayerEntityLinks` with an `ItemId` column, as ADR 0019 expected.** Rejected:
  - an Item is not a Non-Player Entity;
  - Item links carry no Player-facing name, so a required column would become conditional;
  - one link per Scene would need a filtered index.
- **Never deleting an Item's stored files.** It is simpler and always safe, but rejected: it leaves orphaned files for Items that were never played.
- **A port for the holder, a separate link table, and in-play guards (chosen).**

## Consequences
- **PBI-SPL-003** registers its own `IItemHolders` adapter in place of `NoItemHolders`. It must make a give that races a delete of the same Item fail safely.
- **PBI-SPL-002** must count "has a Reveal" as in play, through a port, before an Item or an Item's Handout can be revealed. The reason: a Keeper may unlink an Item from an Active Scene, and without that rule a later delete could remove a file a Reveal still reads.
- **PBI-SPL-001** must re-check the race between a delete's usage check and a Scene start (ADR 0019) for Items as well.
- **ADR 0019 is amended:** a new link target may get its own link table when its links carry different fields or rules.
- **ADR 0021 is amended:** Item-owned files follow the in-play rule instead of the Prepared rule.
- **Given up:** one more port and a placeholder adapter, and an in-play read before every Item delete and Item Handout write.

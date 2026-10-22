# Handouts are child entities of their owning aggregate in one Handouts table

Status: Accepted

A Handout belongs to a Scene now and to an Item later ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Architecture and Constraints). It has rich-text kinds now (PBI-SP-005) and file kinds later (PBI-SP-007). A Reveal in Scene Play names a Handout by `{type: Handout, id}` and snapshots its Player-facing content ([specs/scene-play/spec.md](../../specs/scene-play/spec.md)). The Scene aggregate owns its status and the editing rules that follow from it, and its children change only through Scene methods that check the status first ([ADR 0019](0019-scene-links-are-child-entities-with-in-context-foreign-keys.md)). The design is recorded in the [PBI-SP-005 design record](../scenario-preparation/issues/05-attach-protect-handouts.design.md).

A Handout is a child entity created, changed, ordered, and removed only through its owner aggregate's methods, which check the owner's status first. All Handouts live in one `Handouts` table with one foreign-key column per owner table. PBI-SP-005 has only `SceneId`. PBI-SP-008 adds a nullable `ItemId`, makes `SceneId` nullable, and adds a check constraint that exactly one owner is set. Order follows [ADR 0014](0014-order-preparation-records-by-stored-position-with-tie-break.md) within the owner. Each owner's foreign key cascades on delete. File kinds (PBI-SP-007) add columns to the same table.

## Considered Options
- Per-owner Handout tables (`SceneHandouts`, `ItemHandouts`) sharing a value type. Rejected: one CONTEXT.md concept is duplicated, every Handout change is made twice, and the Reveal subject id space is split.
- A Handout aggregate with its own repository. Rejected for the reason in ADR 0019: the owner's status rules would leave the owner aggregate.
- One table with owner foreign keys, changed only through the owner (chosen).

## Consequences
- Once Items exist, one entity type is reachable from two aggregates; each aggregate loads and changes only the rows whose foreign key points at it.
- PBI-SP-008 needs a migration that makes `SceneId` nullable.
- Loading a Scene for a write loads all of its Handouts, including their text.
- A Reveal's snapshot means a Reveal never needs a Handout to outlive its owner's cascade.

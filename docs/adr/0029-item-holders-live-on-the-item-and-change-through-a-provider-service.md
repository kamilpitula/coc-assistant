# Item holders live on the Item and change through a provider service

Status: Accepted; supersedes the "Holder port" decision of [ADR 0022](0022-items-are-guarded-by-play-usage-read-through-ports.md) and amends its file rules and those of [ADR 0021](0021-handout-files-are-immutable-blobs-behind-a-storage-port.md)

## Context

**Who owns what:**
- An Item is held by at most one Investigator or by no one.
- Scene Play owns the rules for who holds an Item ([specs/scene-play/spec.md](../../specs/scene-play/spec.md), Ownership).
- [ADR 0022](0022-items-are-guarded-by-play-usage-read-through-ports.md) kept the `Items` table free of a holder column. Scenario Preparation was to read the holder through the `IItemHolders` port, with a Scene Play adapter added by PBI-SPL-003.

**Why ADR 0022 rejected a holder column:**
- It would decide the Scene Play boundary before Scene Play had its own ADR.
- Scene Play would write a Scenario Preparation table.

**What has changed since:**
- [ADR 0024](0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md) has decided that boundary. Scene Play's state lives as children of Scenario Preparation aggregates, in Scenario Preparation's database, and changes only through provider services that Scene Play calls.

**What PBI-SPL-003 has to support:**
- Giving an Item reveals it to the new holder, and that Reveal is a child of the Active Scene.
- The give and its Reveal must commit together.
- A give that races a delete of the same Item must fail safely (ADR 0022).
- "Has a Reveal" counts as in play. An Item Handout that has been revealed must keep its stored file, even when the Item is unlinked and deleted concurrently (PBI-SPL-002 follow-ups).

The design is in the [PBI-SPL-003 design record](../scene-play/issues/03-give-and-take-back-items.design.md), D1 and D2.

## Decision

- **Holder on the Item:** `Items` gets three columns:
  - `HolderInvestigatorId`: nullable, with no foreign key ([ADR 0013](0013-scenario-preparation-functionality-with-campaign-ownership-port.md)).
  - `HolderRevealId`: nullable, a foreign key to the give's Reveal with `NoAction`. A Player sees the held Item as it was when given.
  - A check constraint: both columns are set, or neither is.
- **Provider service:**
  - The holder changes only through Scenario Preparation's `ItemHolderCommandService`. It performs no authorization and is called only by Scene Play, through its own ports and adapters.
  - A give runs `Scene.GiveItem` and commits the Item Reveal and the holder change in one save.
  - `IItemHolders` and `NoItemHolders` are removed. Scenario Preparation reads the holder from the Item.
- **In play:** an Item is in play while any of these is true:
  - a Scene that links it is Active or Finished;
  - a Reveal exists of the Item or of one of its Handouts;
  - an Investigator holds it.
- **Item version:** `Items.Version` is an optimistic concurrency token, mirroring `Scene.Version` ([ADR 0025](0025-one-active-scene-per-campaign-through-a-filtered-index-and-a-scene-version.md)).
  - **These increment it, in the same save:**
    - a holder change;
    - a Reveal of the Item or of one of its Handouts;
    - removing an Item Handout;
    - replacing an Item Handout's file in a way that deletes the old one.
  - **An Item delete** checks the version, so the second of two racing writes fails and is refused.

## Considered Options
- **An `ItemHolders` table in a new Scene Play DbContext, behind `IItemHolders` (ADR 0022 as written).** Rejected:
  - the give and its Reveal would be two commits;
  - no version could guard across the two contexts;
  - it adds Scene Play's first DbContext and migrations.
- **A separate holder table in Scenario Preparation's database.** Rejected: it adds a table and a key, and the version must sit on `Items` anyway.
- **A per-Item application lock or a serializable transaction.** Rejected: it is a new mechanism specific to SQL Server, it cannot be tested on SQLite, and every path would have to take the lock.
- **Holder columns and a version on `Items`, changed through a provider service (chosen).**

## Consequences
- Scene Play's holder rules are coded in the Scenario Preparation domain (`Scene.GiveItem`, `Item.GiveTo`, `Item.TakeBack`), as ADR 0024 already does for presence and Reveals.
- Scenario Preparation reads the holder directly. The PBI-SPL-003 consequence of ADR 0022 is met by these columns, with no port adapter.
- **ADR 0021 and ADR 0022 are amended:** an Item's stored files are also kept once the Item or one of its Handouts has been revealed. The Item version replaces "the delete's usage check" as the race guard for Items.
- **Given up:**
  - Scenario Preparation's independence from where Scene Play keeps the holder;
  - a version bump on Item writes;
  - a refused write after a conflict, which the client handles by refetching.

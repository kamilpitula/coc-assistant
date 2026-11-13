# Replaced Roll Records are classified by their consumer; the kernel Roll Record never changes

Status: Accepted

## Context

**The re-roll grant** ([specs/character-sheet/spec.md](../../specs/character-sheet/spec.md), Re-roll grant; CONTEXT.md "Re-roll grant"):
- With a Change Request, the Keeper may let the Player roll Characteristics, Luck, or EDU improvement checks again.
- The earlier Roll Records are kept for the Keeper, are left out of the Player's view, and stop counting toward values and Creation locks.

**What already binds the Roll Record:**
- [ADR 0030](0030-dice-are-rolled-only-on-the-server.md) puts `RollRecord` in the game-rules kernel and lets each consumer own its purposes and storage.
- [specs/dice/spec.md](../../specs/dice/spec.md) says a Roll Record is never changed after it is created.
- The kernel `RollRecord` is also stored by Roll Requests (ScenarioPreparation) and read by Scene Play.

**The problem:** a replacement and the record it replaces share a purpose. `CharacterSheet.ResultFor` reads one record per purpose, so every reader would have to tell the two apart.

## Decision

- The kernel `RollRecord` gets no replaced flag and is never modified.
- A consumer that needs replacement keeps two collections:
  - its current Roll Records, which are the only ones that count;
  - its replaced Roll Records, which are kept and never deleted.
- Replacing a record moves it, unchanged, from the current collection to the replaced one.
- For the Character Sheet:
  - `CharacterSheet.RollRecords` holds the current records;
  - `CharacterSheet.ReplacedRollRecords` holds the replaced records;
  - `CharacterSheet.RerollGrants` holds the open grants;
  - all three are stored in schema version 6 of the Character Sheet document ([ADR 0007](0007-persist-character-sheet-as-schema-versioned-json-value.md)).
- Which audience sees replaced records is decided in the application layer, not in the browser.

## Considered Options

- **An `IsReplaced` flag on the kernel `RollRecord`.** Rejected:
  - it changes a record after creation, against the Dice spec;
  - it adds a creation concept to a kernel type that other contexts share;
  - every reader would have to filter replaced records.
- **A consumer wrapper `(RollRecord, IsReplaced)` in one list.** Rejected: every reader of the sheet's records would have to filter, and missing one filter would count a replaced result toward values.

## Consequences

- Value calculation, validation, Creation locks, and the roll actions keep reading only current records, so a replaced result can't count by construction.
- Any later consumer that needs replacement (for example Roll Requests or the development phase) copies this shape, with its own collections.
- Given up:
  - there is no uniform "replaced" query across consumers;
  - a view that shows both collections must merge them for display.

# Order Campaign preparation records by a stored position with a deterministic tie-break

Status: Accepted

A Campaign has zero or more Scenarios in a set order, and a Scenario will contain ordered Scenes (PBI-SP-002). The Keeper creates records at the end of the order and moves them up or down. The order must be stable and unambiguous ([specs/scenario-preparation/spec.md](../../specs/scenario-preparation/spec.md), Regression Guardrails), and a reorder must never lose, duplicate, or add a record.

Each ordered record stores an integer `Position`. It is not unique. Every read orders by `Position`, then `CreatedAt`, then `Id`, in one repository method, so the order is always total. A new record gets the highest `Position` in its parent plus 1, starting at 1. A reorder submits the complete ordered list of the parent's record ids (`PUT .../order`); a domain operation checks that the list is exactly the stored set and, only then, rewrites the positions to 1..n in one save. `Position` is not sent to clients; they use the order of the list.

## Considered Options
- Unique index on `(parent, Position)`, following [ADR 0003](0003-single-active-campaign-invite-via-filtered-unique-index.md). Rejected: SQL Server checks a unique index per statement, so swapping positions through EF needs a two-step update, and a concurrent create needs conflict translation, for no user-visible gain.
- No stored position; order by `CreatedAt`. Rejected: the order is a domain property the Keeper controls, and adding a position later needs a migration and backfill.
- Per-record move or position endpoints (`.../{id}/move`, `.../{id}/position`). Rejected: each new control would need its own endpoint, and the client cannot state the order it saw.
- Stored non-unique position with a tie-break and full-order replacement (chosen).

## Consequences
- A reorder submits the complete ordered set of ids and rewrites positions to 1..n in one save. A duplicate-free set that differs from the stored one is refused with 409, so a stale client cannot drop, duplicate, or add records. A list with duplicate ids is refused with 400.
- Because every reorder renumbers, duplicate positions from a concurrent create last only until the next reorder; the tie-break keeps the order deterministic meanwhile.
- Reorders are last-write-wins over the whole order. Edits never write `Position`, and reorders write only `Position`.
- A unique index on position can still be added later; together with renumbering it would need a two-step update, which is one reason it is not used now.
- Scenes in PBI-SP-002 follow the same storage and reorder contract unless a recorded reason says otherwise.

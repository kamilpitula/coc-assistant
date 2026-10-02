# Store the Character Sheet as a versioned JSON value on a separate Investigator aggregate

Status: Accepted

An Investigator belongs to one Campaign and one Player, moves through Draft, Submitted, Changes Requested, and Approved, and holds a Character Sheet that covers the full [investigator data model](../game-rules/coc7_character_creation_and_development_rules.md#1-investigator-data-model). The sheet is large, nested, Era-dependent, and always read and written as a whole. `Investigator` is its own aggregate, not a child of `Campaign`. It has a unique index on `(CampaignId, PlayerAccountId)`, and its Character Sheet is a value object stored in one JSON column with an explicit schema version.

## Considered Options
- Child entity of the `Campaign` aggregate, like `CampaignPlayer`. Rejected: every sheet save would load and version the Campaign and collide with `MembershipVersion`, so Player joins and sheet edits would retry against each other.
- Fully relational tables for characteristics, skills, Roll Records, weapons, and backstory. Rejected: no query reads across sheets, the shape varies by Era and Creation Method, and every new Era or roll source would need a migration.
- Separate aggregate with a versioned JSON Character Sheet (chosen).

## Consequences
- The database enforces one Investigator per Player per Campaign even under concurrent creation, following the pattern from [ADR 0003](0003-single-active-campaign-invite-via-filtered-unique-index.md).
- Adding an Era or a `Server` roll source changes the JSON shape and bumps the schema version; older sheets are upgraded on read rather than by table migration.
- Queries that filter on sheet contents (for example, all Investigators with a given Occupation) are not indexed. Promote a field to a column if such a query becomes necessary.
- Authorization checks that the caller is the owning Player or the Campaign's Keeper live in the Investigator application service, which loads the Campaign only to resolve the Keeper and membership.

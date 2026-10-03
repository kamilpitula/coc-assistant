# Persist the Character Sheet as a schema-versioned JSON value through a value converter

Status: Accepted

[ADR 0005](0005-investigator-aggregate-with-versioned-json-character-sheet.md) makes `Investigator` its own aggregate and stores its Character Sheet in one JSON column with an explicit schema version. It left open how the column is mapped, how the Investigator row relates to its Campaign, and how concurrent Keeper and Player actions on one Investigator are kept consistent. This ADR settles those points for the `Investigators` table in `CampaignPlayDbContext`.

The Character Sheet column holds a JSON document with a `schemaVersion` field, written and read by `CharacterSheetJsonStorage` in CampaignPlay Infrastructure through an EF Core value converter. The document stores only the Player's inputs: identity, Creation Method, assigned characteristics, the age deduction split, and the Roll Records. Derived values (age-adjusted characteristics, Hard and Extreme values, HP, Luck, and so on) are recomputed on every read and are never stored or accepted from the client. Reading an unknown schema version fails loudly; a future version adds an upgrade step in the same class. `Investigators.CampaignId` has a foreign key to `Campaigns` with cascade delete, like Campaign Invites and Campaign Players. The unique index `IX_Investigator_CampaignId_PlayerAccountId` enforces one Investigator per Player per Campaign. An integer `Version` concurrency token is incremented by every change, so racing changes surface as a conflict instead of the last write winning.

## Considered Options
- EF Core `ComplexProperty(...).ToJson()` mapping. Rejected: the mapped shape is tied to the domain types and their EF constraints, and the schema version and its upgrade-on-read step have no single obvious place.
- Value converter to a string column with an explicit document type (chosen). It behaves the same on SQL Server (`nvarchar(max)`) and SQLite (`TEXT`), which the unit tests use.
- Storing derived values alongside the inputs. Rejected: they would have to be kept in sync with every rule change, and the spec forbids accepting them from the client.
- A foreign key from the Investigator to `CampaignPlayers` (CampaignId, AccountId). Rejected for now: it needs an alternate key on `CampaignPlayer`, and removing a Player from a Campaign does not exist yet. Membership is checked by the application service.
- No concurrency token. Rejected: two Keeper tabs could approve and request changes at the same time, and a Player's save could race their own Start over.

## Consequences
- The database cannot query inside the Character Sheet; ADR 0005 already accepts this.
- A unique-index violation (matched by the index name on SQL Server and by the constrained columns on SQLite) or a stale `Version` surfaces from `EfInvestigatorRepository` as `InvestigatorConflictException`, which the API reports as 409.
- Deleting a Campaign deletes its Investigators.
- Changing the stored document shape requires a new schema version and an upgrade step in `CharacterSheetJsonStorage`, not a table migration.

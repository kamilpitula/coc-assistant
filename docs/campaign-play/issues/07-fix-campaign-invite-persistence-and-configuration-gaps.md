---
id: PBI-CP-007
status: done
blocked_by: [PBI-CP-002]
pr: 1
---

# PBI-CP-007: Fix Campaign Invite Persistence and Player Limit Configuration Gaps

## Directive
Close the persistence and configuration gaps found during independent verification of PBI-CP-002 so the Player limit and Campaign Invite invariants hold for existing data and under concurrency.

**Scope:**
- Correct the migration backfill so existing Campaigns default to a Player limit of eight, not zero.
- Add a database-level constraint (or equivalent concurrency-safe mechanism) enforcing exactly one active Campaign Invite per Campaign, with a concurrency test proving it.
- Add a way for the Keeper to configure the Player limit, at minimum at Campaign-creation time, consistent with the spec.
- Do not re-touch Investigators, Wall Entries, Presence, or live updates.

## Dependencies
- Blocked by: PBI-CP-002: Manage Campaign Invites and Player Membership
- Must merge before: any ticket depending on reliable Player-limit enforcement or Invite replacement under concurrency

## Context
Read: `specs/campaign-play/spec.md`
- Blueprint: Campaign Structure and Persistence.
- Constraints: Campaign Invite lifecycle and Player limit.
- Regression Guardrails: A revoked or replaced Invite cannot admit new Players.

Gaps found during independent review of PBI-CP-002:
- The migration `20261001110509_AddCampaignInviteAndMembership.cs` (in `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Infrastructure/Migrations/`) adds the `PlayerLimit` column with a backfill value of `0` for Campaign rows created under PBI-CP-001. Those Campaigns can no longer admit any Player after migrating, breaking backward compatibility and violating the spec invariant that the default Campaign limit is eight Players.
- `CampaignPlayDbContext` defines only a global unique index on the Invite `Token` column, not a filtered unique index on `(CampaignId) WHERE Status = Active`. Concurrent issue and replace requests for the same Campaign can both insert an active Invite row. Lookups such as `ActiveInvite.SingleOrDefault()` in `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Application/CampaignMembershipService.cs` and `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Domain/Campaign.cs` can throw when two active Invites exist, and the "exactly one active Invite per Campaign" invariant is not enforced by the database. No test currently covers concurrent Invite issuance or replacement.
- The spec says the Keeper may configure the Player limit, but no constructor parameter, request field, or endpoint exists to set a non-default limit. `Campaign` always assigns the default of eight (see `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Domain/Campaign.cs`), and `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Controllers/CreateCampaignRequest.cs` only accepts `Name`.

## Verification
- [x] Existing Campaigns created before this migration default to a Player limit of eight, not zero.
- [x] The database enforces exactly one active Campaign Invite per Campaign, and a concurrency test proves concurrent issue/replace cannot create two active Invites.
- [x] The Keeper can configure the Player limit at Campaign-creation time, and the configured value is persisted and enforced.
- [x] Unit and integration tests cover the migration backfill, the concurrency constraint, and the configurable limit.

## Refinement Protocol
If the Campaign limit or Invite lifecycle changes, update the membership state rules and all related acceptance scenarios before implementation. Preserve the invariant that each Campaign has exactly one active Invite and that the default Player limit is eight.

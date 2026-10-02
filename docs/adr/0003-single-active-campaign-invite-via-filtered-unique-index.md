# Enforce a single active Campaign Invite with a filtered unique index

Status: Accepted

A Campaign must have at most one active Campaign Invite. The `Campaign` aggregate already replaces the previous Invite when it issues a new one, but that check only sees the state each request loaded. Two concurrent issue or replace requests for the same Campaign could each insert an active Invite, and `Campaign.ActiveInvite` (`SingleOrDefault`) then throws on every later read. The database now enforces the invariant with a filtered unique index, `IX_CampaignInvite_CampaignId_Active` on `CampaignInvite(CampaignId) WHERE [Status] = 'Active'`. A losing write surfaces as `CampaignMembershipConflictException` from `EfCampaignRepository`. `CampaignMembershipService` then re-reads and reapplies the change, which is the same bounded retry pattern `JoinAsync` uses for the Player limit.

## Considered Options
- Application-only check (load, test `ActiveInvite`, insert). Rejected: this is the existing behavior and it is racy by construction.
- Optimistic concurrency token on `Campaign` bumped on every Invite change (reuse `MembershipVersion`). Rejected: it serializes Invite changes with Player joins, so replacing an Invite would make in-flight joins retry. It also puts the invariant on a counter instead of on the Invite rows.
- Serializable transaction or an application lock per Campaign. Rejected: it needs explicit transaction plumbing in the application layer and holds range locks, but it gives no stronger guarantee than the index.
- Filtered unique index plus service-level retry (chosen).

## Consequences
- The invariant holds even for writes that bypass the aggregate. The index is created by migration `FixCampaignPlayerLimitAndActiveInviteUniqueness`, which first demotes all but the newest active Invite per Campaign to `Replaced` so existing data cannot block it.
- The filter compares the string-stored status (`[Status] = 'Active'`). Renaming `CampaignInviteStatus.Active` or changing its storage conversion needs a matching migration.
- `EfCampaignRepository` maps only violations of this index (matched by index name on SQL Server, by constrained column on SQLite) to `CampaignMembershipConflictException`. Other `DbUpdateException`s still surface unchanged.
- Issue and Replace retry up to three attempts. After that the conflict propagates as a server error. That needs more than three concurrent Invite changes for one Campaign, which a single Keeper is not expected to produce.
- Future single-active invariants (for example, one approved Character Sheet per Investigator) can follow the same pattern.

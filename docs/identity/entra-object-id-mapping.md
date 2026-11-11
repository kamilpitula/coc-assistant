# Entra object id mapping: one Account per person

Vocabulary: `Account` and Entra object id per the root `CONTEXT.md` (Identity and Access).
Identity resolution lives in `EntraIdentity.FromClaims` (`backend/src/Identity/CocAssistant.Identity.Application/EntraIdentity.cs`),
shared by every entry point through `CallerAccountResolver`.

## What happened

After deploying with Azure SignalR Service (`Azure:SignalR:ConnectionString` set), Presence showed
"unknown" and `SubscribeToCampaign` threw `HubException("Campaign not found.")`, while the same person
could use every REST endpoint. The `Accounts` table held two rows per person: one whose `EntraObjectId`
was the `oid` GUID, one whose `EntraObjectId` was the opaque 43-char base64url `sub` value.
Memberships and invites hung off the `sub`-style Account (REST resolved to it); the hub resolved the
`oid`-style Account, which had no `CampaignPlayer` row, so the subscribe failed.

## Root cause

REST (JwtBearer via Microsoft.Identity.Web 4.14.2) applies the default JWT inbound claim mapping, so a
real Entra token arrives as `http://schemas.microsoft.com/identity/claims/objectidentifier` (from `oid`)
plus `ClaimTypes.NameIdentifier` (from `sub`), with no short `oid` claim. `EntraIdentity.FromClaims` only
read the short `oid` form and fell back to `NameIdentifier`, i.e. to `sub`, provisioning a second Account
keyed by the pairwise `sub` value. Under Azure SignalR Service the hub principal carries the short `oid`,
so it provisioned (or found) the other row. Locally and in tests both entry points shared one
`HttpContext.User` and the test handler emitted a literal `oid`, so the split never appeared.

Verified: `JwtSecurityTokenHandler.DefaultMapInboundClaims` is true and maps `oid` to the long
`objectidentifier` URI and `sub` to `NameIdentifier` (empirical check, .NET 10); the
Microsoft.Identity.Web 4.14.2 WebApi sources set no `MapInboundClaims` override, so the default applies.
Not verifiable without a live Azure token: the exact claim shape the Azure SignalR Service JWT path
hands the hub. The fix is shape-agnostic, so it holds either way.

## Rule

The Account identity is the Entra `oid` claim in any mapped form: `oid`, then
`http://schemas.microsoft.com/identity/claims/objectidentifier`. `sub` (`ClaimTypes.NameIdentifier`) is
never identity on its own: a token with no `oid`-form claim yields no identity (REST 401,
hub `Context.Abort()`), never a `sub`-keyed Account. A silent second Account is worse than a visible 401.

## Repair runbook (dev data only; human runs this, never automation)

Direction: keep the membership-bearing (`sub`-style) row, because every reference (`Campaign.KeeperAccountId`,
`CampaignPlayer.AccountId`, `Investigator.PlayerAccountId`, `WallEntry.AuthorAccountId`, and
`RolledByAccountId` inside stored Character Sheet JSON) points at the internal `Account.Id` GUID, which does
not change. Only the Identity database is written; no CampaignPlay rewrite is needed. Run nothing against
Azure; this is for the dev database that already holds split rows.

1. Report: list candidate pairs (one GUID-shaped row plus one non-GUID row, same display name
   case-insensitive, created within 24h of each other).

```sql
SELECT oid.Id AS OidAccountId, oid.EntraObjectId AS OidValue,
       sub.Id AS SubAccountId, sub.EntraObjectId AS SubValue, sub.DisplayName AS SharedName
FROM Accounts oid
JOIN Accounts sub
  ON LOWER(sub.DisplayName) = LOWER(oid.DisplayName)
 AND ABS(DATEDIFF(HOUR, oid.CreatedAt, sub.CreatedAt)) <= 24
WHERE TRY_CONVERT(uniqueidentifier, oid.EntraObjectId) IS NOT NULL
  AND TRY_CONVERT(uniqueidentifier, sub.EntraObjectId) IS NULL;
```

2. Confirm per pair, against the CampaignPlay database, that the `sub`-style `Id` holds the memberships
   and the `oid`-style `Id` holds none:

```sql
SELECT 'Campaigns' AS TableName, COUNT(*) AS Refs FROM Campaigns WHERE KeeperAccountId = '<SubAccountId>'
UNION ALL SELECT 'CampaignPlayer', COUNT(*) FROM CampaignPlayer WHERE AccountId = '<SubAccountId>'
UNION ALL SELECT 'Investigators', COUNT(*) FROM Investigators WHERE PlayerAccountId = '<SubAccountId>'
UNION ALL SELECT 'WallEntries', COUNT(*) FROM WallEntries WHERE AuthorAccountId = '<SubAccountId>';
-- Repeat with '<OidAccountId>': every count must be 0, or stop and investigate.
```

3. Merge one confirmed pair (idempotent: the `WHERE` guards make a re-run a no-op). The `UPDATE`
   derives the DisplayName/Email snapshot from whichever row has the later `LastSignedInAt` (ties favor
   the `oid` row), so there is nothing to pick by hand.

```sql
BEGIN TRANSACTION;
UPDATE sub
   SET EntraObjectId = oid.EntraObjectId,
       DisplayName = CASE WHEN oid.LastSignedInAt >= sub.LastSignedInAt THEN oid.DisplayName ELSE sub.DisplayName END,
       Email = CASE WHEN oid.LastSignedInAt >= sub.LastSignedInAt THEN oid.Email ELSE sub.Email END,
       LastSignedInAt = CASE WHEN oid.LastSignedInAt >= sub.LastSignedInAt THEN oid.LastSignedInAt ELSE sub.LastSignedInAt END
  FROM Accounts sub
  JOIN Accounts oid ON oid.Id = '<OidAccountId>' AND oid.EntraObjectId = '<OidValue>'
 WHERE sub.Id = '<SubAccountId>' AND sub.EntraObjectId = '<SubValue>';
DELETE FROM Accounts WHERE Id = '<OidAccountId>' AND EntraObjectId = '<OidValue>';
COMMIT;
```

4. Re-run the report query: it must return no rows.

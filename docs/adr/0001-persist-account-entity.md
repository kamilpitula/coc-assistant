# Persist a local Account entity instead of pure token passthrough

Microsoft Entra External ID is the sole source of authentication, but the API also persists a minimal `Account` row (Entra object ID, display name, email) via a dedicated `IdentityDbContext`, upserted through `GET /api/account/me` on each sign-in. We considered treating the Entra-issued token as the only representation of an Account (no local table), but Campaign Play needs a stable, queryable identifier to look up Accounts independent of any single Campaign (e.g. inviting someone by email, and a future cross-Campaign "my Campaigns" view) — a pure claims-passthrough design can't support that without a much larger migration later.

## Considered Options
- Pure token passthrough: no local table, every feature re-derives identity from the current JWT's claims. Rejected because nothing gives Campaign Play a stable foreign key to reference, or a way to look someone up before they've joined a Campaign.
- Persisted Account entity (chosen): a minimal table keyed by Entra object ID, refreshed on each sign-in.

# Read another functionality's data through a port owned by the consumer

Status: Accepted

Campaign Play shows Player names (the Keeper's Investigator list and review screen, and the read-only Player name on the Character Sheet). Names belong to the Identity functionality's `Account`. Campaign Play should not keep its own copy, because copies go stale when a display name changes at the next sign-in, and the two functionalities have separate `DbContext`s that may live in separate databases.

Campaign Play declares the port it needs, `IAccountDisplayNames`, in `CocAssistant.CampaignPlay.Application`, using its own vocabulary. Identity exposes the read as an application query, `AccountDisplayNameQuery`, in `CocAssistant.Identity.Application`. The adapter `IdentityAccountDisplayNames` lives in `CocAssistant.CampaignPlay.Infrastructure`, which references `CocAssistant.Identity.Application` and implements the Campaign Play port by calling the Identity query. `CocAssistant.Api` only registers both functionalities.

## Considered Options
- Snapshot the display name in Campaign Play when a Player joins. Rejected: it creates a second source of truth that goes stale.
- Put the adapter in `CocAssistant.Api`. Rejected: the composition root contains only startup, registration, and cross-cutting HTTP configuration (`backend/CLAUDE.md`).
- Let Campaign Play controllers call Identity and merge the names. Rejected: controllers stay focused on HTTP, and the merge belongs to the use case.
- Consumer-owned port with an adapter in the consumer's Infrastructure (chosen).

## Consequences
- Campaign Play Domain and Application still reference nothing outside Campaign Play; the dependency on Identity is confined to one Infrastructure adapter.
- Campaign Play tests replace the port with an in-memory fake, so they do not need Identity's database.
- Each read that shows names makes one extra query for all the Accounts it needs.
- Later reads across functionalities should follow the same shape: the consumer owns the port, the provider exposes an application query, and the consumer's Infrastructure adapts one to the other.

# Feature: Campaign Play

## Blueprint

### Context
Campaign Play gives a Keeper and Players a shared place to run a persistent Call of Cthulhu 7th Edition Campaign. It connects Campaign membership, Investigator readiness, live participation, and the chronological Wall Entry record without confusing a long-lived Campaign with an individual Play Session.

### Architecture
- **Domain relationships:** A Campaign has one Keeper, multiple Players, zero or more Investigators, and multiple Play Sessions. A Player joins through a Campaign Invite and controls at most one Investigator in that Campaign.
- **Campaign rules options:** A Campaign has an Era and a set of allowed Creation Methods, set by the Keeper in a collapsed "Rules options" section of the create-campaign form. Defaults are the 1920s Era and all three Creation Methods. The Keeper can change the allowed Creation Methods later from the Campaign page; the Era is fixed after creation. v1 offers the 1920s Era only. Campaigns created before this change are migrated to the 1920s Era with all Creation Methods allowed.
- **Investigator lifecycle:** `Investigator` is its own aggregate in `backend/src/CampaignPlay/CocAssistant.CampaignPlay.Domain/Investigators/`, keyed by Campaign and Player Account with a unique index on (CampaignId, PlayerAccountId). It holds the Character Sheet defined in [specs/character-sheet/spec.md](../character-sheet/spec.md), a status, the latest Change Request comment, and timestamps. Statuses and transitions:
  - Draft -> Submitted (the Player submits a Character Sheet with no validation errors)
  - Submitted -> Changes Requested (the Keeper requests changes with a required comment; only the latest comment is kept)
  - Changes Requested -> Submitted (the Player resubmits)
  - Submitted -> Approved (Character Approval by the Keeper; Approved means ready for play)
  - The Player edits the Character Sheet only in Draft or Changes Requested. Deleting the Investigator ("Start over") is available only in Draft. Editing after Approval is outside this feature.
- **Investigator visibility:** A Player reads only their own Investigator. The Keeper reads every Investigator in Submitted, Changes Requested, or Approved; a Draft is shown to the Keeper only as "In progress" with the Player's name. Requests for an Investigator outside the caller's visibility, including any in another Campaign, return 404.
- **Player and Keeper experience:** The Campaign page is the Campaign overview defined in [specs/campaign-overview/spec.md](../campaign-overview/spec.md); the rest of this bullet describes the Investigator interactions it hosts. The Campaign page renders by role. A Player sees a read-only Campaign view with a "Your Investigator" card showing the status and one primary action (Create, Continue, View, or Edit with the Keeper's Change Request comment). The Keeper sees the Investigator list with statuses and a review screen that uses the shared read-only Character Sheet view with Approve and Request changes actions. UX specification: [specs/character-sheet/ux.md](../character-sheet/ux.md).
- **Presence:** Each Campaign member is Connected or Not connected; the model allows adding further states later. Presence belongs to the member: they are Connected while any of their connections (tabs or devices) is open on any `/campaigns/{campaignId}` page, and Not connected immediately after the last one closes. Every member sees the full roster of their Campaign with each member's display name, role, and Presence. The roster also carries each member's Investigator as projected for the caller in [specs/campaign-overview/spec.md](../campaign-overview/spec.md) (Roster with Investigators). Only Campaign members can subscribe to a Campaign's Presence, and a Player who joins appears to connected members without a reload. UX specification: [ux.md](ux.md).
- **API Contracts:**
  - `POST /api/campaigns` - accepts `era` and `allowedCreationMethods` in addition to the existing fields; the response is the Keeper view below.
  - `GET /api/campaigns/{campaignId}` - Campaign members only; the response depends on the caller's role. The Keeper gets the Keeper view `{id, name, keeperAccountId, playerLimit, era, allowedCreationMethods, role: "Keeper"}`. A Player gets the reduced Player view `{id, name, era, allowedCreationMethods, role: "Player"}`, which carries no Keeper-only data. Non-members get 404.
  - `PUT /api/campaigns/{campaignId}/allowed-creation-methods` - Keeper only; replaces the allowed Creation Methods (at least one).
  - `GET /api/campaigns/{campaignId}/rules/occupations` - Campaign members (Keeper or Player) only; returns the Occupation catalog for the Campaign's Era.
  - `POST /api/campaigns/{campaignId}/investigators` - Player only; creates the caller's Draft Investigator; 409 when one already exists, and 409 when the Campaign allows no Creation Method the application supports yet (PBI-CP-003 supports Point Buy only).
  - `GET /api/campaigns/{campaignId}/investigators/mine` - Player only; returns the caller's Investigator status and Change Request comment, or 404.
  - `DELETE /api/campaigns/{campaignId}/investigators/mine` - Player only; deletes a Draft Investigator.
  - `POST /api/campaigns/{campaignId}/investigators/mine/submit` - Player only; submits a Draft or Changes Requested Investigator; 422 with `ValidationError` items when errors remain.
  - `GET /api/campaigns/{campaignId}/investigators` - Keeper only; lists Investigators with Player name and status.
  - `GET /api/campaigns/{campaignId}/investigators/{investigatorId}` - Keeper only; returns a non-Draft Investigator with its Character Sheet, warnings, and Roll Records.
  - `POST /api/campaigns/{campaignId}/investigators/{investigatorId}/approve` - Keeper only; Submitted -> Approved.
  - `POST /api/campaigns/{campaignId}/investigators/{investigatorId}/request-changes` - Keeper only; Submitted -> Changes Requested; the body carries the required comment of at most 2000 characters.
- **Investigator API shapes:** JSON properties are camelCase; status and Creation Method values use their PascalCase names (`Draft`, `Submitted`, `ChangesRequested`, `Approved`; `PointBuy`).
  - Investigator summary, returned by `POST .../investigators` (201), `GET .../investigators/mine`, and `POST .../investigators/mine/submit` (200): `{id, status, name, changeRequestComment, updatedAt}`. `name` is the Investigator name or null. `changeRequestComment` is the latest Change Request comment or null.
  - Keeper list item, returned as an array by `GET .../investigators`: `{playerAccountId, playerName, status, investigatorId, investigatorName, updatedAt}`. For a Draft, `investigatorId` and `investigatorName` are null, because the Keeper sees a Draft only as "In progress" with the Player's name.
  - Keeper Investigator, returned by `GET .../investigators/{investigatorId}`: `{id, status, playerName, changeRequestComment, updatedAt, characterSheet, warnings}`, where `characterSheet` is the Character Sheet view defined in [specs/character-sheet/spec.md](../character-sheet/spec.md) (it includes the Roll Records) and `warnings` is its `ValidationError` list with severity `Warning`.
  - `DELETE .../investigators/mine` returns 204. `POST .../approve` and `POST .../request-changes` return the Keeper Investigator.
  - Errors use RFC 9457 problem details. An action the Investigator's status does not allow, a second Investigator, or a Campaign without a supported Creation Method returns 409. A submission with errors returns 422 with a `validationErrors` array of `ValidationError` items. A missing or too long Change Request comment returns 400.
  - Player names come from the caller's Account display name through an Identity read port; Campaign Play does not store a copy.
- **Campaign members API:** `GET /api/campaigns/{campaignId}/members` - Campaign members (Keeper or Player) only; non-members get 404. Returns the roster in the UX order ([ux.md](ux.md) section 5) as an array of `{memberId, displayName, role, isYou, investigator}`.
  - `memberId` is an opaque string, stable within the Campaign, that identifies a member in Presence events. It is not an Account id, so the roster exposes no Account ids to Players (consistent with the Player Campaign view). A Player's `memberId` is their `CampaignPlayer.Id`; the Keeper's is the `Campaign.Id`. The mapping from Account to `memberId` lives in one Application method.
  - `role` is `Keeper` or `Player`. `isYou` is true only on the caller's own entry. Each entry also has an `investigator` field, projected server-side for the caller as defined in [specs/campaign-overview/spec.md](../campaign-overview/spec.md) (Roster with Investigators).
- **Wall Entry API:** `GET`, `POST`, and `DELETE /api/campaigns/{campaignId}/wall-entries[/{entryId}]` - Campaign members (Keeper or Player) only; non-members and missing Campaigns get 404 on every call. There is no read-by-id endpoint.
  - `GET ?limit=&cursor=` returns `{entries, nextCursor}`, newest first (by creation time, then id). Each entry is `{id, text, visibility, createdAt, authorDisplayName}` with `visibility` `Public` or `KeeperOnly`. `limit` defaults to 20 and must be 1 to 50; otherwise 400. `cursor` is opaque; a malformed one returns 400. The overview preview calls it with `limit=5`.
  - Visibility is applied in the query before ordering, limiting, and paging: a Player's result, its `nextCursor` (set only when more entries visible to the Player exist), and every id in it are built from Public entries only. The projection never includes an Account id; the author is shown by display name from the Identity read port.
  - `POST` takes `{text, visibility?}` and returns 201 with the entry. `visibility` defaults to Public. The text is trimmed and must be 1 to 2000 characters, otherwise 400. The Keeper may choose Public or KeeperOnly; a Player choosing KeeperOnly gets 400 and nothing is stored. An unknown visibility value returns 400.
  - `DELETE /{entryId}` removes the entry for good (hard delete; there is no edit and no restore) and returns 204. Only the Keeper may remove entries, including a Player's. A Player, a non-member, and a request for a missing entry or one in another Campaign all get the same 404, decided before any entry is looked up for a non-Keeper.
  - Persistence: one `WallEntries` table (id, Campaign id with cascade delete, author Account id, visibility, text, creation time) indexed for the newest-first query per Campaign.
- **Live connection contract:** Architecture decision: [ADR 0009](../../docs/adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md). One authenticated, strongly typed SignalR hub (`Hub<ICampaignClient>`) at `/hubs/campaign`, in `CocAssistant.CampaignPlay.Controllers`. `AddSignalR()` always runs; Azure SignalR Service (Default mode) is added only when `Azure:SignalR:ConnectionString` is configured, so local development, integration tests, and E2E run SignalR in-process.
  - Authentication: the Entra bearer token is sent through the SignalR `accessTokenFactory` (the `access_token` query string on the hub path only). Connections without a valid token are rejected. Connections close when the token expires (`CloseOnAuthenticationExpiration`); the client reconnects with a token from MSAL `acquireTokenSilent` and subscribes again, which re-checks membership.
  - On connect, the hub resolves the caller's Account id once and adds the connection to `account:{accountId}`.
  - The frontend opens the connection in the `/campaigns/$campaignId` layout route and closes it when the user leaves that route. It uses automatic reconnect with the default delays (0, 2, 10, 30 seconds); after the last attempt fails, the UI shows the failed state and "Try again" starts a new connection.
  - Client to server: `SubscribeToCampaign(campaignId)` checks Campaign membership server-side, adds the connection to `campaign:{campaignId}` (and the Keeper's connections also to `campaign:{campaignId}:keeper`), records the connection for Presence, and returns a Presence snapshot `{campaignId, members: [{memberId, presence}]}`. A roster member missing from the snapshot is Not connected. For a non-member or an unknown Campaign it throws a `HubException` with "Campaign not found." and nothing is recorded or delivered.
  - Server to client:
    - `PresenceChanged {campaignId, memberId, presence}`, sent to `campaign:{campaignId}` when a member's Presence changes. `presence` values use PascalCase names: `Connected`, `NotConnected`.
    - `CampaignDataChanged {campaignId, topics}`, an invalidation signal telling the client which data to refetch through REST, which stays the only place that authorizes reads. Topics are a closed set: `members` (PBI-CP-005), and `wallEntries`, `investigators`, and `myInvestigator` (PBI-CP-006).
  - Audience: a publication policy in `CocAssistant.CampaignPlay.Application` decides the group for each event. `members` and Public Wall Entry changes go to `campaign:{campaignId}`; Keeper-only Wall Entry changes and `investigators` go to `campaign:{campaignId}:keeper`; `myInvestigator` goes to the owning Player's `account:{accountId}`. A Keeper-only change never produces a signal to `campaign:{campaignId}`.
  - Publication: aggregates raise domain events that are dispatched after commit ([ADR 0011](../../docs/adr/0011-dispatch-domain-events-after-commit.md)); handlers publish through the policy. Delivery is best-effort: a failed publish never fails the request.
  - Catch-up: after a reconnect the client subscribes again, replaces its Presence states with the new snapshot, and refetches every query of the Campaign, so changes missed while disconnected are recovered.
  - Presence tracking: the server counts open subscribed connections per (Campaign, Account) in a pure `CampaignPresence` model wrapped by an `IPresenceTracker` adapter. The first connection makes the member Connected and the last disconnect makes them Not connected; changes in between send no event. "Immediately" means as soon as the server sees the disconnect: at once for a closed tab, and after the SignalR server timeout (30 seconds by default) for a lost network.
  - The tracker is held in API memory, so the API runs a single replica until a shared tracker replaces it ([ADR 0010](../../docs/adr/0010-in-memory-presence-tracker-with-single-api-replica.md)). Presence is not persisted and has no history.
  - Removing a member from a Campaign, when introduced, must also remove their connections from that Campaign's groups and from Presence.
- **Identity and access:** Account authentication is defined in [specs/identity-and-access/spec.md](../identity-and-access/spec.md). Campaign permissions distinguish the Keeper from Players and protect Keeper-only information.
- **Persistence:** Campaign state is stored in Azure SQL Database.
- **Live collaboration:** Wall Entry changes, changes to the connected Player's own Investigator, and Presence changes are delivered through SignalR (Azure SignalR Service where configured), as defined in the Live connection contract above. In v1 an own-Investigator change is a status change (Approved or Changes Requested); in-play stat changes will use the same `myInvestigator` topic once a play feature produces them.
- **Hosting:** The API runs on Azure Container Apps and the React experience runs on Azure Static Web Apps.
- **Dependencies:** Depends on Identity and Access, persistent Campaign storage, and a live collaboration channel. Scenario Preparation depends on Campaign membership and authorization defined here.

### Constraints
- The ruleset is Call of Cthulhu 7th Edition as defined in [docs/game-rules](../../docs/game-rules/README.md). This spec references rule sections and does not restate them.
- A Campaign Invite is open-join, has no default expiry, and can be revoked or replaced by the Keeper. The default Campaign limit is eight Players and the Keeper may configure it when creating the Campaign, between one and sixteen Players.
- A Campaign has at most one active Campaign Invite at any time, including when the Keeper issues or replaces Invites concurrently.
- An Investigator belongs to exactly one Campaign and cannot be shared across Campaigns.
- A Player may submit a Character Sheet, whose content is defined by the [investigator data model](../../docs/game-rules/coc7_character_creation_and_development_rules.md#1-investigator-data-model), but the Investigator is not ready for play until the Keeper approves it.
- Only the Keeper of a Campaign approves or requests changes to its Investigators; only the owning Player creates, edits, submits, or deletes an Investigator. Both are enforced server-side.
- A Campaign's Era is required and determines which rule data applies to its Character Sheets.
- The Keeper is the primary Wall Entry author. Players may add lightweight Wall Entries representing their own actions or notes.
- Wall Entry visibility is either Public or Keeper-only. Keeper-only Wall Entries are never visible to Players.
- Only the Keeper creates Keeper-only Wall Entries, and only the Keeper removes Wall Entries. A Player creates Public Wall Entries only and cannot edit or remove any entry. Wall Entries are not edited after they are created. Both rules are enforced server-side.
- The Campaign Wall page, composer, removal, and Wall preview are specified in [specs/campaign-wall/ux.md](../campaign-wall/ux.md).
- v1 provides live updates and Presence only; offline notifications, scheduling, dice automation, and billing are outside this feature.

## Contract

### Definition of Done
- [ ] An authenticated user can create a Campaign and is recorded as its Keeper.
- [ ] The Keeper can issue, revoke, and replace a Campaign Invite.
- [ ] A Player can join an active Campaign Invite until the configured Player limit is reached.
- [ ] A Player can submit an Investigator Character Sheet, and the Keeper can approve it.
- [ ] The Keeper can request changes with a comment, and the Player can edit and resubmit.
- [ ] The Keeper can set the Era and allowed Creation Methods when creating a Campaign, and change the allowed Creation Methods later.
- [ ] A Player sees only their own Investigator; the Keeper sees non-Draft Investigators in full and Draft Investigators only as "In progress".
- [ ] The Keeper can create Public and Keeper-only Wall Entries, and Players can create their permitted Public Wall Entries.
- [ ] A Player cannot read a Keeper-only Wall Entry.
- [ ] The Keeper can remove a Wall Entry, and a Player cannot remove any.
- [ ] Connected Campaign members receive Wall Entry, own-Investigator, and Presence changes without manually reloading the Campaign view.

### Regression Guardrails
- Campaign data and Investigators never cross Campaign boundaries.
- Keeper-only Wall Entries never appear in Player-visible data or live updates.
- An unapproved Investigator cannot be represented as ready for play.
- A Player controls at most one Investigator per Campaign.
- A Player cannot approve or request changes to any Investigator, including their own.
- A Player cannot read another Player's Investigator.
- A Player cannot perform Keeper actions through a Player-authorized operation.
- A revoked or replaced Campaign Invite cannot admit new Players.
- A Campaign's roster and Presence are delivered only to members of that Campaign, never include Account ids, and never include Investigator data beyond the caller's visibility ([specs/campaign-overview/spec.md](../campaign-overview/spec.md)).

### Scenarios
```gherkin
Scenario: Keeper creates a persistent Campaign
  Given an authenticated user has no role in a Campaign
  When the user creates a Campaign
  Then the Campaign is created with that user as its Keeper
  And the Campaign can contain multiple Play Sessions

Scenario: Player joins through an active Campaign Invite
  Given a Keeper has issued an active Campaign Invite
  And the Campaign has not reached its configured Player limit
  When an authenticated user follows the Campaign Invite
  Then the user becomes a Player in the Campaign
  And the user's Presence is available to connected Campaign members

Scenario: Campaign Invite limit prevents another Player from joining
  Given a Campaign has reached its configured Player limit
  When another authenticated user follows its Campaign Invite
  Then the user is not added as a Player
  And the Campaign membership remains unchanged

Scenario: Keeper configures the Player limit when creating a Campaign
  Given an authenticated user has no role in a Campaign
  When the user creates a Campaign with a Player limit between one and sixteen
  Then the Campaign admits Players through its Campaign Invite only until that limit is reached

Scenario: Keeper approves an Investigator
  Given a Player has submitted an Investigator Character Sheet
  And the Investigator is not approved
  When the Keeper approves the Character Sheet
  Then the Investigator is marked ready for play

Scenario: Keeper creates a Campaign with default rules options
  Given an authenticated user has no role in a Campaign
  When the user creates a Campaign without changing the rules options
  Then the Campaign's Era is 1920s
  And the Campaign allows Standard Rolling, Point Buy, and Quick Fire

Scenario: Keeper changes the allowed Creation Methods
  Given a Keeper's Campaign allows Standard Rolling, Point Buy, and Quick Fire
  When the Keeper changes the allowed Creation Methods to Standard Rolling and Point Buy
  Then the Campaign allows Standard Rolling and Point Buy
  And the Campaign's Era is unchanged

Scenario: Player cannot change the allowed Creation Methods
  Given a Player has joined a Campaign
  When the Player attempts to change the allowed Creation Methods
  Then the request is rejected
  And the allowed Creation Methods are unchanged

Scenario: Player starts a Draft Investigator
  Given a Player has joined a Campaign and has no Investigator
  When the Player starts creating an Investigator
  Then the Player's Investigator is a Draft
  And the Keeper sees that Investigator only as "In progress"

Scenario: Player submits a valid Character Sheet
  Given a Player has a Draft Investigator whose Character Sheet has no validation errors
  When the Player submits the Character Sheet
  Then the Investigator is Submitted
  And the Player can no longer edit the Character Sheet

Scenario: Keeper requests changes
  Given a Player's Investigator is Submitted
  When the Keeper requests changes with the comment "Credit Rating seems high for this Occupation"
  Then the Investigator is Changes Requested
  And the Player sees the comment on their Investigator
  And the Player can edit and resubmit the Character Sheet

Scenario: Request changes requires a comment
  Given a Player's Investigator is Submitted
  When the Keeper requests changes without a comment
  Then the request is rejected
  And the Investigator remains Submitted

Scenario: Player cannot approve their own Investigator
  Given a Player's Investigator is Submitted
  When the Player attempts to approve it
  Then the request is rejected
  And the Investigator remains Submitted

Scenario: Player cannot create a second Investigator
  Given a Player already has an Investigator in a Campaign
  When the Player attempts to create another Investigator in that Campaign
  Then the request is rejected
  And the Player still has exactly one Investigator in that Campaign

Scenario: Player cannot read another Player's Investigator
  Given two Players have Investigators in the same Campaign
  When one Player requests the other Player's Investigator
  Then the response is not found

Scenario: Investigator is not reachable from another Campaign
  Given an Investigator belongs to Campaign A
  When the Keeper of Campaign B requests that Investigator through Campaign B
  Then the response is not found

Scenario: Player starts over from a Draft
  Given a Player has a Draft Investigator
  When the Player chooses to start over
  Then the Player has no Investigator in the Campaign

Scenario: Player reads the Campaign without Keeper-only data
  Given a Player has joined a Campaign
  When the Player opens the Campaign
  Then the Player sees its name, Era, and allowed Creation Methods
  And the response carries no Campaign Invite or other Keeper-only data

Scenario: Player cannot create an Investigator without a supported Creation Method
  Given a Campaign allows only Creation Methods the application does not support yet
  When a Player of that Campaign attempts to create an Investigator
  Then the request is rejected
  And the Player has no Investigator in the Campaign

Scenario: Keeper cannot open a Draft Investigator
  Given a Player has a Draft Investigator
  When the Keeper requests that Investigator
  Then the response is not found

Scenario: Keeper-only Wall Entry stays hidden
  Given a Keeper has created a Keeper-only Wall Entry
  When a Player requests the Campaign Wall
  Then the Keeper-only Wall Entry is absent from the Player's result

Scenario: Player cannot add or remove Keeper-only Wall Entries
  Given a Keeper has created a Keeper-only Wall Entry
  When a Player tries to create a Keeper-only Wall Entry and to remove that Wall Entry
  Then the creation is refused and the removal is not found, as for a Wall Entry that does not exist

Scenario: Keeper removes a Wall Entry
  Given a Player has created a Public Wall Entry
  When the Keeper removes it
  Then it is absent for the Keeper and the Player

Scenario: Live Wall Entry is delivered to connected members
  Given a Keeper and a Player are connected to the same Campaign
  When the Keeper creates a Public Wall Entry
  Then the Player receives the new Wall Entry without manually reloading

# Presence scenarios trace to specs/campaign-play/ux.md section 9 (PR-UX-n).

Scenario: Members see who is at the table
  # PR-UX-1, PR-UX-11
  Given a Campaign with a Keeper and two Players
  And the Keeper and one Player have the Campaign open
  When the other Player opens the Campaign page
  Then the Player sees every member in the order Keeper, themselves, other Players
  And their own entry is marked "(you)" and the Keeper's entry is labelled "Keeper"
  And each member shows "Connected" or "Not connected"
  And the roster shows only the Investigator data visible to the Player (specs/campaign-overview/spec.md)

Scenario: A member connecting is shown without reloading
  # PR-UX-2
  Given the Keeper has the Campaign page open
  And a Player is shown as "Not connected"
  When the Player opens the Campaign
  Then the Keeper sees the Player as "Connected" without manually reloading
  And the summary count of connected members goes up by one

Scenario: A member leaving is shown without reloading
  # PR-UX-3
  Given the Keeper and a Player have the Campaign open
  When the Player closes their only Campaign tab
  Then the Keeper sees the Player as "Not connected" without manually reloading

Scenario: A member with another open tab stays connected
  # PR-UX-3
  Given a Player has the Campaign open in two tabs
  And the Keeper has the Campaign page open
  When the Player closes one of the tabs
  Then the Keeper still sees the Player as "Connected"

Scenario: A member on a Campaign sub-page counts as connected
  # PR-UX-4
  Given the Keeper has the Campaign page open
  When a Player opens the Investigator creation wizard in that Campaign
  Then the Keeper sees the Player as "Connected"

Scenario: A Player who joins appears to connected members
  # PR-UX-5
  Given the Keeper has the Campaign page open
  When an authenticated user joins through the active Campaign Invite
  Then the new Player appears in the Keeper's roster without manually reloading
  And no member's position changes except to make room for the new Player

Scenario: Presence changes do not reorder the roster
  # PR-UX-6
  Given a Player has the Campaign page open
  When another Player connects and then disconnects
  Then every member stays in the same position in the roster

Scenario: Losing your own connection marks Presence as unknown
  # PR-UX-7, PR-UX-8
  Given a Player has the Campaign page open
  When the Player's live connection is lost
  Then the Player sees "Connection lost. Reconnecting..."
  And every member shows "Unknown"
  When the connection is restored
  Then the notice disappears and every member shows their current Presence

Scenario: Reconnecting gives up and offers a retry
  # PR-UX-9
  Given a Player's live connection is lost
  When every automatic reconnect attempt fails
  Then the Player sees "Couldn't reconnect." with a "Try again" button
  When the Player presses "Try again" and the connection succeeds
  Then every member shows their current Presence

Scenario: Keeper without Players is prompted to share the Invite
  # PR-UX-10, superseded by CO-UX-5 (specs/campaign-overview/ux.md section 4.1)
  Given a Campaign has no Players
  When the Keeper opens the Campaign page
  Then the roster shows only the Keeper as "Connected"
  And "Needs your attention" shows "No Players have joined yet." with "Invite Players"

Scenario: Non-member cannot subscribe to a Campaign's Presence
  # PR-UX-12
  Given an authenticated user is not a member of a Campaign
  When the user subscribes to that Campaign's Presence
  Then the subscription is refused with "Campaign not found."
  And the user receives no Presence or roster for that Campaign
  And no member sees the user as connected

Scenario: Non-member cannot read a Campaign's roster
  Given an authenticated user is not a member of a Campaign
  When the user requests that Campaign's members
  Then the request returns 404

Scenario: Unauthenticated connection is rejected
  Given a request carries no valid bearer token
  When it connects to the Campaign hub
  Then the connection is rejected

Scenario: Presence stays within its Campaign
  Given a Player is a member of Campaign A but not of Campaign B
  And the Player has Campaign A open
  When a member of Campaign B connects
  Then the Player receives no Presence event for Campaign B
```

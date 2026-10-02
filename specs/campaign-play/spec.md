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
- **Player and Keeper experience:** The Campaign page renders by role. A Player sees a read-only Campaign view with a "Your Investigator" card showing the status and one primary action (Create, Continue, View, or Edit with the Keeper's Change Request comment). The Keeper sees the Investigator list with statuses and a review screen that uses the shared read-only Character Sheet view with Approve and Request changes actions. UX specification: [specs/character-sheet/ux.md](../character-sheet/ux.md).
- **API Contracts:**
  - `POST /api/campaigns` - accepts `era` and `allowedCreationMethods` in addition to the existing fields.
  - `PUT /api/campaigns/{campaignId}/allowed-creation-methods` - Keeper only; replaces the allowed Creation Methods (at least one).
  - `POST /api/campaigns/{campaignId}/investigators` - Player only; creates the caller's Draft Investigator; 409 when one already exists.
  - `GET /api/campaigns/{campaignId}/investigators/mine` - Player only; returns the caller's Investigator status and Change Request comment, or 404.
  - `DELETE /api/campaigns/{campaignId}/investigators/mine` - Player only; deletes a Draft Investigator.
  - `POST /api/campaigns/{campaignId}/investigators/mine/submit` - Player only; submits a Draft or Changes Requested Investigator; 422 with `ValidationError` items when errors remain.
  - `GET /api/campaigns/{campaignId}/investigators` - Keeper only; lists Investigators with Player name and status.
  - `GET /api/campaigns/{campaignId}/investigators/{investigatorId}` - Keeper only; returns a non-Draft Investigator with its Character Sheet, warnings, and Roll Records.
  - `POST /api/campaigns/{campaignId}/investigators/{investigatorId}/approve` - Keeper only; Submitted -> Approved.
  - `POST /api/campaigns/{campaignId}/investigators/{investigatorId}/request-changes` - Keeper only; Submitted -> Changes Requested; the body carries the required comment of at most 2000 characters.
- **Identity and access:** Account authentication is defined in [specs/identity-and-access/spec.md](../identity-and-access/spec.md). Campaign permissions distinguish the Keeper from Players and protect Keeper-only information.
- **Persistence:** Campaign state is stored in Azure SQL Database.
- **Live collaboration:** Wall Entry changes, the connected Player's own Investigator stat changes, and Presence changes are delivered through Azure SignalR Service.
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
- [ ] Connected Campaign members receive Wall Entry, own-Investigator stat, and Presence changes without manually reloading the Campaign view.

### Regression Guardrails
- Campaign data and Investigators never cross Campaign boundaries.
- Keeper-only Wall Entries never appear in Player-visible data or live updates.
- An unapproved Investigator cannot be represented as ready for play.
- A Player controls at most one Investigator per Campaign.
- A Player cannot approve or request changes to any Investigator, including their own.
- A Player cannot read another Player's Investigator.
- A Player cannot perform Keeper actions through a Player-authorized operation.
- A revoked or replaced Campaign Invite cannot admit new Players.

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

Scenario: Keeper-only Wall Entry stays hidden
  Given a Keeper has created a Keeper-only Wall Entry
  When a Player requests the Campaign Wall
  Then the Keeper-only Wall Entry is absent from the Player's result

Scenario: Live Wall Entry is delivered to connected members
  Given a Keeper and a Player are connected to the same Campaign
  When the Keeper creates a Public Wall Entry
  Then the Player receives the new Wall Entry without manually reloading
```

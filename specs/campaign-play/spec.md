# Feature: Campaign Play

## Blueprint

### Context
Campaign Play gives a Keeper and Players a shared place to run a persistent Call of Cthulhu 7th Edition Campaign. It connects Campaign membership, Investigator readiness, live participation, and the chronological Wall Entry record without confusing a long-lived Campaign with an individual Play Session.

### Architecture
- **Domain relationships:** A Campaign has one Keeper, multiple Players, zero or more approved or pending Investigators, and multiple Play Sessions. A Player joins through a Campaign Invite and controls at most one Investigator in that Campaign.
- **Identity and access:** Microsoft Entra External ID federates Google and Microsoft sign-in. Campaign permissions distinguish the Keeper from Players and protect Keeper-only information.
- **Persistence:** Campaign state is stored in Azure SQL Database.
- **Live collaboration:** Wall Entry changes, the connected Player's own Investigator stat changes, and Presence changes are delivered through Azure SignalR Service.
- **Hosting:** The API runs on Azure Container Apps and the React experience runs on Azure Static Web Apps.
- **Dependencies:** Depends on external identity, persistent Campaign storage, and a live collaboration channel. Scenario Preparation depends on Campaign membership and authorization defined here.

### Constraints
- The ruleset is Call of Cthulhu 7th Edition.
- A Campaign Invite is open-join, has no default expiry, and can be revoked or replaced by the Keeper. The default Campaign limit is eight Players and the Keeper may configure it.
- An Investigator belongs to exactly one Campaign and cannot be shared across Campaigns.
- A Player may submit a Character Sheet, but the Investigator is not ready for play until the Keeper approves it.
- The Keeper is the primary Wall Entry author. Players may add lightweight Wall Entries representing their own actions or notes.
- Wall Entry visibility is either Public or Keeper-only. Keeper-only Wall Entries are never visible to Players.
- v1 provides live updates and Presence only; offline notifications, scheduling, dice automation, and billing are outside this feature.

## Contract

### Definition of Done
- [ ] An authenticated user can create a Campaign and is recorded as its Keeper.
- [ ] The Keeper can issue, revoke, and replace a Campaign Invite.
- [ ] A Player can join an active Campaign Invite until the configured Player limit is reached.
- [ ] A Player can submit an Investigator Character Sheet, and the Keeper can approve it.
- [ ] The Keeper can create Public and Keeper-only Wall Entries, and Players can create their permitted Public Wall Entries.
- [ ] A Player cannot read a Keeper-only Wall Entry.
- [ ] Connected Campaign members receive Wall Entry, own-Investigator stat, and Presence changes without manually reloading the Campaign view.

### Regression Guardrails
- Campaign data and Investigators never cross Campaign boundaries.
- Keeper-only Wall Entries never appear in Player-visible data or live updates.
- An unapproved Investigator cannot be represented as ready for play.
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

Scenario: Keeper approves an Investigator
  Given a Player has submitted an Investigator Character Sheet
  And the Investigator is not approved
  When the Keeper approves the Character Sheet
  Then the Investigator is marked ready for play

Scenario: Keeper-only Wall Entry stays hidden
  Given a Keeper has created a Keeper-only Wall Entry
  When a Player requests the Campaign Wall
  Then the Keeper-only Wall Entry is absent from the Player's result

Scenario: Live Wall Entry is delivered to connected members
  Given a Keeper and a Player are connected to the same Campaign
  When the Keeper creates a Public Wall Entry
  Then the Player receives the new Wall Entry without manually reloading
```

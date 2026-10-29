# Feature: Campaign Overview

## Blueprint

### Context
The Campaign page grew into a stack of everything a Campaign has: Presence, Invite management, the Investigators list, and Rules options. A Keeper and a Player arriving at a Campaign need to answer three questions first:
- What needs me now?
- Who is at the table, and is their Investigator ready?
- What happened recently on the Campaign Wall?

This feature turns the Campaign page into an overview that answers them, and adds Campaign-level navigation so that the Campaign Wall and Keeper-only settings are one step away without crowding the overview. Campaign membership, Investigator lifecycle, Presence, and live updates are defined in [specs/campaign-play/spec.md](../campaign-play/spec.md). This spec changes only what the roster exposes and how the Campaign is presented.

UX specification: [ux.md](ux.md).

### Architecture
- **Navigation:**
  - **Campaign header:** the `/campaigns/$campaignId` layout route renders the Campaign header (name, Era, back link, and Campaign navigation) on every Campaign page. The Campaign name is the Overview's `h1`. On other Campaign pages each page keeps its own `h1`.
  - **Navigation links:**
    - Overview (`/campaigns/$campaignId`)
    - Wall (`/campaigns/$campaignId/wall`, added with PBI-CP-004)
    - Settings (`/campaigns/$campaignId/settings`, Keeper only)
  - **Sub-pages:** the Character Sheet, wizard, and review pages belong to Overview.
- **Overview:** one layout for both roles:
  1. **Needs your attention:** items that call for the viewer's action. Shown only when there is at least one.
  2. **Active Scene** (PBI-SPL-001): shown only while a Scene is Active; its title, and for the Keeper and a Player whose Investigator is present, the location and Investigators present ([scene-play ux](../scene-play/ux.md) section 5). Data comes from the Scene Play Active Scene read.
  3. **At the table:** one row per Campaign Member with Presence, the Investigator visible to the viewer, its status, and an action. It replaces the separate Presence roster and the Keeper's Investigators list on the page.
  4. **Wall preview** (PBI-CP-004): the 5 latest Wall Entries visible to the viewer, read-only.
- **Attention items:**
  - **Keeper:**
    - one item per Submitted Investigator (Review);
    - one item when the Campaign has no Players (Invite Players).
  - **Player:** at most one item, about their own Investigator:
    - none yet (Create);
    - creation methods unavailable (no action);
    - Draft (Continue, with progress);
    - Changes Requested (Edit, with the Change Request comment).
  - Submitted and Approved produce no Player item.
  - Items are derived on the client from the roster and the Player's own Investigator reads. There is no attention endpoint.
- **Settings:** Keeper only. Holds Invite management (issue, replace, revoke) and Rules options, moved from the Campaign page unchanged in behavior. The overview keeps one "Invite Players" shortcut that opens a dialog with the join link, and issues an Invite first when none is active.
- **Roster with Investigators:** `GET /api/campaigns/{campaignId}/members` (defined in [campaign-play spec](../campaign-play/spec.md), Campaign members API) adds an `investigator` field to each entry, projected server-side for the caller. The client never filters.

  | Caller | Entry | `investigator` |
  |---|---|---|
  | Any | The Keeper | `null` |
  | Any | A Player with no Investigator | `null` |
  | Keeper | A Player's Draft | `{visibility: "InProgress"}` |
  | Keeper | A Player's Submitted, Changes Requested, or Approved | `{visibility: "Visible", id, name, status}` |
  | Player | Own Investigator, any status | `{visibility: "Visible", name, status}` |
  | Player | Another Player's Approved Investigator | `{visibility: "Visible", name, status: "Approved"}` |
  | Player | Another Player's Investigator in any other status, or none | `{visibility: "NotReady"}` |

  - **Wire format:** properties are camelCase; `visibility` and `status` use PascalCase names (`Visible`, `InProgress`, `NotReady`; `Draft`, `Submitted`, `ChangesRequested`, `Approved`). Each shape carries exactly the properties in its row: `InProgress` and `NotReady` carry `visibility` only, and a Player's `Visible` entry has no `id` property at all.
  - `name` may be `null` for an unnamed Investigator.
  - `id` is given to the Keeper only, because only the Keeper opens other Investigators.
  - A Player never receives another Player's Investigator id, status other than Approved, or any Character Sheet data.
  - For Players, "none" and "not Approved" both map to `NotReady`, so a Player cannot tell whether another Player has started.
- **Live updates** (through the existing `CampaignDataChanged` topics, [ADR 0009](../../docs/adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md)):
  - **Client:** the `investigators` and `myInvestigator` topics also invalidate the members query. A refetch is needed either way, so no new topic is added.
  - **Server:** when an Investigator becomes Approved, the publication policy also sends `members` to `campaign:{campaignId}`, so other Players see the newly visible name.
  - **What the signal carries:** only the topic. The name and status come through the authorized REST read.
  - **Timing:** the topics come from PBI-CP-006. Until it merges, the overview reflects Investigator changes on load and on refetch after reconnect.
- **Authorization:**
  - All roster projection happens in `CocAssistant.CampaignPlay.Application`.
  - The Settings route renders only for the Keeper. The Invite and rules endpoints keep their existing server-side Keeper checks, which remain the real boundary.

### Constraints
- Terminology follows [CONTEXT.md](../../CONTEXT.md). Presence copy never uses "status", "online", or "offline". "Status" names only the Investigator status.
- The overview has no editing: no Invite management beyond the shortcut dialog, no Rules options, and no Wall Entry authoring.
- Investigator visibility from the campaign-play spec is unchanged, with one deliberate addition: Players see the names of other Players' Approved Investigators. They still cannot open them.
- The Wall preview and the Wall link ship with PBI-CP-004. Nothing about the Wall is shown before it exists.

## Contract

### Definition of Done
- [ ] Every Campaign page shows the Campaign header with the back link, Campaign name, Era, and Campaign navigation.
- [ ] The Keeper sees Overview and Settings, and a Player sees Overview only (plus Wall once PBI-CP-004 ships).
- [ ] The overview shows "Needs your attention" only when it has items, with the Keeper and Player items defined above.
- [ ] "At the table" shows every member with Presence and the Investigator visible to the viewer, as projected by the members API.
- [ ] Invite management and Rules options appear only on Settings. The overview offers "Invite Players", which opens the join-link dialog.
- [ ] A Player cannot reach Settings data through the UI or the API.
- [ ] Investigator changes reach the overview without a reload once PBI-CP-006 topics exist.
- [ ] Unit, integration, and E2E tests cover the roster projection for each caller and status, the attention items, navigation by role, the Invite dialog, and Settings access.

### Regression Guardrails
- The roster never carries Account ids, and never carries Investigator data beyond the caller's visibility in the projection table.
- A Player never learns another Player's Investigator status other than Approved, nor another Player's Investigator id.
- The Keeper never sees a Draft Investigator's name.
- Moving Invite management and Rules options to Settings does not change their behavior or authorization.
- Presence behavior, order, and announcements from [specs/campaign-play/ux.md](../campaign-play/ux.md) are unchanged.

### Scenarios
```gherkin
# Scenarios trace to ux.md section 11 (CO-UX-n).

Scenario: Opening a Campaign lands on the overview
  # CO-UX-1, CO-UX-2
  Given a Keeper of a Campaign with one Player
  When the Keeper opens the Campaign
  Then the page heading is the Campaign name
  And the Campaign navigation shows "Overview" as current and "Settings"

Scenario: Players do not see Settings
  # CO-UX-2, CO-UX-12
  Given a Player of a Campaign
  When the Player opens the Campaign
  Then the Campaign navigation shows only "Overview"
  And opening the Settings address shows that the page could not be found

Scenario: Settings holds Invite management and Rules options
  # CO-UX-3
  Given a Keeper of a Campaign with an active Campaign Invite
  When the Keeper opens the overview
  Then no join link field and no Rules options are shown
  When the Keeper opens Settings
  Then the Keeper can replace and revoke the Invite and edit the Creation Methods

Scenario: Keeper is asked to review a submitted Investigator
  # CO-UX-4
  Given a Player has submitted an Investigator named "Dr. Ames"
  When the Keeper opens the overview
  Then "Needs your attention" shows "Dr. Ames by <Player> is ready for review"
  And choosing "Review" opens the review screen for Dr. Ames

Scenario: Keeper without Players is prompted to invite
  # CO-UX-5, CO-UX-10
  Given a Keeper's Campaign has no Players and no active Invite
  When the Keeper chooses "Invite Players" on the overview
  Then a join link is created and shown in the dialog
  And choosing "Copy link" shows "Copied."

Scenario: Player attention follows their Investigator
  # CO-UX-6
  Given a Player whose Investigator is a Draft at step 3
  When the Player opens the overview
  Then "Needs your attention" shows one item with "step 3 of 4" and "Continue"
  When the Investigator is Submitted
  Then "Needs your attention" is not shown

Scenario: Player sees the Keeper's Change Request on the overview
  # CO-UX-6
  Given the Keeper requested changes to a Player's Investigator with a comment
  When the Player opens the overview
  Then "Needs your attention" shows the comment and "Edit Investigator"

Scenario: Players see only Approved Investigators of others
  # CO-UX-7, CO-UX-8
  Given Player A's Investigator "Mae Doyle" is Approved
  And Player B's Investigator is Submitted
  When Player C opens the overview
  Then Player A's row shows "Mae Doyle" and "Approved" with no link
  And Player B's row shows "Not ready yet"

Scenario: Keeper does not see Draft names
  # CO-UX-9
  Given a Player's Investigator is a Draft
  When the Keeper opens the overview
  Then that Player's row shows "Not shown until submitted" and "In progress"

Scenario: Roster API projects Investigators by caller
  Given a Campaign with Players whose Investigators are Draft, Submitted, and Approved
  When a Player requests the Campaign members
  Then only their own Investigator and other Approved Investigators carry a name
  And no entry carries another Player's Investigator id or a status other than Approved

Scenario: Header stays on Campaign sub-pages
  # CO-UX-11
  Given a Player is on their Investigator wizard
  Then the Campaign header is shown with "Overview" as current

Scenario: Approval reaches other Players without reloading
  # CO-UX-13 (requires PBI-CP-006)
  Given Player C has the overview open
  When the Keeper approves Player A's Investigator "Mae Doyle"
  Then Player C sees "Mae Doyle" and "Approved" in Player A's row without manually reloading
```

# Feature: Campaign List

## Blueprint

### Context
A Campaign can only be reached by knowing its id: `/campaigns` shows nothing but the create-campaign form. Keepers and Players need one place listing every Campaign they are a Campaign Member of, with enough at a glance to pick the right one and see where they are needed, and one click into its overview ([specs/campaign-overview/spec.md](../campaign-overview/spec.md)).

Creating a Campaign is a separate user journey and moves off the list page to its own route. Campaign creation rules, membership, and Investigator visibility are defined in [specs/campaign-play/spec.md](../campaign-play/spec.md); this spec adds a read over them and does not change them.

UX specification: [ux.md](ux.md).

### Architecture
- **Routes:**
  - `/campaigns`: the read-only Campaign List, page heading "Your campaigns".
  - `/campaigns/new`: the existing create-campaign form, reached from a "New campaign" button on the list. Cancel returns to `/campaigns`. A successful create navigates to the new Campaign's overview (`/campaigns/{id}`) instead of showing an in-page success message.
  - `/`: a signed-in Account is redirected to `/campaigns` with a history replace, without rendering the home page first. Sign-in returns to `/` and is redirected from there. The home page is not reachable while signed in.
  - Signed-out visitors on `/campaigns` and `/campaigns/new` see a sign-in prompt instead of the page. Other `/campaigns/*` routes are unchanged.
- **Sections:** the list has two sections, "You run" (Campaigns where the caller is the Keeper) then "You play in" (Campaigns where the caller is a Player). A section with no Campaigns is not shown. Within a section, newest first: Keeper Campaigns by `Campaign.CreatedAt`, Player Campaigns by `CampaignPlayer.JoinedAt`.
- **Item content by role:**

  | Field | Keeper item | Player item |
  |---|---|---|
  | Campaign name | yes | yes |
  | Era | yes | yes |
  | Keeper display name | no | yes |
  | Players | joined count and Player limit | joined count only |
  | Approved Investigators | count | count |
  | Awaiting review | count of Submitted Investigators, shown when above 0 | no |
  | Own Investigator | no | status and name, or none |

  - "Approved Investigators" counts Investigators in Approved status only. Counting any other status would let a Player learn whether other Players have started, which the [campaign-overview guardrails](../campaign-overview/spec.md#regression-guardrails) forbid.
  - The whole item is one link to the Campaign overview.
- **API:** `GET /api/campaigns` - authenticated Accounts only. Returns every Campaign the caller is a Campaign Member of as one flat array, sorted server-side by section then newest first, so the client only splits it by `role`.
  - Keeper item: `{id, name, era, role: "Keeper", playerCount, playerLimit, approvedInvestigatorCount, awaitingReviewCount}`.
  - Player item: `{id, name, era, role: "Player", keeperName, playerCount, approvedInvestigatorCount, myInvestigator}`, where `myInvestigator` is `{status, name}` or `null`. `name` may be `null` for an unnamed Investigator.
  - Wire format: camelCase properties; `role` and `status` use PascalCase names (`Keeper`, `Player`; `Draft`, `Submitted`, `ChangesRequested`, `Approved`). Each shape carries exactly the properties listed for it: a Player item has no `playerLimit` and no `awaitingReviewCount`.
  - No item carries Account ids, Investigator ids, or Character Sheet data.
  - Unpaged. An Account with no Campaigns gets `[]`.
  - Keeper names come from Account display names through the existing Identity read port (`IAccountDisplayNames`); Campaign Play stores no copy.
- **Projection:** the query and the per-role projection live in `CocAssistant.CampaignPlay.Application`. The controller only maps to the wire format.
- **Freshness:** no live updates. The client refetches on page load and when the window regains focus. Delivering list changes through the `account:{accountId}` SignalR group is a recorded follow-up.

### Constraints
- Terminology follows [CONTEXT.md](../../CONTEXT.md). "Campaign List" and "Your campaigns" are UI names for a view over Campaign Membership, not new domain concepts, so CONTEXT.md is unchanged.
- The list is read-only: no create, leave, archive, or Invite actions on it beyond the "New campaign" button.
- Out of scope for v1: pagination, search, filtering, archived Campaigns, Presence on items, a home link while signed in, and joining by typing an invite code.

## Contract

### Definition of Done
- [ ] `/campaigns` lists the caller's Campaigns in "You run" and "You play in" with the item content above, and no create form.
- [ ] `/campaigns/new` hosts the create-campaign form; success opens the new Campaign's overview and Cancel returns to the list.
- [ ] Every item opens its Campaign overview.
- [ ] Empty, loading, error, and signed-out states match [ux.md](ux.md).
- [ ] A signed-in Account opening `/` lands on `/campaigns`, and Back does not return to `/`.
- [ ] `GET /api/campaigns` returns only the caller's Campaigns, projected per role, in the defined order.
- [ ] Unit, integration, and E2E tests cover the projection for each role, the counts, ordering, empty list, the redirect, the create route, and the signed-out prompt.

### Regression Guardrails
- A Player item never carries the Player limit, the awaiting-review count, Account ids, Investigator ids, or any count that depends on non-Approved Investigators of other Players.
- A non-member never receives a Campaign in the list.
- Creating a Campaign keeps its validation and server behavior from the [campaign-play spec](../campaign-play/spec.md); only the route and the post-create destination change.
- The Campaign overview and its back link ("Back to Campaigns", to `/campaigns`) are unchanged.

### Scenarios
```gherkin
# Scenarios trace to ux.md section 9 (CL-UX-n).

Scenario: Keeper and Player Campaigns are listed in their sections
  # CL-UX-1, CL-UX-2
  Given an Account is the Keeper of "The Haunting" and a Player in "Horror on the Orient Express"
  When the Account opens Campaigns
  Then "You run" lists "The Haunting"
  And "You play in" lists "Horror on the Orient Express"

Scenario: A section without Campaigns is not shown
  # CL-UX-2
  Given an Account is only a Player in one Campaign
  When the Account opens Campaigns
  Then no "You run" section is shown

Scenario: Keeper item shows Players, Approved Investigators, and reviews
  # CL-UX-3
  Given a Keeper's Campaign has 3 Players, a limit of 8, one Approved and two Submitted Investigators
  When the Keeper opens Campaigns
  Then the item shows "3 of 8 Players", "1 Investigator approved", and "2 awaiting review"

Scenario: Player item shows the Keeper and the Player's own Investigator
  # CL-UX-4
  Given a Player's Investigator "Harvey Walters" has Changes Requested
  When the Player opens Campaigns
  Then the item shows the Keeper's name, the Players count without a limit, and "Harvey Walters" with "Changes requested"

Scenario: Player item never reveals other Players' progress
  # CL-UX-4, guardrail
  Given another Player in the Campaign has a Draft Investigator and none are Approved
  When the Player opens Campaigns
  Then the item shows "No Investigators approved yet"

Scenario: Opening a Campaign from the list
  # CL-UX-5
  Given an Account is a Campaign Member of "The Haunting"
  When the Account chooses "The Haunting" on Campaigns
  Then the Campaign overview of "The Haunting" opens

Scenario: Account without Campaigns sees how to start
  # CL-UX-6
  Given an Account is not a Campaign Member of any Campaign
  When the Account opens Campaigns
  Then an explanation of joining by invite link and a "New campaign" button are shown

Scenario: Creating a Campaign is its own journey
  # CL-UX-7
  Given a signed-in Account on Campaigns
  When the Account chooses "New campaign" and creates "The Haunting"
  Then the overview of "The Haunting" opens with the Account as its Keeper
  And going back to Campaigns lists "The Haunting" under "You run"

Scenario: Signed-in Accounts skip the home page
  # CL-UX-8
  Given a signed-in Account
  When the Account opens the home page
  Then Campaigns is shown
  And going back does not return to the home page

Scenario: Signed-out visitors are asked to sign in
  # CL-UX-9
  Given a signed-out visitor
  When the visitor opens Campaigns
  Then "Sign in to see your campaigns" and a "Sign in" button are shown

Scenario: The list recovers from a failed load
  # CL-UX-10
  Given loading the Campaign List fails
  When the Account chooses "Try again" and loading succeeds
  Then the Campaign List is shown
```

# UX Specification: Campaign Overview and Navigation

Selected direction: **Option A (action-first column)**, chosen 2026-10-03. Alternatives considered:
- **Option B (party board):** a grid of member cards. Rejected because it takes about two phone screens for five members, makes it harder to compare statuses than in a column, and drops the table semantics the Keeper uses for review.
- **Option C (Wall-centered with a side rail):** rejected because its main column is empty until the Campaign Wall exists, and its compact rail truncates Investigator names and actions.

Behavior and rules: [spec.md](spec.md). This document covers presentation only. It supersedes the Campaign page layout in [specs/character-sheet/ux.md](../character-sheet/ux.md) section 3 and the placement rules in [specs/campaign-play/ux.md](../campaign-play/ux.md) section 1. The Presence indicator, notices, and announcements in that document still apply.

## 1. Information architecture

```
/campaigns                                   Campaign List (specs/campaign-list/ux.md)
/campaigns/$campaignId                       layout: Campaign header + live connection
  (index)          Overview                  tab "Overview"
  /wall            Campaign Wall             tab "Wall"      (specs/campaign-wall/ux.md)
  /settings        Settings                  tab "Settings"  (Keeper only)
  /investigator, /investigator/$step         Player's sheet and wizard   -> Overview tab current
  /investigators/$investigatorId             Keeper's review / sheet     -> Overview tab current
  /scenarios/new, /scenarios/$scenarioId     Keeper's Scenario pages     -> Overview tab current
                                             (specs/scenario-preparation/ux.md)
```

- The overview is the landing page for a Campaign. It answers "what needs me?" (attention list), "who is here and are they ready?" ("At the table"), and, once the Campaign Wall exists, "what happened recently?" (Wall preview).
- Invite management and Rules options move to Settings. The overview keeps only one "Invite Players" shortcut (section 6).
- There is no Investigators tab. Character Sheets are opened from the rows in "At the table" and from attention items.

## 2. Campaign header (`campaign-header`)

Rendered by the `/campaigns/$campaignId` layout route on every Campaign page, above the page content.

```
< Back to Campaigns                                         (link)
Haunting of Corbitt House                                   (h1 on Overview only)
1920s                                                       (Era, muted)
[ Overview ]  Wall  Settings                                (nav "Campaign")
---------------------------------------------------------------- (border)
```

- "Back to Campaigns" links to `/campaigns`.
- **Campaign name:** the `h1` on the Overview only. Every other Campaign page (Wall, Settings, sheet, wizard, review) already has its own `h1` and focus handling, so there the name is plain text (`p`, same style) and the page's `h1` stays.
- **Era:** `text-sm text-muted-foreground`, under the name.
- **Tabs:** a `nav` with `aria-label="Campaign"` containing links, not ARIA tabs, because each one is its own route.
  - The current link has `aria-current="page"`, a 2px bottom border in `--foreground`, and `font-medium`. Other links use `--muted-foreground`, and hover switches them to `--foreground`.
  - Overview is current on the overview, sheet, wizard, review, and Scenario pages.
  - Wall is rendered for both roles. Settings is rendered only for the Keeper.
  - The row never wraps. With at most three short labels it fits at 320px. Each link is at least 44px high.
- **Header states:**
  - **Campaign loading:** a Skeleton for the name and the tab row, with `aria-busy="true"`. The page below shows its own loading state.
  - **Load error:** "We couldn't load this Campaign." and a "Try again" button replace the header and the page.
  - **Not found:** the existing not-found page ([character-sheet ux](../character-sheet/ux.md) section 3.3) replaces the header and the page.

## 3. Overview layout

```
Phone (< 1024px), single column          Desktop (>= 1024px), two columns once the Wall exists
+--------------------------------+       +----------------------------+---------------+
| [status message]               |       | [status message]           |               |
| Needs your attention           |       | Needs your attention       | Wall          |
| At the table                   |       | At the table               | (preview)     |
| Wall (preview)                 |       |                            |               |
+--------------------------------+       +----------------------------+---------------+
```

- **Order** (DOM and visual are the same): status message, "Needs your attention" (only when it has items), "Active Scene" (both roles, only while a Scene is Active, [scene-play ux](../scene-play/ux.md) section 5), "At the table", "Scenarios" (Keeper only, [scenario-preparation ux](../scenario-preparation/ux.md) section 2), "Non-Player Entities" (Keeper only, [scenario-preparation ux](../scenario-preparation/ux.md) section 22), "Items" (Keeper only, [scenario-preparation ux](../scenario-preparation/ux.md) section 60), then "Wall" (only once PBI-CP-004 ships).
- **Column widths:** from 1024px (`lg`) the Wall preview moves to a right column (`lg:grid-cols-[2fr_1fr]`). Before the Wall exists, the overview is one column with `max-w-3xl`.
- **Status message:** the existing navigation `statusMessage` (for example after a submit) stays as a `role="status"` paragraph directly under the header, now for both roles.
- **Spacing:** sections are separated by `gap-6`, and each section is a `section` labelled by its `h2`.

## 4. Needs your attention (`attention-list`)

```
Needs your attention                                         (h2)
+------------------------------------------------------------+
| (!) Dr. Ames by Ana is ready for review          [Review]   |
| (!) Corbitt Hale by Ben is ready for review      [Review]   |
+------------------------------------------------------------+
```

- **Rendering:** a `Card` containing a `ul`. Each item shows a decorative icon (`aria-hidden`), a sentence, and one action link or button on the right. Below 640px the action wraps under the sentence, left-aligned.
- **No items:** the whole section, heading included, is not rendered. No "All caught up" message is shown.
- **Order:** the order of the table below. Several Keeper review items follow the "At the table" roster order (decided 2026-10-03: items are derived from the roster, which carries no submission time).

### 4.1 Keeper items

| When | Sentence | Action |
|---|---|---|
| An Investigator is Submitted (one item each) | "{Investigator name} by {Player name} is ready for review" | Link "Review" -> `/campaigns/$campaignId/investigators/$investigatorId` |
| The Campaign has no Players | "No Players have joined yet." | Button "Invite Players" (opens the Invite dialog, section 6) |
| The Campaign has no Scenario | "This Campaign has no Scenario yet." | Link "Create Scenario" -> `/campaigns/$campaignId/scenarios/new` ([scenario-preparation ux](../scenario-preparation/ux.md) section 3) |

### 4.2 Player items (at most one: the Player's own Investigator)

| When | Sentence | Action |
|---|---|---|
| No Investigator, and no allowed Creation Method is available yet | The existing "You can't create your Investigator yet..." text ([character-sheet ux](../character-sheet/ux.md) section 3.2) | None |
| No Investigator | "Create the Investigator you'll play in this Campaign." | Button "Create Investigator" (existing behavior: creates the Draft, opens `identity`) |
| Draft | "Continue {name or 'your Investigator'}: step N of M", where M is the number of wizard steps (4 today) | Link "Continue" |
| Changes Requested | "Your Keeper asked for changes to {name}." followed by the Change Request comment in a quoted block (`whitespace-pre-line`) | Link "Edit Investigator" (opens `sheet`) |

- Submitted and Approved create no Player item. The Player's own row in "At the table" carries the "View" link instead.
- The existing `your-investigator-card` refusal handling (methods changed, Draft created elsewhere) carries over to the "Create Investigator" item unchanged.
- **Loading:** the section shows one Skeleton row with `aria-busy="true"` until the data it depends on has loaded.
- **Error:** if the data fails to load, one item reads "We couldn't check what needs your attention." with a "Try again" button.

## 5. At the table (`campaign-table`, replaces `campaign-presence` + `investigator-list` on the page)

```
At the table                                   [Invite Players]   (h2; button Keeper only)
3 of 4 connected
[connection notice]
+------------------------------------------------------------------------------------+
| Member              | Presence        | Investigator              | Status      |       |
| Eleanor Hart (you) [Keeper] | (*) Connected | -                 | -           |       |
| Ana Ruiz            | (*) Connected   | Dr. Ames                  | Submitted   | Review|
| Ben Cole            | ( ) Not connected | Not shown until submitted | In progress |     |
| Cleo Park           | (*) Connected   | Mae Doyle                 | Approved    | View  |
+------------------------------------------------------------------------------------+
```

- **Heading and button:** the `h2` "At the table" and, for the Keeper, an outline Button "Invite Players" (section 6) share one row. The button wraps under the heading below 640px.
- **Summary, notice, and announcements:** the summary line, connection notice, and live announcements are unchanged from [campaign-play ux](../campaign-play/ux.md) sections 2, 4, and 6.
- **From 640px:** a `Table` with columns Member, Presence, Investigator, Status, and Action. The Action header is visually hidden but kept for screen readers.
- **Below 640px:** a `ul` of rows. Each row shows:
  - line 1: the name and badges, with the Presence indicator on the right (wrapping as in campaign-play ux section 2);
  - line 2: the Investigator name and status badge;
  - line 3: the action link.
  The Keeper's own row omits lines 2 and 3.
- **Order:** fixed, as in [campaign-play ux](../campaign-play/ux.md) section 5 (Keeper, then you, then other Players by display name). Status changes never move a row.
- **Own row:** "(you)" after the name, and a `bg-muted` row background. The background is not the only cue, because the "(you)" text is always there.

### 5.1 Investigator cell, Status cell, and Action by viewer

| Viewer | Row | Investigator | Status (badge) | Action |
|---|---|---|---|---|
| Any | The Keeper's row | "-" (`aria-label="None"`) | "-" | None |
| Any | A Player with no Investigator | "No Investigator yet" (muted) | "-" | None |
| Keeper | Draft | "Not shown until submitted" (muted) | "In progress" | None |
| Keeper | Submitted | Name | "Submitted" | "Review" |
| Keeper | Changes Requested / Approved | Name | Keeper label | "View" |
| Player | Own, Draft | Name or "Unnamed Investigator" | "Draft" | "Continue" |
| Player | Own, Submitted / Approved | Name | Player label | "View" |
| Player | Own, Changes Requested | Name | "Changes requested" | "Edit Investigator" |
| Player | Another Player, Approved | Name | "Approved" | None |
| Player | Another Player, not Approved or none | "Not ready yet" (muted) | "-" | None |

- **Badge labels:** status badges reuse `investigator-status-badge` and the labels from [character-sheet ux](../character-sheet/ux.md) section 1.
- **Action links:** each has visually hidden context, for example "Review <span class=sr-only>Dr. Ames</span>", as in the current `investigator-list`.
- **Keeper with no Players:** the hint "No Players yet. Share the Invite to bring them in." is removed from this section. The attention item (section 4.1) replaces it.

### 5.2 States

- **Roster loading, roster error, connecting, reconnecting, reconnect failed:** as in [campaign-play ux](../campaign-play/ux.md) section 4. The Investigator columns load with the roster (one request, [spec.md](spec.md)), so there is no separate loading state for them.
- **Live changes:** the row's Investigator, Status, and Action cells update in place, with no animation and no reordering.
- **Investigator change announcements:** these come through the same polite live region.
  - Keeper hears: "{Investigator name} by {Player name} was submitted."
  - A Player hears: "{Investigator name} is ready for play." when another Player's Investigator is Approved.
  - A Player's own Approved / Changes Requested is announced by the attention list and row change: "Your Investigator was approved." / "Your Keeper asked for changes."
  - No announcement on first load.
- **Live Investigator details (PBI-CP-006):**
  - The Investigator announcements are their own element inside the section's one polite region, next to the Presence announcements. This includes the Player's own "Your Investigator was approved." / "Your Keeper asked for changes."; the attention list adds no region.
  - "First load" means until the roster has been fetched since the overview opened, even when cached data showed first.
  - Keeper: announced when a row's status becomes Submitted (first submission or resubmission). An unnamed Investigator reads "Unnamed Investigator".
  - Player: announced when another Player's row changes from "Not ready yet" to Approved, and when their own status becomes Approved or Changes Requested.
  - Not announced: the Keeper's own Approve or Request changes (the review page announces them), a Draft being started or abandoned (the Keeper's row changes silently between "No Investigator yet" and "In progress"), and any other transition.
  - Several changes found by one refetch are announced in one message, in roster order. Changes found by the catch-up refetch after a reconnect follow the same rules.
  - Other pages (the Player's Investigator view and resume, the Keeper's open review) update in place from the refetch and announce nothing.

## 6. Invite Players dialog (`invite-dialog`)

Opened from "Invite Players" in "At the table" or in the attention list. Keeper only.

```
Invite Players                                  (DialogTitle)
Anyone with this link can join until you replace or revoke it.   (DialogDescription)
Join link
[ https://.../campaigns/join/abc123        ] [Copy link]
Copied.                                          (role=status, after copying)
Replace or revoke the link in Settings.          (link to /settings)
                                               [Done]
```

- **Opening:**
  - If an Invite is active, the link shows in a read-only `Input` labelled "Join link".
  - If no Invite is active, the dialog first shows a busy state ("Creating a join link...") and issues an Invite with the existing `useIssueInvite`. It does not ask first, because this button only exists to share a link.
- **"Copy link":** copies with the Clipboard API, then the inline status shows "Copied." for as long as the dialog stays open.
- **If copying fails:** the status reads "Couldn't copy. Select the link and copy it." and the input text is selected.
- **If loading or issuing fails:** "We couldn't create a join link." with a "Try again" button inside the dialog.
- **Closing and focus:** "Done", Escape, and the close button all close the dialog, and focus returns to the button that opened it.
- **Settings link:** "Settings" in the help text closes the dialog and navigates to `/campaigns/$campaignId/settings`.

## 7. Wall preview (`wall-preview`, shipped with PBI-CP-004)

```
Wall                                             (h2)
+-----------------------------------------+
| 19:02  Eleanor Hart                      |
| The lamp flickers and goes out.         |
|-----------------------------------------|
| 18:55  Eleanor Hart  [Keeper only]       |
| Ana finds a torn letter in the desk.    |
+-----------------------------------------+
Open the Wall                                     (link -> /wall)
```

- **Contents:** the 5 latest Wall Entries visible to the viewer, newest first, in a `Card` with an `ol`. Each entry shows the time (`time` element; date added when the entry is not from today), the author's display name, and the text clamped to 3 lines. The full text is on the Wall.
- **Keeper only entries:** visible only to the Keeper, with an outline `Badge` "Keeper only". Players never receive them ([campaign-play spec](../campaign-play/spec.md)).
- **Read-only:** no compose box. "Open the Wall" is the only action.
- **Empty:** "Nothing on the Wall yet." and the "Open the Wall" link.
- **Loading:** three Skeleton entries.
- **Error:** "We couldn't load the Wall." with a "Try again" button.
- **Live:** new entries are inserted at the top through the `wallEntries` topic (PBI-CP-006), and the sixth entry drops off. A polite announcement "New Wall Entry from {author}." is made, at most once per 5 seconds, merging bursts. The merged copy, the first-load rule, and live removal are specified in [campaign-wall ux](../campaign-wall/ux.md) sections 4.5 and 7.
- **Wall entries in general:** the Wall page is specified in [specs/campaign-wall/ux.md](../campaign-wall/ux.md). The preview uses the same list endpoint with a limit of 5, so the viewer's visibility is applied before the 5 are taken.

## 8. Settings (`campaign-settings`, Keeper only)

- **Route:** `/campaigns/$campaignId/settings`, with `h1` "Settings".
- **Content:** two sections, each headed by an `h2`, in this order:
  1. **Invite:** the existing `InviteManagement` moves here unchanged in behavior. Its `h1` "Campaign Invite" becomes an `h2` "Invite", and its `mx-auto max-w-md` centering is dropped so it aligns with the page.
  2. **Rules options:** the existing `RulesOptions` section, unchanged.
- **Player access:** a Player who opens the URL sees the not-found page for Settings, "We couldn't find that page", with "Back to overview". The tab is never shown to Players. Authorization stays server-side on every Invite and rules endpoint.

## 9. Content

| Key | Copy |
|---|---|
| Back link | Back to Campaigns |
| Nav label (screen readers) | Campaign |
| Tabs | Overview / Wall / Settings |
| Attention heading | Needs your attention |
| Keeper review item | {Investigator name} by {Player name} is ready for review |
| Keeper no-Players item | No Players have joined yet. |
| Keeper no-Scenario item / action | This Campaign has no Scenario yet. / Create Scenario |
| Player Draft item | Continue {name or "your Investigator"}: step {n} of {number of wizard steps} |
| Player Changes Requested item | Your Keeper asked for changes to {name}. |
| Attention error | We couldn't check what needs your attention. |
| Table heading | At the table |
| Invite button / dialog title | Invite Players |
| Dialog description | Anyone with this link can join until you replace or revoke it. |
| Dialog field label | Join link |
| Copy / result | Copy link / Copied. / Couldn't copy. Select the link and copy it. |
| Dialog busy / error | Creating a join link... / We couldn't create a join link. |
| Dialog settings hint | Replace or revoke the link in Settings. |
| No Investigator | No Investigator yet |
| Other Player not ready | Not ready yet |
| Wall heading / link | Wall / Open the Wall |
| Wall empty | Nothing on the Wall yet. |
| Keeper-only badge | Keeper only |
| Settings heading / sections | Settings / Invite / Rules options |

Presence copy rules from [campaign-play ux](../campaign-play/ux.md) section 7 still apply. Never use "status", "online", or "offline" for Presence. "Status" is used only as the Investigator column header.

## 10. Component mapping

| Element | Component |
|---|---|
| Header, nav links | New `campaign-header` in `frontend/src/campaign-play/components/campaign-header/`, rendered by `routes/campaigns.$campaignId.tsx`; TanStack `Link` with `activeProps` for `aria-current` |
| Overview page | `campaign-page` reworked into the overview; Player and Keeper share one layout |
| Attention list | New `attention-list`; Player items reuse logic from `your-investigator-card` (`resumeStep`, creation-method check, create mutation), which is then removed |
| At the table | New `campaign-table`, built from `campaign-presence` (summary, notice, announcements) and `investigator-list` (table/stacked rows, row actions), both of which it replaces on the page |
| Status badge, Presence | Existing `investigator-status-badge`, `presence-indicator` |
| Invite dialog | New `invite-dialog` on existing `Dialog`, `Input`, `Button`, and the `useCampaignInvite` / `useIssueInvite` hooks |
| Settings | New route `routes/campaigns.$campaignId.settings.tsx` and `campaign-settings` composing `InviteManagement` and `RulesOptions` |
| Wall preview | New `wall-preview` (PBI-CP-004) |
| Scenarios section | `scenario-list-section` from `frontend/src/scenario-preparation/` (PBI-SP-001), rendered by `campaign-page` for the Keeper |
| Primitives | Existing `Card`, `Table`, `Badge`, `Alert`, `Button`, `Dialog`, `Input`, `Skeleton`; no new primitives |

Stories cover:
- **Keeper:** with reviews pending, with no Players, and all Approved.
- **Player:** each attention state, plus a Player with no attention items.
- **Layout:** 17 members with long names, narrow width, the Invite dialog (active, issuing, error), and Settings.

## 11. UX acceptance criteria

- **CO-UX-1** Opening a Campaign shows the Campaign header (back link, name, Era, tabs) and the overview. The Campaign name is the page `h1`.
- **CO-UX-2** The Keeper sees the tabs Overview, Wall, and Settings, and a Player sees Overview and Wall.
- **CO-UX-3** On the overview the Keeper sees no Invite link field and no Rules options. Both are on Settings.
- **CO-UX-4** A Keeper with a Submitted Investigator sees "{name} by {Player} is ready for review" with "Review", which opens the review screen. While the Campaign has no Scenario, the item "This Campaign has no Scenario yet." follows the review items (PBI-SP-001).
- **CO-UX-5** A Keeper with no Players sees "No Players have joined yet." with "Invite Players". Once a Player joins, that item disappears without a reload; other items may remain.
- **CO-UX-6** A Player sees exactly one attention item for each of: no Investigator, Draft (with step N of 4), Changes Requested (with the Keeper's comment), and creation methods unavailable. Once Submitted or Approved, the attention section is not shown.
- **CO-UX-7** "At the table" lists every member once, in the fixed order. Each Player row shows the Investigator and status visible to the viewer as in section 5.1.
- **CO-UX-8** A Player sees another Player's Investigator name only once it is Approved, and has no link to open it. Otherwise the row reads "Not ready yet".
- **CO-UX-9** The Keeper never sees a Draft Investigator's name. The row reads "Not shown until submitted" and "In progress".
- **CO-UX-10** "Invite Players" opens the dialog with the join link. "Copy link" copies it and shows "Copied.". With no active Invite, one is created when the dialog opens.
- **CO-UX-11** On sheet, wizard, review, and Scenario pages the header stays, with Overview as the current tab.
- **CO-UX-12** A Player opening `/campaigns/$campaignId/settings` sees the not-found message and no Invite or rules data.
- **CO-UX-13** When the Keeper approves an Investigator, the Player's row and the other Players' rows show it as Approved without a reload (requires PBI-CP-006).
- **CO-UX-14** (PBI-CP-004) The overview shows at most 5 latest Wall Entries with "Open the Wall". Keeper-only entries show "Keeper only" to the Keeper and never appear for Players.
- **CO-UX-15** (PBI-CP-006) The Keeper sees a submission or resubmission in "At the table" and the attention list without a reload, and hears "{Investigator name} by {Player name} was submitted.".
- **CO-UX-16** (PBI-CP-006) A Player sees their own Approved or Changes Requested in their row and the attention list without a reload, and hears "Your Investigator was approved." or "Your Keeper asked for changes.".
- **CO-UX-17** (PBI-CP-006) A Player hears "{Investigator name} is ready for play." when another Player's Investigator is Approved, and never learns another Player's other statuses.
- **CO-UX-18** (PBI-CP-006) A Player starting or abandoning a Draft changes the Keeper's row between "No Investigator yet" and "In progress" without a reload and without an announcement.

## 12. Accessibility acceptance criteria (WCAG 2.2 AA)

- **CO-A11Y-1** Each page has exactly one `h1`. On the overview it is the Campaign name, and each overview section is a `section` labelled by its `h2` (1.3.1, 2.4.6).
- **CO-A11Y-2** The tabs are a `nav` labelled "Campaign" with links. The current one has `aria-current="page"` and is distinguished by more than color (border and weight) (1.3.1, 1.4.1).
- **CO-A11Y-3** From 640px "At the table" is a `table` with column headers (`scope="col"`), including a visually hidden "Action" header. Below 640px it is a list (1.3.1).
- **CO-A11Y-4** Every row action has an accessible name including the Investigator name (2.4.4).
- **CO-A11Y-5** The own-row background is not the only cue: "(you)" is present (1.4.1). All muted text meets 4.5:1 (1.4.3).
- **CO-A11Y-6** The Invite dialog traps focus while open, starts focus on "Copy link" (or on the busy status while issuing), and returns focus to its trigger on close. "Copied." uses `role="status"` (2.4.3, 4.1.3).
- **CO-A11Y-7** Live changes (presence, Investigator status, attention items, Wall preview) never move focus. They are announced through one polite live region per section, with no announcement on first load (4.1.3).
- **CO-A11Y-8** Tab links, row actions, and buttons are keyboard reachable in visual order, show a visible focus ring, and are at least 24 by 24 CSS pixels (tab links at least 44px high) (2.1.1, 2.4.7, 2.5.8).
- **CO-A11Y-9** At 320px and at 200% zoom the header, tabs, and overview fit without horizontal page scrolling. The table switches to the list below 640px (1.4.10).
- **CO-A11Y-10** No motion is used for live changes (2.3.3).

## 13. Open decisions and research gaps

- **Deferred:** a Campaign-level indicator for "your connection has a problem" in the header. The notice stays in "At the table" (decision Q19).
- **Deferred:** Players opening other Players' Approved Character Sheets. Today names only (decision Q8). It needs a visibility change in the campaign-play spec.
- **Deferred:** Play Session grouping in the Wall preview, until Play Sessions exist.
- **Research gap:** whether Keepers miss the Invite link field on the overview during the first days of a Campaign. Check with early Keepers after release.
- **Research gap:** whether "Needs your attention" reads naturally for Players, whose only item is about their own Investigator.

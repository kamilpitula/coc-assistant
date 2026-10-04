# UX Specification: Campaign List

Selected direction: **Option B (stacked list)**, chosen 2026-10-04. Alternatives considered:
- **Option A (card grid):** one Card per Campaign in a 1/2/3-column grid. Rejected because it is the least dense for the expected 1 to 5 Campaigns and forces equal-height cards where only some show badges.
- **Option C (table):** a table per section with a list fallback under 640px. Rejected because whole-row links fight table semantics ([Adrian Roselli, 2023](https://adrianroselli.com/2023/11/dont-turn-a-table-into-an-aria-grid-just-for-a-clickable-row.html)), the two sections need different columns, and it means two layouts to build and test.

Behavior and rules: [spec.md](spec.md). This document covers presentation only.

## 1. Information architecture

```
/                    signed in: replace-redirect to /campaigns; signed out: home page (unchanged)
/campaigns           Campaign List ("Your campaigns")
/campaigns/new       New campaign (existing create-campaign form)
/campaigns/$id       Campaign overview (unchanged; its "Back to Campaigns" link returns here)
```

- Entry points: sign-in (via `/`), the header "Campaigns" link, and the overview's back link.
- The list is read-only. Its only action besides opening a Campaign is "New campaign".

## 2. Page layout (`/campaigns`)

Uses the existing page shell: `Header`, then `main` with `px-6 py-8 md:px-16`. Content column `max-w-3xl`, left aligned.

1. **Page header row:** `h1` "Your campaigns" on the left, "New campaign" button (`Button`, `Plus` icon, links to `/campaigns/new`) on the right. Wraps below the heading under 640px.
2. **"You run"** section (`h2`), only when the caller keeps at least one Campaign.
3. **"You play in"** section (`h2`), only when the caller plays in at least one Campaign.

Each section is a `section` labelled by its `h2`, containing one `Card` with a `ul` of items separated by dividers (`divide-y`), in server order.

## 3. Campaign item (`campaign-list-item`)

```
+------------------------------------------------------------+
| The Haunting                              [2 awaiting review]|   line 1: name (h3 + link), badge right
| 1920s                                                       |   line 2: Era (Keeper)
| 3 of 8 Players, 1 Investigator approved                    |   line 3: counts
+------------------------------------------------------------+

+------------------------------------------------------------+
| Horror on the Orient Express              [Changes requested]|
| 1920s, Keeper: Anna K.                                     |   line 2: Era and Keeper (Player)
| 5 Players, 4 Investigators approved                        |
| Your Investigator: Harvey Walters                           |   line 4: Player only
+------------------------------------------------------------+
```

- **Name:** `h3` containing a TanStack `Link` to `/campaigns/$campaignId`. The link is stretched over the whole item with an `::after` overlay (`relative` item, `after:absolute after:inset-0`), the card pattern from [Inclusive Components: Cards](https://inclusive-components.design/cards/). Only the name is the link's accessible name.
- **Badge (top right, wraps under the name below 640px):**
  - Keeper: `Badge variant="secondary"` with `Clock` icon, "{N} awaiting review", only when N > 0. Otherwise no badge.
  - Player: the existing `InvestigatorStatusBadge` with `audience="Player"` when the Player has an Investigator. With no Investigator: `Badge variant="outline"` "No Investigator yet".
- **Line 2:** Era; for Player items followed by ", Keeper: {keeperName}". Muted text (`text-sm text-muted-foreground`).
- **Line 3, counts:** `text-sm`. Keeper "{playerCount} of {playerLimit} Players"; Player "{playerCount} Players"; then ", " and the Approved count (section 6 copy).
- **Line 4 (Player only, when the Player has an Investigator):** "Your Investigator: {name}", or "Your Investigator: unnamed" when the name is null. Omitted when there is no Investigator (the badge says so).
- **Interaction:** click or tap anywhere on the item, or Enter on the focused name link, opens the overview. Hover: `bg-muted` on the item. Focus: the visible focus ring is drawn around the whole item (`focus-within:ring-2` on the item, `focus-visible:outline-none` on the link). No other interactive element sits inside an item.
- Long names wrap (`break-words`); nothing is truncated.

## 4. States

| State | Presentation |
|---|---|
| Loading | Page header row renders at once. Below it one `Card` with `aria-busy="true"` holding 3 skeleton items (`Skeleton` h-5 w-56, h-4 w-24, h-4 w-48). No section headings until data arrives. |
| Error | Under the page header: "We couldn't load your campaigns." with an outline "Try again" button, inside `role="alert"`. "Try again" refetches; while refetching the button is disabled and reads "Trying again...". On success focus moves to the `h1` (it has `tabIndex={-1}`). |
| Empty | Under the page header, a `Card` with `h2` "No campaigns yet", text "To join a Campaign, open the invite link your Keeper sent you. To run your own, start a new one.", and a "New campaign" button. The header row button stays too. |
| Refetch on focus | Silent: the current list stays visible, no skeleton, no announcement. |
| Signed out | Instead of the page content: `h1` "Your campaigns", text "Sign in to see your campaigns.", and a "Sign in" button that starts the same MSAL `loginRedirect` as the header. Same on `/campaigns/new` with `h1` "New campaign". |
| MSAL resolving | Nothing below the `Header` until MSAL settles, so neither the signed-out prompt nor a request flashes. |

## 5. New campaign (`/campaigns/new`) and redirect

- **Page:** existing `CreateCampaignForm` in the same shell. Its `h1` becomes "New campaign" (matching the button). Under the submit button, a "Cancel" `Link` (variant `link`) back to `/campaigns`.
- **Success:** navigate to `/campaigns/$campaignId` of the created Campaign with `replace`, so Back from the new overview returns to `/campaigns`, not to a filled-out form. The in-page success message and its "Manage its invite" link are removed; the overview's "Invite Players" attention item takes over.
- **Error:** unchanged ("Could not create the Campaign. Please try again.").
- **Redirect from `/`:** in the `/` route, once MSAL reports an authenticated Account, `navigate({ to: '/campaigns', replace: true })`. While MSAL is resolving, `/` renders only the `Header`, so the home page never flashes for signed-in users.

## 6. Content

| Key | Copy |
|---|---|
| Page heading | Your campaigns |
| Create button / page heading | New campaign |
| Cancel | Cancel |
| Keeper section | You run |
| Player section | You play in |
| Keeper Players count | {n} of {limit} Players |
| Player Players count | 1 Player / {n} Players |
| Approved count | 1 Investigator approved / {n} Investigators approved |
| Approved count zero | No Investigators approved yet |
| Awaiting review badge | {n} awaiting review |
| Keeper on Player item | Keeper: {name} |
| Own Investigator | Your Investigator: {name} / Your Investigator: unnamed |
| No own Investigator | No Investigator yet |
| Own status | existing Player labels in `investigatorStatusLabels.ts` |
| Separator | ", " (ASCII; reads naturally in screen readers) |
| Error | We couldn't load your campaigns. / Try again / Trying again... |
| Empty heading / text | No campaigns yet / To join a Campaign, open the invite link your Keeper sent you. To run your own, start a new one. |
| Signed out | Sign in to see your campaigns. / Sign in |

Zero Players on a Keeper item reads "0 of {limit} Players". Glossary terms (Campaign, Keeper, Player, Investigator) keep their capitals, as elsewhere.

## 7. Component mapping

| Element | Component |
|---|---|
| Slice | New `frontend/src/campaign-list/` with `components/`, `services/` (API client with zod parsing, `queryKeys`), `hooks/` (`useCampaignList`), `types/` |
| List page | New `campaign-list` component; route `routes/campaigns.index.tsx` renders it |
| Item | New `campaign-list-item` |
| Signed-out prompt | New `sign-in-prompt` in `src/shared/components/` (used by two routes) |
| New campaign route | New `routes/campaigns.new.tsx` rendering existing `CreateCampaignForm` (heading, Cancel, and post-create navigation changed) |
| Home redirect | `routes/index.tsx` |
| Status badge | Existing `investigator-status-badge` (Player audience) |
| Primitives | Existing `Card`, `Badge`, `Button`, `Skeleton`; `lucide-react` `Plus`, `Clock`. No new primitives |

Stories cover: Keeper only, Player only, both sections, every Player Investigator status and none, awaiting review 0/1/many, zero Approved, long names at narrow width, loading, error, empty, signed out.

## 8. Accessibility (WCAG 2.2 AA)

Covered by section 10. Key decisions: one link per item named by the Campaign name only (2.4.4); list semantics announce the item count (1.3.1); status and review are text badges, never colour alone (1.4.1); focus ring surrounds the item (2.4.7).

## 9. UX acceptance criteria

- **CL-UX-1** `/campaigns` shows the `h1` "Your campaigns" and a "New campaign" button, and no create-campaign form.
- **CL-UX-2** Keeper Campaigns appear under "You run" before Player Campaigns under "You play in", each newest first. A section without Campaigns is not rendered.
- **CL-UX-3** A Keeper item shows name, Era, "{n} of {limit} Players", the Approved count, and "{n} awaiting review" only when n > 0.
- **CL-UX-4** A Player item shows name, Era, "Keeper: {name}", "{n} Players" without a limit, the Approved count, and the Player's own Investigator status badge and name, or "No Investigator yet".
- **CL-UX-5** Clicking anywhere on an item, or pressing Enter on its name, opens that Campaign's overview.
- **CL-UX-6** An Account with no Campaigns sees "No campaigns yet", the invite-link explanation, and "New campaign".
- **CL-UX-7** "New campaign" opens `/campaigns/new` with the `h1` "New campaign". Cancel returns to `/campaigns`. A successful create opens the new Campaign's overview, and Back from there returns to `/campaigns`.
- **CL-UX-8** A signed-in Account opening `/` lands on `/campaigns` without seeing the home page, and Back does not return to `/`.
- **CL-UX-9** A signed-out visitor on `/campaigns` or `/campaigns/new` sees "Sign in to see your campaigns." and a "Sign in" button, and no request for the list is made.
- **CL-UX-10** While loading, skeleton items show. On failure, "We couldn't load your campaigns." with "Try again" shows; a successful retry shows the list.
- **CL-UX-11** Returning to the browser tab refetches the list without showing skeletons.

## 10. Accessibility acceptance criteria

- **CL-A11Y-1** One `h1` per page. Each section is a `section` labelled by its `h2`; each Campaign name is an `h3` (1.3.1, 2.4.6).
- **CL-A11Y-2** Items are `li` elements in a `ul`, so the item count is announced (1.3.1).
- **CL-A11Y-3** Each item has exactly one link, whose accessible name is the Campaign name. Badges and counts are outside the link's name but inside the clickable area (2.4.4).
- **CL-A11Y-4** Keyboard users reach the "New campaign" button and then every item link in visual order; the focused item shows a visible ring around the whole item (2.1.1, 2.4.3, 2.4.7).
- **CL-A11Y-5** Status and awaiting-review badges carry text; icons are `aria-hidden` (1.1.1, 1.4.1). Muted text meets 4.5:1 (1.4.3).
- **CL-A11Y-6** Item links and buttons have targets of at least 24 by 24 CSS pixels (2.5.8).
- **CL-A11Y-7** The error message uses `role="alert"`; after a successful retry focus moves to the `h1` so it is not lost (4.1.3, 2.4.3).
- **CL-A11Y-8** At 320px and 200% zoom the page fits without horizontal scrolling; badges wrap under the name (1.4.10).
- **CL-A11Y-9** The loading container has `aria-busy="true"`; refetching on focus makes no announcement and does not move focus (4.1.3).

## 11. Open decisions and research gaps

- **Deferred:** live list updates through the `account:{accountId}` SignalR group (spec Freshness).
- **Deferred:** sign-in guards on the remaining `/campaigns/*` routes.
- **Research gap:** whether newest-first is the right order once Campaigns have activity; revisit when the Campaign Wall or Play Sessions provide a "last activity" signal.
- **Research gap:** whether Keepers with many Campaigns need search or archiving; check after release.

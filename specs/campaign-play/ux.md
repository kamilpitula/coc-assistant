# UX Specification: Campaign Presence

Selected direction: **Option A (stacked roster list)**, chosen 2026-10-03. Alternatives considered: a table matching the Keeper's Investigators table (Option B) and compact wrapping chips (Option C). B was rejected as heavy for three facts per row and for needing a second layout below 640px. C was rejected because it hides the state text and is harder to scan for missing members.

Behavior and rules: [spec.md](spec.md), Architecture, Presence. This document covers presentation only.

Superseded in part by [specs/campaign-overview/ux.md](../campaign-overview/ux.md): placement (section 1), the Keeper empty hint (section 4), and PR-UX-11. "At the table" now also shows each member's Investigator as projected for the viewer. The indicator, states, order, and announcements here still apply.

## 1. Information architecture

- Presence appears only on the Campaign page (`/campaigns/$campaignId`), as a section headed "At the table".
- Player: below the `h1` Campaign name and status message, above "Your Investigator".
- Keeper: first section of the page, above Invite management.
- No Presence on `/campaigns` or on Campaign sub-pages (wizard, sheet view, review). Members still count as connected there.
- The section is read-only. It has no links or actions except "Try again" (section 4).

## 2. Layout (`campaign-presence`)

```
At the table                                   (h2)
3 of 5 connected                               (summary line)
[connection notice, only when your own connection has a problem]
+------------------------------------------------+
| (*) Eleanor Hart  [Keeper]          Connected   |
| (*) Sam Okafor (you)                Connected   |
| ( ) Alex Brandt                 Not connected   |
| (*) Priya Nair                      Connected   |
| ( ) Tom Lewis                   Not connected   |
+------------------------------------------------+
```

- A `section` labelled by its `h2` "At the table".
- The summary line "{connected} of {members} connected" sits under the heading. "Members" includes the Keeper and you.
- The roster is a `Card` containing a `ul`, one `li` per member. Each row:
  - Left: the display name. The Keeper's row adds a `Badge` (variant `outline`) "Keeper". Your own row adds "(you)" after the name.
  - Right: the Presence indicator (section 3): icon plus text.
  - Rows are separated by a divider. Rows are at least 40px high.
- Width: `max-w-xl`, matching the Your Investigator card.
- Below 640px the same row structure is kept. If the name and indicator do not fit on one line, the indicator wraps below the name, left-aligned. The list is never collapsed or truncated, and long names wrap rather than ellipsize.

## 3. Presence indicator (`presence-indicator`)

| State | Icon (decorative, `aria-hidden`) | Text | Color |
|---|---|---|---|
| Connected | Filled circle | "Connected" | Icon `--success` (new token); text `--foreground` |
| Not connected | Hollow ring | "Not connected" | Icon and text `--muted-foreground` |
| Unknown | Dashed ring (`CircleDashed`) | "Unknown" | Icon and text `--muted-foreground` |

- The text always shows; the icon only supports it (WCAG 1.4.1).
- `--success` is added to the theme with at least 3:1 contrast against the card surface (WCAG 1.4.11). The card surface is `--background`; there is no `--card` token.
- "Unknown" rows render the name in `--muted-foreground`. Do not use opacity; the text must keep at least 4.5:1 contrast (WCAG 1.4.3).
- No animation (no pulsing dot). State changes swap the icon and text in place.

## 4. States

| State | Summary line | Rows | Notice |
|---|---|---|---|
| Campaign loading | Not shown | The page skeleton from [specs/character-sheet/ux.md](../character-sheet/ux.md) section 3.3 covers the whole page | None |
| Roster loading (Campaign loaded) | "Checking who's connected..." | The heading and placeholder (Skeleton) rows inside the card | None |
| Connecting (before the first snapshot) | "Checking who's connected..." | All members, all "Unknown" | None |
| Live | "{n} of {m} connected" | Each member's state | None |
| Reconnecting (your connection dropped) | "Checking who's connected..." | All "Unknown" | "Connection lost. Reconnecting... Who's at the table may be out of date." |
| Reconnect failed (retries exhausted) | "Checking who's connected..." | All "Unknown" | "Couldn't reconnect." and an outline Button "Try again" |
| Keeper with no Players | As Live ("1 of 1 connected") | Keeper row only | Below the card, Keeper only: "No Players yet. Share the Invite to bring them in." |

- The notice is an inline `Alert` inside the section, between the summary line and the card, with `role="status"`. It is not page-wide.
- "Try again" restarts the connection and switches the notice back to "Connection lost. Reconnecting...". Focus stays on the button until it is removed; then focus moves to the `h2` "At the table" (`tabIndex=-1`), so focus is never lost.
- On a successful reconnect, a fresh snapshot replaces every "Unknown", the notice disappears, and "Reconnected." is announced (section 6).
- The roster (names and roles) loads from `GET /api/campaigns/{campaignId}/members` alongside the Campaign, so it shows without waiting for the live connection. Only the states wait for the connection. If the roster request fails, the section shows "We couldn't load who's at the table." with a "Try again" button.

## 5. Order and live changes

- Fixed order: the Keeper, then you (when you are a Player), then other Players by display name, case-insensitively. The server returns this order ([spec.md](spec.md), Campaign members API) and the client keeps it. A change in state never moves a row.
- A Player who joins through the Invite while the page is open is inserted into the roster at their sorted position, with their current state.
- Changes update the row in place. There are no toasts or highlight animations.

## 6. Screen-reader announcements

One visually hidden `aria-live="polite"` region in the section. Rows and the summary line are not live regions themselves.

| Event | Announcement |
|---|---|
| A member connects | "{name} connected." |
| A member disconnects | "{name} disconnected." |
| A new Player joins the Campaign | "{name} joined the Campaign." |
| Your connection is restored | "Reconnected." |

- The first snapshot after loading is not announced.
- Your own connect and disconnect are not announced as member events. The notice covers your own connection.
- Several events that arrive together are announced in one message, in roster order (section 5).

## 7. Content

| Key | Copy |
|---|---|
| Heading | At the table |
| Summary | {n} of {m} connected |
| Summary, no snapshot | Checking who's connected... |
| Own row suffix | (you) |
| Keeper badge | Keeper |
| States | Connected / Not connected / Unknown |
| Notice, reconnecting | Connection lost. Reconnecting... Who's at the table may be out of date. |
| Notice, failed | Couldn't reconnect. |
| Retry button | Try again |
| Keeper empty hint | No Players yet. Share the Invite to bring them in. |
| Roster load error | We couldn't load who's at the table. |

Do not use the words "status", "availability", "online", or "offline" in the UI ([CONTEXT.md](../../CONTEXT.md), Presence).

## 8. Component mapping

| Element | Component |
|---|---|
| Section card, Keeper label, notice, retry | Existing `Card`, `Badge`, `Alert`, `Button` in `frontend/src/shared/components/ui/` |
| Icons | `lucide-react`: `Circle` (filled with `fill-current`), `Circle`, `CircleDashed` |
| `campaign-presence` | New, in `frontend/src/campaign-play/components/campaign-presence/` with a colocated story and test |
| `presence-indicator` | New, in `frontend/src/campaign-play/components/presence-indicator/` with a colocated story and test |
| Connection | A Campaign-scoped connection opened in the `/campaigns/$campaignId` layout route and shared with the page through context ([spec.md](spec.md), Live connection contract) |

Stories cover: Live (mixed states), Connecting, Reconnecting, Reconnect failed, Keeper with no Players, 17 members with long names, and narrow width.

## 9. UX acceptance criteria

- **PR-UX-1** Both the Keeper and a Player see "At the table" on the Campaign page, listing every member in the fixed order, with "(you)" on their own row and a "Keeper" label on the Keeper's row.
- **PR-UX-2** When another member opens the Campaign, their row changes to "Connected" and the summary count goes up without a reload.
- **PR-UX-3** When another member closes their last Campaign tab, their row changes to "Not connected" without a reload. Closing one of two tabs does not change it.
- **PR-UX-4** A member who is on a Campaign sub-page (for example the Investigator wizard) shows as "Connected".
- **PR-UX-5** A Player who joins through the Invite appears in the roster of members already on the page, without a reload.
- **PR-UX-6** Rows never change position when states change.
- **PR-UX-7** Before the first snapshot every row shows "Unknown" and the summary reads "Checking who's connected...".
- **PR-UX-8** When your connection drops, the notice appears and every row shows "Unknown". After reconnecting, the notice disappears and current states return.
- **PR-UX-9** When reconnecting fails, the notice reads "Couldn't reconnect." with "Try again", which starts a new attempt.
- **PR-UX-10** A Keeper with no Players sees only their own row. The hint about sharing the Invite is superseded by the attention item of CO-UX-5 ([campaign-overview ux](../campaign-overview/ux.md) section 4.1).
- **PR-UX-11** (Superseded by [campaign-overview ux](../campaign-overview/ux.md) CO-UX-7 to CO-UX-9.) The roster shows only the Investigator data visible to the viewer.
- **PR-UX-12** A non-member opening the Campaign URL sees "We couldn't find that Campaign" and no roster.

## 10. Accessibility acceptance criteria (WCAG 2.2 AA)

- **PR-A11Y-1** The section is a `section` labelled by its `h2`. The roster is a `ul` whose items expose the name, role, and state as text (1.3.1).
- **PR-A11Y-2** Each state is conveyed by text, not only by the icon or its color (1.4.1).
- **PR-A11Y-3** Connected icons meet 3:1 against the card surface (`--background`; there is no `--card` token). All text, including "Unknown" rows, meets 4.5:1 (1.4.11, 1.4.3).
- **PR-A11Y-4** Member changes and "Reconnected." are announced through one polite live region without moving focus. The first snapshot is not announced (4.1.3).
- **PR-A11Y-5** The connection notice uses `role="status"`. "Try again" is reachable by keyboard, has a visible focus ring, and is at least 24 by 24 CSS pixels (2.1.1, 2.4.7, 2.5.8).
- **PR-A11Y-6** When "Try again" is removed, focus moves to the section heading rather than to the page body (2.4.3).
- **PR-A11Y-7** At 320px wide and at 200% zoom the roster shows every member without horizontal scrolling or truncated names (1.4.10).
- **PR-A11Y-8** No motion is used for state changes (2.3.3).

## 11. Open decisions and research gaps

- **Deferred:** an "idle" state. The indicator and announcement tables are built so a third member state can be added.
- **Deferred:** a compact Presence strip on Campaign sub-pages, and collapsing long rosters. Revisit if Keepers of large Campaigns find the section pushes Invite management too far down.
- **Accepted trade-off:** Presence goes to "Not connected" immediately, so a member's hard reload briefly shows them as disconnected to others.
- **Research gap:** whether "At the table" reads naturally to Players before the first game night. Check with first-time Players.

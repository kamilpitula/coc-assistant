# UX Specification: Campaign Wall

Selected direction: **Option A (feed with an always-visible compose box)**, chosen 2026-10-16. Alternatives considered:
- **Option B (compose in a dialog):** rejected because it adds a step to every entry and needs a custom inline remove confirmation the product does not have.
- **Option C (oldest first, composer pinned at the bottom):** rejected because it contradicts the newest-first Wall preview, causes scroll-position problems when paging upward and for later live inserts, and a sticky composer can hide focus.

Behavior and rules: [specs/campaign-play/spec.md](../campaign-play/spec.md) (Play Record, Constraints, Contract). This document covers presentation only. The Wall preview on the overview is specified in [specs/campaign-overview/ux.md](../campaign-overview/ux.md) section 7 and is completed here (section 7).

## 1. Information architecture

```
/campaigns/$campaignId/wall      Campaign Wall      tab "Wall" (Keeper and Player)
/campaigns/$campaignId           Overview           contains the Wall preview, links to /wall
```

- The page `h1` is "Wall". The Campaign name in the header is plain text on this page, as on every non-overview Campaign page.
- Entry points: the "Wall" tab and "Open the Wall" in the preview.
- Exit: the other tabs, or "Back to Campaigns".
- Who can do what:
  - Keeper: reads all entries, adds Public or Keeper only entries, removes any entry.
  - Player: reads Public entries, adds Public entries. Cannot see, add, or infer Keeper only entries. Cannot remove.
- Entries cannot be edited. A Keeper corrects an entry by removing it and adding a new one.
- Out of scope: Play Session grouping or link (deferred).
- Live delivery of other members' changes (PBI-CP-006, selected Option A "insert directly at the top", 2026-10-16) is in section 4.5. Rejected: holding new entries behind a "Show new entries" button (an extra step when liveness matters, and a second model next to the preview) and inserting or holding by scroll position (two mechanisms, unpredictable for assistive technology users).

## 2. Page layout (`campaign-wall`)

```
Wall                                                          (h1)
+---------------------------------------------------------------+
| New Wall Entry                                    (label)      |
| [                                                         ]    |
| [                                                         ]    |
| Who can read this?                         (Keeper only)       |
| (o) Public - Players can read this.                            |
| ( ) Keeper only - Only you can read this.                      |
| 0 / 2000                                  [ Add to the Wall ]  |
+---------------------------------------------------------------+
(status: "Wall Entry added.")                    (role=status)

+---------------------------------------------------------------+
| 19:02  Eleanor Hart                              [Remove]      |
| The lamp flickers and goes out.                  (Keeper only) |
+---------------------------------------------------------------+
| 18:55  Eleanor Hart  [Keeper only]               [Remove]      |
| Ana finds a torn letter in the desk.                           |
+---------------------------------------------------------------+
[ Show older entries ]
```

- **Container:** one column, `max-w-3xl`, `gap-6`. Order (DOM and visual): `h1`, compose `Card`, status message, entry list, "Show older entries".
- **Compose Card:** a `form` containing:
  - `Textarea` labelled "New Wall Entry", 3 rows, resizable vertically, no `maxLength` attribute (so an over-long paste is visible and explained, not silently cut).
  - Keeper only: a `radio-group` with legend "Who can read this?" and the options "Public" (description "Players can read this.") and "Keeper only" (description "Only you can read this."). The default is "Public" on every page load and after every post. Players do not get this group, and instead see the help text "Everyone in this Campaign can read this."
  - A counter "{n} / 2000" and the primary Button "Add to the Wall".
- **Entry list:** an `ol` of `Card`-style rows (`li`). Each entry has:
  - Header line: `time` (see section 3), the author's display name, and for the Keeper only an outline `Badge` "Keeper only" on Keeper only entries.
  - Body: the full text, `whitespace-pre-line`, `break-words`. No clamp.
  - Keeper only: a ghost Button "Remove" at the right of the header line (wraps under it below 640px), with visually hidden context: "Remove <span class=sr-only>Wall Entry from {author} at {time}</span>".
- **Author name:** the author's current display name, taken from the account. A Player sees the Keeper's name on Public entries (the roster already shows it).
- **"Show older entries":** a secondary Button below the list, shown only when more entries exist. It appends the next page below the current entries without moving focus. While loading it is disabled and reads "Loading...".
- **Newest entry first.** The list is never reordered by interactions other than adding or removing.

## 3. Time display

- A `time` element with `datetime` set to the entry's UTC instant, in ISO 8601.
- Visible text is in the viewer's locale and time zone: time only (for example "19:02") when the entry is from today, otherwise date and time (for example "3 Oct, 19:02"; the year is added when it is not the current year).
- The `title` is not used. The full date and time are provided in the accessible name of the `time` element through `aria-label` ("3 October 2026, 19:02") only when the visible text omits the date.

## 4. States and interactions

### 4.1 Loading, empty, error
| State | Behavior |
|---|---|
| Loading | The compose box is rendered and usable. The list shows three Skeleton rows inside a container with `aria-busy="true"`. |
| Empty | The list is replaced by "Nothing on the Wall yet." (muted). The compose box stays. |
| Load error | The list is replaced by an `Alert` "We couldn't load the Wall." with a "Try again" button. The compose box stays and is usable. |
| Older entries error | Inline `Alert` under the list: "We couldn't load older entries." with a "Try again" button. The loaded entries stay. |
| Campaign missing or caller not a member | The existing not-found page replaces the header and the page. |

### 4.2 Adding an entry
- "Add to the Wall" is disabled while the trimmed text is empty (the Textarea's `aria-describedby` points to the hint "Write something to post." only while empty) or longer than 2000 characters, and while a post is in flight.
- Over 2000: the counter turns into the error text "Wall Entries can be at most 2000 characters." (destructive colour plus text, linked with `aria-describedby`; `aria-invalid="true"`), and the button is disabled.
- On success (confirmed, not optimistic): the new entry, taken from the server response, is inserted at the top of the list, the Textarea is cleared and keeps focus, the visibility returns to "Public", and the status region says "Wall Entry added.". The status text clears after the next edit.
- On failure: an inline `Alert` (`role="alert"`) in the compose Card: "We couldn't add your entry. Your text is still here. Try again." The text and the chosen visibility are kept. If the server says the caller may not post (the Campaign is gone, or the caller is no longer a member), the not-found page replaces the page.
- Double submission: the button is disabled while posting, so a second click or Enter cannot post twice. Ctrl+Enter or Cmd+Enter in the Textarea submits when the button is enabled.
- Posting Keeper only does not ask for confirmation.

### 4.3 Removing an entry (Keeper only)
- "Remove" opens the existing `AlertDialog`:
  - Public entry: title "Remove this Wall Entry?", description "Players will no longer see it. This can't be undone."
  - Keeper only entry: title "Remove this Wall Entry?", description "This can't be undone."
  - Actions: "Cancel" (default focus) and a destructive "Remove entry".
- On confirm: the dialog shows a busy state (the "Remove entry" button disabled and reading "Removing..."), then closes, the entry leaves the list, and the status region says "Wall Entry removed.".
- Focus after removal: the "Remove" button of the entry that followed it, otherwise the one before it, otherwise the Textarea.
- On failure: the dialog stays open with an `Alert` "We couldn't remove that entry. Try again.". The entry stays.
- If the server reports the entry is already gone (not found), the entry leaves the list as if it had been removed.
- Cancel, Escape and the close button close the dialog and return focus to the "Remove" button that opened it.

### 4.4 Player view
- The same page without the visibility group, without any "Keeper only" badge, and without "Remove". A Player never receives Keeper only entries, so there is no placeholder, count, gap, or hint for them.
- Entries added or removed by other members arrive live (section 4.5). No stale-data banner is shown.

### 4.5 Live updates (PBI-CP-006)
- **Arrival:** an entry another member adds appears at the top of the list in place, with no animation and no reordering. Entries already loaded through "Show older entries" stay loaded: the number of loaded pages is kept, and an entry at a page boundary may move into the next "Show older entries" page. None is duplicated or lost.
- **Removal:** an entry the Keeper removes elsewhere leaves the list in place, with no announcement. If keyboard focus was on that entry's "Remove" button, focus moves as in section 4.3 (the next entry, then the previous one, then the Textarea). An open remove dialog for an entry that is already gone stays open; confirming it treats "not found" as removed (section 4.3).
- **Composer:** live updates never change the Textarea text, the chosen visibility, the counter, or focus.
- **Announcements:** a visually hidden polite `role="status"` region of its own, so the visible "Wall Entry added." / "Wall Entry removed." text is untouched.
  - The first batch of new entries is announced at once. New entries within the next 5 seconds are collected and announced as one merged message when the 5 seconds end, which starts a new window.
  - One entry: "New Wall Entry from {author}." Several from one author: "{n} new Wall Entries from {author}." Several authors: "{n} new Wall Entries."
  - Not announced: anything before the list has been fetched since the page opened (first load, even when cached data showed first); entries loaded by "Show older entries"; removals; the viewer's own post from this tab, which is already in the list.
  - The viewer's own post from another tab is announced like any member's post.
- **Reconnect:** changes found by the catch-up refetch follow the same arrival, removal, and announcement rules.

## 5. Navigation changes

- The `campaign-header` shows the tab "Wall" for both roles between "Overview" and "Settings" (Settings stays Keeper only). The current link has `aria-current="page"`.
- `routes/campaigns.$campaignId.wall.tsx` renders the page and marks the section as `wall`, so the header does not render the Campaign name as the `h1`.

## 6. Overview layout change

- From 1024px (`lg`), the overview becomes `lg:grid-cols-[2fr_1fr]`, with the Wall preview in the right column, as in [campaign-overview ux](../campaign-overview/ux.md) section 3.
- Below 1024px it stays a single column, and "Wall" is the last section.

## 7. Wall preview (`wall-preview`)

Completes [campaign-overview ux](../campaign-overview/ux.md) section 7.

- **Source:** the same entries the Wall page would show to this viewer, newest first, limited to 5. For a Player this is the 5 latest Public entries, never the 5 latest overall with Keeper only entries removed afterwards.
- **Each entry:** the `time` (section 3), the author's display name, the Keeper only `Badge` for the Keeper, and the text clamped to 3 lines (`line-clamp-3`). The full text is on the Wall.
- **"Open the Wall":** a link to `/campaigns/$campaignId/wall`, shown in every state except loading.
- **Empty, loading, error:** as in campaign-overview ux section 7 ("Nothing on the Wall yet.", three Skeleton entries, "We couldn't load the Wall." with "Try again").
- **Freshness:** when an entry is added or removed on the Wall page, the preview refreshes the next time the overview is shown.
- **Live updates (PBI-CP-006):** the arrival, removal, first-load, and reconnect rules of section 4.5 apply. A new entry goes to the top and the sixth drops off; after a removal the next older entry fills in.
- **Announcements:** the copy and 5-second merge of section 4.5, through a visually hidden `aria-live="polite"` region inside the preview section, which is the section's one live region (campaign-overview ux CO-A11Y-7).

## 8. Content

| Key | Copy |
|---|---|
| Page heading | Wall |
| Compose label | New Wall Entry |
| Visibility legend | Who can read this? |
| Visibility options | Public / Keeper only |
| Option descriptions | Players can read this. / Only you can read this. |
| Player help text | Everyone in this Campaign can read this. |
| Empty-text hint | Write something to post. |
| Too long | Wall Entries can be at most 2000 characters. |
| Post button | Add to the Wall |
| Posted | Wall Entry added. |
| Post error | We couldn't add your entry. Your text is still here. Try again. |
| Badge | Keeper only |
| Remove button / dialog action | Remove / Remove entry |
| Remove dialog title | Remove this Wall Entry? |
| Remove dialog description (Public / Keeper only) | Players will no longer see it. This can't be undone. / This can't be undone. |
| Removed | Wall Entry removed. |
| Remove error | We couldn't remove that entry. Try again. |
| Older entries | Show older entries / Loading... / We couldn't load older entries. |
| Empty | Nothing on the Wall yet. |
| Load error | We couldn't load the Wall. |
| Live arrival (one / one author / several authors) | New Wall Entry from {author}. / {n} new Wall Entries from {author}. / {n} new Wall Entries. |

Never use "note", "log message", "event", or "private" in the UI (see root CONTEXT.md). The UI says "Keeper only" (the spec's wording); CONTEXT.md's term is "Keeper-Only Wall Entry", which is the same concept.

## 9. Component mapping

| Element | Component |
|---|---|
| Page | New `campaign-wall` in `frontend/src/campaign-play/components/campaign-wall/` and route `routes/campaigns.$campaignId.wall.tsx` |
| Compose box | New `wall-entry-composer` using `Textarea`, `Label`, `radio-group`, `Button`, `Alert` |
| Entry row, list | New `wall-entry-list` (list and `li` rows) and a shared `wall-entry-time` for the `time` element, used by the page and the preview |
| Remove confirmation | New `remove-wall-entry-dialog` on the existing `AlertDialog` |
| Preview | New `wall-preview` using `Card`, `Skeleton`, `Badge`, `Alert`, `Button`, and a TanStack `Link` |
| Data | New `useWallEntries`, `useAddWallEntry`, `useRemoveWallEntry` hooks and Wall functions in `services/campaignApi.ts` with strict zod schemas |
| Primitives | Existing only; no new primitives |

Stories cover: Keeper and Player compose boxes, empty, loading, load error, a page with Keeper only entries (Keeper view), a long text and a long author name at narrow width, the remove dialog (idle, busy, error), and the preview in each state.

## 10. UX acceptance criteria

- **WL-UX-1** The Keeper and a Player both see a "Wall" tab; selecting it opens `/campaigns/$campaignId/wall` with the `h1` "Wall".
- **WL-UX-2** The Keeper can add an entry as Public or Keeper only; Public is the default. The new entry appears at the top of the list, the Textarea is cleared and keeps focus, and "Wall Entry added." is announced.
- **WL-UX-3** A Player sees no visibility choice and the help text "Everyone in this Campaign can read this."; the entry they add appears as a Public entry.
- **WL-UX-4** A Player sees no Keeper only entry, no "Keeper only" badge, and no placeholder, gap, or count in the list or in the preview; the Keeper sees the badge on those entries.
- **WL-UX-5** Entries are newest first. "Show older entries" appends the next page and is hidden when there is no more.
- **WL-UX-6** The post button is disabled for empty or whitespace-only text and for text over 2000 characters, with the explanatory text; a failed post keeps the text and the chosen visibility.
- **WL-UX-7** Only the Keeper sees "Remove". It asks for confirmation, then removes the entry, announces "Wall Entry removed.", and moves focus as in section 4.3.
- **WL-UX-8** Loading, empty, load error, and older-entries error states are shown as in section 4.1, with a working "Try again".
- **WL-UX-9** The overview shows at most 5 entries in the Wall preview with "Open the Wall"; the Player's 5 are the 5 latest Public entries; Keeper only entries show the badge to the Keeper only (CO-UX-14).
- **WL-UX-10** Opening the Wall of a Campaign the viewer is not a member of shows the not-found page.
- **WL-UX-11** (PBI-CP-006) A Public entry another member adds appears at the top of the Wall and the preview without a reload; entries loaded through "Show older entries" stay.
- **WL-UX-12** (PBI-CP-006) A Player receives nothing for a Keeper only entry: the list, the preview, and the announcements are unchanged.
- **WL-UX-13** (PBI-CP-006) An entry the Keeper removes disappears from other members' Wall and preview without a reload and without an announcement.
- **WL-UX-14** (PBI-CP-006) New entries are announced at most once per 5 seconds with the section 4.5 copy, merging bursts; nothing is announced on first load, for older pages, or for the viewer's own post in the same tab.
- **WL-UX-15** (PBI-CP-006) Live updates never change the composer's text, visibility, or focus.

## 11. Accessibility acceptance criteria (WCAG 2.2 AA)

- **WL-A11Y-1** The page has one `h1`. The entries are in an `ol`; each timestamp is a `time` element with a machine-readable `datetime` (1.3.1).
- **WL-A11Y-2** The Textarea has a visible label. The counter, hint, and error are associated with it by `aria-describedby`; the error is also exposed with `aria-invalid` (1.3.1, 3.3.1, 3.3.3).
- **WL-A11Y-3** The visibility group is a `fieldset` / `radiogroup` with a legend and is operable with the keyboard (1.3.1, 2.1.1).
- **WL-A11Y-4** "Keeper only" is conveyed by text, not by colour alone (1.4.1).
- **WL-A11Y-5** "Wall Entry added." and "Wall Entry removed." are in a polite `role="status"` region; errors use `role="alert"`; none of them move focus (4.1.3).
- **WL-A11Y-6** Every "Remove" button has an accessible name that includes the author and time (2.4.4). The dialog traps focus, starts focus on "Cancel", and restores focus as in section 4.3 (2.4.3).
- **WL-A11Y-7** Everything is keyboard reachable in visual order with a visible focus ring; controls are at least 24 by 24 CSS pixels (2.1.1, 2.4.7, 2.5.8).
- **WL-A11Y-8** At 320px and at 200% zoom the page fits without horizontal scrolling; long words wrap (1.4.10).
- **WL-A11Y-9** Muted text meets 4.5:1 (1.4.3). No motion is used (2.3.3).
- **WL-A11Y-10** Loading lists are marked `aria-busy="true"`; "Show older entries" does not move focus and the new rows are reachable after the button in tab order (2.4.3).
- **WL-A11Y-11** (PBI-CP-006) Live arrivals and removals never move focus, except when the entry of the focused "Remove" button is removed, where the section 4.3 rule applies (2.4.3, 4.1.3).
- **WL-A11Y-12** (PBI-CP-006) Live announcements use a polite status region separate from the visible status text (4.1.3).
- **WL-A11Y-13** (PBI-CP-006) No motion is used for live changes (2.3.3).

## 12. Open decisions and research gaps

- **Deferred:** Play Session grouping or link, until Play Sessions exist (PBI-CP-004 follow-up).
- **Deferred:** editing entries, Player removal of their own entries.
- **Research gap:** whether Keepers mistakenly post Public instead of Keeper only; the default is Public and the choice is explained next to the radios. Check with early Keepers.
- **Research gap:** whether Players use the Wall for their own actions and how long entries get in practice (the 2000 limit is an assumption).

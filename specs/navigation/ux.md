# UX Specification: Navigation

Selected direction, chosen 2026-11-04 through a grilling session with clickable prototypes ([prototype/active-scene.html](prototype/active-scene.html), variant A): **a Campaign tab for the Active Scene, side panels kept in the URL for lookups during play, and back links that remember their origin.** The prototype is illustrative: structure, order, copy, URLs, and behavior in this document are normative; colors and spacing come from the existing tokens and shadcn/ui.

Alternatives considered:
- **A persistent "Scene in progress - Return" bar instead of a tab:** rejected; a tab is in a fixed place and reads as a destination, not a notice.
- **A tab that exists only while a Scene is Active:** rejected; the tab row would change shape mid-session.
- **Breadcrumbs:** rejected; they follow the structure, not the journey. The Clues page's structural parent is the Investigator, not the Active Scene the Keeper came from.
- **Origin kept in router history state:** rejected; lost on refresh and in a new tab. A search param survives both.
- **Panel state kept only in component state:** rejected; browser back would leave the page instead of closing the panel.

Human decisions (2026-11-04):
- The tab is labelled "Active Scene" (the [CONTEXT.md](../../CONTEXT.md) term), is second in the row, and is shown to every Campaign Member, with a text "Live" badge while a Scene is Active.
- Reading during play opens a side panel; leaving to do other work goes to a page with a back link.
- The origin is a `from` search param with an allow-list and a structural fallback.
- This pattern is the app-wide default. Features other than Scene Play adopt it through follow-up PBIs.

Behavior and rules: [spec.md](spec.md). The Active Scene layout that uses these pieces is in [scene-play ux](../scene-play/ux.md) section 21.

## 1. Information architecture

```
Campaign tabs (nav "Campaign")
  Overview       /campaigns/$campaignId
  Active Scene   /campaigns/$campaignId/active-scene[/to-reveal|/reference|/revealed]
  Wall           /campaigns/$campaignId/wall
  Settings       /campaigns/$campaignId/settings            (Keeper only)

Side panel (search params on the page that opens it)
  ?panel=clues&investigator=<id>     an Investigator's Clues (Keeper) or your Clues (Player: no investigator param)
  ?panel=entity&link=<linkId>        a Scene's Non-Player Entity: what Players see, then the profile read-only (Keeper)
  ?panel=handout&handout=<id>        a Handout's current content (Keeper)
  ?panel=reveal&reveal=<revealId>    what was revealed, from its snapshot (Keeper)

Origin (search param on a full page)
  ?from=active-scene                 the only allowed value for now
```

## 2. Campaign tabs (amends [campaign-overview ux](../campaign-overview/ux.md) section 2)

```
< Back to Campaigns
Arkham Nights
1920s
[ Overview ]  Active Scene (o Live)  Wall  Settings
```

- **Order:** Overview, Active Scene, Wall, Settings (Settings Keeper only). Each is a link in the existing `nav` "Campaign", not an ARIA tab.
- **Current tab (`aria-current="page"`):**
  - Active Scene is current on `/active-scene` and every sub-route under it.
  - Overview stays current on the overview, sheet, wizard, review, Scenario, Scene, Clues, Non-Player Entity, Item, and Handout pages.
- **Live badge:** while a Scene is Active, the Active Scene link ends with a `Badge` reading "Live" with an `aria-hidden` dot. The link's accessible name is then "Active Scene, live". The badge appears and disappears on the `activeScene` topic without reloading; nothing is announced. A Player whose Investigator is not present still sees "Live".
- **Data:** the badge reads the Active Scene query the page already uses (`useActiveScene`); the header does not add a request of its own when that query is cached.
- **Narrow screens:** the row no longer fits four labels at 320px. Below 640px the `nav` scrolls horizontally inside itself (`overflow-x-auto`, no visible scrollbar gutter change), the current link is scrolled into view on load, and the page body never scrolls sideways. Links stay at least 44px high.

## 3. Side panel (`side-panel`, shadcn `Sheet`)

```
+------------------------------------------- page (dimmed) ---+-------------------------+
|                                                             | Clues               [x] |
|                                                             | Lucy Ward's Clues  (h2) |
|                                                             | ----------------------- |
|                                                             | <panel body>            |
|                                                             | ----------------------- |
|                                                             | Open full page ->       |
+-------------------------------------------------------------+-------------------------+
```

- **Placement:** a `Sheet` from the right, `w-full sm:max-w-md` (28rem); full width below 640px. Modal: the page behind is inert and dimmed.
- **Header:** a muted kind line ("Clues", "Non-Player Entity", "Handout", "Revealed"), the `h2` title, and the close button (accessible name "Close").
- **Body by panel type:**
  - **clues:** the Clues list of [scene-play ux](../scene-play/ux.md) section 15 without its `h1`, description, or back link. Scene group headings become `h3`, Clues `h4`.
  - **entity:** "What Players see" (`h3`): the link's Player-facing name and description, or "No Player-facing description yet."; then "Profile" (`h3`): the profile's View mode ([scenario-preparation ux](../scenario-preparation/ux.md) section 25.1) read-only, without Edit, Delete, or Duplicate, headings shifted down to start at `h4`. The panel title is the Player-facing name.
  - **handout:** the Handout's current content as rendered by `handout-preview`, with its badges.
  - **reveal:** `revealed-content` from the Reveal's snapshot, with the meta line "{kind} . {time} . to {names}".
- **Footer:** the link "Open full page" to the full page with `from` set to the opening page's origin (section 4). The `reveal` panel has no full page and no footer link. A page may add one context action to the footer (the Active Scene adds "Reveal..." on a revealable Handout, scene-play ux section 21).
- **URL:** opening pushes a history entry with the panel params; the page under it keeps its own path and params.
- **Closing:** the close button, Escape, and a click on the dimmed page each close the panel. If the previous history entry is the same page without a panel, closing goes back; otherwise it replaces the entry without the panel params. Browser back closes it too.
- **One at a time:** opening another panel while one is open replaces the history entry instead of pushing.
- **Focus:** on open, focus moves to the panel `h2` (`tabIndex=-1`). On close, focus returns to the control that opened it; if that control is gone (the page was reloaded with the panel open, or the subject left the list), focus moves to the page `h1`.
- **States:** loading shows a Skeleton with `aria-busy="true"`; a failure shows "We couldn't load this." with "Try again"; a missing or forbidden subject shows "We couldn't find that." with no footer link. The page under the panel is unaffected by any of these.
- **Live:** the panel body refetches on the same topics as its full page, silently.

## 4. Back link with an origin (`back-link`)

```
<- Back to The Corbitt House                (from=active-scene)
<- Back to Lucy Ward                        (no from: structural parent)
```

- **Allow-list:** `from` is parsed with a zod enum. Today it has one value:

| `from` | Label | Target |
|---|---|---|
| `active-scene` | "Back to {Active Scene title}", or "Back to the Active Scene" until the title is known or when no Scene is Active | `/campaigns/$campaignId/active-scene` |

- **Fallback:** a missing or unknown `from` shows the page's existing structural back link, unchanged:

| Page | Structural back link |
|---|---|
| Keeper Clues page | "Back to {Investigator name}" (review page) |
| Player Clues page | "Back to your Campaign" |
| Human NPC and Mythos Creature profile pages | their existing back link (scenario-preparation ux section 25) |
| Scene Handout page | its existing back link to the Scene page (scenario-preparation ux section 42) |

- **One hop:** `from` is not carried forward. A link on the full page to yet another page does not pass `from` on.
- **Placement and style:** where the page's back link is today, the existing `ArrowLeft` link style. The page's `h1` and focus handling are unchanged.

## 5. Panel or page

| The user wants to | Use |
|---|---|
| Read something while staying in the current task (Clues, a profile, Handout content, a revealed snapshot) | Side panel |
| Edit, manage, or browse a whole list | Full page, opened with `from` when the origin is on the allow-list |
| Switch to another area of the Campaign | Campaign tab |

New features follow this table. A feature that needs a new origin adds it to the allow-list in this document.

## 6. Content

| Element | Copy |
|---|---|
| Tab | "Active Scene" |
| Live badge | "Live" (accessible name of the link: "Active Scene, live") |
| Panel close | "Close" |
| Panel kind lines | "Clues", "Non-Player Entity", "Handout", "Revealed" |
| Entity panel headings | "What Players see", "Profile" |
| Panel footer | "Open full page" |
| Panel load failure | "We couldn't load this." / "Try again" |
| Panel not found | "We couldn't find that." |
| Origin back link | "Back to {Active Scene title}" / "Back to the Active Scene" |

## 7. Component mapping

| Piece | Component | Notes |
|---|---|---|
| Campaign tabs | `campaign-header` (changed) | adds the Active Scene link and `live-badge` |
| Live badge | `Badge` + dot | `shared/components/live-badge` |
| Side panel | `Sheet` (shadcn) | `shared/components/side-panel`; panel params parsed by a `useSidePanel` hook with a zod schema |
| Panel bodies | `clues-list`, profile view, `handout-preview`, `revealed-content` | extracted from their pages so page and panel render the same thing |
| Back link | `back-link` | `shared/components/back-link`; origin resolved by a pure `resolveBackLink(from, fallback)` |

## 8. UX acceptance criteria

- **NAV-UX-1** Every Campaign page shows the tabs Overview, Active Scene, Wall, and (Keeper) Settings, in that order.
- **NAV-UX-2** Active Scene is the current tab on `/active-scene` and its sub-routes; Overview stays current on the pages listed in section 2.
- **NAV-UX-3** "Live" shows on the Active Scene tab exactly while a Scene is Active, and changes without reloading when a Scene starts or finishes.
- **NAV-UX-4** Opening a lookup from the Active Scene opens a side panel and adds the panel params to the URL; the page under it does not reload or lose scroll position.
- **NAV-UX-5** Browser back, Escape, the close button, and a click outside each close the panel; reloading with panel params reopens it.
- **NAV-UX-6** Opening a second panel replaces the first; only one is ever open.
- **NAV-UX-7** "Open full page" leads to the full page with `?from=active-scene`, which shows "Back to {Active Scene title}" and returns to the Active Scene.
- **NAV-UX-8** A full page without `from`, or with a value not on the allow-list, shows its structural back link.
- **NAV-UX-9** A panel URL for a subject the viewer may not see shows "We couldn't find that." and loads nothing more than the full page would.

## 9. Accessibility acceptance criteria (WCAG 2.2 AA)

- **NAV-A11Y-1** The tabs stay a `nav` labelled "Campaign" with `aria-current="page"`; "Live" is text, never color alone, and is part of the link's accessible name (1.3.1, 1.4.1, 4.1.2).
- **NAV-A11Y-2** The panel is a modal dialog labelled by its `h2`; focus moves into it on open, is trapped while open, and returns to the trigger (or the page `h1`) on close (2.4.3, 4.1.2).
- **NAV-A11Y-3** Every control is keyboard operable with a visible focus ring and at least 24 by 24 CSS px; tab links stay at least 44px high (2.1.1, 2.4.7, 2.5.8).
- **NAV-A11Y-4** At 320px and 200% zoom, the tab row scrolls inside itself and the panel fills the width; the page body never scrolls sideways (1.4.10).
- **NAV-A11Y-5** The Live badge changing is not announced, and nothing moves focus (4.1.3).

## 10. Open decisions and research gaps

- **Rollout beyond the Active Scene:** other dead-end journeys (for example the Scene page's links to profiles and Handouts, and the Investigator review page) adopt sections 3 to 5 in follow-up PBIs after an audit.
- **More origins:** each new `from` value is added to section 4 when a feature needs it; there is no generic "previous page" value.

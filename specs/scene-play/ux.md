# UX Specification: Scene Play (Active Scene)

Selected direction: **Option B (dedicated Active Scene page with a guided start page)**, chosen 2026-10-28 for PBI-SPL-001. Alternatives considered:
- **Option A (run from the Scene page with dialogs):** rejected because it mixes authoring (Edit, Remove) with live controls on the Scenario Preparation Scene page, and the Reveal and give controls of PBI-SPL-002 and PBI-SPL-003 would grow that page further.
- **Option C (overview command card):** rejected because it turns the overview into a control panel, needs a cross-Scenario list of Prepared Scenes, and still needs an Active Scene page for Players and for PBI-SPL-002.

Reveals and Clues (PBI-SPL-002, sections 11 to 20): **Option A (a material list on the Active Scene page, a "Reveal..." confirm dialog, and dedicated Clues pages)**, chosen 2026-10-29. Alternatives considered:
- **Option B (one-click "Reveal to everyone" with an inline chooser):** rejected because one accidental click irreversibly discloses material to every Investigator present.
- **Option C (an audience-first "Reveal to" bar and a Clues tab):** rejected because a forgotten audience misdirects a Reveal, and a Campaign tab was deferred (section 10).

Human decisions at the PBI-SPL-002 UX gate (2026-10-29): Image and Map Handouts get an optional image description ([scenario-preparation ux](../scenario-preparation/ux.md) section 71); Keeper notes are shown read-only and collapsed on the Keeper's Active Scene page. Design record: [docs/scene-play/issues/02-reveal-to-investigators-and-clues.design.md](../../docs/scene-play/issues/02-reveal-to-investigators-and-clues.design.md).

Human decisions at the UX gate (2026-10-28): the Wall Entry text is "Scene started: {title}" and "Scene finished: {title}". A Scene is started only from its Scene page; the overview card has no "Start a Scene" entry.

Behavior and rules: [spec.md](spec.md). This document covers presentation only. Scene status, times, and the Scene page are in [scenario-preparation ux](../scenario-preparation/ux.md) sections 12 and 14; the overview order is in [campaign-overview ux](../campaign-overview/ux.md) section 3.

## 1. Information architecture

```
/campaigns/$campaignId                                         Overview (Active Scene card, section 5)
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId   Scene page (Keeper; "Start Scene" / "Open Active Scene")
  .../scenes/$sceneId/start                                    Start page (Keeper only, section 2)
/campaigns/$campaignId/active-scene                            Active Scene page (Keeper view sections 3 and 12, Player view sections 4 and 14)
/campaigns/$campaignId/investigator/clues                      Player: their Investigator's Clues (section 15)
/campaigns/$campaignId/investigators/$investigatorId/clues     Keeper: an Investigator's Clues (section 15)
```

- Overview is the current Campaign tab on the start page. **Since PBI-NAV-001** the Active Scene page has its own Campaign tab, "Active Scene" ([navigation ux](../navigation/ux.md) section 2); this replaces "No new tab is added".
- The Keeper starts a Scene only from its Scene page. A Prepared Scene gets the action "Start Scene", a link styled as a primary button, placed before "Edit". An Active Scene gets the link "Open Active Scene", placed before "Edit". A Finished Scene is unchanged. This amends [scenario-preparation ux](../scenario-preparation/ux.md) section 14, "Actions by status".
- Every member reaches the Active Scene page from the overview card. The Keeper also reaches it from "Open Active Scene" and after starting a Scene.
- **Since PBI-SPL-002:** the Keeper's Active Scene page shows Keeper notes, Handouts, and Non-Player Entities with the Reveal controls (section 12). "Open in Scenario" stays, for editing. Items arrive with PBI-SPL-003.
- **Since PBI-SPL-006:** the Keeper's Active Scene page is split into Run, To reveal, Keeper reference, and Revealed, each with its own route (section 21.1).

## 2. Start page (`start-scene-page`)

```
< Back to the Scene
Start The Corbitt House                          (h1)
Scenario: The Haunting                           (muted)
+-- (only when another Scene is Active) ---------------------+
| Meeting Knott is the Active Scene                (h2)      |
| Only one Scene can be Active. A Finished Scene can't be    |
| started again.                                             |
| [ ] Finish Meeting Knott first                             |
+------------------------------------------------------------+
Investigators present                            (fieldset legend)
Choose the Investigators taking part in this Scene. (hint)
 [x] Harvey Walters     Ana Ruiz                 (Player name, muted)
 [x] Lucy Ward          Ben Cole
[Start Scene]  Cancel
```

- **Data:**
  - The Scene and its Scenario title come from the existing Scene and Scenario reads.
  - The Active Scene comes from the Keeper's Active Scene read.
  - The Approved Investigators come from the Campaign roster (`members`), which gives the Keeper each Investigator's id, name, status, and Player name.
- **Role and route checks:**
  - A Player gets `scene-not-found`. This is a client-side role check with no API call, as on the Scene page.
  - An unknown Scene, or a Scene of another Scenario or Campaign, also gets `scene-not-found`.
- **A Scene that is not Prepared:** instead of the form, the page shows the `h1` "{title} has already been started" and a link.
  - If it is the Active Scene, the link is "Open Active Scene".
  - Otherwise, the link is "Back to the Scene".
- **Active Scene notice:** the bordered region with its `h2` is shown only while another Scene is Active. It comes before the fieldset in DOM and visual order.
  - It holds one checkbox, "Finish {Active title} first". The checkbox is never pre-checked.
  - The page never finishes a Scene without this explicit choice.
- **Investigators present:**
  - **Markup:** a `fieldset` with the `legend` "Investigators present". The hint is connected with `aria-describedby`.
  - **Rows:** one `Checkbox` per Approved Investigator, in roster order. The label is the Investigator name, or "Unnamed Investigator" when it has none. The Player name follows as muted text inside the label.
  - **Pre-check:**
    - With an Active Scene, the Investigators present in it are pre-checked.
    - Without one, every Approved Investigator is pre-checked.
- **No Approved Investigator:** the fieldset and "Start Scene" are not rendered. The page shows "No Investigator is Approved yet. Approve an Investigator before starting a Scene." with the link "Back to your Campaign".
- **Actions:** the primary button "Start Scene". While busy it reads "Starting..." and is disabled, so a second activation does nothing. The secondary action is the link "Cancel", back to the Scene page.
- **Validation on submit (client):**
  - **Errors:**
    - No Investigator is checked: "Choose at least one Investigator present." shows under the legend.
    - The Active Scene notice is shown and its checkbox is unchecked: "Choose to finish {Active title} first, or cancel." shows under the checkbox.
  - **Markup:** the errors are connected with `aria-describedby`, and the checkbox or fieldset gets `aria-invalid`.
  - **Focus:** focus moves to the first invalid control in DOM order (the finish checkbox, then the first Investigator checkbox).
- **Success:**
  - The page navigates to `/campaigns/$campaignId/active-scene` with the navigation status message "{title} started.".
  - The Active Scene query and the Scene queries are invalidated.
- **Server refusals:** each is an `Alert` with `role=alert` above the actions. The input is kept.
  - **409, the Scene is no longer Prepared:** "This Scene has already been started, so it can't be started again." with the link "Back to the Scene".
  - **409, another Scene became Active meanwhile:**
    - The Active Scene is refetched and the notice appears.
    - Message: "Another Scene was started meanwhile. Choose whether to finish it first."
    - Focus moves to the finish checkbox.
  - **400 (an Investigator can no longer be present):** "One of these Investigators can't be present. Check the list and try again." The roster is refetched.
  - **Any other failure:** "We couldn't start the Scene. Try again."
- **Loading:** Skeletons for the `h1` and three checkbox rows, with `aria-busy="true"`.
- **Load error:** "We couldn't load this Scene." with "Try again".
- **Unsaved changes:** there is no prompt. The page holds only a selection.

## 3. Active Scene page, Keeper view (`active-scene-page`, `active-scene-keeper-view`)

> **Since PBI-SPL-006** the header layout and the page order are section 21.2 and 21.3. The Investigators present and Finish behavior below stay.

```
The Corbitt House started.                       (role=status)
The Corbitt House                                (h1)
(>) Active  Started 28 Oct 2026, 19:40
Scenario: The Haunting   Open in Scenario        (muted text, link)
Location   Arkham, Boston Road                   (dl, only when set)
[Finish Scene]
Investigators present                            (h2)  [Change]
 - Harvey Walters
 - Lucy Ward
```

- **Header:**
  - A `role=status` paragraph for navigation and status messages.
  - The `h1` is the Scene title (`break-words`).
  - The status line reuses `scene-status-badge` and `scene-times`.
  - Next comes "Scenario: {title}" with the link "Open in Scenario" to the Scene page.
  - The `dl` with "Location" appears only when a location is set.
- **Investigators present (`investigators-present-section`):**
  - **View:** a `section` labelled by its `h2` "Investigators present", with a `ul` of names in roster order and the outline button "Change".
  - **Change:** replaces the list with the same fieldset as the start page.
    - Every Approved Investigator is listed, and the present ones are pre-checked.
    - The buttons are "Save" ("Saving..." while busy, disabled) and "Cancel".
    - Focus moves to the first checkbox.
  - **Save success:** the view returns, the status says "Investigators present saved.", and focus moves to "Change".
  - **Cancel:** discards without confirmation; focus moves to "Change".
  - **Errors:**
    - **Empty selection:** "Choose at least one Investigator present." with focus on the first checkbox.
    - **400:** the start page's 400 message.
    - **409 (no Scene is Active any more):** "This Scene has been finished, so who is present can't be changed." Selecting Cancel shows the refetched page.
    - **Any other failure:** "We couldn't save who is present. Try again."
    - Every message is an `Alert` with `role=alert`.
- **Finish (`finish-scene-dialog`, `AlertDialog`):** opened from "Finish Scene", an outline button with destructive text.
  - **Content:** the title is "Finish {title}?" and the description is "A Finished Scene can't be started again. Players will see that it has finished."
  - **Buttons:** "Cancel" and "Finish Scene". While busy the confirm button reads "Finishing...", and both buttons are disabled.
  - **Success:** the dialog closes and the page shows the no-Active-Scene state (section 4.3) with the status "{title} finished.". Focus moves to the `h1`.
  - **409 (already finished elsewhere):** the dialog closes, the page refetches, and the status says "This Scene was already finished.". Focus moves to the `h1`.
  - **Failure:** "We couldn't finish the Scene. Try again." (`role=alert`) inside the dialog.
  - **Cancel:** returns focus to "Finish Scene".
- **No live announcements on the Keeper view.** The Keeper is the only actor. A change made in another tab refetches silently.

## 4. Active Scene page, Player view (`active-scene-player-view`)

### 4.1 The Player's Investigator is present
```
The Corbitt House                                (h1)
Location   Arkham, Boston Road                   (dl, only when set)
Investigators present                            (h2)
 - Harvey Walters (your Investigator)
 - Lucy Ward
Revealed to Harvey Walters                       (h2)
The Keeper hasn't revealed anything to Harvey Walters yet.   (muted)
```
- "(your Investigator)" follows the Player's own Investigator name as plain text.
- The "Revealed to {name}" section lists what reached the Investigator in this Scene (section 14). The empty sentence shows until the first Reveal.

### 4.2 The Player's Investigator is not present
This covers a Player with no Investigator or an unapproved one.
```
The Corbitt House                                (h1)
This Scene is in progress. You aren't taking part in it.
```
- Nothing else is shown: no location, no Investigators present, no times.

### 4.3 No Active Scene (both roles)
```
No Active Scene                                  (h1)
No Scene is being played right now.
Back to your Campaign
```
- The Keeper also sees "Start a Scene from its page in a Scenario." before the link.

### 4.4 Shared states
- **Loading:** a Skeleton for the `h1` and two lines, with `aria-busy="true"`.
- **Error:** "We couldn't load the Active Scene." with "Try again".
- **Not a member, or no Campaign:** the existing Campaign not-found page, from the layout route.
- **Live updates (Player view):**
  - The page refetches on the `activeScene` topic.
  - Changes found by a refetch after the first load are announced in the page's polite live region, without moving focus.
  - **Announcement texts:**
    - A Scene starts: "{title} started."
    - The Scene finishes: "{title} finished."
    - The Player's Investigator is added: "You're now taking part in {title}."
    - The Player's Investigator is removed: "You're no longer taking part in {title}."
  - Other changes to the present list are not announced.
  - Nothing is announced on the first load or for the catch-up refetch after a reconnect that finds no change.

## 5. Active Scene card on the overview (`active-scene-card`)

```
Active Scene                                     (h2)
The Corbitt House                                (font-medium)
Arkham, Boston Road                              (muted, only when set and visible)
Investigators present: Harvey Walters, Lucy Ward
Open Active Scene                                (link)

Not present:  The Corbitt House is in progress. You aren't taking part in it.
```

- **Placement:**
  - A `section` labelled by its `h2`, inside a `Card`, for both roles.
  - It sits after "Needs your attention" and before "At the table" ([campaign-overview ux](../campaign-overview/ux.md) section 3 order).
  - It is rendered only while a Scene is Active.
- **Content by viewer:**
  - **Keeper:** title, location, Investigators present, and the link "Open Active Scene".
  - **Player whose Investigator is present:** the same, with "(your Investigator)" after their Investigator's name.
  - **Player whose Investigator is not present:** "{title} is in progress. You aren't taking part in it." There is no link, because the page would show nothing more.
- **Loading:** nothing is rendered, to avoid a placeholder that usually disappears.
- **Error:** the section renders with "We couldn't check for an Active Scene." and "Try again".
- **Live updates:**
  - The card appears, changes, or disappears on the `activeScene` topic, in place, with no animation.
  - Players hear "{title} started." and "{title} finished." through the card's polite live region. This does not happen on the first load, and never for the Keeper.

## 6. Content

| Key | Copy |
|---|---|
| Scene page actions | Start Scene / Open Active Scene |
| Start page h1 | Start {title} |
| Start page meta | Scenario: {title} |
| Active notice | {title} is the Active Scene / Only one Scene can be Active. A Finished Scene can't be started again. / Finish {title} first |
| Fieldset | Investigators present / Choose the Investigators taking part in this Scene. |
| Unnamed | Unnamed Investigator |
| No Approved Investigator | No Investigator is Approved yet. Approve an Investigator before starting a Scene. |
| Start actions | Start Scene / Starting... / Cancel |
| Start errors | Choose at least one Investigator present. / Choose to finish {title} first, or cancel. |
| Start refusals | This Scene has already been started, so it can't be started again. / Another Scene was started meanwhile. Choose whether to finish it first. / One of these Investigators can't be present. Check the list and try again. / We couldn't start the Scene. Try again. |
| Already started page | {title} has already been started |
| Status messages | {title} started. / Investigators present saved. / {title} finished. / This Scene was already finished. |
| Keeper view | Open in Scenario / Finish Scene / Change / Save / Saving... / Cancel |
| Present refusals | This Scene has been finished, so who is present can't be changed. / We couldn't save who is present. Try again. |
| Finish dialog | Finish {title}? / A Finished Scene can't be started again. Players will see that it has finished. / Cancel / Finish Scene / Finishing... / We couldn't finish the Scene. Try again. |
| Player view | (your Investigator) / Revealed to {name} / The Keeper hasn't revealed anything to {name} yet. / This Scene is in progress. You aren't taking part in it. |
| No Active Scene | No Active Scene / No Scene is being played right now. / Start a Scene from its page in a Scenario. / Back to your Campaign |
| Card | Active Scene / Investigators present: {names} / Open Active Scene / {title} is in progress. You aren't taking part in it. / We couldn't check for an Active Scene. |
| Load errors | We couldn't load this Scene. / We couldn't load the Active Scene. |
| Announcements | {title} started. / {title} finished. / You're now taking part in {title}. / You're no longer taking part in {title}. |
| Wall Entries | Scene started: {title} / Scene finished: {title} |

Never use "current scene", "live scene", "open scene", "closed scene", "party", "participants", or "scene members" (root CONTEXT.md).

## 7. Component mapping

| Element | Component |
|---|---|
| Slice | New `frontend/src/scene-play/` with `components`, `hooks`, `services` (`activeSceneApi.ts`, `activeSceneQueryKeys`, zod schemas), and `types` |
| Start page | New `start-scene-page`, route `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.start.tsx` |
| Active Scene page | New `active-scene-page` (role switch), `active-scene-keeper-view`, `active-scene-player-view`, and `no-active-scene`; route `routes/campaigns.$campaignId.active-scene.tsx` |
| Present choice | New `investigators-present-fieldset` (`Checkbox`, `Label`), shared by the start page and `investigators-present-section` |
| Finish dialog | New `finish-scene-dialog` (`AlertDialog`, like `remove-scene-dialog`) |
| Overview card | New `active-scene-card`, mounted by `campaign-page` (as it already mounts Scenario Preparation sections) |
| Scene page actions | `scene-page` gains "Start Scene" and "Open Active Scene" links |
| Reused | `scene-status-badge`, `scene-times`, `scene-not-found`, `Card`, `Alert`, `Button`, `Skeleton`, `AlertDialog`, `Checkbox` |
| Live | `activeScene` added to `campaign-play/services/liveTopics.ts`; it invalidates the Active Scene query and the Scene queries (`sceneQueryKeys`) |

Stories cover:
- **`start-scene-page`:** idle, with an Active Scene, no Approved Investigator, every client error, starting, each refusal, already started, and loading.
- **`active-scene-keeper-view`:** with and without a location, change mode, save errors, and saving.
- **`active-scene-player-view`:** present, not present, and no Active Scene.
- **`finish-scene-dialog`:** idle, finishing, and failure.
- **`active-scene-card`:** the Keeper, a present Player, a non-present Player, and error.
- **`investigators-present-fieldset`:** default, an unnamed Investigator, a long name at 320px, and an error.

## 8. UX acceptance criteria

- **SPL-UX-1** A Prepared Scene's page shows "Start Scene", which opens the start page. An Active Scene's page shows "Open Active Scene". A Finished Scene's page shows neither.
- **SPL-UX-2** The start page lists every Approved Investigator, and only those, all checked when no Scene is Active. Submitting starts the Scene and opens the Active Scene page with "{title} started.".
- **SPL-UX-3** Any Prepared Scene of any Scenario can be started. Starting "The Corbitt House" leaves an earlier "Meeting Knott" Prepared.
- **SPL-UX-4** Submitting with no Investigator checked shows "Choose at least one Investigator present.", focuses the first checkbox, and starts nothing.
- **SPL-UX-5** While another Scene is Active, the start page shows "{title} is the Active Scene" with an unchecked "Finish {title} first". Submitting without checking it shows "Choose to finish {title} first, or cancel." and changes nothing.
- **SPL-UX-6** With "Finish {title} first" checked, submitting finishes that Scene and starts the new one. The Active Scene page shows the new Scene, and the old Scene's page shows Finished.
- **SPL-UX-7** A start refused because another Scene became Active meanwhile shows "Another Scene was started meanwhile. Choose whether to finish it first." and the notice, with focus on the finish checkbox.
- **SPL-UX-8** With no Approved Investigator, the start page shows "No Investigator is Approved yet. Approve an Investigator before starting a Scene." and no "Start Scene".
- **SPL-UX-9** The Keeper's Active Scene page shows the title, Active status, start time, Scenario, location, Investigators present, "Open in Scenario", "Change", "Finish Scene", Keeper notes (collapsed), Handouts, and Non-Player Entities (section 12; amended by PBI-SPL-002).
- **SPL-UX-10** "Change", then a different selection, then "Save" shows "Investigators present saved." with the new list after a reload. "Cancel" keeps the old list. An empty selection shows "Choose at least one Investigator present.".
- **SPL-UX-11** "Finish Scene", then confirming, shows "{title} finished." and "No Active Scene". "Cancel" keeps the Scene Active.
- **SPL-UX-12** A Player whose Investigator is present sees the title, location, Investigators present with "(your Investigator)", and and, before any Reveal to their Investigator, "The Keeper hasn't revealed anything to {name} yet." and no Handout (amended by PBI-SPL-002).
- **SPL-UX-13** A Player whose Investigator is not present sees only the title and "This Scene is in progress. You aren't taking part in it.", on the page and on the overview card.
- **SPL-UX-14** While a Scene is Active, the overview shows the "Active Scene" card between "Needs your attention" and "At the table" for both roles. With no Active Scene there is no card.
- **SPL-UX-15** Starting, finishing, and changing who is present update a connected Player's overview card and Active Scene page without reloading.
- **SPL-UX-16** Starting and finishing add Public Wall Entries "Scene started: {title}" and "Scene finished: {title}", visible to Players on the Wall.
- **SPL-UX-17** A Player opening the start URL sees "We couldn't find that Scene". A Player sees no "Change", "Finish Scene", or "Open in Scenario".
- **SPL-UX-18** While a start, save, or finish is in flight its button is disabled, and a second activation does nothing.
- **SPL-UX-19** The start page and the Active Scene page keep the Campaign header with Overview as the current tab.

## 9. Accessibility acceptance criteria (WCAG 2.2 AA)

- **SPL-A11Y-1** Each page has exactly one `h1`. The card and the page sections are `section` elements labelled by their `h2` (1.3.1, 2.4.6).
- **SPL-A11Y-2** Investigators present is a `fieldset` with a `legend`. Each checkbox has a visible label that includes the Investigator name, and the hint and errors are connected with `aria-describedby`, with `aria-invalid` when invalid (1.3.1, 3.3.1, 3.3.2, 4.1.2).
- **SPL-A11Y-3** After a refused submit, focus moves to the first invalid control. Focus moves to the first checkbox on "Change", and to "Change" after Save or Cancel. It returns to "Finish Scene" when the dialog is cancelled and goes to the `h1` after a finish. Focus is never lost to `body` (2.4.3).
- **SPL-A11Y-4** Status is text in the badge with an `aria-hidden` icon. Times are `time` elements. "(your Investigator)" is text, not only styling (1.3.1, 1.4.1).
- **SPL-A11Y-5** Navigation and save messages use `role=status`; failures and refusals use `role=alert`. Live changes for Players are announced politely, never on first load (4.1.3).
- **SPL-A11Y-6** Every control is reachable and operable by keyboard. Checkboxes and buttons have a visible focus ring and are at least 24 by 24 CSS px (2.1.1, 2.4.7, 2.5.8).
- **SPL-A11Y-7** At 320px and 200% zoom the start page, the Active Scene page, and the card fit without horizontal scrolling, and long titles and names wrap (1.4.10).

## 10. Open decisions and research gaps

- **Resolved by PBI-SPL-002:** the Keeper's Active Scene page shows Keeper notes, Handouts, and Non-Player Entities (section 12).
- **Deferred:** an "Active Scene" Campaign tab. The overview card and the Scene page link are the only entries for now.
- **Research gap:** whether Keepers want the start page to remember the last present selection across Scenes when no Scene is Active. Today every Approved Investigator is pre-checked.
- **Research gap:** whether Players want a notification beyond the polite announcement when their Investigator joins a Scene.
- **Research gap (PBI-SPL-002):** whether Keepers want a "reveal to everyone" shortcut, as Option B offered.
- **Research gap (PBI-SPL-002):** whether Players want Clues expanded by default.

## 11. Reveals and Clues: entry points

- **Player:**
  - The link "{name}'s Clues" under "Revealed to {name}" on the Active Scene page.
  - The same link on the read-only Sheet step once their Investigator is Approved.
- **Keeper:**
  - In "Investigators present", each name is followed by the link "Clues", with the accessible name "{name}'s Clues".
  - The Investigator review page of an Approved Investigator has the link "Clues".
- The Clues pages keep the Campaign header with Overview as the current tab.
- Items are not revealed in this PBI (PBI-SPL-003). (Superseded by section 22.)
- **Since PBI-NAV-002** both "Clues" entry points on the Active Scene open the `clues` side panel ([navigation ux](../navigation/ux.md) section 3); the other entry points still navigate.

## 12. Keeper view additions (`active-scene-keeper-view`)

> **Superseded by section 21 (PBI-SPL-006).** Kept as the record of PBI-SPL-002; the data, empty, and Revealed rules below are reused by section 21 where it says so.
>
> **Since PBI-SPL-005** the Handout and Non-Player Entity items below are material entries ([scenario-preparation ux](../scenario-preparation/ux.md) section 72): the title opens a side panel, "Show content" and the inline description and profile link are gone, and "Revealed to {names}" sits in the status slot.

```
(header, Finish Scene, and Investigators present as section 3; each name followed by a "Clues" link)
Keeper notes                          (h2)  [Show Keeper notes]
Handouts                              (h2)
Player-facing Handouts reach only the Investigators you choose. Keeper-facing Handouts are never revealed.
1. The front door                     (h3)
   Read-aloud . Player-facing         (badges)
   Revealed to Harvey Walters         (muted, only once revealed)
   [Show content]  [Reveal...]
2. Corbitt's true nature              (h3)
   Text . Keeper-facing
   [Show content]
Non-Player Entities                   (h2)
Only the Player-facing name and description reach Players, and only when you reveal them.
- A shape in the cellar               (h3)
  Mythos Creature: Ghoul              (muted; profile link)
  <description, or "No Player-facing description yet.">
  Revealed to Harvey Walters and Lucy Ward
  [Reveal...]
Revealed in this Scene                (h2)
1. The front door                     (h3)
   Read-aloud . 19:52 . to Harvey Walters
   [Show what was revealed]
```

- **Order:** Investigators present, Keeper notes, Handouts, Non-Player Entities, then Revealed in this Scene. Each is a `section` labelled by its `h2`.
- **Keeper notes:**
  - A `Collapsible` that starts closed.
  - Its trigger button reads "Show Keeper notes" or "Hide Keeper notes" and has `aria-expanded`.
  - The content is `rich-text-view` with `headingOffset` 1. With no notes: "No Keeper notes."
- **Data:**
  - Keeper notes, Handouts, and Non-Player Entities come from the existing Keeper Scene read (`useScene`), using the response's `scenarioId` and `sceneId`.
  - While that read loads, these three sections show a Skeleton (`aria-busy`).
  - If it fails, they show "We couldn't load this Scene's material." with "Try again". The rest of the page is unaffected.
- **Handouts:**
  - An `ol` in stored order, with `handout-badges`.
  - "Show content" and "Hide content" (accessible name "Show content of {title}", `aria-expanded`) load the Handout with `useHandout` on first open and render `handout-content`, with headings below the `h3`.
  - "Reveal..." (outline, accessible name "Reveal {title}") appears on Player-facing Handouts only. A Keeper-facing Handout has no Reveal control.
  - Empty: "No Handouts in this Scene."
- **Non-Player Entities:**
  - A `ul` in link order, laid out as [scenario-preparation ux](../scenario-preparation/ux.md) section 32, without Edit or Unlink.
  - Each has "Reveal..." with the accessible name "Reveal {Player-facing name}".
  - Empty: "No Non-Player Entities in this Scene."
- **"Revealed to {names}":**
  - The union of the recipients of this Scene's Reveals of that subject, in roster order.
  - Absent until the first Reveal.
- **Revealed in this Scene:**
  - An `ol` of this Scene's Reveals as revealed, newest first.
  - Each entry's meta line is "{kind label or 'Non-Player Entity'} . {time} . to {names}".
  - "Show what was revealed" and "Hide what was revealed" (the accessible name includes the title) render `revealed-content` from the snapshot.
  - Empty: "Nothing has been revealed in this Scene yet."
- **Live:** `sceneReveals` and `activeScene` refetch silently. There are no Keeper announcements (section 3).

## 13. Reveal dialog (`reveal-dialog`, `Dialog`)

```
Reveal The front door                 (dialog title)
Read-aloud . Player-facing
Reveal to                             (fieldset legend)
Players see it as it is now. A Reveal can't be undone.   (hint)
 [x] Harvey Walters
 [ ] Lucy Ward  (already revealed)
[Reveal]  Cancel
```

- **Choices:**
  - The dialog reuses `investigators-present-fieldset` over the Investigators present, in roster order.
  - Every present Investigator who has not yet received this subject in this Scene is pre-checked.
  - "(already revealed)" is muted text inside the label. When everyone has received it, nothing is checked.
- **Validation:** with nothing checked, "Choose at least one Investigator." shows under the legend, the fieldset gets `aria-invalid`, and focus moves to the first checkbox.
- **Request:** the client always sends explicit `investigatorIds`.
- **Busy:** the button reads "Revealing...", both buttons are disabled, and Escape and the overlay do not close the dialog.
- **Success:**
  - The dialog closes.
  - The page's `role=status` paragraph says "{title} revealed to {names}.".
  - Focus returns to that item's "Reveal...".
  - The Active Scene is refetched. If the Scene was finished meanwhile, the page shows section 4.3 and keeps the status message, and focus moves to the `h1` because the trigger is gone. The Reveal was made.
- **Refusals** (`role=alert` inside the dialog):
  - **409:** "This Scene has been finished, so nothing more can be revealed." Closing the dialog shows the refetched no-Active-Scene state, with focus on the `h1`.
  - **409 (race):** "{title} wasn't revealed: the Scene or the Item changed meanwhile." The Scene is refetched and the dialog stays open.
  - **400 at `subject`:** "This can't be revealed any more. It may have been changed or removed." The Scene is refetched.
  - **400 at `investigatorIds`:** "One of these Investigators is no longer present. Check the list and try again." The Active Scene is refetched, and the list updates and keeps choices by id.
  - **Any other failure:** "We couldn't reveal {title}. Try again."
- **Cancel:** returns focus to "Reveal...".

## 14. Player view: revealed content (`revealed-to-section`, `revealed-content`)

```
Revealed to Harvey Walters            (h2)
Harvey Walters's Clues                (link)
+ article -------------------------------------------+
| Corbitt House cellar                (h3)           |
| Map . Revealed 19:58                (muted, time)  |
| <image, full width of the main content, no cap>    |
| corbitt-house-cellar.png, 1.2 MB  [Open full size] [Download]
+----------------------------------------------------+
+ article: The front door (h3) / Read-aloud . Revealed 19:52 / [read-aloud panel] +
```

- **List:** the Reveals that reached the Player's Investigator in this Active Scene, newest first. Each is an `article` labelled by its `h3`.
- **`revealed-content` by kind:**
  - **Read-aloud:** the `read-aloud-text` panel, without its own heading. The meta line names "Read-aloud".
  - **Text:** `rich-text-view` with `headingOffset` 1.
  - **Image:** as [scenario-preparation ux](../scenario-preparation/ux.md) section 52, capped at 70vh.
  - **Map:** the figure breaks out of the `max-w-2xl` reading column to the full width of the main content, with no height cap. This is how a Map is "shown prominently".
  - **Document:** as section 53 of that document.
  - **Non-Player Entity:** the Player-facing description (`headingOffset` 1), or nothing when it has none.
- **Images:** `alt` is the image description, or the title when there is none.
- **Files:** each Reveal's file is fetched from `reveals/{revealId}/file`. Loading and failure behave as in sections 52 and 53 of that document.
- **Empty:** the section 4.1 sentence.
- **Live:**
  - `myClues` refetches the page.
  - A refetch after the first load that finds new Reveal ids announces them in the page's polite live region: "New for {name}: {title}." for one, or "{n} new for {name}." for several.
  - Focus does not move.
  - Nothing is announced on the first load, or on a catch-up refetch with no change.
- **Removed Investigator:** a Player whose Investigator was removed from the Investigators present sees section 4.2. Their Clues stay on the Clues page.

## 15. Clues page (`clues-page`)

```
< Back to your Campaign   |  < Back to Harvey Walters (Keeper)
Harvey Walters's Clues                (h1)
Everything Harvey Walters received from the Keeper, newest first.   (muted)
The Corbitt House                     (h2, Scene title)
  The front door                      (h3)
  Read-aloud . Revealed 28 Oct 2026, 19:52
  [Show]                              (accessible name "Show The front door")
```

- **Grouping:** Clues are grouped by Scene. Groups are ordered by their newest Clue, and Clues within a group are newest first.
- **Each Clue:** a `Collapsible` that starts closed and shows `revealed-content`. A file loads on first open. The trigger reads "Show" or "Hide".
- **Empty:** "{name} hasn't received any Clues yet."
- **Back link (since PBI-NAV-002):** with `?from=active-scene` the back link is "Back to {Active Scene title}"; otherwise it is the one shown above ([navigation ux](../navigation/ux.md) section 4).
- **No Approved Investigator (Player, 404):** the `h1` "No Clues to show", "You don't have an Approved Investigator in this Campaign yet.", and "Back to your Campaign".
- **Not found:**
  - The Keeper opening an unknown or unapproved Investigator sees `investigator-not-found`.
  - A Player opening the Keeper route sees `investigator-not-found`, with no API call.
- **Loading:** a Skeleton with `aria-busy="true"`.
- **Error:** "We couldn't load the Clues." with "Try again".
- **Live:**
  - The Player's page refetches on `myClues` and announces as in section 14.
  - The Keeper's page refetches silently on `sceneReveals`.

## 16. Image description

Specified in [scenario-preparation ux](../scenario-preparation/ux.md) section 71.

## 17. Reveals and Clues content

| Key | Copy |
|---|---|
| Keeper sections | Keeper notes / Show Keeper notes / Hide Keeper notes / No Keeper notes. / Handouts / Player-facing Handouts reach only the Investigators you choose. Keeper-facing Handouts are never revealed. / No Handouts in this Scene. / Non-Player Entities / Only the Player-facing name and description reach Players, and only when you reveal them. / No Non-Player Entities in this Scene. / Revealed in this Scene / Nothing has been revealed in this Scene yet. / We couldn't load this Scene's material. |
| Item actions | Show content / Hide content / Reveal... / Revealed to {names} / Show what was revealed / Hide what was revealed / Clues |
| Dialog | Reveal {title} / Reveal to / Players see it as it is now. A Reveal can't be undone. / (already revealed) / Reveal / Revealing... / Cancel / Choose at least one Investigator. |
| Refusals | This Scene has been finished, so nothing more can be revealed. / This can't be revealed any more. It may have been changed or removed. / One of these Investigators is no longer present. Check the list and try again. / We couldn't reveal {title}. Try again. |
| Status | {title} revealed to {names}. |
| Player | {name}'s Clues / Revealed {time} / Non-Player Entity |
| Announcements | New for {name}: {title}. / {n} new for {name}. |
| Clues page | {name}'s Clues / Everything {name} received from the Keeper, newest first. / Show / Hide / {name} hasn't received any Clues yet. / No Clues to show / You don't have an Approved Investigator in this Campaign yet. / We couldn't load the Clues. / Back to {name} / Back to your Campaign |

Names are joined as "A", "A and B", or "A, B, and C". An unnamed Investigator is "Unnamed Investigator".

## 18. Reveals and Clues component mapping

| Element | Component |
|---|---|
| Keeper material | New `scene-material-section` (Handouts and Non-Player Entities), `keeper-notes-section`, `revealed-in-scene-section` |
| Dialog | New `reveal-dialog` (`Dialog`; `investigators-present-fieldset` gains an optional per-row note) |
| Revealed content | New `revealed-content`, composing `read-aloud-text` (moved to `frontend/src/shared/components/`), `RichTextView`, and `HandoutImage` and `HandoutDocument`, which now take a file query and an `alt` |
| Player | New `revealed-to-section`, inside `active-scene-player-view` |
| Clues | New `clues-page`; routes `campaigns.$campaignId.investigator.clues.tsx` and `campaigns.$campaignId.investigators.$investigatorId.clues.tsx` |
| Hooks and services | `useRevealFile`, `useClues`, `useMyClues`, `useRevealAnnouncement`, `revealApi.ts`, `cluesApi.ts` (strict zod schemas) |
| Live | `myClues` and `sceneReveals` added to `campaign-play/services/liveTopics.ts` |

Stories cover:
- **`scene-material-section`:** empty, mixed visibilities, revealed, load error, and 320px.
- **`reveal-dialog`:** default, already revealed, the none-checked error, busy, and each refusal.
- **`revealed-content`:** every kind, a Map, an image with and without a description, and a load failure.
- **`revealed-to-section`:** empty and several Reveals.
- **`clues-page`:** Player, Keeper, empty, 404, loading, and error.

## 19. Reveals and Clues UX acceptance criteria

- **SPL-UX-20** The Keeper's Active Scene page lists the Scene's Handouts in stored order with their kind and visibility, and its Non-Player Entities. Only Player-facing Handouts and Non-Player Entities offer "Reveal...". (Amended by PBI-SPL-006: "To reveal" lists Player-facing Handouts in stored order with their kind and visibility, then Non-Player Entity links in link order, each until it has reached every Investigator present; "Keeper reference" lists Keeper-facing Handouts and every Non-Player Entity with no "Reveal...". Only "To reveal" and the `handout` and `entity` panel footers offer "Reveal...".)
- **SPL-UX-21** "Reveal..." opens "Reveal {title}" with every present Investigator who hasn't received it checked. Those who have show "(already revealed)". (Amended by PBI-SPL-006: "Reveal..." lives on "To reveal" entries and in the `handout` and `entity` panel footers; the dialog is unchanged.)
- **SPL-UX-22** Confirming shows "{title} revealed to {names}.", adds "Revealed to {names}" to the item and an entry to "Revealed in this Scene", and returns focus to "Reveal...". If the Scene was finished meanwhile, the page shows "No Active Scene" with that status message. (Amended by PBI-SPL-006: the item keeps the status line "Revealed to {names} . not yet: {names}" on "To reveal" until everyone present has received it; reaching the last Investigator present moves it to the "Revealed" sub-tab and adds " Moved to Revealed." to the status; focus follows section 21.7.)
- **SPL-UX-23** Confirming with nothing checked shows "Choose at least one Investigator." and reveals nothing. "Cancel" reveals nothing. (Amended by PBI-SPL-006: "Cancel" returns focus to the "Reveal..." trigger.)
- **SPL-UX-24** Each refusal shows its section 17 message. A Scene finished meanwhile leads to "No Active Scene".
- **SPL-UX-25** "Show Keeper notes" shows the notes. "Show content" shows a Handout's current content. (Amended by PBI-SPL-005: "Show content" is removed; a Handout's title opens its current content in the `handout` side panel, and a Non-Player Entity's title opens its description and profile in the `entity` side panel. Amended by PBI-SPL-006: Keeper notes sit on Run and start open with "Hide Keeper notes"; titles open the same panels from "To reveal" and "Keeper reference".)
- **SPL-UX-26** A Player whose Investigator received a Reveal sees it under "Revealed to {name}", newest first, with its title, kind, and time.
- **SPL-UX-27** Revealed content renders by kind:
  - Read-aloud shows in the read-aloud panel.
  - A Map spans the full content width with no height cap.
  - An Image is capped, with `alt` equal to its image description, or its title when there is none.
  - A Document offers "Open" and "Download".
  - A Non-Player Entity shows only its Player-facing name and description.
- **SPL-UX-28** A connected targeted Player sees a new Reveal without reloading and hears "New for {name}: {title}.". An untargeted Player's page does not change, and that Player receives no `myClues` signal.
- **SPL-UX-29** An Investigator added later does not see earlier Reveals. A removed Investigator's Player sees section 4.2 and keeps the Clues.
- **SPL-UX-30** After the Keeper edits or replaces a revealed Handout, the Player still sees the text or image as revealed, both on the Active Scene page and among the Clues.
- **SPL-UX-31** "{name}'s Clues" lists every Clue grouped by Scene, newest first. "Show" shows its content.
- **SPL-UX-32** A Player without an Approved Investigator sees "You don't have an Approved Investigator in this Campaign yet." on the Clues page.
- **SPL-UX-33** The Keeper reaches any Approved Investigator's Clues from "Investigators present" and from the review page. (Amended by PBI-SPL-006: "{name}'s Clues" on Run opens the `clues` side panel, whose "Open full page" leads to the Clues page with `?from=active-scene`.)
- **SPL-UX-34** A Player opening a Keeper Clues URL sees `investigator-not-found`.
- **SPL-UX-35** A Player sees no "Reveal...", no Keeper notes, and no Keeper-facing material.
- **SPL-UX-36** While a Reveal is in flight, its button reads "Revealing..." and is disabled, and a second activation does nothing.
- **SPL-UX-37** The Clues pages keep the Campaign header with Overview as the current tab.

## 20. Reveals and Clues accessibility acceptance criteria (WCAG 2.2 AA)

- **SPL-A11Y-8** Sections are `section` elements labelled by their `h2`, items and Reveals have `h3` headings, and revealed rich text starts at `h4`. Each page has exactly one `h1` (1.3.1, 2.4.6).
- **SPL-A11Y-9** The dialog has an accessible name, and focus starts on the first checkbox. The fieldset has a `legend`, and the hint and error are connected with `aria-describedby`. Focus returns to the trigger when the dialog closes, or moves to the `h1` when the trigger is gone (1.3.1, 2.4.3, 3.3.1, 4.1.2).
- **SPL-A11Y-10** Every image has `alt`: its image description, or its title when there is none. Kind, visibility, and "Read-aloud" are text, never color alone (1.1.1, 1.4.1).
- **SPL-A11Y-11** Disclosure buttons expose `aria-expanded`, and their accessible names include the title (2.4.6, 4.1.2).
- **SPL-A11Y-12** The reveal status uses `role=status` and refusals use `role=alert`. Live arrivals are announced politely, never on first load (4.1.3).
- **SPL-A11Y-13** Every control is reachable and operable by keyboard, has a visible focus ring, and is at least 24 by 24 CSS px (2.1.1, 2.4.7, 2.5.8).
- **SPL-A11Y-14** At 320px and 200% zoom, the material list, the dialog, a Map, and the Clues pages fit without horizontal scrolling (1.4.10).

## 21. Active Scene redesign (PBI-SPL-006, PBI-SPL-007)

Selected direction, chosen 2026-11-04 from three clickable prototypes ([navigation prototype](../navigation/prototype/active-scene.html)): **variant A, Scene sub-tabs.** The prototype is illustrative; this section is normative. Navigation pieces (the Active Scene tab, side panels, back links) are in [navigation ux](../navigation/ux.md).

Alternatives considered:
- **B, a material drawer over the Run view:** rejected at the gate; the Keeper preferred material as destinations of their own.
- **C, one "Scene material" page with collapsible sections:** rejected; every reveal trip is a full page change and back.

Human decisions (2026-11-04):
- The main view (Run) shows no Handouts, Non-Player Entities, or Items. Material is grouped by what the Keeper wants to do with it, not by type: "To reveal", "Keeper reference", "Revealed".
- Material leaves "To reveal" once it has reached **every** Investigator present; partly revealed material stays and says who is still missing.
- Keeper notes stay on Run and start open (this replaces the PBI-SPL-002 decision that they start collapsed).
- The Wall (latest entries and a way to post) sits on Run above Investigators present, for the Keeper and for Players.
- Handouts, Non-Player Entities, and Items use one material entry on the Scene page and the Active Scene ([scenario-preparation ux](../scenario-preparation/ux.md) section 72).
- Run reserves room for future play tools (rolls, combat, a timer); nothing is rendered for them until the first one lands.

This section replaces, for the Keeper, the layout of section 3 (header and order) and all of section 12. The Investigators present and Finish behavior of section 3, and sections 13, 14, 15, 17, and 18, stay in force unless stated below.

### 21.1 Routes and sub-navigation

```
/campaigns/$campaignId/active-scene              Run (Keeper and Players)
/campaigns/$campaignId/active-scene/to-reveal    To reveal         (Keeper)
/campaigns/$campaignId/active-scene/reference    Keeper reference  (Keeper)
/campaigns/$campaignId/active-scene/revealed     Revealed          (Keeper)
```

- **Sub-navigation (`active-scene-nav`):** under the scene header, a `nav` labelled "Active Scene" with four links: "Run", "To reveal {n}", "Keeper reference {n}", "Revealed {n}". Each count is a `Badge` with tabular numbers; the link's accessible name is "To reveal, {n}". The current link has `aria-current="page"`. Styled as a segmented control (muted track, the current link raised), at least 44px high, scrolling inside itself below 640px.
- **Counts:** the number of entries the sub-tab lists (21.4 to 21.6). They update with the lists.
- **Players** get no sub-navigation. A Player opening a Keeper sub-route is redirected (replace) to `/active-scene`.
- **No Active Scene:** every sub-route redirects (replace) to `/active-scene`, which shows section 4.3. A Scene finished while the Keeper is on a sub-tab does the same, with the status of section 3.

### 21.2 Scene header

```
Run:                                                   Other sub-tabs (compact):
The Corbitt House started.          (role=status)      The Corbitt House            [Finish Scene]
The Corbitt House                   [Finish Scene]     (>) Active  Started 19:40
(>) Active  Started 28 Oct 2026, 19:40
Scenario: The Haunting . Open in Scenario . Location Arkham, Boston Road
[ Run | To reveal 4 | Keeper reference 5 | Revealed 2 ]
```

- The `role=status` paragraph, the `h1`, `scene-status-badge`, and `scene-times` are as section 3.
- "Finish Scene" moves to the right of the `h1` (it wraps under it below 640px) and is on every sub-tab. Its dialog and outcomes are section 3's.
- On Run only: "Scenario: {title}" with "Open in Scenario", and "Location" when set, on one wrapping meta line.

### 21.3 Run

```
>= 1024px                                                   < 1024px (one column)
+--------------------------------------+------------------+  Keeper notes
| Keeper notes            [Hide]  (h2) | Wall        (h2) |  Investigators present
| <rich text>                          | [New Wall Entry] |  Wall
|                                      | 5 latest entries |
|                                      +------------------+
| (future play tools go here)          | Investigators    |
|                                      | present (h2)     |
|                                      | Harvey  [Clues]  |
+--------------------------------------+------------------+
```

- **Grid:** `lg:grid-cols-[minmax(0,1fr)_20rem]` with `grid-template-areas`. DOM order is Keeper notes, Investigators present, Wall; from 1024px the right column shows Wall above Investigators present. The regions are independent, so the visual reordering does not change meaning (1.3.2).
- **Regions:** each is a `section` labelled by its `h2`, drawn as a bordered card.
- **Keeper notes:** a `Collapsible` that starts **open**; the trigger reads "Hide Keeper notes" or "Show Keeper notes". Content and empty text as section 12.
- **Investigators present:** section 3, except that each name is followed by the button "Clues" (accessible name "{name}'s Clues"), which opens the `clues` side panel instead of navigating.
- **Wall (PBI-SPL-007):** see 21.8.
- **Future play tools** take the left column under Keeper notes. Nothing is rendered there now.

### 21.4 To reveal

```
To reveal                                     (h2)
Player-facing material that hasn't reached every Investigator present.
Handouts                                      (h3)
  The front door                (button)              [Reveal...]
  Read-aloud . Player-facing
  Revealed to Harvey Walters . not yet: Lucy Ward and Cy Holloway
Non-Player Entities                           (h3)
  The landlord                  (button)              [Reveal...]
  Human NPC: Mr. Knott
Items                                         (h3, from PBI-SPL-003; section 22.1)
```

- **What is listed:** Player-facing Handouts (stored order), Non-Player Entity links (link order), and from PBI-SPL-003 Items, each while the union of its Reveals' recipients does not include every Investigator present. The rule lives in one pure function, `isRevealedToEveryonePresent(subjectId, reveals, investigatorsPresent)`.
- Adding an Investigator present brings back every subject they haven't received; removing one can complete a subject.
- **Entries:** the material entry (scenario-preparation ux section 72) in play context: the title opens the `handout` or `entity` side panel; the action is "Reveal..." (accessible name "Reveal {title}"); the status line "Revealed to {names} . not yet: {names}" shows once anyone has received it.
- **Type groups:** an `h3` per type that has entries; types without entries are omitted.
- **Empty:** "Everything Player-facing has reached every Investigator present."

### 21.5 Keeper reference

- **What is listed:** Keeper-facing Handouts (stored order), then every Non-Player Entity link (link order), whatever has been revealed. From PBI-SPL-003, Items add their Keeper-facing material here, with "Give..." and "Take back" (section 22.2).
- **Entries:** the material entry in play context with no action, except Items (section 22.2); the title opens the `handout`, `entity`, or `item` side panel.
- **Hint:** "Only you see these: Keeper-facing Handouts and the profiles behind Non-Player Entities." (From PBI-SPL-003, section 22.2: "Only you see these: Keeper-facing Handouts, the profiles behind Non-Player Entities, and Items' Keeper notes.")
- **Empty:** "Nothing Keeper-only in this Scene."

### 21.6 Revealed

- Section 12's "Revealed in this Scene" list, newest first, with the `h2` "Revealed" and the hint "Every fully revealed subject's Reveals, newest first.".
- "Show what was revealed" (accessible name "Show what was revealed: {title}") opens the `reveal` side panel instead of expanding inline.
- **Empty:** "Nothing has been revealed in this Scene yet."

### 21.7 Revealing from the sub-tabs and the panel

- "Reveal..." opens the section 13 dialog, unchanged.
- The `handout` and `entity` panels opened from the Active Scene add "Reveal..." to their footer for a revealable subject; revealing keeps the panel open and updates its status line.
- **Success:** the status says "{title} revealed to {names}.". When the subject has now reached everyone present, it leaves "To reveal" and the status adds " Moved to Revealed.".
- **Focus after success:** back to the trigger when it still exists; otherwise the next entry's title in the list, then the previous one, then the sub-tab `h2`.
- Refusals and a Scene finished meanwhile behave as section 13.

### 21.8 Wall on the Active Scene (`active-scene-wall`, PBI-SPL-007)

```
Wall                                          (h2)
[ New Wall Entry                            ]
(o) Public  ( ) Keeper only
0 / 2000                              [Add to the Wall]
19:14  Keeper     The front door slams shut behind Harvey.
19:10  Keeper  [Keeper only]  Corbitt has noticed Cy.
...  (5 latest)
Open the Wall
```

- **Entries:** the `wall-preview` of [campaign-wall ux](../campaign-wall/ux.md) section 7 (5 latest the viewer may read, clamped to 3 lines, live, announced as there), with "Open the Wall" after the entries (WallPreview's placement, not the heading row).
- **Compose:** the Wall page's compose form (campaign-wall ux section 4.2), reused through WallPreview's composer slot between the heading and the entries, with a 2-row Textarea. The Keeper gets the "Who can read this?" group; Players get "Everyone in this Campaign can read this.". Success puts the entry at the top of the list and shows "Wall Entry added." in the page's `role=status` paragraph.
- No "Remove" and no "Show older entries" here; both stay on the Wall page.
- Entries are the Campaign's, not this Scene's; there is no link between a Wall Entry and a Scene.
- **Players:** from 1024px the Player view (section 4.1) becomes two columns with this region on the right; below, it comes last. A Player whose Investigator is not present (section 4.2) sees the region too: it shows only Campaign Wall Entries, never Scene details.

### 21.9 Player view changes

- The link "{name}'s Clues" (section 14) opens the `clues` side panel. "Open full page" leads to the Clues page with `?from=active-scene`.
- Everything else in sections 4 and 14 is unchanged, except the Wall region of 21.8.

### 21.10 States and live updates

- The sub-tab lists load from the Keeper Scene read with section 12's Skeleton and "We couldn't load this Scene's material." states; the header, sub-navigation (without counts while loading), and Run are unaffected.
- `activeScene`, `sceneReveals`, and `scenes` refetch silently and update lists and counts in place. Nothing is announced to the Keeper (section 3).

### 21.11 Content

| Element | Copy |
|---|---|
| Sub-navigation | "Run", "To reveal", "Keeper reference", "Revealed" |
| To reveal hint | "Player-facing material that hasn't reached every Investigator present." |
| Status line | "Revealed to {names} . not yet: {names}" |
| To reveal empty | "Everything Player-facing has reached every Investigator present." |
| Reference hint | "Only you see these: Keeper-facing Handouts and the profiles behind Non-Player Entities." |
| Reference empty | "Nothing Keeper-only in this Scene." |
| Revealed hint | "Every fully revealed subject's Reveals, newest first." |
| Reveal status suffix | " Moved to Revealed." |

### 21.12 UX acceptance criteria

- **SPL-UX-40** Run shows the scene header, Keeper notes (open), Investigators present, and the Wall, and no Handout, Non-Player Entity, or Item.
- **SPL-UX-41** The sub-navigation shows Run, To reveal, Keeper reference, and Revealed with counts; each has its own URL, and browser back and refresh keep the sub-tab.
- **SPL-UX-42** To reveal lists Player-facing material until it has reached every Investigator present; partly revealed entries show "Revealed to {names} . not yet: {names}".
- **SPL-UX-43** Revealing a subject to the last Investigator present moves it from To reveal to Revealed, updates both counts, and says "Moved to Revealed.".
- **SPL-UX-44** Adding an Investigator present returns every subject they haven't received to To reveal.
- **SPL-UX-45** Keeper reference lists Keeper-facing Handouts and every Non-Player Entity, and offers no "Reveal...". (Amended by PBI-SPL-003: it also lists every linked Item and the Item's Keeper-facing Handouts, and offers "Give..." and "Take back" on Items, never "Reveal...".)
- **SPL-UX-46** Titles, "Clues", and "Show what was revealed" open side panels ([navigation ux](../navigation/ux.md) section 3); the page beneath keeps its state.
- **SPL-UX-47** "Finish Scene" is available on every sub-tab; Location and "Open in Scenario" show on Run only.
- **SPL-UX-48** A Player sees no sub-navigation, and a Player opening a Keeper sub-route lands on `/active-scene`.
- **SPL-UX-49** The Keeper and Players can post to the Wall from Run and see the 5 latest entries they may read, live; a Player never sees a Keeper only entry or the visibility choice.
- **SPL-UX-50** Below 1024px Run is one column in the order Keeper notes, Investigators present, Wall.

### 21.13 Accessibility acceptance criteria (WCAG 2.2 AA)

- **SPL-A11Y-15** The sub-navigation is a `nav` labelled "Active Scene" with `aria-current="page"`; counts are part of each link's accessible name (1.3.1, 4.1.2).
- **SPL-A11Y-16** Each sub-tab has the page `h1` and one `h2`; type groups are `h3` (1.3.1, 2.4.6).
- **SPL-A11Y-17** Focus after a Reveal follows 21.7 and never lands on `body` (2.4.3).
- **SPL-A11Y-18** At 320px and 200% zoom, the sub-navigation scrolls inside itself and Run is one column; the page body never scrolls sideways (1.4.10).

## 22. Items in play (PBI-SPL-003)

Selected at the PBI-SPL-003 UX gate (2026-11-06): **Keeper option A, Give and Take back on the material entry**, with **Player option P1, Items on the Clues page and panel and on the Player's Active Scene**. There was no prototype. Design record: [docs/scene-play/issues/03-give-and-take-back-items.design.md](../../docs/scene-play/issues/03-give-and-take-back-items.design.md).

Alternatives considered:
- **B, holder actions only in the `item` panel:** rejected. It adds a step for every give at the table, and it breaks the one-footer-action rule ([navigation ux](../navigation/ux.md) section 3).
- **C, giving from the Investigator's side (the `clues` panel with an Item picker):** rejected. The give happens away from the material it concerns.
- **P2, a separate Items page and `items` panel:** rejected. It adds a route, a panel type, and an entry point.

Rules (spec Constraints):
- **Giving** needs an Active Scene that links the Item and the Investigator present. It reveals the Item's name and Player-facing description to the new holder.
- **Taking back** needs neither an Active Scene nor anyone present.
- **A held Item given to someone else** moves; the former holder keeps the Clue.
- **Revealing:** an Item's Player-facing Handouts are revealed on their own, like Scene Handouts.

### 22.1 To reveal: Items

```
Items                                         (h3)
  Walter Corbitt's diary        (button)      [Reveal...] [Give...]
  Item
  Revealed to Harvey Walters . not yet: Lucy Ward . Held by Harvey Walters
  The last entry                (button)      [Reveal...]
  Text . Player-facing . Item: Walter Corbitt's diary
```

- **What is listed:** the Items the Scene links, in link order. Each Item is followed by its Player-facing Handouts in stored order. Every entry stays listed until it has reached every Investigator present (`isRevealedToEveryonePresent`, section 21.4). A give's Reveal counts as a Reveal to the holder.
- **Item entry:** the material entry ([scenario-preparation ux](../scenario-preparation/ux.md) section 72), with:
  - **Title:** opens the `item` side panel (22.5).
  - **Second line:** the badge "Item".
  - **Status slot:** the reveal status line of section 21.4, then "Held by {name}" while someone holds it, joined by " . ".
  - **Actions:** "Reveal..." (accessible name "Reveal {name}"), which opens the section 13 dialog unchanged, and "Give..." (accessible name "Give {name}").
- **Item Handout entry:**
  - **Second line:** `handout-badges`, then the muted text "Item: {name}".
  - **Title:** opens the `handout` panel.
  - **Action:** "Reveal..." (section 13).
- **Below 640px:** the two actions wrap under the text.

### 22.2 Keeper reference: Items

- **What is listed:** after the Keeper-facing Handouts and the Non-Player Entity links, the `h3` "Items" lists every Item the Scene links, in link order, whatever has been revealed. Each Item is followed by its Keeper-facing Handouts, which show "Item: {name}" and have no action.
- **Item entry:**
  - **Status slot:** "Held by {name}" or "Held by no one".
  - **Actions:** "Give..." (accessible name "Give {name}"), and "Take back" (accessible name "Take back {name}") while someone holds it.
  - There is never "Reveal..." (SPL-UX-45).
- **Hint:** "Only you see these: Keeper-facing Handouts, the profiles behind Non-Player Entities, and Items' Keeper notes."
- **Count:** the sub-navigation count includes these entries.

### 22.3 Give dialog (`give-item-dialog`, `Dialog`)

```
Give Walter Corbitt's diary           (dialog title)
Item
Give to                               (fieldset legend)
Walter Corbitt's diary becomes theirs, and they receive it as a Clue. Taking it back later doesn't remove the Clue.   (hint)
 ( ) Harvey Walters  (holds it)       (disabled)
 ( ) Lucy Ward
[Give]  Cancel
```

- **Choices:** radios over the Investigators present, in roster order. Nothing is chosen at first. The current holder shows "(holds it)" as muted text inside the label and is disabled.
- **Held by someone else:** when someone holds the Item, the hint adds " {holder} holds it now and keeps the Clue.".
- **Validation:** with nothing chosen, "Choose an Investigator." shows under the legend, the fieldset gets `aria-invalid`, and focus moves to the first enabled radio.
- **Busy:** the button reads "Giving...", both buttons are disabled, and Escape and the overlay do not close the dialog.
- **Success:**
  - The dialog closes.
  - The page's `role=status` paragraph says "{name} given to {investigator}.". When the Item has now reached every Investigator present, it adds " Moved to Revealed.".
  - The Active Scene and the Scene are refetched.
  - Focus follows section 21.7.
- **Refusals** (`role=alert` inside the dialog):
  - **409:** "{name} wasn't given: the Scene or the Item changed meanwhile." The page is refetched; a finished Scene leads to section 4.3, with focus on the `h1`.
  - **400 at `itemId`:** "{name} is no longer part of this Scene." The Scene is refetched.
  - **400 at `investigatorId`:** "That Investigator is no longer present or already holds {name}. Check the list and try again." The list is refetched and keeps the choice by id.
  - **404:** "We couldn't find {name}. It may have been deleted."
  - **Any other failure:** "We couldn't give {name}. Try again."
- **Cancel:** returns focus to "Give...".

### 22.4 Take back (`take-back-item-dialog`, `AlertDialog`)

- **Dialog:**
  - title "Take {name} back from {holder}?";
  - description "{holder} keeps it among their Clues.";
  - buttons "Cancel" and "Take back" ("Taking back..." while busy, both disabled).
- **Offered:** on Keeper reference (22.2), on the Keeper's Clues page, and in the `clues` panel (22.7). It works with no Active Scene.
- **Success:**
  - The status is "{name} taken back from {holder}.".
  - Focus moves to that entry's "Give..." on Keeper reference, or to the "Items {name} holds" heading on the Clues page and panel.
- **Failure:** "We couldn't take {name} back. Try again." (`role=alert`). A 404 shows "We couldn't find {name}. It may have been deleted.".
- **Taken back elsewhere:** taking back an Item that no one holds any more succeeds silently, and the refetch shows "Held by no one".
- **Cancel:** returns focus to "Take back".

### 22.5 Item side panel (`item`)

- **Header:** the kind line "Item"; the `h2` is the Item's name.
- **Body:**
  - "What Players see" (`h3`): the Player-facing description, rendered from `h4`.
  - "Held by {name}." or "Held by no one.", in muted text.
  - "Handouts" (`h3`): the Item's Handouts in stored order, as titles with `handout-badges`, text only, or "No Handouts.".
  - "Keeper notes" (`h3`), or "No Keeper notes yet.".
- **Footer:**
  - "Open full page" leads to `/campaigns/$campaignId/items/$itemId?from=active-scene`.
  - On the Active Scene, the context action is "Reveal..." while the Item is listed in To reveal; otherwise there is none.
- **Scene page:** the Scene page hosts the same panel for its linked Items, with no "Reveal..." and with "Open full page" without `from` (scenario-preparation ux section 72).
- **States:** as [navigation ux](../navigation/ux.md) section 3.

### 22.6 Item page

- The muted line reads "Held by {name}." or "Held by no one." ([scenario-preparation ux](../scenario-preparation/ux.md) section 63.1). The name comes from the Approved Investigators; an unknown name is "Unnamed Investigator".
- With `?from=active-scene`, the back link is "Back to {Active Scene title}"; otherwise it is "Back to Items".

### 22.7 The Investigator's Items (`held-items-section`)

```
Items Harvey Walters holds            (h2; h3 in the panel)
  Walter Corbitt's diary              (h3; h4 in the panel)
  Given 28 Oct 2026, 19:58            (muted)
  [Show]                              (accessible name "Show Walter Corbitt's diary")
  [Take back]                         (Keeper only)
```

- **Where:**
  - On the Player's Active Scene (section 4.1), after "Revealed to {name}".
  - On the Clues page and in the `clues` panel, before the Scene groups, for both roles.
- **Each Item:**
  - It shows as it was when given (the give Reveal's snapshot), newest first.
  - It is a `Collapsible` that starts closed. "Show" or "Hide" reveals the description through `revealed-content`.
  - On the Active Scene, the time shows as "Given {time}".
- **Keeper variant:** adds "Take back" (22.4) on each Item.
- **Empty:** "{name} doesn't hold any Items."
- **Loading and error:** a Skeleton with `aria-busy="true"`. On failure, "We couldn't load the Items." with "Try again"; the Clues below are unaffected.
- **Live:**
  - **Player:** `myItems` refetches. A refetch after the first load announces, in the page's polite live region:
    - "{name} now holds {item}." for one gain;
    - "{item} was taken back from {name}." for one loss;
    - "{n} Items changed for {name}." for several changes.
  - **Keeper:** refetches silently on `sceneReveals`.
  - **Silence:** nothing is announced on the first load or on an unchanged refetch, and focus does not move.
- **Who sees what:** a Player sees only their own Investigator's Items, with no "Give..." or "Take back".

### 22.8 Item Reveals in revealed content and Clues

- An Item Reveal's meta line names "Item" (for example "Item . Revealed 19:58"), and `revealed-content` renders its description like a Non-Player Entity's (section 14).
- On "Revealed" (section 21.6), an Item Reveal reads "Item . {time} . to {names}".

### 22.9 Content

| Key | Copy |
|---|---|
| Groups and hints | Items / Item: {name} / Only you see these: Keeper-facing Handouts, the profiles behind Non-Player Entities, and Items' Keeper notes. |
| Status | Held by {name} / Held by no one / Held by {name}. / Held by no one. |
| Actions | Give... / Take back / Reveal... |
| Give dialog | Give {name} / Item / Give to / {name} becomes theirs, and they receive it as a Clue. Taking it back later doesn't remove the Clue. / {holder} holds it now and keeps the Clue. / (holds it) / Give / Giving... / Cancel / Choose an Investigator. |
| Give refusals | {name} wasn't given: the Scene or the Item changed meanwhile. / {name} is no longer part of this Scene. / That Investigator is no longer present or already holds {name}. Check the list and try again. / We couldn't find {name}. It may have been deleted. / We couldn't give {name}. Try again. |
| Take back | Take {name} back from {holder}? / {holder} keeps it among their Clues. / Take back / Taking back... / We couldn't take {name} back. Try again. |
| Status messages | {name} given to {investigator}. / {name} taken back from {holder}. / Moved to Revealed. |
| Panel | Item / What Players see / Handouts / No Handouts. / Keeper notes / No Keeper notes yet. / Open full page |
| Investigator's Items | Items {name} holds / Given {time} / Show / Hide / {name} doesn't hold any Items. / We couldn't load the Items. / Try again |
| Announcements | {name} now holds {item}. / {item} was taken back from {name}. / {n} Items changed for {name}. |

### 22.10 Component mapping

| Element | Component |
|---|---|
| Lists | `to-reveal-section` and `keeper-reference-section` gain an Items group; `subTabGrouping.ts` adds `item` and `itemHandout` subjects |
| Dialogs | New `give-item-dialog` (`Dialog`, radio group) and `take-back-item-dialog` (`AlertDialog`) |
| Panel | New `item-panel-body` in `scenario-preparation/components` (ADR 0028), hosted by `scene-play` `item-panel` and `scenario-preparation` `scene-panel`; `handout-panel-body` accepts an Item owner |
| Investigator's Items | New `held-items-section` (Player and Keeper variants), used by `clues-page`, `clues-panel`, and `active-scene-player-view` |
| Services and hooks | `itemHolderApi.ts` (strict zod), `useGiveItem`, `useTakeBackItem`, `useHeldItems`, `useHeldItemsAnnouncement` |
| Live | `myItems` added to `campaign-play/services/liveTopics.ts`; `sceneReveals` also refreshes the Scene and Item reads |

Stories cover:
- **`give-item-dialog`:** default, held by someone else, the none-chosen error, busy, and each refusal.
- **`take-back-item-dialog`:** default, busy, and failure.
- **`item-panel-body`:** held, not held, no Handouts, loading, error, and not found.
- **`held-items-section`:** Player, Keeper, empty, loading, and error.

### 22.11 UX acceptance criteria

- **SPL-UX-51** To reveal lists linked Items and their Player-facing Handouts until each has reached every Investigator present. "Reveal..." on an Item reveals only its name and Player-facing description.
- **SPL-UX-52** "Give..." gives the Item to one Investigator present. The holder's Player sees it under "Items {name} holds" and among the Clues without reloading.
- **SPL-UX-53** Giving a held Item to another Investigator moves it. Both Players' Items update, and the former holder keeps the Clue.
- **SPL-UX-54** "Take back" removes the Item from the Player's Items without reloading. The Clue stays.
- **SPL-UX-55** The Keeper can take an Item back from the Clues page while no Scene is Active.
- **SPL-UX-56** Keeper reference lists every linked Item with its holder and the Item's Keeper-facing Handouts, without "Reveal...".
- **SPL-UX-57** A Player sees no "Give..." or "Take back" and never sees another Investigator's Items.
- **SPL-UX-58** Each refusal shows its 22.3 or 22.4 message, and nothing changes.
- **SPL-UX-59** While a give or take back is in flight, its button reads "Giving..." or "Taking back..." and is disabled, and a second activation does nothing.
- **SPL-UX-60** The `item` panel shows what Players see, the holder, the Handouts, and the Keeper notes. Its "Open full page" leads to the Item page, which shows "Back to {Active Scene title}".

### 22.12 Accessibility acceptance criteria (WCAG 2.2 AA)

- **SPL-A11Y-19** The give dialog has an accessible name. Its radio group has a `legend`, and the hint and error are connected with `aria-describedby`. Focus starts on the first enabled radio and returns as in 22.3 and 21.7 (1.3.1, 2.4.3, 3.3.1, 4.1.2).
- **SPL-A11Y-20** "Held by", "(holds it)", and "Item" are text, never color alone. Give and take-back results use `role=status`, and refusals use `role=alert` (1.4.1, 4.1.3).
- **SPL-A11Y-21** An Item arriving or leaving is announced politely, never on first load, and focus does not move (4.1.3).
- **SPL-A11Y-22** Every new control is keyboard operable with a visible focus ring and is at least 24 by 24 CSS px. At 320px and 200% zoom, the entry actions wrap and the dialogs fit without horizontal scrolling (2.1.1, 2.4.7, 2.5.8, 1.4.10).

## 23. Scene History (PBI-SPL-004)

Selected direction: **Option A (a Campaign tab with one page, every Scene a section, its Reveals closed until "Show")**, chosen 2026-11-07 after comparing clickable prototypes (23.9). Alternatives considered:
- **Option B (a Campaign tab with a Scene index and a page per Scene):** rejected; every re-read costs a second page and a back step, and the per-Scene page adds a not-found state and Previous/Next navigation for a list that is short at Campaign scale.
- **Option C (no tab; an overview card with the latest Scenes and a full page under Overview):** rejected; Scene History is an area of the Campaign, which [navigation ux](../navigation/ux.md) section 5 puts behind a Campaign tab, and the card would be a second presentation of the same list.

Human decisions at the PBI-SPL-004 UX gate (2026-11-07):
- Scenes are listed newest started first. There is no "Jump to the latest Scene" link, because the latest Scene is at the top.
- The Keeper sees each Scene's Investigators present; a Player does not.
- A Scene where nothing reached a Player's Investigator stays listed with "Nothing from this Scene reached {name}.".

Design record: [docs/scene-play/issues/04-scene-history.design.md](../../docs/scene-play/issues/04-scene-history.design.md).

### 23.1 Information architecture

```
/campaigns/$campaignId/scene-history     Scene History (every Campaign Member)
```

- **Campaign tab (amends [navigation ux](../navigation/ux.md) section 2):** "Scene History" is the third tab: Overview, Active Scene, Scene History, Wall, Settings (Settings Keeper only). It is current on `/scene-history`. It has no badge.
- **Entry:** the tab only. The page has no back link, like the Wall page.
- **Exit:** the Campaign tabs; "Open Active Scene" on the Active Scene (23.2).

### 23.2 Page (`scene-history-page`)

```
Scene History                                                    (h1)
Every Scene played in this Campaign, newest first.               (muted; Keeper, Player without an Approved Investigator)
Every Scene played in this Campaign and what reached Harvey Walters, newest first.   (muted; Player)

Return to the Corbitt House                                      (h2)
Scenario: The Haunting . Started 7 Nov 2026, 19:05 . [Active] Open Active Scene
Investigators present: Harvey Walters and Lucy Ward              (Keeper only)
  The cellar door                                                (h3)
  Read-aloud . Revealed 7 Nov 2026, 19:20 . to Harvey Walters    ("to {names}" Keeper only)
  [Show]

The Speakeasy                                                    (h2)
Scenario: Dead Man Stomp . Started 31 Oct 2026, 19:10 . Finished 31 Oct 2026, 21:00
Nothing from this Scene reached Harvey Walters.                  (Player)
```

- **Scenes:** every Active and Finished Scene of every Scenario of the Campaign, newest started first. A Prepared Scene never appears.
- **Each Scene:** a `section` labelled by its `h2` (the Scene title), then a muted meta line:
  - "Scenario: {Scenario title}";
  - "Started {date and time}";
  - "Finished {date and time}", or, for the Active Scene, the "Active" `scene-status-badge` followed by the link "Open Active Scene" to `/campaigns/$campaignId/active-scene`.
  - The separator between parts is the one the existing meta lines use (`reveal-meta-line`, `clues-list`); this section does not settle the PBI-SPL-002 separator follow-up.
- **Investigators present (Keeper only):** "Investigators present: {names}" under the meta line: who was present when the Scene finished, or who is present now for the Active Scene, in roster order. Names are joined as section 17 says; an unnamed Investigator is "Unnamed Investigator".
- **Reveals:** under the Scene, newest first, each an `article` labelled by its `h3`, closed until "Show", exactly as a Clue on the Clues page (section 15):
  - **Meta line:** a Player reads "{kind} . Revealed {date and time}" (section 15); the Keeper reads the same followed by " . to {names}".
  - **"Show" and "Hide":** accessible name "Show {title}" or "Hide {title}", with `aria-expanded`. Opening renders `revealed-content` from the snapshot (sections 14 and 22.8); a file loads on first open from `reveals/{revealId}/file`.
- **Empty Scene:**
  - Keeper: "Nothing was revealed in this Scene."
  - Player: "Nothing from this Scene reached {name}."
- **Player without an Approved Investigator:** every Scene is listed with its title and times and no Reveals and no per-Scene sentence. One muted note sits under the description: "You don't have an Approved Investigator in this Campaign yet, so no Reveals are shown."
- **No Scene played yet:** "No Scene has been played yet." under the description.
- **Loading:** a Skeleton with `aria-busy="true"`.
- **Error:** "We couldn't load the Scene History." with "Try again" (`role=alert`).
- **Not a member or no such Campaign:** the existing Campaign not-found page.

### 23.3 Live updates

- The page refetches silently on `sceneHistory` (a Scene starts or finishes, or the Investigators present change), on `myClues` (a Player's Investigator received a Reveal), and on `sceneReveals` (the Keeper).
- Nothing is announced; arrivals are already announced on the Active Scene page and the overview card (sections 5 and 14).
- Focus never moves. A Reveal that was open stays open across a refetch (open state is kept by Reveal id). A newly started Scene appears at the top.

### 23.4 Headings and layout

- One `h1`. Scenes are `h2`, Reveals `h3`, and revealed rich text starts at `h4`, as on the Clues page.
- The page uses the same reading column as the Clues page; a Map breaks out to the full content width as section 14 says.
- At 320px the meta line wraps between its parts; the Campaign tab row scrolls inside itself ([navigation ux](../navigation/ux.md) section 2).

### 23.5 Content

| Key | Copy |
|---|---|
| Tab | Scene History |
| Page | Scene History / Every Scene played in this Campaign, newest first. / Every Scene played in this Campaign and what reached {name}, newest first. |
| Scene meta | Scenario: {title} / Started {date and time} / Finished {date and time} / Active / Open Active Scene |
| Keeper | Investigators present: {names} / to {names} / Nothing was revealed in this Scene. |
| Player | Nothing from this Scene reached {name}. / You don't have an Approved Investigator in this Campaign yet, so no Reveals are shown. |
| Reveal | {kind} / Revealed {date and time} / Show / Hide |
| States | No Scene has been played yet. / We couldn't load the Scene History. / Try again |

Never use "timeline", "log", or "play order" (root CONTEXT.md, Scene History).

### 23.6 Component mapping

| Element | Component |
|---|---|
| Route | New `routes/campaigns.$campaignId.scene-history.tsx` (thin) |
| Page | New `scene-history-page` (states, description, note) |
| Scene | New `scene-history-scene` (one `section`: meta line, Investigators present, Reveals, empty sentence) |
| Reveal | New `reveal-disclosure`, extracted from the Clue item of `clues-list` and taking its meta line; `clues-list` and `scene-history-scene` both use it |
| Reused | `revealed-content`, `useRevealFile`, `scene-times` ("Started" and "Finished"), `scene-status-badge`, `revealPresentation` (kind label, times, names), `Collapsible`, `Button`, `Skeleton`, `Alert` |
| Tabs | `campaign-header` gains the "Scene History" link; `CampaignSection` gains `scene-history` |
| Data | New `sceneHistoryApi.ts` (strict zod Keeper and Player schemas, `sceneHistoryQueryKeys`), `useSceneHistory` |
| Live | `sceneHistory` added to `campaign-play/services/liveTopics.ts`; `myClues` and `sceneReveals` also refetch the Scene History |

Stories cover:
- **`scene-history-page`:** Keeper, Player, Player without an Approved Investigator, no Scene played, loading, error, and 320px.
- **`scene-history-scene`:** Active and Finished, Keeper and Player, empty for each, and an unnamed Investigator.
- **`reveal-disclosure`:** closed, open, and with the Keeper meta line.

### 23.7 UX acceptance criteria

- **SPL-UX-61** Every Campaign page shows the tabs Overview, Active Scene, Scene History, Wall, and (Keeper) Settings, in that order. Scene History is the current tab on `/scene-history`. (Amends NAV-UX-1.)
- **SPL-UX-62** Scene History lists the Active and Finished Scenes of every Scenario of the Campaign, newest started first, each with its Scenario title, its start time, and its finish time or "Active". No Prepared Scene is listed.
- **SPL-UX-63** The Keeper sees every Reveal of every listed Scene with "to {names}", and each Scene's "Investigators present: {names}".
- **SPL-UX-64** A Player sees, per Scene, only the Reveals that reached their Investigator, with no "to {names}" and no Investigators present. A Scene where nothing reached it shows "Nothing from this Scene reached {name}.". A Player-facing Handout that was never revealed is absent.
- **SPL-UX-65** A Player without an Approved Investigator sees the Scenes with their times, no Reveals, and "You don't have an Approved Investigator in this Campaign yet, so no Reveals are shown.".
- **SPL-UX-66** "Show" opens a Reveal's content as revealed, by kind (SPL-UX-27), and keeps showing the snapshot after the Keeper edits the subject (SPL-UX-30).
- **SPL-UX-67** "Open Active Scene" on the Active Scene opens the Active Scene page.
- **SPL-UX-68** When the Keeper starts or finishes a Scene, a connected member's Scene History updates without reloading. A new Reveal appears only for the Keeper and the Players whose Investigators it reached. Nothing is announced, and an open Reveal stays open.
- **SPL-UX-69** With no Scene played the page shows "No Scene has been played yet."; a load failure shows "We couldn't load the Scene History." with "Try again", which reloads it.

### 23.8 Accessibility acceptance criteria (WCAG 2.2 AA)

- **SPL-A11Y-23** The page has one `h1`; each Scene is a `section` labelled by its `h2`; each Reveal is an `article` labelled by its `h3`; revealed rich text starts at `h4`. Times are `time` elements, and "Active" is text, never color alone (1.3.1, 1.4.1, 2.4.6).
- **SPL-A11Y-24** "Show" and "Hide" expose `aria-expanded`, and their accessible names include the Reveal title. Every control is keyboard operable with a visible focus ring and is at least 24 by 24 CSS px (2.1.1, 2.4.6, 2.4.7, 2.5.8, 4.1.2).
- **SPL-A11Y-25** A live refetch announces nothing and never moves focus; the load error uses `role=alert` (2.4.3, 4.1.3).
- **SPL-A11Y-26** At 320px and 200% zoom the page, its meta lines, and a revealed Map fit without horizontal scrolling (1.4.10).

### 23.9 Prototype validation

- **Question:** which page structure serves Scene History best (one page, index and Scene page, or no tab), and in which order.
- **Branch of the prototype skill:** UI.
- **Prototype:** [prototype/scene-history.html](prototype/scene-history.html), a throwaway single HTML file kept as a reference, as the [navigation prototype](../navigation/prototype/active-scene.html) is. It shows Options A, B, and C, Keeper and Player views (including a Player without an Approved Investigator and a Scene where nothing reached the Player), both orders, empty, loading, and error states, a simulated finish, and a 320px frame. Open it in a browser; this section, not the prototype, is normative. At the human's direction it is committed beside this document and no `prototype/` branch was created.
- **Verdict:** Option A, with newest started first, Investigators present for the Keeper only, and empty Scenes kept listed for a Player.
- **Date:** 2026-11-07. **Decided by:** the human at the PBI-SPL-004 UX gate, relayed by the Orchestrator.
- **Screenshots:** none recorded.

### 23.10 Open decisions and research gaps

- **Research gap:** how long Campaigns grow. If Scene History becomes hard to scan, Option B's index is the documented fallback.
- **Research gap:** whether Players want the Investigators present of past Scenes; adding them changes the Player projection and needs the spec's Regression Guardrails first.

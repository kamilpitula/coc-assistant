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

- Overview is the current Campaign tab on the start page and the Active Scene page. No new tab is added.
- The Keeper starts a Scene only from its Scene page. A Prepared Scene gets the action "Start Scene", a link styled as a primary button, placed before "Edit". An Active Scene gets the link "Open Active Scene", placed before "Edit". A Finished Scene is unchanged. This amends [scenario-preparation ux](../scenario-preparation/ux.md) section 14, "Actions by status".
- Every member reaches the Active Scene page from the overview card. The Keeper also reaches it from "Open Active Scene" and after starting a Scene.
- **Since PBI-SPL-002:** the Keeper's Active Scene page shows Keeper notes, Handouts, and Non-Player Entities with the Reveal controls (section 12). "Open in Scenario" stays, for editing. Items arrive with PBI-SPL-003.

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
- Items are not revealed in this PBI (PBI-SPL-003).

## 12. Keeper view additions (`active-scene-keeper-view`)

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
- **Refusals** (`role=alert` inside the dialog):
  - **409:** "This Scene has been finished, so nothing more can be revealed." Closing the dialog shows the refetched no-Active-Scene state, with focus on the `h1`.
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

- **SPL-UX-20** The Keeper's Active Scene page lists the Scene's Handouts in stored order with their kind and visibility, and its Non-Player Entities. Only Player-facing Handouts and Non-Player Entities offer "Reveal...".
- **SPL-UX-21** "Reveal..." opens "Reveal {title}" with every present Investigator who hasn't received it checked. Those who have show "(already revealed)".
- **SPL-UX-22** Confirming shows "{title} revealed to {names}.", adds "Revealed to {names}" to the item and an entry to "Revealed in this Scene", and returns focus to "Reveal...".
- **SPL-UX-23** Confirming with nothing checked shows "Choose at least one Investigator." and reveals nothing. "Cancel" reveals nothing.
- **SPL-UX-24** Each refusal shows its section 17 message. A Scene finished meanwhile leads to "No Active Scene".
- **SPL-UX-25** "Show Keeper notes" shows the notes. "Show content" shows a Handout's current content.
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
- **SPL-UX-33** The Keeper reaches any Approved Investigator's Clues from "Investigators present" and from the review page.
- **SPL-UX-34** A Player opening a Keeper Clues URL sees `investigator-not-found`.
- **SPL-UX-35** A Player sees no "Reveal...", no Keeper notes, and no Keeper-facing material.
- **SPL-UX-36** While a Reveal is in flight, its button reads "Revealing..." and is disabled, and a second activation does nothing.
- **SPL-UX-37** The Clues pages keep the Campaign header with Overview as the current tab.

## 20. Reveals and Clues accessibility acceptance criteria (WCAG 2.2 AA)

- **SPL-A11Y-8** Sections are `section` elements labelled by their `h2`, items and Reveals have `h3` headings, and revealed rich text starts at `h4`. Each page has exactly one `h1` (1.3.1, 2.4.6).
- **SPL-A11Y-9** The dialog has an accessible name, and focus starts on the first checkbox. The fieldset has a `legend`, and the hint and error are connected with `aria-describedby`. Focus returns to the trigger when the dialog closes (1.3.1, 2.4.3, 3.3.1, 4.1.2).
- **SPL-A11Y-10** Every image has `alt`: its image description, or its title when there is none. Kind, visibility, and "Read-aloud" are text, never color alone (1.1.1, 1.4.1).
- **SPL-A11Y-11** Disclosure buttons expose `aria-expanded`, and their accessible names include the title (2.4.6, 4.1.2).
- **SPL-A11Y-12** The reveal status uses `role=status` and refusals use `role=alert`. Live arrivals are announced politely, never on first load (4.1.3).
- **SPL-A11Y-13** Every control is reachable and operable by keyboard, has a visible focus ring, and is at least 24 by 24 CSS px (2.1.1, 2.4.7, 2.5.8).
- **SPL-A11Y-14** At 320px and 200% zoom, the material list, the dialog, a Map, and the Clues pages fit without horizontal scrolling (1.4.10).

# UX Specification: Scene Play (Active Scene)

Selected direction: **Option B (dedicated Active Scene page with a guided start page)**, chosen 2026-10-28 for PBI-SPL-001. Alternatives considered:
- **Option A (run from the Scene page with dialogs):** rejected because it mixes authoring (Edit, Remove) with live controls on the Scenario Preparation Scene page, and the Reveal and give controls of PBI-SPL-002 and PBI-SPL-003 would grow that page further.
- **Option C (overview command card):** rejected because it turns the overview into a control panel, needs a cross-Scenario list of Prepared Scenes, and still needs an Active Scene page for Players and for PBI-SPL-002.

Human decisions at the UX gate (2026-10-28): the Wall Entry text is "Scene started: {title}" and "Scene finished: {title}". A Scene is started only from its Scene page; the overview card has no "Start a Scene" entry.

Behavior and rules: [spec.md](spec.md). This document covers presentation only. Scene status, times, and the Scene page are in [scenario-preparation ux](../scenario-preparation/ux.md) sections 12 and 14; the overview order is in [campaign-overview ux](../campaign-overview/ux.md) section 3.

## 1. Information architecture

```
/campaigns/$campaignId                                         Overview (Active Scene card, section 5)
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId   Scene page (Keeper; "Start Scene" / "Open Active Scene")
  .../scenes/$sceneId/start                                    Start page (Keeper only, section 2)
/campaigns/$campaignId/active-scene                            Active Scene page (Keeper view section 3, Player view section 4)
```

- Overview is the current Campaign tab on the start page and the Active Scene page. No new tab is added.
- The Keeper starts a Scene only from its Scene page. A Prepared Scene gets the action "Start Scene", a link styled as a primary button, placed before "Edit". An Active Scene gets the link "Open Active Scene", placed before "Edit". A Finished Scene is unchanged. This amends [scenario-preparation ux](../scenario-preparation/ux.md) section 14, "Actions by status".
- Every member reaches the Active Scene page from the overview card. The Keeper also reaches it from "Open Active Scene" and after starting a Scene.
- **Interim (until PBI-SPL-002):** the Keeper's Active Scene page shows no Keeper notes, Handouts, Non-Player Entities, or Items. "Open in Scenario" links to the Scene page, where they are shown and edited. PBI-SPL-002 brings the revealable content and the Reveal controls onto this page.

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
- In PBI-SPL-001 the "Revealed to {name}" section always shows the empty sentence. PBI-SPL-002 fills it.

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
- **SPL-UX-9** The Keeper's Active Scene page shows the title, Active status, start time, Scenario, location, Investigators present, "Open in Scenario", "Change", and "Finish Scene", and no Keeper notes or Handouts (interim, section 1).
- **SPL-UX-10** "Change", then a different selection, then "Save" shows "Investigators present saved." with the new list after a reload. "Cancel" keeps the old list. An empty selection shows "Choose at least one Investigator present.".
- **SPL-UX-11** "Finish Scene", then confirming, shows "{title} finished." and "No Active Scene". "Cancel" keeps the Scene Active.
- **SPL-UX-12** A Player whose Investigator is present sees the title, location, Investigators present with "(your Investigator)", and "The Keeper hasn't revealed anything to {name} yet.", and no Handout.
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

- **Interim, until PBI-SPL-002:** the Keeper reaches Keeper notes and Handouts during play through "Open in Scenario". PBI-SPL-002 designs revealable content on this page.
- **Deferred:** an "Active Scene" Campaign tab. The overview card and the Scene page link are the only entries for now.
- **Research gap:** whether Keepers want the start page to remember the last present selection across Scenes when no Scene is Active. Today every Approved Investigator is pre-checked.
- **Research gap:** whether Players want a notification beyond the polite announcement when their Investigator joins a Scene.

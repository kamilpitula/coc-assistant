# UX Specification: Scenario Preparation (Scenarios and Scenes)

Selected direction: **Option B (an Overview section with a dedicated Scenario page)**, chosen 2026-10-16 (PBI-SP-001). Alternatives considered:
- **Option A (a "Scenario" header tab):** rejected because it breaks the limit of three tab labels at 320px ([campaign-overview ux](../campaign-overview/ux.md) section 2, CO-A11Y-9).
- **Option C (a section in Settings):** rejected because Settings holds configuration, not preparation; Scenes (PBI-SP-002) would force a move later, and it is the least discoverable option.

Reorder control: **Move up / Move down buttons, saved per move**. Rejected: drag and drop (needs a new dependency and still needs buttons for WCAG 2.5.7) and a separate "Change order" mode with position selects (more steps for the usual one- or two-place change).

Behavior and rules: [spec.md](spec.md). Design record: [docs/scenario-preparation/issues/01-create-edit-scenario.design.md](../../docs/scenario-preparation/issues/01-create-edit-scenario.design.md). This document covers presentation only.

Scenes (PBI-SP-002): **Option A (a Scene page with a view and an Edit toggle)**, chosen 2026-10-17. Alternatives considered:
- **Option B (the Scene page as an always-on editor):** rejected because it differs from the Scenario page and risks accidental edits while the Keeper reads notes at the table.
- **Option C (an expandable Scene list on the Scenario page):** rejected because rows get dense at 320px, each expansion needs its own request, and Handouts and links (PBI-SP-004, PBI-SP-005) would need a Scene page later anyway.

Scene design record: [docs/scenario-preparation/issues/02-manage-ordered-scenes.design.md](../../docs/scenario-preparation/issues/02-manage-ordered-scenes.design.md). Scenes are specified in sections 11 to 20.

Non-Player Entities (PBI-SP-003, PBI-SP-009, PBI-SP-010): **a dedicated list page with search and a type filter, a create page with a type choice, and profile pages with a stat-block view and one whole-profile Edit mode with optional sections**, chosen 2026-10-17. It combines Option B's list and view with Option A's editing. Alternatives considered:
- **Option A (an Overview section as the list, with Add buttons in one form):** list part rejected because the Overview cannot hold 30-80 profiles plus Items without search; its single Edit mode was kept.
- **Option B (per-section editing on section cards):** editing part rejected because it adds a second editing pattern next to the Scene page and multiplies the states to build and test; its list page and stat-block view were kept.
- **Option C (a "What will this NPC do?" question at creation that pre-adds sections):** rejected because adding a section is already one activation, and most Mythos Creatures need nearly every section.

Overview entry: **counts with "View all"**, not recent profiles. The list's search and type filter **reset on every visit**. Non-Player Entities are specified in sections 21 to 30. This shared pass fixes the list, creation, page layout, and section pattern; each profile's field-level editor details are added at the start of PBI-SP-003 (NPC Profile) and PBI-SP-009 (Monster Profile) in sections 25.4 and 25.5. The Duplicate action (section 25.3) appears only once PBI-SP-010 ships.

## 1. Information architecture

```
/campaigns/$campaignId                       Overview: Keeper-only "Scenarios" section (section 2)
/campaigns/$campaignId/scenarios/new         Create Scenario       -> Overview tab current
/campaigns/$campaignId/scenarios/$scenarioId Scenario (view/edit)  -> Overview tab current
/campaigns/$campaignId/scenarios/$scenarioId/scenes/new       Create Scene     -> Overview tab current
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId  Scene (view/edit) -> Overview tab current
```

- There is no Scenarios tab and no separate list page. The Overview section is the list.
- Players get no entry point. They never learn whether a Scenario exists, how many there are, or their titles.
- A Campaign may have no Scenario, for example while Players create their Investigators. This is shown only as a Keeper attention item (section 3) and blocks nothing.

## 2. Overview section (`scenario-list-section`, Keeper only)

```
Scenarios                                   (h2)   [Create Scenario]
+------------------------------------------------------+
| 1. The Haunting                               (link) |
| 2. Edge of Darkness                           (link) |
+------------------------------------------------------+
```

- **Placement:** a `section` labelled by its `h2`, in the main column after "At the table". Phone order: status message, "Needs your attention", "At the table", "Scenarios", Wall preview.
- **List:** an `ol` in the Campaign's order, numbered by the list. Each item is a link to the Scenario page whose name is the Scenario title (`break-words`).
- **Action:** "Create Scenario", a link styled as a small button (`buttonVariants({ size: 'sm' })`) to `/scenarios/new`, to the right of the heading; it wraps under it below 640px.
- **Empty:** "No Scenarios yet." and the "Create Scenario" link.
- **Loading:** two Skeleton rows with `aria-busy="true"`.
- **Error:** "We couldn't load the Scenarios." with a "Try again" button.
- **Players:** the section is not rendered and its query is never sent.

### 2.1 Changing the order

```
Scenarios                                        (h2)   [Create Scenario]
+---------------------------------------------------------------+
| 1. The Haunting                                     [ ] [v]   |
| 2. Edge of Darkness                                 [^] [v]   |
| 3. Masks                                            [^] [ ]   |
+---------------------------------------------------------------+
```

- **Controls:** at the right of each row, two ghost icon `Button`s, "Move up" (ArrowUp) and "Move down" (ArrowDown), with the accessible names "Move {title} up" and "Move {title} down" as `sr-only` text, each at least 40x40 CSS px. The first row has no "Move up" and the last row no "Move down"; an `aria-hidden` spacer of the same size keeps alignment. With one Scenario, no move buttons are rendered. Below 640px the controls stay on the title's line and the title wraps.
- **Saving:** each activation moves the Scenario one place and sends the complete new order at once. There is no separate Save. Updates are confirmed, not optimistic.
- **In flight:** every move button in the section has `aria-disabled="true"` and ignores activation (not `disabled`, so focus is kept).
- **Success:** the list is re-rendered from the server's response. The section's polite live region announces "{title} moved to position {n} of {total}.". Focus stays on the same control of the moved Scenario; if that control is gone because the Scenario is now first or last, focus moves to its other move button.
- **Failure:** the list keeps the saved order, and an `Alert` (`role=alert`) above the list says "We couldn't change the order. Try again.". Focus stays where it was.
- **Stale order (409):** the list is refetched and the alert says "The Scenarios changed in another window. Check the order and try again.". If the focused control no longer exists, focus moves to the section `h2` (`tabIndex=-1`).
- The live region and the alert clear at the next move. Nothing is announced on first load.

## 3. Attention item

Added to the Keeper items of [campaign-overview ux](../campaign-overview/ux.md) section 4.1.

| When | Sentence | Action |
|---|---|---|
| The Campaign has no Scenario | "This Campaign has no Scenario yet." | Link "Create Scenario" -> `/campaigns/$campaignId/scenarios/new` |

- **Order:** after the review items and "No Players have joined yet.".
- The item disappears once a Scenario exists (the list query is invalidated on create).
- The existing attention loading and error states cover both the roster and the Scenarios; "Try again" refetches both.

## 4. Create page (`create-scenario-page`)

- `h1` "Create Scenario".
- **Form (`scenario-form`):**
  - `Input` labelled "Title".
  - `Textarea` labelled "Keeper notes (optional)", 8 rows, resizable vertically, with the hint "Only you can read these. Up to 10,000 characters." connected by `aria-describedby`.
  - Neither field has a `maxLength` attribute, so an over-long paste stays visible and is explained.
- **Actions:** primary "Create Scenario"; secondary "Cancel", a link back to the Overview.
- **Validation on submit:** "Enter a title." / "Title must be 200 characters or fewer." / "Keeper notes must be 10,000 characters or fewer.", inline under the field (`aria-invalid`, `aria-describedby`); focus moves to the first invalid field. A 400 from the server maps to the same field errors.
- **Submitting:** the button reads "Creating..." and is disabled, so it cannot be submitted twice.
- **Success:** navigate to the new Scenario's page with the navigation status message "Scenario created."; the list is invalidated.
- **Failure:** an `Alert` (`role=alert`) "We couldn't create the Scenario. Try again."; the input is kept.
- **Unsaved edits:** `useUnsavedChangesPrompt(isDirty)`.

## 5. Scenario page (`scenario-page`)

- **View:** a `role=status` paragraph for the navigation status message; `h1` the Scenario title (`break-words`); `h2` "Keeper notes" with the notes in `whitespace-pre-line`, or "No Keeper notes yet." in muted text; an outline button "Edit".
- **Edit:** "Edit" swaps the view for `scenario-form`, prefilled; the `h1` keeps the saved title. Actions "Save" ("Saving..." while busy, disabled) and "Cancel". Focus moves to the Title field.
- **Save success:** back to the view, the status says "Scenario saved.", focus moves to "Edit".
- **Cancel:** discards the edits without confirmation; focus moves to "Edit".
- **Save failure:** the form stays, with "We couldn't save the Scenario. Try again." (`role=alert`). Unsaved edits use `useUnsavedChangesPrompt`.
- **Scenes:** the Scenes section (section 12) follows the Keeper notes and the Edit button, and stays in place while the Scenario is being edited.
- **Loading:** a Skeleton for the `h1` and the notes, with `aria-busy`.
- **Error:** "We couldn't load this Scenario." with "Try again".
- **Not found (`scenario-not-found`):** for a 404, for a Player (role check on the client, no API call), and for an unknown or other-Campaign id: `h1` "We couldn't find that Scenario" and the link "Back to your Campaign", mirroring `investigator-not-found`.

## 6. Content

| Key | Copy |
|---|---|
| Section heading | Scenarios |
| Create action / page h1 / submit | Create Scenario |
| Empty | No Scenarios yet. |
| List error | We couldn't load the Scenarios. |
| Attention item | This Campaign has no Scenario yet. |
| Field labels | Title / Keeper notes (optional) |
| Notes hint | Only you can read these. Up to 10,000 characters. |
| Errors | Enter a title. / Title must be 200 characters or fewer. / Keeper notes must be 10,000 characters or fewer. |
| Busy | Creating... / Saving... |
| Status | Scenario created. / Scenario saved. |
| Failures | We couldn't create the Scenario. Try again. / We couldn't save the Scenario. Try again. / We couldn't load this Scenario. |
| Not found | We couldn't find that Scenario / Back to your Campaign |
| Notes empty | No Keeper notes yet. |
| Move buttons (screen readers) | Move {title} up / Move {title} down |
| Moved | {title} moved to position {n} of {total}. |
| Reorder failure | We couldn't change the order. Try again. |
| Reorder stale | The Scenarios changed in another window. Check the order and try again. |

Never use "adventure", "module", or "ready to play" in the UI (see root CONTEXT.md).

## 7. Component mapping

| Element | Component |
|---|---|
| Overview section, move controls | New `scenario-list-section` in `frontend/src/scenario-preparation/components/`, mounted by `campaign-page` for the Keeper |
| Create page | New `create-scenario-page`, route `routes/campaigns.$campaignId.scenarios.new.tsx` |
| Scenario page | New `scenario-page`, route `routes/campaigns.$campaignId.scenarios.$scenarioId.tsx` |
| Form | New `scenario-form`, shared by create and edit |
| Not found | New `scenario-not-found` |
| Attention item | Existing `attention-list`, new Keeper item kind |
| Order helper | New pure `scenario-preparation/services/scenarioOrder.ts` |
| Primitives | Existing `Card`, `Input`, `Label`, `Textarea`, `Button`, `Alert`, `Skeleton`; no new primitives |

Stories cover:
- **`scenario-list-section`:** empty, two Scenarios, three Scenarios, a single Scenario, a long title at 320px, loading, error, reorder saving, reorder failure, and reorder stale.
- **`scenario-form`:** empty, prefilled, every field error, and busy.
- **`scenario-page`:** view with and without notes, edit, saved status, and not found.
- **`create-scenario-page`:** idle, creating, and failure.

## 8. UX acceptance criteria

- **SP-UX-1** The Keeper's Overview shows a "Scenarios" section listing the Campaign's Scenarios in order as links, or "No Scenarios yet." with "Create Scenario".
- **SP-UX-2** A Campaign with no Scenario shows "This Campaign has no Scenario yet." with "Create Scenario" in "Needs your attention"; the item is gone once a Scenario exists.
- **SP-UX-3** "Create Scenario" opens `/scenarios/new`; submitting a valid title opens the new Scenario's page with the title and "Scenario created.".
- **SP-UX-4** A new Scenario is listed after the existing ones.
- **SP-UX-5** An empty or whitespace title shows "Enter a title." and focuses Title; a title over 200 characters and notes over 10,000 characters show their messages; nothing is saved.
- **SP-UX-6** "Edit" then "Save" stores the new title and notes, shows "Scenario saved.", and the change survives a reload; "Cancel" discards the edits.
- **SP-UX-7** While a create or save is in flight the submit button is disabled; a second click creates nothing.
- **SP-UX-8** Scenario pages keep the Campaign header with Overview as the current tab (extends CO-UX-11).
- **SP-UX-9** A Player sees no Scenarios section and no Scenario attention item; opening a Scenario URL (`/new` or an id) shows "We couldn't find that Scenario".
- **SP-UX-10** A Scenario id from another Campaign, opened under this Campaign, shows "We couldn't find that Scenario".
- **SP-UX-11** With two or more Scenarios each row shows "Move up" (except the first) and "Move down" (except the last); activating one moves that Scenario one place, the list shows the new order, and it survives a reload.
- **SP-UX-12** After a move, "{title} moved to position {n} of {total}." is announced, and focus stays on the moved Scenario's control, or on its other control when the first is gone.
- **SP-UX-13** While a move is saving, further move activations do nothing. A failure keeps the saved order and shows "We couldn't change the order. Try again."; a stale order refetches the list and shows "The Scenarios changed in another window. Check the order and try again.".
- **SP-UX-14** A single Scenario has no move controls.

## 9. Accessibility acceptance criteria (WCAG 2.2 AA)

- **SP-A11Y-1** Each page has exactly one `h1`. The Overview section is a `section` labelled by its `h2` "Scenarios", and the list is an `ol` (1.3.1, 2.4.6).
- **SP-A11Y-2** Every field has a visible label; "(optional)" is part of the label, and the notes hint is connected with `aria-describedby` (1.3.1, 3.3.2).
- **SP-A11Y-3** Errors are text next to their field, connected with `aria-describedby`, with `aria-invalid="true"`; on submit, focus moves to the first invalid field (3.3.1, 3.3.3).
- **SP-A11Y-4** "Scenario created." and "Scenario saved." are announced through `role=status` without moving focus; failures use `role=alert` (4.1.3).
- **SP-A11Y-5** Focus moves to Title on "Edit" and to "Edit" after Save or Cancel, and is never lost to `body` (2.4.3).
- **SP-A11Y-6** Every link and button is keyboard reachable in visual order, has a visible focus ring, and is at least 24 by 24 CSS pixels (2.1.1, 2.4.7, 2.5.8).
- **SP-A11Y-7** At 320px and at 200% zoom the section, the form, and the page fit without horizontal scrolling; long titles wrap (1.4.10).
- **SP-A11Y-8** Move controls are `button`s named "Move {title} up" or "Move {title} down", operable with Enter and Space, with a visible focus ring, at least 24 by 24 CSS pixels (40 by 40 used); reordering needs no dragging (2.1.1, 2.4.4, 2.4.7, 2.5.7, 2.5.8).
- **SP-A11Y-9** Order changes are announced through one polite live region in the section, never on first load; focus is never lost to `body` during or after a move (`aria-disabled`, not `disabled`) (2.4.3, 4.1.3).

## 10. Open decisions and research gaps

- **Deferred:** removing a Scenario.
- **Deferred:** any Player-visible Scenario information.
- **Research gap:** whether Keepers find the "no Scenario yet" attention item useful or nagging when they deliberately start without a Scenario.

## 11. Scenes: information architecture

- A Scenario's Scenes are listed only on its Scenario page (section 12). There is no Scenes tab.
- Each Scene has its own page with a view and "Edit" (section 14), like the Scenario page. Creating a Scene has its own page (section 13).
- A Scene is removed from its page, and only while it is Prepared.
- Players get no entry point; every Scene URL shows them not found.

## 12. Scenes section on the Scenario page (`scene-list-section`)

```
Scenes                                            (h2)  [Create Scene]
+-------------------------------------------------------------------+
| 1. Meeting Knott                                       [ ] [v]    |
|    (o) Prepared                                                   |
| 2. The Corbitt House                                   [^] [ ]    |
|    (>) Active  Started 12 Oct 2026, 19:40                         |
+-------------------------------------------------------------------+
```

- **Placement:** a `section` labelled by its `h2` "Scenes", after the Scenario's Keeper notes and Edit button (or the Scenario form).
- **Action:** "Create Scene", a link styled as a small button to `/scenes/new`, to the right of the heading; it wraps under it below 640px.
- **List:** an `ol` in prepared order. Each item has a link whose name is the Scene title (`break-words`), and under it the status badge and, once set, the times.
- **Status badge (`scene-status-badge`):** a `Badge` with text and an `aria-hidden` icon: Prepared (CircleDashed, outline), Active (Play, default), Finished (CircleCheck, secondary). Every Scene shows its badge, Prepared included.
- **Times (`scene-times`):** "Started {date, time}" and "Finished {date, time}", each a `time` element whose `dateTime` is the ISO value, formatted with `Intl.DateTimeFormat` (`dateStyle: 'medium'`, `timeStyle: 'short'`) in the viewer's locale and time zone. A time is shown only once it is set. They wrap at 320px.
- **Changing the order:** exactly as section 2.1, with Scene wording: "Move {title} up" / "Move {title} down", "{title} moved to position {n} of {total}.", "We couldn't change the order. Try again.", and for a stale order "The Scenes changed in another window. Check the order and try again." (focus to the section `h2` when the used control is gone). One polite live region in the section; `aria-disabled` while a move is saving; no move controls with a single Scene. Every Scene has move controls whatever its status, because the prepared order belongs to the Scenario (spec Constraints).
- **Empty:** "No Scenes yet." and the "Create Scene" link.
- **Loading:** two Skeleton rows with `aria-busy="true"`.
- **Error:** "We couldn't load the Scenes." with a "Try again" button.

## 13. Create Scene page (`create-scene-page`)

- `h1` "Create Scene", and under it the muted line "Scenario: {Scenario title}".
- A Player (role check on the client, no API call) or an unknown Scenario gets `scenario-not-found`.
- **Form (`scene-form`):**
  - `Input` labelled "Title".
  - `Input` labelled "Location (optional)", with the hint "Where the Scene takes place, for example Arkham, Boston Road." connected by `aria-describedby`.
  - `rich-text-editor` labelled "Keeper notes (optional)" (section 15), with the hint "Only you can read these. You can format text and add links."
  - No field has a `maxLength` attribute.
- **Actions:** primary "Create Scene"; secondary "Cancel", a link back to the Scenario page.
- **Validation on submit:** "Enter a title." / "Title must be 200 characters or fewer." / "Location must be 200 characters or fewer." / "Keeper notes are too long. Shorten them and try again." (more than 204,800 bytes), inline under the field (`aria-invalid`, `aria-describedby`); focus moves to the first invalid field in the order Title, Location, Keeper notes. A 400 from the server maps to the same field errors; a refused `keeperNotes` shows "These Keeper notes can't be saved. Shorten them or remove unsupported content."
- **Submitting:** the button reads "Creating..." and is disabled.
- **Success:** navigate to the new Scene's page with the navigation status message "Scene created."; the Scene list is invalidated.
- **Failure:** an `Alert` (`role=alert`) "We couldn't create the Scene. Try again."; the input is kept.
- **Unsaved edits:** `useUnsavedChangesPrompt(isDirty)`. The notes count as changed once the editor reports a content change after it mounts, not by comparing JSON text.

## 14. Scene page (`scene-page`)

```
< Back to the Scenario
Scene created.                                    (role=status)
The Corbitt House                                 (h1)
(o) Prepared
Location   Arkham, Boston Road                    (dl)
Keeper notes                                      (h2)
<rendered notes, or "No Keeper notes yet.">
[Edit] [Remove Scene]
```

- **View:**
  - A link "Back to the Scenario" with an `aria-hidden` ArrowLeft icon.
  - A `role=status` paragraph for the navigation status message and "Scene saved.".
  - `h1` the Scene title (`break-words`), then a line with the status badge and the times (section 12).
  - A `dl` with "Location" and its value, only when a location is set.
  - `h2` "Keeper notes" with `rich-text-view`, or "No Keeper notes yet." in muted text when there are none.
- **Actions by status:** Prepared: outline "Edit" and "Remove Scene" (outline, destructive text). Active: "Edit" only. Finished: no actions, and the muted sentence "This Scene is finished and can't be changed."
- **Edit:** "Edit" swaps the view for `scene-form`, prefilled; the `h1` keeps the saved title. Actions "Save" ("Saving..." while busy, disabled) and "Cancel". Focus moves to the Title field.
- **Save success:** back to the view, the status says "Scene saved.", focus moves to "Edit".
- **Cancel:** discards the edits without confirmation; focus moves to "Edit".
- **Save failure:** the form stays, with "We couldn't save the Scene. Try again." (`role=alert`).
- **Save refused because the Scene is Finished (409):** the form stays with the alert "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel."; Cancel shows the refetched Finished view.
- **Remove (`remove-scene-dialog`, `AlertDialog`):** title "Remove {title}?", description "This can't be undone.", buttons "Cancel" and "Remove Scene" ("Removing..." while busy, both disabled). A failure shows "We couldn't remove the Scene. Try again." (`role=alert`) in the dialog. A refusal because the Scene is no longer Prepared (409) shows "This Scene has been started, so it can't be removed."; closing the dialog refetches the Scene. Success navigates to the Scenario page with the navigation status message "Scene removed." and invalidates the Scene list. Cancel returns focus to "Remove Scene".
- **Loading:** a Skeleton for the `h1` and the notes, with `aria-busy`.
- **Error:** "We couldn't load this Scene." with "Try again".
- **Not found (`scene-not-found`):** for a 404, for a Player (role check on the client, no API call), and for a Scene id of another Scenario or Campaign: `h1` "We couldn't find that Scene" and the link "Back to your Campaign", mirroring `scenario-not-found`.

## 15. Keeper notes editor and view

- **Editor (`rich-text-editor`, shared):** a bordered box styled like `Textarea`, at least 12rem tall and growing with its content, with the toolbar above the editable area. The editable area has `role=textbox`, `aria-multiline="true"`, `aria-labelledby` the visible label, `aria-describedby` the hint and any error, and `aria-invalid` when invalid. Ctrl+Z and Ctrl+Y undo and redo. Tab and Shift+Tab leave the editor. Pasted content keeps only the allowed formatting (spec Constraints); headings become Heading or Subheading, and anything else becomes plain text.
- **Toolbar (`rich-text-toolbar`):** `role=toolbar` named "Formatting", one tab stop; Arrow Left and Right move between buttons, Home and End go to the first and last. Ghost icon buttons of 40 by 40 CSS px with `sr-only` names, in this order: Bold, Italic, Underline, Strikethrough | Heading, Subheading, Quote, Bulleted list, Numbered list | Link. Each is a toggle whose `aria-pressed` follows the selection; pressing an active block button turns the block back into a paragraph. Ctrl+B, Ctrl+I, and Ctrl+U also work. The toolbar wraps at 320px.
- **Link dialog (`rich-text-link-dialog`, `Dialog`):** title "Add link" or "Edit link", an `Input` labelled "Web address", and the buttons "Save link", "Remove link" (only when editing a link), and "Cancel". An address that does not start with `http://` or `https://` shows "Enter a web address that starts with http:// or https://." under the field. Focus moves to the field when the dialog opens and back to the editor when it closes.
- **View (`rich-text-view`, shared):** read-only, with the same formatting. Heading and Subheading are `h3` and `h4`, below the `h2` "Keeper notes". Links are underlined and open in a new tab with `rel="noopener noreferrer"`.

## 16. Scene content

| Key | Copy |
|---|---|
| Section heading | Scenes |
| Create action / page h1 / submit | Create Scene |
| Empty | No Scenes yet. |
| List error | We couldn't load the Scenes. |
| Status | Prepared / Active / Finished |
| Times | Started {date, time} / Finished {date, time} |
| Field labels | Title / Location (optional) / Keeper notes (optional) |
| Hints | Where the Scene takes place, for example Arkham, Boston Road. / Only you can read these. You can format text and add links. |
| Errors | Enter a title. / Title must be 200 characters or fewer. / Location must be 200 characters or fewer. / Keeper notes are too long. Shorten them and try again. / These Keeper notes can't be saved. Shorten them or remove unsupported content. / Enter a web address that starts with http:// or https://. |
| Busy | Creating... / Saving... / Removing... |
| Status messages | Scene created. / Scene saved. / Scene removed. |
| Failures | We couldn't create the Scene. Try again. / We couldn't save the Scene. Try again. / We couldn't remove the Scene. Try again. / We couldn't load this Scene. |
| Conflicts | This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel. / This Scene has been started, so it can't be removed. |
| Finished | This Scene is finished and can't be changed. |
| Remove dialog | Remove {title}? / This can't be undone. / Cancel / Remove Scene |
| Toolbar | Formatting / Bold / Italic / Underline / Strikethrough / Heading / Subheading / Quote / Bulleted list / Numbered list / Link |
| Link dialog | Add link / Edit link / Web address / Save link / Remove link / Cancel |
| Navigation | Back to the Scenario / Scenario: {title} |
| Not found | We couldn't find that Scene / Back to your Campaign |
| Notes empty | No Keeper notes yet. |
| Move buttons (screen readers) | Move {title} up / Move {title} down |
| Moved | {title} moved to position {n} of {total}. |
| Reorder failure | We couldn't change the order. Try again. |
| Reorder stale | The Scenes changed in another window. Check the order and try again. |

Never use "chapter", "encounter", "draft scene", "planned scene", "current scene", "live scene", "open scene", "closed scene", "past scene", or "archived scene" in the UI (see root CONTEXT.md).

## 17. Scene component mapping

| Element | Component |
|---|---|
| Scenes section | New `scene-list-section` in `frontend/src/scenario-preparation/components/`, mounted by `scenario-page` |
| Move controls | New `move-controls` and `usePreparedOrderReordering` in the slice, also used by `scenario-list-section` |
| Status and times | New `scene-status-badge` (`Badge`, like `investigator-status-badge`) and `scene-times` (`time`) |
| Create page | New `create-scene-page`, route `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.new.tsx` |
| Scene page | New `scene-page`, route `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.tsx`; the Scenario route becomes `routes/campaigns.$campaignId.scenarios.$scenarioId.index.tsx` |
| Form | New `scene-form`, shared by create and edit |
| Remove dialog | New `remove-scene-dialog` (`AlertDialog`, like `remove-wall-entry-dialog`) |
| Not found | New `scene-not-found`; existing `scenario-not-found` on the create page |
| Rich text | New shared `rich-text-editor`, `rich-text-toolbar`, `rich-text-link-dialog`, and `rich-text-view` in `frontend/src/shared/components/` (Lexical) |
| Primitives | Existing `Badge`, `Button`, `Input`, `Label`, `Alert`, `AlertDialog`, `Dialog`, `Card`, `Skeleton`; the Lexical editable area is the only new primitive |

Stories cover:
- **`scene-list-section`:** empty, a single Scene, three Scenes with every status and their times, a long title at 320px, loading, error, reorder saving, reorder failure, and reorder stale.
- **`scene-form`:** empty, prefilled with formatted notes, every field error, and busy.
- **`scene-page`:** Prepared with and without location and notes, Active, Finished, edit, saved status, save refused as Finished, the remove dialog (idle, removing, failure, refused), and not found.
- **`create-scene-page`:** idle, creating, and failure.
- **`rich-text-editor`:** empty, every format, and an error. **`rich-text-toolbar`:** pressed states. **`rich-text-link-dialog`:** add, edit, and invalid address. **`rich-text-view`:** every allowed node.
- **`scene-status-badge`:** each status. **`scene-times`:** none, started, started and finished.

## 18. Scene UX acceptance criteria

- **SP-UX-15** The Keeper's Scenario page shows a "Scenes" section listing the Scenario's Scenes in prepared order as links with their status, or "No Scenes yet." with "Create Scene".
- **SP-UX-16** "Create Scene" opens `/scenes/new`; submitting a valid title and location opens the new Scene's page with "Scene created.", and the Scene is listed last on the Scenario page.
- **SP-UX-17** An empty or whitespace title shows "Enter a title." and focuses Title; a title or location over 200 characters and Keeper notes over 204,800 bytes show their messages; nothing is saved.
- **SP-UX-18** Bold, italic, underline, strikethrough, Heading, Subheading, Quote, Bulleted list, Numbered list, and Link applied in the editor show formatted on the Scene page after a reload.
- **SP-UX-19** The link dialog accepts only `http` and `https` addresses; a saved link opens in a new tab with `rel="noopener noreferrer"`.
- **SP-UX-20** "Edit" then "Save" stores the title, location, and Keeper notes, shows "Scene saved.", and the change survives a reload; "Cancel" discards the edits.
- **SP-UX-21** Every row and the Scene page show the Scene's status as text; "Started ..." and "Finished ..." appear only once those times are set.
- **SP-UX-22** A Finished Scene's page has no "Edit" and no "Remove Scene" and says "This Scene is finished and can't be changed."; a save refused because the Scene was finished meanwhile shows its message.
- **SP-UX-23** Only a Prepared Scene shows "Remove Scene"; "Cancel" in the dialog keeps it; confirming returns to the Scenario page with "Scene removed." and without the Scene; a refused removal shows "This Scene has been started, so it can't be removed.".
- **SP-UX-24** Moving Scenes behaves as SP-UX-11 to SP-UX-14, with Scene names and messages.
- **SP-UX-25** Scene pages keep the Campaign header with Overview as the current tab (extends SP-UX-8).
- **SP-UX-26** A Player opening a Scene URL, and anyone opening a Scene id of another Scenario or Campaign, sees "We couldn't find that Scene"; a Player opening `/scenes/new` sees "We couldn't find that Scenario".
- **SP-UX-27** While a create, save, or removal is in flight its button is disabled; a second click does nothing.

## 19. Scene accessibility acceptance criteria (WCAG 2.2 AA)

- **SP-A11Y-10** Each page has exactly one `h1`. The Scenes section is a `section` labelled by its `h2` "Scenes", and the list is an `ol`. Headings in Keeper notes are only `h3` and `h4`, below the `h2` "Keeper notes" (1.3.1, 2.4.6).
- **SP-A11Y-11** Status is text in the badge with an `aria-hidden` icon; times are `time` elements with `dateTime` (1.3.1, 1.4.1).
- **SP-A11Y-12** The editable area is a `textbox` with `aria-multiline="true"`, named by its visible label, described by its hint and any error, with `aria-invalid="true"` when invalid; errors are text next to the field (1.3.1, 3.3.1, 3.3.2, 4.1.2).
- **SP-A11Y-13** The toolbar is a `toolbar` named "Formatting" with one tab stop and Arrow, Home, and End navigation; every button has an accessible name, `aria-pressed`, a visible focus ring, and is at least 24 by 24 CSS pixels (40 by 40 used); Ctrl+B, Ctrl+I, and Ctrl+U work (2.1.1, 2.4.7, 2.5.8, 4.1.2).
- **SP-A11Y-14** Tab and Shift+Tab always move focus out of the editor (2.1.2).
- **SP-A11Y-15** Focus moves into the link dialog's field when it opens and back to the editor when it closes; to Title on "Edit" and to "Edit" after Save or Cancel; back to "Remove Scene" when the remove dialog is cancelled; it is never lost to `body` (2.4.3).
- **SP-A11Y-16** "Scene created.", "Scene saved.", and "Scene removed." are announced through `role=status` without moving focus; failures and refusals use `role=alert`; moves use the section's polite live region and nothing is announced on first load (4.1.3).
- **SP-A11Y-17** At 320px and at 200% zoom the Scenes section, the form with its toolbar, and the Scene page fit without horizontal scrolling; long titles and times wrap (1.4.10).

## 20. Scene open decisions and research gaps

- **Deferred:** Duplicate Scene; a Campaign-scoped Location record shared by Scenes (PBI-SP-002 Follow-ups).
- **Deferred:** controls to indent nested lists; a visible "opens in a new tab" cue (WCAG 3.2.5 is AAA).
- **Deferred:** Active and Finished Scene journeys end to end; they become reachable with PBI-SPL-001.
- **Research gap:** whether two heading levels are enough for long Keeper notes.
- **Research gap:** whether Keepers want collapsible notes on the Scene page during play.

## 21. Non-Player Entities: information architecture

```
/campaigns/$campaignId                                    Overview: Keeper-only "Non-Player Entities" section (section 22)
/campaigns/$campaignId/non-player-entities                Non-Player Entity list (section 23)   -> Overview tab current
/campaigns/$campaignId/non-player-entities/new            Create Non-Player Entity (section 24) -> Overview tab current
/campaigns/$campaignId/human-npcs/$humanNpcId             NPC Profile page (section 25)         -> Overview tab current
/campaigns/$campaignId/mythos-creatures/$mythosCreatureId Monster Profile page (section 26)     -> Overview tab current
```

- No Campaign tab is added; three tab labels is the limit at 320px ([campaign-overview ux](../campaign-overview/ux.md) section 2).
- The Overview section is the entry point; the list page is the only full list.
- The profile type is chosen once on the create page and never changes; each type has its own route.
- Players get no entry point. Every Non-Player Entity URL shows them `non-player-entity-not-found`, without an API call. A profile id of another Campaign, or opened under the other type's route, also shows it.
- In UI copy, the type labels are "Human NPC" and "Mythos Creature" and the umbrella is "Non-Player Entities". Never write "NPC" alone, "monster", or "enemy" (root CONTEXT.md).

## 22. Overview section (`non-player-entity-summary-section`, Keeper only)

```
Non-Player Entities                              (h2)   [Create]
12 Human NPCs and 5 Mythos Creatures.
View all Non-Player Entities                     (link)
```

- **Placement:** a `section` labelled by its `h2`, after "Scenarios" and before the Wall preview ([campaign-overview ux](../campaign-overview/ux.md) section 3 order gains it).
- **Counts:** one sentence from the list response, with singular and plural forms ("1 Human NPC and 1 Mythos Creature."). A zero count is left out ("3 Human NPCs.").
- **Actions:** "Create", a link styled as a small button to `/non-player-entities/new`, right of the heading (wraps under it below 640px), with the accessible name "Create Non-Player Entity" (`sr-only` suffix). The link "View all Non-Player Entities" goes to the list page.
- **Empty:** "No Non-Player Entities yet." and the "Create" link; no "View all" link.
- **Loading:** one Skeleton line with `aria-busy="true"`. **Error:** "We couldn't load the Non-Player Entities." with "Try again".
- **Players:** the section is not rendered and its query is never sent.

## 23. Non-Player Entity list page (`non-player-entity-list-page`)

```
< Back to the Overview
Non-Player Entities                               (h1)  [Create]
Search by name [______________]
Type  (o) All  ( ) Human NPCs  ( ) Mythos Creatures
17 shown.                                         (polite live region)
+--------------------------------------------------------------+
| Name                         | Type                           |
| Ghoul                (link)  | Mythos Creature                |
| Mr. Knott            (link)  | Human NPC                      |
+--------------------------------------------------------------+
```

- **Heading and actions:** `h1` "Non-Player Entities"; "Create" as in section 22. A "Back to the Overview" link with an `aria-hidden` ArrowLeft icon.
- **Search:** an `Input` labelled "Search by name". It filters the loaded list on the client as the Keeper types, case- and accent-insensitive (`localeCompare` base sensitivity, substring match). No request is sent.
- **Type filter:** a `RadioGroup` in a `fieldset` with the legend "Type": All (default), Human NPCs, Mythos Creatures.
- **Reset:** search and filter are local component state; leaving the page and coming back shows All with an empty search. Nothing is stored in the URL or the browser.
- **List:** a `Table` with the columns Name and Type, sorted by name (`Intl.Collator`, viewer's locale). Name is a link to the profile page (`break-words`). Below 640px the table becomes a `ul` where each item shows the name link and, under it, the type in muted text.
- **Result count:** a polite live region announces "{n} shown." after the search or filter changes (debounced 500 ms); nothing is announced on first load.
- **No match:** "No Non-Player Entities match these filters." with a "Clear filters" button that resets both and moves focus to the search field.
- **Empty Campaign:** "No Non-Player Entities yet." and the "Create" link; search and filter are not rendered.
- **Loading:** three Skeleton rows with `aria-busy="true"`. **Error:** "We couldn't load the Non-Player Entities." with "Try again".

## 24. Create page (`create-non-player-entity-page`)

```
Create Non-Player Entity                          (h1)
Type                                              (fieldset legend)
  ( ) Human NPC        A person.
  ( ) Mythos Creature  A beast, folklore creature, Mythos monster, or unique entity.
  You can't change the type later.
Name [________________]
Age  [___]   Any age from 0 to 150.               (only for Human NPC)
[Create]  Cancel
```

- **Type:** a `RadioGroup` in a `fieldset` with the legend "Type" and no default selection. Each option has a one-line description connected with `aria-describedby`; the hint "You can't change the type later." is connected to the fieldset.
- **Name:** `Input` labelled "Name". **Age:** `Input` labelled "Age", `inputMode="numeric"`, with the hint "Any age from 0 to 150."; rendered only while Human NPC is selected. Switching to Mythos Creature hides Age and keeps its value until submit, where it is not sent.
- No field has a `maxLength` attribute.
- **Validation on submit,** in field order Type, Name, Age: "Choose Human NPC or Mythos Creature." / "Enter a name." / "Name must be 200 characters or fewer." / "Enter an age." / "Enter an age from 0 to 150, in whole years.". Errors are inline (`aria-invalid`, `aria-describedby`); focus moves to the first invalid field. A 400 maps to the same field errors.
- **Actions:** primary "Create" ("Creating..." while busy, disabled); secondary "Cancel", a link back to the list page.
- **Success:** navigate to the new profile page with the navigation status message "Human NPC created." or "Mythos Creature created."; the list and the Overview counts are invalidated. The page opens in view, like a new Scene.
- **Failure:** an `Alert` (`role=alert`) "We couldn't create the Non-Player Entity. Try again."; the input is kept.
- **Unsaved edits:** `useUnsavedChangesPrompt(isDirty)`.

## 25. Profile page layout (`human-npc-page`, `mythos-creature-page`)

Both profile pages share this layout. The field-level content of each section (inputs, rows, and stat-block formatting) is specified with its PBI: NPC Profile sections in PBI-SP-003, Monster Profile sections in PBI-SP-009, both in this section's subsections 25.4 and 25.5.

### 25.1 View

```
< Back to Non-Player Entities
Human NPC created.                                (role=status)
Mr. Knott                                         (h1)
Human NPC . Age 62                                (muted line)
Details                                           (h2)  dl: Profession, Goal, ...
Characteristics                                   (h2)  only when added
Skills                                            (h2)  only when added
Keeper notes                                      (h2)
[Edit] [Duplicate] [Delete]
```

- **Header:** "Back to Non-Player Entities" link; `role=status` paragraph; `h1` the name (`break-words`); a muted line with the type, then the age (Human NPC) or the Creature Kind (Mythos Creature, when set), separated by `aria-hidden` dots.
- **Sections:** each added section is an `h2` with its content, in the fixed order of the profile type (25.4, 25.5), whatever order they were added in. Sections that were not added are not shown. "Details" (the narrative fields) and "Keeper notes" are always shown; Details lists only filled fields in a `dl`, or "No details yet." in muted text; Keeper notes use `rich-text-view` or "No Keeper notes yet.".
- **Computed values** (Hit Points, Magic Points, Damage Bonus, Build, MOV, difficulty) come from the server response and are text, never disabled inputs. A value that cannot be computed yet is not shown; MOV outside the covered ages shows "Not covered by the rules for this age". A Derived Value Override shows the override, then "(computed {value})" and its reason.
- **Stat tables:** from 640px, characteristic and skill groups are a `Table`; below 640px they reflow to a `dl` so nothing scrolls sideways at 320px.
- **Actions:** outline "Edit", outline "Duplicate" (PBI-SP-010), and "Delete" (outline, destructive text).

### 25.2 Edit mode

```
Mr. Knott                                         (h1, saved name)
[There are 2 problems: link, link]                (error summary, only after a failed save)
Details                         (fieldset)  Name, Age, Profession, Goal, ...
Characteristics                 (fieldset)                 [Remove section]
Skills                          (fieldset)                 [Remove section]
Add a section                   (group)     [Add Combat] [Add Spells]
Keeper notes                    (fieldset)
+--------------------------------------------------------------+
| [Save] [Cancel]                          (sticky action bar) |
+--------------------------------------------------------------+
```

- "Edit" swaps the whole view for one form, prefilled; the `h1` keeps the saved name; focus moves to the Name field.
- **Sections:** each section is a `fieldset` whose `legend` is styled like the view's `h2`. Details and Keeper notes are always present. Every added optional section has an outline "Remove section" button (accessible name "Remove {section} section") in its legend row.
- **Adding:** a group labelled "Add a section" sits after the last optional section position and holds one outline button per section not yet added ("Add Combat"). Activating one inserts the section in its fixed position, empty, removes its button from the group, moves focus to the section's first field, and the form's polite live region announces "{section} section added.". When every section is added, the group is not rendered.
- **Removing:** an empty section is removed at once. A section with any entered value opens an `AlertDialog` "Remove the {section} section?" with "Its values are deleted when you save." and the buttons "Keep section" (default focus) and "Remove section". After removing, focus moves to that section's button in "Add a section", and "{section} section removed." is announced. Removal takes effect only on Save; Cancel restores the saved profile.
- **Repeating rows** (skills, weapons, attacks, spells, powers, immunities, vulnerabilities, movement modes): each list ends with an outline "Add {item}" button; each row has a ghost "Remove" button named "Remove {item} {row label}" (for example "Remove skill Spot Hidden", or "Remove skill 3" when the row has no name yet), at least 40x40 CSS px. Removing a row needs no confirmation, because Cancel restores it. After adding, focus moves to the new row's first field; after removing, to the next row's first field, else the previous row's, else "Add {item}". At 100 rows the Add button is replaced by the muted text "You've reached the limit of 100 {items}.".
- **Computed values are not recalculated while editing;** the server computes them (ADR 0017). Each section with computed values shows the muted hint "Hit Points and other worked-out values update when you save." once.
- **Action bar:** "Save" ("Saving..." while busy, disabled) and "Cancel", in a bar `sticky bottom-0` with the page background and a top border. The form has `scroll-padding-bottom` equal to the bar's height, so a focused field is never hidden behind it.
- **Validation:** the client checks only that Name is filled and Age (Human NPC) is a whole number from 0 to 150; every other rule is the server's, and a 400 maps each problem to its field by path. When a save fails validation, an error summary `Alert` (`role=alert`, focused, `tabIndex=-1`) above the form says "There is 1 problem" or "There are {n} problems" and lists each message as a link to its field; each field also shows its message inline (`aria-invalid`, `aria-describedby`).
- **Save success:** back to the view, the status says "Human NPC saved." or "Mythos Creature saved.", focus moves to "Edit"; the list and counts are invalidated.
- **Cancel:** discards the edits without confirmation; focus moves to "Edit".
- **Save failure (not validation):** the form stays, with "We couldn't save the {type}. Try again." (`role=alert`).
- **Unsaved edits:** `useUnsavedChangesPrompt(isDirty)`; adding or removing a section or row counts as a change.

### 25.3 Delete and Duplicate

- **Delete (`delete-non-player-entity-dialog`, `AlertDialog`):** title "Delete {name}?", description "This can't be undone.", buttons "Cancel" and "Delete" ("Deleting..." while busy, both disabled). Failure: "We couldn't delete {name}. Try again." (`role=alert`) in the dialog. From PBI-SP-004, a refusal (409) shows "{name} is part of a Scene that has been played, so it can't be deleted.". Success navigates to the list page with the status "{name} deleted." and invalidates the list and counts. Cancel returns focus to "Delete".
- **Duplicate (PBI-SP-010):** activates at once, with no dialog. The button reads "Duplicating..." and is disabled while busy. Success navigates to the copy's profile page with the status "Copy created. It isn't part of any Scene."; failure shows "We couldn't duplicate {name}. Try again." (`role=alert`) under the actions.

### 25.4 NPC Profile sections

Fixed order: Details (Name, Age, then the narrative fields), Characteristics, Skills, Combat, Spells, Keeper notes. Field-level content: added at the start of PBI-SP-003.

### 25.5 Monster Profile sections

Fixed order: Details (Name, Creature Kind, then the narrative fields), Characteristics and derived values, Movement, Combat (attacks per round, Dodge, attacks), Defenses (armor, immunities, vulnerabilities), Skills, Spells, Powers, Sanity loss, Keeper notes. Field-level content: added at the start of PBI-SP-009.

### 25.6 States

- **Loading:** a Skeleton for the `h1`, the type line, and two sections, with `aria-busy`.
- **Error:** "We couldn't load this {type}." with "Try again".
- **Not found (`non-player-entity-not-found`):** `h1` "We couldn't find that Non-Player Entity" and the link "Back to your Campaign", mirroring `scenario-not-found`.

## 26. Non-Player Entity content

| Key | Copy |
|---|---|
| Section and list heading | Non-Player Entities |
| Create action / page h1 / submit | Create (named "Create Non-Player Entity") / Create Non-Player Entity / Create |
| Counts | {n} Human NPC(s) and {m} Mythos Creature(s). |
| View all | View all Non-Player Entities |
| Empty | No Non-Player Entities yet. |
| Load errors | We couldn't load the Non-Player Entities. / We couldn't load this {type}. |
| Search / filter | Search by name / Type: All, Human NPCs, Mythos Creatures / {n} shown. |
| No match | No Non-Player Entities match these filters. / Clear filters |
| Type options | Human NPC: A person. / Mythos Creature: A beast, folklore creature, Mythos monster, or unique entity. / You can't change the type later. |
| Fields | Name / Age, hint "Any age from 0 to 150." |
| Create errors | Choose Human NPC or Mythos Creature. / Enter a name. / Name must be 200 characters or fewer. / Enter an age. / Enter an age from 0 to 150, in whole years. |
| Busy | Creating... / Saving... / Deleting... / Duplicating... |
| Status | {type} created. / {type} saved. / {name} deleted. / Copy created. It isn't part of any Scene. |
| Sections | Add a section / Add {section} / Remove section / {section} section added. / {section} section removed. |
| Remove section dialog | Remove the {section} section? / Its values are deleted when you save. / Keep section / Remove section |
| Rows | Add {item} / Remove {item} {row label} / You've reached the limit of 100 {items}. |
| Computed hint | Hit Points and other worked-out values update when you save. |
| MOV gap | Not covered by the rules for this age |
| Error summary | There is 1 problem / There are {n} problems |
| Failures | We couldn't create the Non-Player Entity. Try again. / We couldn't save the {type}. Try again. / We couldn't delete {name}. Try again. / We couldn't duplicate {name}. Try again. |
| Delete dialog | Delete {name}? / This can't be undone. / Delete |
| Delete refused (PBI-SP-004) | {name} is part of a Scene that has been played, so it can't be deleted. |
| Empty view | No details yet. / No Keeper notes yet. |
| Not found | We couldn't find that Non-Player Entity / Back to your Campaign |

The "{n} shown." count uses "1 shown." for one result.

## 27. Non-Player Entity component mapping

| Element | Component |
|---|---|
| Overview section | New `non-player-entity-summary-section` in `frontend/src/scenario-preparation/components/`, mounted by `campaign-page` for the Keeper after `scenario-list-section` |
| List page | New `non-player-entity-list-page`, route `routes/campaigns.$campaignId.non-player-entities.index.tsx`; filtering in a pure `services/nonPlayerEntityFilter.ts` |
| Create page | New `create-non-player-entity-page`, route `routes/campaigns.$campaignId.non-player-entities.new.tsx` |
| Profile pages | New `human-npc-page` (route `routes/campaigns.$campaignId.human-npcs.$humanNpcId.tsx`, PBI-SP-003) and `mythos-creature-page` (route `routes/campaigns.$campaignId.mythos-creatures.$mythosCreatureId.tsx`, PBI-SP-009) |
| Section pattern | New `profile-section` (view `h2` or edit `fieldset` with Remove), `add-section-group`, `remove-section-dialog` (`AlertDialog`), and `repeating-rows`, shared by both editors |
| Error summary | New `form-error-summary` (`Alert` with links to fields) in the slice |
| Action bar | New `sticky-form-actions` |
| Delete dialog | New `delete-non-player-entity-dialog` (`AlertDialog`, like `remove-scene-dialog`) |
| Not found | New `non-player-entity-not-found` |
| Primitives | Existing `RadioGroup`, `Input`, `Label`, `Textarea`, `Table`, `Button`, `Alert`, `AlertDialog`, `Skeleton`, `rich-text-editor`, `rich-text-view`; no new primitives |

Stories cover:
- **`non-player-entity-summary-section`:** empty, only Human NPCs, both types with singular and plural counts, loading, and error.
- **`non-player-entity-list-page`:** empty Campaign, many profiles, search with matches, no match, each filter, 320px, loading, and error.
- **`create-non-player-entity-page`:** no type chosen, Human NPC with Age, Mythos Creature, every field error, creating, and failure.
- **Section pattern:** a section with and without values, the add group with some and with no buttons left, the remove dialog, repeating rows with zero, one, and 100 rows, and the error summary.
- **`delete-non-player-entity-dialog`:** idle, deleting, failure, and refused.

## 28. Non-Player Entity UX acceptance criteria

- **SP-UX-28** The Keeper's Overview shows a "Non-Player Entities" section with the counts sentence, "View all Non-Player Entities", and "Create", or "No Non-Player Entities yet." with "Create"; a Player sees no section.
- **SP-UX-29** The list page lists every Non-Player Entity of the Campaign by name with its type, sorted by name; each name opens its profile page.
- **SP-UX-30** Typing in "Search by name" and choosing a type narrow the list at once and announce "{n} shown."; with no match, "Clear filters" restores the full list. Returning to the page shows All and an empty search.
- **SP-UX-31** The create page requires a type, a name, and, for a Human NPC, an age from 0 to 150, showing each message from section 26; Age is shown only for a Human NPC.
- **SP-UX-32** Creating opens the new profile page with "{type} created."; the profile is in the list and the counts.
- **SP-UX-33** In Edit mode, "Add {section}" inserts the section in its fixed position and focuses its first field; "Remove section" on a section with values asks first; removed sections are gone after Save and restored by Cancel.
- **SP-UX-34** "Add {item}" and "Remove {item} ..." add and remove rows; at 100 rows the Add button is replaced by the limit message.
- **SP-UX-35** A save the server refuses shows the error summary with one link per problem, each moving focus to its field, and the message next to each field; nothing is saved.
- **SP-UX-36** After Save, the view shows the saved sections in their fixed order and the server's computed values; MOV outside ages 15-89 shows "Not covered by the rules for this age"; an override shows its computed value and reason.
- **SP-UX-37** "Delete" asks first; confirming returns to the list with "{name} deleted." and without the profile; "Cancel" keeps it.
- **SP-UX-38** "Duplicate" opens the copy's page named "{name} (copy)" with "Copy created. It isn't part of any Scene." (PBI-SP-010).
- **SP-UX-39** A Player opening any Non-Player Entity URL, and anyone opening a profile of another Campaign or under the other type's route, sees "We couldn't find that Non-Player Entity".
- **SP-UX-40** While a create, save, delete, or duplicate is in flight its button is disabled; a second activation does nothing.
- **SP-UX-41** Non-Player Entity pages keep the Campaign header with Overview as the current tab (extends SP-UX-8).

## 29. Non-Player Entity accessibility acceptance criteria (WCAG 2.2 AA)

- **SP-A11Y-18** Each page has exactly one `h1`. The Overview section is a `section` labelled by its `h2`; profile sections are `h2` in view and `fieldset` with `legend` in edit; the type choice and type filter are `fieldset`s with legends (1.3.1, 2.4.6).
- **SP-A11Y-19** Every field has a visible label; hints and errors are connected with `aria-describedby`; invalid fields have `aria-invalid="true"` (1.3.1, 3.3.1, 3.3.2).
- **SP-A11Y-20** The error summary receives focus after a refused save, and each of its links moves focus to its field (2.4.3, 3.3.1, 3.3.3).
- **SP-A11Y-21** "Add {section}", "Remove section", "Add {item}", and "Remove {item} {row label}" are `button`s with unique accessible names, at least 24 by 24 CSS pixels (40 by 40 used for row Remove) (2.4.6, 2.5.8, 4.1.2).
- **SP-A11Y-22** Focus moves to a new section's or row's first field, after a removal to the place section 25.2 names, into and back out of every dialog, and is never lost to `body` (2.4.3).
- **SP-A11Y-23** Section changes, result counts, and status messages are announced through polite live regions or `role=status`, never on first load; failures use `role=alert` (4.1.3).
- **SP-A11Y-24** A field that receives focus is never hidden behind the sticky action bar (2.4.11).
- **SP-A11Y-25** Type, difficulty, overrides, and "not covered" are conveyed in text, never only by color (1.4.1).
- **SP-A11Y-26** At 320px and at 200% zoom the list, create page, and profile pages fit without horizontal scrolling; stat tables reflow to definition lists and long names wrap (1.4.10).

## 30. Non-Player Entity open decisions and research gaps

- **Open (PBI-SP-003, PBI-SP-009):** field-level editor content for each section (sections 25.4 and 25.5), designed through the UX designer skill at the start of each PBI.
- **Deferred:** a profession or Creature Kind column in the list; the list response carries only `{id, type, name}`.
- **Deferred:** linking a profile to a Scene from its profile page (PBI-SP-004 designs linking on the Scene page).
- **Research gap:** whether one long Edit form is workable for a full Monster Profile at the table, or per-section editing (Option B) is needed after all.
- **Research gap:** whether Keepers want the list grouped by Scenario once Scene links exist.

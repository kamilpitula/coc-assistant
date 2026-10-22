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

Monster Profile field-level design (PBI-SP-009): **Option B, a long form plus an "On this page" section index**, chosen 2026-10-18 (section 25.5). Option A (the plain long form) was rejected because Sanity loss and attacks are hard to find in a full profile at the table; Option C (per-section editing) was rejected because it reopens section 25.2 and adds a second editing pattern. Design record: [docs/scenario-preparation/issues/09-create-mythos-creature-profiles.design.md](../../docs/scenario-preparation/issues/09-create-mythos-creature-profiles.design.md).

Scene links (PBI-SP-004): **Option B, dedicated link pages** (a "Non-Player Entities" section on the Scene page, a link page with a searchable picker, and an edit page per link), chosen 2026-10-21. A Non-Player Entity may be linked to the same Scene more than once; the Scene page shows only a link to the profile, not a profile summary; the Player-facing name starts empty. Alternatives considered:
- **Option A (a link dialog on the Scene page):** rejected because the rich-text editor's link dialog would nest inside it, the editor and picker are cramped at 320px, and dismissing the dialog could silently discard a long description.
- **Option C (links as repeating rows in the Scene's Edit mode):** rejected because several rich-text editors make one heavy form, a `Select` cannot search a long list, and editing one description during play would open the whole Scene form.

Scene links are specified in sections 31 to 39. Design record: [docs/scenario-preparation/issues/04-link-entities-to-scenes.design.md](../../docs/scenario-preparation/issues/04-link-entities-to-scenes.design.md).

Handouts (PBI-SP-005): **Option C, a compact ordered "Handouts" list on the Scene page with a page per Handout (view plus Edit toggle)**, chosen 2026-10-22. The kind may change between Read-aloud and Text; the text is required; Handouts can be moved on Active Scenes. Alternatives considered:
- **Option A (each Handout in full on the Scene page, with add and edit pages like Scene links):** not selected. The Scene page grows long with several long Handouts, moves are hard to follow, and each Handout gets no page of its own ahead of file and Item Handouts.
- **Option B (inline editing inside each Handout card):** not selected. It adds a third editing pattern (per-section editing was already rejected for profiles), puts a rich-text editor inside a long page with move controls, and risks losing text on a refetch.

Handouts are specified in sections 40 to 49. Design record: [docs/scenario-preparation/issues/05-attach-protect-handouts.design.md](../../docs/scenario-preparation/issues/05-attach-protect-handouts.design.md).

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
Handouts                                          (h2)  [Add Handout]  (section 41)
Non-Player Entities                               (h2)  [Link a Non-Player Entity]  (section 32)
[Edit] [Remove Scene]
```

- **View:**
  - A link "Back to the Scenario" with an `aria-hidden` ArrowLeft icon.
  - A `role=status` paragraph for the navigation status message and "Scene saved.".
  - `h1` the Scene title (`break-words`), then a line with the status badge and the times (section 12).
  - A `dl` with "Location" and its value, only when a location is set.
  - `h2` "Keeper notes" with `rich-text-view`, or "No Keeper notes yet." in muted text when there are none.
  - The "Handouts" section (section 41), in view mode only.
  - The "Non-Player Entities" section (section 32), in view mode only; in Edit mode it is not shown.
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
/campaigns/$campaignId/mythos-creatures/$mythosCreatureId Monster Profile page (section 25)     -> Overview tab current
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
- **Computed values** (Hit Points, Magic Points, Damage Bonus, Build, MOV, difficulty) come from the server response and are text, never disabled inputs. A value that cannot be computed yet is not shown; MOV outside the covered ages shows "Not covered by the rules for this age". On a Monster Profile only, a Derived Value Override shows the override, then "(computed {value})" and its reason; NPC Profiles have none. Investigator Difficulty is shown on both profile types (25.4, 25.5).
- **Section index:** the Monster Profile page only has an "On this page" section index under the header (25.5).
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

- **Delete (`delete-non-player-entity-dialog`, `AlertDialog`):** title "Delete {name}?", description "This can't be undone. It is also removed from any Prepared Scene it is part of.", buttons "Cancel" and "Delete" ("Deleting..." while busy, both disabled). Failure: "We couldn't delete {name}. Try again." (`role=alert`) in the dialog. From PBI-SP-004, a refusal (409) shows "{name} is part of a Scene that has been played, so it can't be deleted." and disables Delete; Cancel closes the dialog. Success navigates to the list page with the status "{name} deleted." and invalidates the list and counts. Cancel returns focus to "Delete".
- **Duplicate (PBI-SP-010):** activates at once, with no dialog. The button reads "Duplicating..." and is disabled while busy. Success navigates to the copy's profile page with the status "Copy created. It isn't part of any Scene." and moves focus to the copy's `h1`; failure, including a not-found answer, shows "We couldn't duplicate {name}. Try again." (`role=alert`) under the actions and focus stays on "Duplicate". Duplicate is shown only in the view, never in Edit mode. The server names the copy; the client never computes the name.

### 25.4 NPC Profile sections

Selected 2026-10-17 (PBI-SP-003): **compact rows with progressive disclosure.** Alternatives considered:
- **One card per row** (the Investigator Custom Weapons pattern): rejected because a 15-skill NPC becomes several screens of cards, which slows copying values from a book.
- **Stat-line text entry** (paste "STR 70 CON 60 ..." and parse it into rows): rejected because it needs a client parser, gives two editing surfaces for the same data, and cannot map server problems to fields (SP-UX-35).

Fixed order: Details, Characteristics, Skills, Combat, Spells, Keeper notes. Values are whole numbers; number inputs use `inputMode="numeric"`. No half or fifth values are shown. Skills, characteristics, and Dodge show their Investigator Difficulty (root CONTEXT.md; [NPC ruleset section 3.4](../../docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#34-skill-difficulty-for-an-investigator-opposing-an-npc-or-monster)) as text.

**Details** (always present)
- **Edit:** Name and Age on one row from 640px (Age 6rem wide, hint "Any age from 0 to 150."); "Profession or role" (`Input` with the Era's Occupation names as datalist suggestions, hint "Choose a suggestion or type your own."); then the `Textarea`s "Short description", "Goal", "Relationship to the Investigators", "What the Human NPC knows", "What the Human NPC hides", and "Behavior cue" (3 rows, full width).
- **View:** a `dl` of the filled narrative fields in that order; "No details yet." when none.

**Characteristics**
- **Edit:** a grid of 8 number inputs in rule order STR, CON, DEX, APP, POW, SIZ, INT, EDU (4 columns from 640px, 2 below). The visible label is the code; the accessible name adds the full name ("STR Strength"). Hint once: "Enter only the characteristics this Scenario needs, from 0 to 100.", then the computed hint of section 25.2.
- **View:** a `Table` "Characteristic | Value | Investigator difficulty" with only the entered characteristics (a `dl` below 640px); difficulty reads Regular, Hard, or Extreme. Then an `h3` "Worked-out values" and a `dl` of Hit Points, Magic Points, Damage Bonus, Build, and MOV, each only when the characteristics (and for MOV the age) it needs are present. MOV for an age outside 15-89 reads "Not covered by the rules for this age" ([project_ruleset.md section 5.3](../../docs/game-rules/project_ruleset.md#53-human-movement-outside-the-covered-ages)). When none can be worked out: "Worked-out values appear when the characteristics they need are entered." An added section with no values shows "None recorded."

**Skills** (repeating rows; item "skill"; row label the skill name with "(Specialization)", else "skill {n}")
- **Edit:** each row is a `role="group"` labelled "Skill {n}", on one line from 640px: "Skill" (`Input` with the Era's skill names as datalist suggestions; any name is accepted) | "Specialization" (`Select` from the specialization list, shown only when Skill is Fighting or Firearms, case-insensitive) | "Value" (number) | Remove (ghost, 40x40). Below 640px, Skill and Specialization are full width and Value and Remove share a line. Hint once: "Choose a skill from the list or type your own. Fighting and Firearms need a specialization from the list.", then the computed hint.
- **Skill list failure:** an inline `Alert` "We couldn't load the skill list. You can still type skill names." with "Try again"; Specialization is a text `Input` until the list loads.
- **View:** a `Table` "Skill | Value | Investigator difficulty" in the entered order (a `dl` below 640px); "None recorded." for an empty added section.

**Combat**
- **Edit:** "Dodge" and "Armor points" (numbers) on one line; "Tactics and morale" (`Textarea`); then a `fieldset` "Weapons" with repeating rows (item "weapon"; row label the weapon name, else "weapon {n}"): "Name" | "Skill" (`Select` of this profile's skill rows, including rows not yet saved, shown as "Firearms (Handgun)"; with no skill rows, the hint "Add the skill under Skills first.") | "Damage" | "Attacks per round" | Remove. Hint once under the legend: "Damage uses dice like 1D6+DB or 2D6-1. Firearms don't add DB." Under each row, a `Collapsible` trigger "More details for {row label}" (`aria-expanded`) holds "Range", "Ammunition", "Malfunction" (`Input`s) and the `Checkbox` "Impaling weapon". It starts open when any of these has a value or a server problem, else closed; its state is not saved. Then the computed hint.
- **View:** a `dl` with Dodge and its Investigator difficulty, Armor points, and Tactics and morale; a `Table` "Weapon | Skill | Damage | Attacks | Details", where Skill reads "{skill} {value}%" and Details joins the filled optional fields ("Range 15 yards; Ammunition 6; Malfunction 100; Impaling"); a `dl` per weapon below 640px. "None recorded." for an empty added section.

**Spells** (repeating rows; item "spell"; row label the name, else "spell {n}")
- **Edit:** "Name" | "Magic Point cost" (free text, [project_ruleset.md section 5.6](../../docs/game-rules/project_ruleset.md#56-spells-and-powers-without-a-catalog)) | Remove on one line; "Effect" (`Textarea`) full width under them.
- **View:** a list; each item shows the name, "Magic Point cost {cost}" in muted text, and the effect.

**Keeper notes:** as Scene Keeper notes (section 15).

**Server problems.** A refused save returns each problem under its request path ([ADR 0018](../../docs/adr/0018-scenario-preparation-validation-problems-keyed-by-request-path.md)); the form shows the server's message inline and in the error summary. A problem whose path matches no field is listed in the summary without a link. Messages:

| Problem | Message |
|---|---|
| Name | Enter a name. / Name must be 200 characters or fewer. |
| Age | Enter an age. / Enter an age from 0 to 150, in whole years. |
| Plain-text field too long | {Field} must be 4,000 characters or fewer. |
| Row text too long | {Field} must be 1,000 characters or fewer. |
| Characteristic | Enter {code} from 0 to 100. |
| Skill | Enter the skill's name. / Enter a value from 0 to 100. / Choose a {family} specialization from the list. |
| Dodge / Armor points | Enter Dodge from 0 to 100. / Enter armor points from 0 to 2,000. |
| Weapon | Enter the weapon's name. / Choose a skill this Human NPC has. / Enter the damage. / Write the damage as dice and numbers, for example 1D6+DB or 2D6-1. / Damage Bonus doesn't apply to firearms. Remove DB from the damage. / Enter attacks per round from 1 to 99. |
| Spell | Enter the spell's name. |
| Too many rows | Add at most 100 {items}. |
| Keeper notes | As for Scene Keeper notes. |

**Components** (in `frontend/src/scenario-preparation/components/`, beside section 27): `human-npc-view` and `human-npc-form`, with `npc-characteristics-fields`, `npc-skill-rows`, `npc-combat-fields`, and `npc-spell-rows` for editing and their view counterparts. They reuse `WizardField`, `WizardSelect`, and the skill and Occupation catalog hooks from `campaign-play`, and the existing `Collapsible` and `Checkbox` primitives.

### 25.5 Monster Profile sections

Selected 2026-10-18 (PBI-SP-009): **the long form of section 25.2 plus an "On this page" section index**, with compact rows as in 25.4. Alternatives considered:
- **Option A (the plain long form):** rejected because Sanity loss and attacks are hard to find in a full Monster Profile at the table.
- **Option C (per-section editing):** rejected because it reopens section 25.2 and adds a second editing pattern next to the Human NPC and Scene pages.

Fixed order: Details, Characteristics, Movement, Combat, Defenses, Skills, Spells, Powers, Sanity loss, Keeper notes. The "Add a section" buttons read "Add Characteristics", "Add Movement", "Add Combat", "Add Defenses", "Add Skills", "Add Spells", "Add Powers", and "Add Sanity loss". Values are whole numbers; number inputs use `inputMode="numeric"`. No half or fifth values and no MOV are shown ([NPC ruleset section 5.3](../../docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#53-step-3--assign-characteristics-and-movement)). Characteristics, skills, attack skill values, and Dodge show their Investigator Difficulty as text ([project_ruleset.md section 5.9](../../docs/game-rules/project_ruleset.md#59-monster-profile-skills-and-attacks)).

**Section index (`profile-section-index`)**
- Under the header's muted line, in view and in edit: a muted label "On this page" (`p`) and a `nav` with `aria-labelledby` that label, holding an inline list of links, one per present section in the fixed order, separated by `aria-hidden` dots. Details and Keeper notes are always listed.
- A link scrolls to its section and moves focus to it: the view's `section` or the edit `fieldset`, each with an `id` and `tabIndex=-1`. In edit the list follows added and removed sections.
- It is not sticky, so it never competes with the sticky action bar (SP-A11Y-24). It wraps at 320px; each link is at least 24px tall.
- Human NPC pages have no section index.

**Details** (always present)
- **Edit:** "Name" (full width); "Creature Kind" (`Select`, 12rem wide: "Not set", Beast, Folklore, Mythos, Unique; hint "It only organizes your profiles and has no game effect."); then the `Textarea`s "Description and sensory cues", "Origin", "Goal and typical behavior", "Signs and traces", "Defeat outcome" (hint "What happens at zero Hit Points or when it loses a conflict."), and "Specimen range notes" (3 rows, full width).
- **View:** Creature Kind is in the header line (25.1); a `dl` of the filled narrative fields in that order; "No details yet." when none.

**Characteristics**
- **Edit:** a grid of number inputs STR, CON, SIZ, DEX, INT, POW (3 columns from 640px, 2 below). The visible label is the code; the accessible name adds the full name ("STR Strength"). Under the grid, the outline buttons "Add APP" and "Add EDU"; each is replaced by its input when activated, and focus moves to that input. An input with a saved value is always shown. Hint once: "Enter only the characteristics this Mythos Creature needs, from 0 to 2,000.", then the computed hint of section 25.2.
- **Worked-out values (edit):** a nested `fieldset` with a legend styled like an `h3`, "Worked-out values":
  - **Hit Points:** a `RadioGroup` in its own `fieldset` (legend "Hit Points"): "Work out from the characteristics" (default), "Override", "Not applicable". "Override" reveals "Hit Points" (number, 6rem, hint "From 1 to 9,999.") and "Reason". "Not applicable" reveals the hint "Describe the Defeat outcome under Details."
  - **Magic Points, Damage Bonus, Build:** each a `Checkbox` "Override {value}" that reveals "{value}" and "Reason". Hints: Magic Points "From 0 to 9,999."; Damage Bonus (text, 8rem) "Write it like +1D4, -1, or 0."; Build "From -2 to 99."
  - **Reason:** an `Input`, full width; the accessible name is "Reason for the {value} override"; hint "Why it differs from the rules, up to 500 characters."
  - Clearing a checkbox or choosing another Hit Points option hides the fields and drops their values on Save; Cancel restores them. Either counts as a change.
- **View:** a `Table` "Characteristic | Value | Investigator difficulty" with only the entered characteristics (a `dl` below 640px). Then an `h3` "Worked-out values" and a `dl` of Hit Points, Magic Points, Damage Bonus, and Build. Each reads:
  - the computed value; or
  - "{override} (computed {value})" with a muted line "Reason: {reason}"; or
  - "{override} (no computed value: needs CON and SIZ)" for Hit Points, "needs POW" for Magic Points, "needs STR and SIZ" for Damage Bonus and Build, with the reason line; or
  - for Hit Points marked not applicable: "Not applicable" with a muted line "Defeat outcome: {defeat outcome}".

  A value with nothing to show is left out; when none can be shown: "Worked-out values appear when the characteristics they need are entered."

**Movement** (repeating rows; item "movement mode"; row label the mode, or "Other ({name})", else "movement mode {n}")
- **Edit:** each row is a `role="group"` labelled "Movement mode {n}": "Mode" (`Select`: Walk, Swim, Fly, Burrow, Other; a new row starts at Walk) | "Name of the mode" (`Input`, only for Other) | "Rate" (number) | Remove. Hint once: "Enter each way it moves, from 0 to 999. With no modes it has no ordinary movement."
- **View:** a `dl` ("Walk 8", "Other (phasing) 10"); an added empty section reads "No ordinary movement."

**Combat**
- **Edit:** "Attacks per round" and "Dodge" (numbers) on one line; then a `fieldset` "Attacks" with repeating rows (item "attack"; row label the name, else "attack {n}"), each a group labelled "Attack {n}": "Name" | "Skill" (`Input`, a new row is prefilled "Fighting") | "Value" (number) | "Damage" | Remove. Hint once under the legend: "Damage uses dice like 1D6+DB or 2D6-1. Write DB only where Damage Bonus applies; firearms never add it." Under each row, a `Collapsible` trigger "More details for {row label}" (`aria-expanded`) holds "Effect" (`Textarea`, for example grapples, drains, or escape conditions) and the `Checkbox` "Manoeuvre (no damage needed)". It starts open when either has a value or a server problem, else closed; its state is not saved.
- **View:** a `dl` with Attacks per round and Dodge with its Investigator difficulty; a `Table` "Attack | Skill | Investigator difficulty | Damage | Effect", where Skill reads "{skill} {value}%" and Damage reads "Manoeuvre" for a manoeuvre without damage; a `dl` per attack below 640px. "None recorded." for an empty added section.

**Defenses**
- **Edit:** "Armor points" (number) and "Armor note" (`Textarea`, 2 rows); then the `fieldset`s "Immunities" and "Vulnerabilities", each with repeating rows (items "immunity" and "vulnerability"; row labels "immunity {n}" and "vulnerability {n}") of one "Description" `Textarea` (2 rows) and Remove. Hint once: "Say what it covers and when, for example: Ordinary bullets inflict no damage." ([NPC ruleset section 5.6](../../docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#56-step-6--set-armour-immunities-and-vulnerabilities)).
- **View:** a `dl` of Armor points and Armor note; `h3` "Immunities" and "Vulnerabilities", each with a `ul`, only when it has entries. "None recorded." when the whole section is empty.

**Skills** (repeating rows; item "skill"; row label the name, else "skill {n}")
- **Edit:** "Skill" (`Input` with the Era's skill names as datalist suggestions; any name is accepted) | "Value" (number) | Remove. Hint once: "Choose a skill from the list or type your own, with a value from 0 to 2,000." Skill list failure: as in 25.4, without a Specialization field.
- **View:** a `Table` "Skill | Value | Investigator difficulty" in the entered order (a `dl` below 640px); "None recorded." for an empty added section.

**Spells:** as in 25.4.

**Powers** (repeating rows; item "power"; row label the name, else "power {n}")
- **Edit:** as Spells, plus "Limits" (`Input`, full width, hint "Use limits, recovery, or other restrictions.").
- **View:** as Spells, plus "Limits: {limits}" in muted text.

**Sanity loss**
- **Edit:** one `Input` "Sanity loss", 10rem wide, hint "Success/failure, for example 0/1D6 or 1/1D10."
- **View:** "Sanity loss 0/1D6"; an added empty section reads "No Sanity roll."

**Keeper notes:** as Scene Keeper notes (section 15).

**Server problems.** As in 25.4 (ADR 0018). Messages:

| Problem | Message |
|---|---|
| Name | Enter a name. / Name must be 200 characters or fewer. |
| Creature Kind | Choose a Creature Kind from the list. |
| Text too long | {Field} must be 4,000 characters or fewer. / {Field} must be 1,000 characters or fewer. |
| Characteristic | Enter {code} from 0 to 2,000. |
| Override value | Enter the override. / Enter Hit Points from 1 to 9,999. / Enter Magic Points from 0 to 9,999. / Enter Build from -2 to 99. / Write the Damage Bonus like +1D4, -1, or 0. |
| Override reason | Give a reason for the override. / Reason must be 500 characters or fewer. |
| Hit Points | Choose either an override or not applicable for Hit Points. |
| Defeat outcome | Describe the defeat outcome, because Hit Points don't apply. |
| Movement | Choose a mode from the list. / Name the mode. / Enter a rate from 0 to 999. |
| Attacks per round / Dodge / Armor points | Enter attacks per round from 1 to 99. / Enter Dodge from 0 to 2,000. / Enter armor points from 0 to 2,000. |
| Attack | Enter the attack's name. / Enter the attack's skill. / Enter a skill value from 0 to 2,000. / Enter the damage, or mark the attack as a manoeuvre. / Write the damage as dice and numbers, for example 1D6+DB or 2D6-1. / Damage Bonus doesn't apply to firearms. Remove DB from the damage. |
| Immunity / Vulnerability | Describe the immunity. / Describe the vulnerability. |
| Skill | Enter the skill's name. / Enter a value from 0 to 2,000. |
| Spell / Power | Enter the spell's name. / Enter the power's name. |
| Sanity loss | Write the Sanity loss as success/failure, for example 0/1D6. |
| Too many rows | Add at most 100 {items}. |
| Keeper notes | As for Scene Keeper notes. |

**Components** (in `frontend/src/scenario-preparation/components/`, beside section 27): `mythos-creature-page`, `mythos-creature-view`, and `mythos-creature-form`; `profile-section-index`; `monster-characteristics-fields`, `monster-movement-rows`, `monster-combat-fields`, `monster-defenses-fields`, `monster-skill-rows`, and `monster-sanity-loss-fields` for editing and their `-view` counterparts; and the shared `spell-row-fields` and `spells-view` (Spells of both profiles and Powers). They reuse `WizardField`, `WizardSelect`, `WizardTextarea`, and the skill catalog hook from `campaign-play`, and the existing `Collapsible`, `Checkbox`, `RadioGroup`, and `Select` primitives.

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
| Delete dialog | Delete {name}? / This can't be undone. It is also removed from any Prepared Scene it is part of. / Delete |
| Delete refused (PBI-SP-004) | {name} is part of a Scene that has been played, so it can't be deleted. |
| Empty view | No details yet. / No Keeper notes yet. |
| Not found | We couldn't find that Non-Player Entity / Back to your Campaign |
| Section index (Monster Profile) | On this page |
| Overrides | Override {value} / Reason / Reason for the {value} override / {override} (computed {value}) / (no computed value: needs ...) / Reason: {reason} / Not applicable / Defeat outcome: {text} |
| Monster empty states | No ordinary movement. / No Sanity roll. |

The "{n} shown." count uses "1 shown." for one result.

## 27. Non-Player Entity component mapping

| Element | Component |
|---|---|
| Overview section | New `non-player-entity-summary-section` in `frontend/src/scenario-preparation/components/`, mounted by `campaign-page` for the Keeper after `scenario-list-section` |
| List page | New `non-player-entity-list-page`, route `routes/campaigns.$campaignId.non-player-entities.index.tsx`; filtering in a pure `services/nonPlayerEntityFilter.ts` |
| Create page | New `create-non-player-entity-page`, route `routes/campaigns.$campaignId.non-player-entities.new.tsx` |
| Profile pages | New `human-npc-page` (route `routes/campaigns.$campaignId.human-npcs.$humanNpcId.tsx`, PBI-SP-003) and `mythos-creature-page` (route `routes/campaigns.$campaignId.mythos-creatures.$mythosCreatureId.tsx`, PBI-SP-009) |
| Section pattern | New `profile-section` (view `h2` or edit `fieldset` with Remove; optional `id` as a focus target), `add-section-group`, `remove-section-dialog` (`AlertDialog`), `repeating-rows`, `remove-row-button`, and `stat-table`, shared by both editors |
| Monster Profile | `mythos-creature-view`, `mythos-creature-form`, `profile-section-index`, the `monster-*` section components, and the shared `spell-row-fields` and `spells-view` (section 25.5) |
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
- **`profile-section-index`:** few sections, all sections, and 320px.
- **`mythos-creature-view`:** narrative only, a full profile, every override state, and Hit Points not applicable.
- **`mythos-creature-form`:** empty, full, and with server problems.

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
- **SP-UX-42** On an NPC Profile, characteristics, skills, and Dodge show their Investigator difficulty as text; no half or fifth values appear.
- **SP-UX-43** A weapon's "More details" opens by itself when it holds a value or a server problem, so every error summary link reaches a visible field.
- **SP-UX-44** A weapon's Skill offers only this profile's skills, including rows not yet saved.
- **SP-UX-45** The Monster Profile page shows "On this page" with a link to each present section in the fixed order, in view and edit; a link moves focus to its section; in edit the list follows added and removed sections.
- **SP-UX-46** Choosing "Override" or "Override {value}" shows the value and Reason fields, and Hit Points offers one of three choices; after Save the view shows the override with "(computed {value})" or "(no computed value: needs ...)" and its reason, or "Not applicable" with the defeat outcome.
- **SP-UX-47** An attack's "More details" opens by itself when it holds a value or a server problem (extends SP-UX-43).
- **SP-UX-48** On a Monster Profile, characteristics, skills, attack values, and Dodge show their Investigator difficulty as text; no half or fifth values and no MOV appear; movement shows each mode as entered.
- **SP-UX-49** APP and EDU appear only after "Add APP" or "Add EDU", or when they have a value.

## 29. Non-Player Entity accessibility acceptance criteria (WCAG 2.2 AA)

- **SP-A11Y-18** Each page has exactly one `h1`. The Overview section is a `section` labelled by its `h2`; profile sections are `h2` in view and `fieldset` with `legend` in edit; the type choice and type filter are `fieldset`s with legends (1.3.1, 2.4.6).
- **SP-A11Y-19** Every field has a visible label; hints and errors are connected with `aria-describedby`; invalid fields have `aria-invalid="true"` (1.3.1, 3.3.1, 3.3.2).
- **SP-A11Y-20** The error summary receives focus after a refused save, and each of its links moves focus to its field (2.4.3, 3.3.1, 3.3.3).
- **SP-A11Y-21** "Add {section}", "Remove section", "Add {item}", and "Remove {item} {row label}" are `button`s with unique accessible names, at least 24 by 24 CSS pixels (40 by 40 used for row Remove) (2.4.6, 2.5.8, 4.1.2).
- **SP-A11Y-22** Focus moves to a new section's or row's first field, after a removal to the place section 25.2 names, after Duplicate to the copy's `h1`, into and back out of every dialog, and is never lost to `body` (2.4.3).
- **SP-A11Y-23** Section changes, result counts, and status messages are announced through polite live regions or `role=status`, never on first load; failures use `role=alert` (4.1.3).
- **SP-A11Y-24** A field that receives focus is never hidden behind the sticky action bar (2.4.11).
- **SP-A11Y-25** Type, difficulty, overrides, and "not covered" are conveyed in text, never only by color (1.4.1).
- **SP-A11Y-26** At 320px and at 200% zoom the list, create page, and profile pages fit without horizontal scrolling; stat tables reflow to definition lists and long names wrap (1.4.10).
- **SP-A11Y-27** Each skill, weapon, and spell row is a group with a unique accessible name; the "More details" trigger exposes `aria-expanded` and names its weapon (2.4.6, 4.1.2).
- **SP-A11Y-28** The section index is a `nav` labelled by the visible "On this page"; its links are at least 24 by 24 CSS pixels, show visible focus, and move focus to the target, never to `body` (2.4.1, 2.4.3, 2.5.8).
- **SP-A11Y-29** Each derived value's override controls are grouped with a legend; revealed fields have visible labels and hints connected with `aria-describedby`; each attack, movement mode, immunity, vulnerability, and power row is a group with a unique accessible name (1.3.1, 3.3.2, 4.1.2; extends SP-A11Y-27).

## 30. Non-Player Entity open decisions and research gaps

- **Resolved (PBI-SP-003):** NPC Profile field-level content, section 25.4 (compact rows, selected 2026-10-17).
- **Resolved (PBI-SP-009):** Monster Profile field-level content, section 25.5 (long form plus a section index, selected 2026-10-18).
- **Deferred:** a profession or Creature Kind column in the list; the list response carries only `{id, type, name}`.
- **Deferred:** linking a profile to a Scene from its profile page (PBI-SP-004 designs linking on the Scene page).
- **Resolved (PBI-SP-004):** linking Non-Player Entities on the Scene page, sections 31 to 39 (Option B, selected 2026-10-21).
- **Research gap:** whether the section index (section 25.5) is enough for a full Monster Profile at the table, or per-section editing (Option C of PBI-SP-009) is needed after all.
- **Research gap:** whether Keepers want the list grouped by Scenario once Scene links exist.

## 31. Scene links: information architecture

```
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId                                  Scene page, "Non-Player Entities" section (section 32)
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/new      Link a Non-Player Entity (section 33)
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/$linkId  Edit a link (section 33)
```

- Both pages keep the Campaign header with Overview as the current tab (extends SP-UX-25).
- Players get no entry point; every link URL shows them `scene-not-found`, without an API call.
- A link's Non-Player Entity is fixed; to change it, the Keeper unlinks and links again.
- A Non-Player Entity may be linked to the same Scene more than once (spec Constraints).
- UI copy says "Player-facing name" and "Player-facing description". Never write "NPC" alone, "monster", or "stat block" (root CONTEXT.md).

## 32. Non-Player Entities section on the Scene page (`scene-link-section`)

```
Non-Player Entities                               (h2)  [Link a Non-Player Entity]
Only the Player-facing name and description can reach Players, and only when you reveal them.
- A shape in the cellar                           (h3)
  Mythos Creature: Ghoul                          (muted; "Ghoul" links to the profile)
  <description, or "No Player-facing description yet.">
  [Edit] [Unlink]
```

- **Placement:** a `section` labelled by its `h2`, after Keeper notes and before the Scene actions, shown in view mode only. The muted hint sits under the heading.
- **Action:** "Link a Non-Player Entity", a link styled as a small button to the link page, right of the `h2` (wraps under it below 640px), shown only while the Scene is Prepared or Active.
- **List:** a `ul` in the order the links were made. Each item has:
  - an `h3` with the Player-facing name (`break-words`, `tabIndex=-1` as a focus target);
  - a muted line "{type label}: " followed by the profile name as a link to the profile page;
  - the description in `rich-text-view` with `headingOffset` 1 (its headings render as `h4` and `h5`), or "No Player-facing description yet." in muted text;
  - outline "Edit", a link to the edit page with the accessible name "Edit {Player-facing name}", and "Unlink" (outline, destructive text) with the accessible name "Unlink {Player-facing name}", both only on Prepared and Active Scenes.
- **Empty:** "No Non-Player Entities linked yet." and, on Prepared and Active Scenes, the action.
- **Finished:** the links are shown without "Link a Non-Player Entity", "Edit", or "Unlink".
- **Loading and errors:** the links load with the Scene and use its Skeleton and error states (section 14).
- **Status:** the page's `role=status` paragraph shows "{Player-facing name} linked.", "{Player-facing name} saved.", and "{Player-facing name} unlinked.".

## 33. Link and Edit link pages (`link-non-player-entity-page`, `edit-non-player-entity-link-page`, `scene-link-form`, `non-player-entity-picker`)

```
Link a Non-Player Entity                          (h1)
Scene: The Corbitt House                          (muted)
Non-Player Entity                                 (fieldset legend)
  Search by name [__________]
  Type  (o) All  ( ) Human NPCs  ( ) Mythos Creatures
  Selected: Ghoul, Mythos Creature                (muted, once one is chosen)
  12 shown.                                       (polite live region)
  ( ) Ghoul            Mythos Creature
  ( ) Mr. Knott        Human NPC . Already in this Scene
Player-facing name [__________]
  What the Investigators know it as, for example A shape in the cellar.
Player-facing description (optional)              <rich-text-editor>
  What the Investigators may learn. Players see it only when you reveal it. You can format text and add links.
[Link]  Cancel
```

- **Picker (`non-player-entity-picker`):**
  - A `fieldset` with the legend "Non-Player Entity", holding the search and type filter exactly as in section 23 (reusing `nonPlayerEntityFilter`) and the results.
  - Results are a `RadioGroup` sorted by name (`Intl.Collator`, viewer's locale). Each option is labelled by the profile name and described (`aria-describedby`) by its type label, plus " . Already in this Scene" when this Scene already links it.
  - Only the Campaign's own Human NPCs and Mythos Creatures are offered.
  - A choice stays selected when the filters hide it; the "Selected:" line always names it.
  - **No match:** "No Non-Player Entities match these filters." with "Clear filters", which resets both and moves focus to the search field.
  - **Empty Campaign:** "No Non-Player Entities yet." and the link "Create Non-Player Entity" to `/non-player-entities/new`; search and filter are not rendered.
  - **Loading:** three Skeleton rows with `aria-busy="true"`. **Error:** "We couldn't load the Non-Player Entities." with "Try again".
- **Fields:** "Player-facing name" (`Input`), which starts empty and is never prefilled from the profile; "Player-facing description (optional)" (`rich-text-editor`, section 15). Hints as in the wireframe, connected with `aria-describedby`. No field has a `maxLength` attribute.
- **Validation on submit,** in the order picker, name, description: "Choose a Non-Player Entity." / "Enter a Player-facing name." / "Player-facing name must be 200 characters or fewer." / "Player-facing description is too long. Shorten it and try again." (more than 204,800 bytes). Errors are inline (`aria-invalid`, `aria-describedby`; the picker's error is connected to its fieldset). Focus moves to the first invalid field; for the picker, the checked radio, else the first radio, else the search field.
- **Server problems (400, ADR 0018):** each message is shown at its field by key; a `nonPlayerEntity` problem is shown at the picker and the picker's list is refetched.
- **Actions:** link page primary "Link" ("Linking..." while busy, disabled); edit page primary "Save" ("Saving..." while busy, disabled); secondary "Cancel", a link back to the Scene page.
- **Edit page:** `h1` "Edit {saved Player-facing name}"; the muted lines "Scene: {title}" and "{type label}: {profile name}" (text, no picker); the fields prefilled.
- **Success:** navigate to the Scene page with the navigation status message "{name} linked." or "{name} saved.", move focus to that link's `h3`, and invalidate the Scene.
- **Failure:** an `Alert` (`role=alert`) "We couldn't link the Non-Player Entity. Try again." or "We couldn't save the link. Try again."; the input is kept.
- **Finished:** a save refused because the Scene is Finished (409) keeps the form with the alert "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel.". Opening either page for a Finished Scene shows "This Scene is finished and can't be changed." and "Back to the Scene" instead of the form.
- **Not found:** a Player or an unknown Scene gets `scene-not-found`. An unknown link id, or a 404 on save, shows `non-player-entity-link-not-found`: `h1` "We couldn't find that link" and the link "Back to the Scene".
- **Unsaved edits:** `useUnsavedChangesPrompt(isDirty)`; choosing an entity, typing a name, or an editor change counts.

## 34. Unlink (`unlink-non-player-entity-dialog`, `AlertDialog`)

- Title "Unlink {Player-facing name}?", description "Its Player-facing name and description are deleted. {profile name} stays in the Campaign.", buttons "Cancel" and "Unlink" ("Unlinking..." while busy, both disabled).
- **Success:** the dialog closes, the status says "{name} unlinked.", focus moves to the section `h2` (`tabIndex=-1`), and the Scene is invalidated. A 404 counts as success.
- **Failure:** "We couldn't unlink {name}. Try again." (`role=alert`) in the dialog.
- **Refused (409):** "This Scene has been finished, so it can't be changed."; closing the dialog refetches the Scene.
- **Cancel:** returns focus to "Unlink".

## 35. Scene link content

| Key | Copy |
|---|---|
| Section | Non-Player Entities / Only the Player-facing name and description can reach Players, and only when you reveal them. / No Non-Player Entities linked yet. / No Player-facing description yet. |
| Actions | Link a Non-Player Entity / Edit / Unlink / Link / Save / Cancel / Clear filters / Create Non-Player Entity / Back to the Scene |
| Busy | Linking... / Saving... / Unlinking... |
| Pages | Link a Non-Player Entity / Edit {name} / Scene: {title} / {type}: {profile name} / Selected: {profile name}, {type} / Already in this Scene |
| Fields | Non-Player Entity / Search by name / Type / Player-facing name / Player-facing description (optional) |
| Hints | What the Investigators know it as, for example A shape in the cellar. / What the Investigators may learn. Players see it only when you reveal it. You can format text and add links. |
| Errors | Choose a Non-Player Entity. / Choose a Non-Player Entity from this Campaign. / Enter a Player-facing name. / Player-facing name must be 200 characters or fewer. / Player-facing description is too long. Shorten it and try again. / This Player-facing description can't be saved. Shorten it or remove unsupported content. |
| Status | {name} linked. / {name} saved. / {name} unlinked. / {n} shown. |
| Failures | We couldn't link the Non-Player Entity. Try again. / We couldn't save the link. Try again. / We couldn't unlink {name}. Try again. / We couldn't load the Non-Player Entities. |
| Conflicts | As section 16 |
| Finished | This Scene is finished and can't be changed. |
| Unlink dialog | Unlink {name}? / Its Player-facing name and description are deleted. {profile name} stays in the Campaign. / Cancel / Unlink |
| Not found | We couldn't find that link / Back to the Scene |

## 36. Scene link component mapping

| Element | Component |
|---|---|
| Section | New `scene-link-section` in `frontend/src/scenario-preparation/components/`, mounted by `scene-page` in view mode |
| Unlink dialog | New `unlink-non-player-entity-dialog` (`AlertDialog`, like `remove-scene-dialog`) |
| Pages | New `link-non-player-entity-page` and `edit-non-player-entity-link-page`, routes per section 31; the Scene route becomes `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.index.tsx` |
| Form | New `scene-link-form`, shared by both pages |
| Picker | New `non-player-entity-picker` (`RadioGroup`, `Input`, `nonPlayerEntityFilter`) |
| Not found | New `non-player-entity-link-not-found`; existing `scene-not-found` |
| Rich text | Existing `rich-text-editor`; `rich-text-view` gains an optional `headingOffset` |
| Primitives | Existing only; no new primitives |

Stories cover:
- **`scene-link-section`:** empty, links with and without a description, Active, Finished, and a long name at 320px.
- **`non-player-entity-picker`:** empty Campaign, many entities, filtered, no match, selected but hidden, already linked, loading, and error.
- **`scene-link-form`:** empty, every error, busy, and the Finished conflict.
- **`link-non-player-entity-page` and `edit-non-player-entity-link-page`:** idle, busy, failure, Finished, and not found.
- **`unlink-non-player-entity-dialog`:** idle, unlinking, failure, and refused.

## 37. Scene link UX acceptance criteria

- **SP-UX-50** The Scene page shows "Non-Player Entities" after Keeper notes, listing each link's Player-facing name, its type and profile name (a link to the profile page), and its description or "No Player-facing description yet."; with no links, "No Non-Player Entities linked yet.".
- **SP-UX-51** On a Prepared or Active Scene, "Link a Non-Player Entity" opens the link page, whose picker offers only this Campaign's Human NPCs and Mythos Creatures, by name with their type; search and the type filter narrow it and announce "{n} shown."; "Clear filters" restores it.
- **SP-UX-52** Choosing an entity, entering a Player-facing name and optionally a description, and selecting "Link" returns to the Scene page with "{name} linked." and the link; the link and its formatting survive a reload.
- **SP-UX-53** Submitting without an entity, with an empty name, with a name over 200 characters, or with a description over 204,800 bytes shows its message from section 35, focuses the first invalid field, and saves nothing; a server refusal shows its message at the field.
- **SP-UX-54** An entity already linked to the Scene is still offered, marked "Already in this Scene", and can be linked again.
- **SP-UX-55** "Edit" opens the edit page with the entity as text and the fields prefilled; "Save" stores the change with "{name} saved."; "Cancel" changes nothing.
- **SP-UX-56** "Unlink" asks first; "Cancel" keeps the link; confirming removes it with "{name} unlinked.", and the profile stays in the Non-Player Entity list.
- **SP-UX-57** A Finished Scene shows its links without "Link a Non-Player Entity", "Edit", or "Unlink"; the link and edit pages say it can't be changed; a write refused because the Scene was finished meanwhile shows the conflict message.
- **SP-UX-58** Deleting a profile linked to an Active or Finished Scene shows "{name} is part of a Scene that has been played, so it can't be deleted." with Delete disabled; a profile linked only to Prepared Scenes is deleted, and those Scenes no longer list it.
- **SP-UX-59** The copy of a linked profile is linked to no Scene (extends SP-UX-38).
- **SP-UX-60** A Player opening a link URL sees "We couldn't find that Scene"; an unknown link id shows "We couldn't find that link".
- **SP-UX-61** While a link, save, or unlink is in flight its button is disabled; a second activation does nothing.
- **SP-UX-62** With no Non-Player Entities in the Campaign, the picker says "No Non-Player Entities yet." and links to "Create Non-Player Entity".
- **SP-UX-63** The Player-facing name starts empty; it is never prefilled from the profile.

## 38. Scene link accessibility acceptance criteria (WCAG 2.2 AA)

- **SP-A11Y-30** Each page has exactly one `h1`. The section is a `section` labelled by its `h2`, each link's Player-facing name is an `h3` in a `ul`, and description headings are only `h4` and `h5` (1.3.1, 2.4.6).
- **SP-A11Y-31** The picker is a `fieldset` with the legend "Non-Player Entity"; the search has a visible label; the type filter is a `fieldset` with a legend; each radio is named by the profile name and described by its type and "Already in this Scene" (1.3.1, 4.1.2).
- **SP-A11Y-32** "{n} shown." is announced through a polite live region (debounced 500 ms), never on first load; status messages use `role=status`; failures and refusals use `role=alert` (4.1.3).
- **SP-A11Y-33** Focus moves to the link's `h3` after Link or Save, to the section `h2` after Unlink, back to "Unlink" when the dialog is cancelled, to the search field after "Clear filters", and to the first invalid field after a refused submit; it is never lost to `body` (2.4.3).
- **SP-A11Y-34** "Edit" and "Unlink" include the Player-facing name in their accessible names; every control is at least 24 by 24 CSS pixels with a visible focus ring (2.4.6, 2.4.7, 2.5.8).
- **SP-A11Y-35** Errors are text next to their field; fields have `aria-invalid="true"` and `aria-describedby`, and the picker's error is connected to its fieldset (3.3.1, 3.3.2).
- **SP-A11Y-36** At 320px and at 200% zoom the section, the picker, and both pages fit without horizontal scrolling; long names wrap (1.4.10).

## 39. Scene link open decisions and research gaps

- **Deferred:** reordering a Scene's links; showing on a profile page which Scenes link it; linking from the profile page (section 30); live updates across the Keeper's own tabs (no SignalR, design record D6).
- **Research gap:** whether a radio list with search is enough for Campaigns with many Non-Player Entities, or a combobox is needed.

## 40. Handouts: information architecture

```
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId                       Scene page, "Handouts" section (section 41)
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new          Add Handout (section 43)
/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId   Handout page, view and Edit (section 42)
```

- Both pages keep the Campaign header with Overview as the current tab (extends SP-UX-25).
- Players get no entry point. Every Handout URL shows them `scene-not-found`, without an API call.
- Kinds in this PBI: Read-aloud and Text. Visibility is Player-facing or Keeper-facing, always chosen explicitly.
- UI copy never uses "attachment", "asset", "file", "article", "boxed text", or "narration" (root CONTEXT.md).

## 41. Handouts section on the Scene page (`scene-handout-section`)

```
Handouts                                          (h2)  [Add Handout]
Player-facing Handouts reach Players only when you reveal them. Keeper-facing Handouts are never revealed.
1. The front door                                 (link)   [up] [down]
   Read-aloud . Player-facing                     (badges)
2. Corbitt's true nature                          (link)   [up] [down]
   Text . Keeper-facing
```

- **Placement:** a `section` labelled by its `h2` (`tabIndex=-1`, used as a focus target), after Keeper notes and before Non-Player Entities, in view mode only. The muted hint sits under the heading.
- **Action:** "Add Handout", a link styled as a small button to `/handouts/new`, right of the `h2` (it wraps below 640px). It is shown only on Prepared and Active Scenes.
- **List:** an `ol` in stored order. Each item has:
  - the title as a link to the Handout page (`break-words`, `id` for focus after a create);
  - `handout-badges`: a kind badge ("Read-aloud" or "Text") and a visibility badge ("Player-facing" with an `aria-hidden` Eye icon, or "Keeper-facing" with an `aria-hidden` Lock icon);
  - `move-controls` ("Move {title} up" and "Move {title} down"), on Prepared and Active Scenes only, as in the Scene list (section 13).
- **Moves:** saved per move through `usePreparedOrderReordering`.
  - Success: the polite announcement "{title} moved to position {n} of {total}."
  - Failure: "We couldn't change the order. Try again." (`role=alert`).
  - A 409 shows "The Handouts changed in another window. Check the order and try again." and refetches the Scene. A Scene finished meanwhile then shows the Finished state without move controls.
- **Empty:** "No Handouts yet." and, on Prepared and Active Scenes, the action.
- **Finished:** the list without "Add Handout" or move controls.
- **Loading and errors:** the section loads with the Scene and uses its Skeleton and error states (section 14).
- **Status:** the page's `role=status` paragraph shows "{title} added." and "{title} deleted.".

## 42. Handout page (`handout-page`, `handout-content`, `read-aloud-text`)

```
< Back to the Scene
Handout saved.                                    (role=status)
The front door                                    (h1)
Scene: The Corbitt House                          (muted)
Read-aloud . Player-facing                        (badges)
+--------------------------------------------+
| Read-aloud                         (h2)    |   left rule, tinted panel
| <rendered text, headings h3/h4>            |
+--------------------------------------------+
[Edit] [Delete Handout]
```

- **View:**
  - A link "Back to the Scene" with an `aria-hidden` ArrowLeft icon, and the `role=status` paragraph.
  - `h1` with the title (`tabIndex=-1`), the muted "Scene: {title}", and the badges.
  - The content in `handout-content`:
    - Read-aloud: `read-aloud-text`, a `section` labelled by its `h2` "Read-aloud" with an `aria-hidden` BookOpenText icon. It has a 4px left rule in the primary color and a muted background (rule against background at least 3:1; text at least 4.5:1) and holds `rich-text-view`.
    - Text: an `h2` "Text" followed by `rich-text-view`.
    - Both use `headingOffset` 0, so the text's headings are `h3` and `h4`.
- **Actions by Scene status:**
  - Prepared: outline "Edit" and "Delete Handout" (outline, destructive text).
  - Active: "Edit" only, and the muted sentence "This Scene has been started, so its Handouts can't be deleted."
  - Finished: no actions, and the muted sentence "This Scene is finished and can't be changed."
- **Edit:** "Edit" swaps the view for `handout-form`, prefilled. The `h1` keeps the saved title. The actions are "Save" ("Saving..." while busy, disabled) and "Cancel". Focus moves to Title. `useUnsavedChangesPrompt` guards navigation away.
- **Save success:** back to the view, with the status "Handout saved." and focus on "Edit".
- **Cancel:** discards the edits without confirmation, as in section 14. Focus moves to "Edit".
- **Save failure:** "We couldn't save the Handout. Try again." (`role=alert`), and the input is kept.
- **Save refused because the Scene is Finished (409):** the form stays, with the alert from section 16. Cancel shows the refetched Finished view.
- **Server problems (400, ADR 0018):** each message is shown at its field.
- **Loading:** a Skeleton for the `h1` and the content, with `aria-busy`.
- **Error:** "We couldn't load this Handout." with "Try again".
- **Not found:**
  - A Player or an unknown Scene gets `scene-not-found`.
  - An unknown Handout id, or a 404 on save, shows `handout-not-found`: `h1` "We couldn't find that Handout" and the link "Back to the Scene".

## 43. Add Handout page and form (`add-handout-page`, `handout-form`)

```
Add Handout                                       (h1)
Scene: The Corbitt House                          (muted)
Title [__________]
Kind                                              (fieldset legend)
  ( ) Read-aloud   Text you read to the Players. It is shown as read-aloud text.
  ( ) Text         Any other text, such as a letter or a newspaper clipping.
Who can see it                                    (fieldset legend)
  ( ) Player-facing   Players can receive it when you reveal it.
  ( ) Keeper-facing   Only you can read it. It is never revealed.
Text                                              <rich-text-editor>
  You can format text and add links.
[Add Handout]  Cancel
```

- **Fields, in this order:**
  1. "Title" (`Input`).
  2. "Kind" (a `RadioGroup` in a `fieldset`).
  3. "Who can see it" (a `RadioGroup` in a `fieldset`).
  4. "Text" (`rich-text-editor`, section 15).

  No radio is preselected on the add page. Each option is labelled by its name and described by its sentence. No field has `maxLength`.
- **Validation on submit,** in field order:
  - "Enter a title." / "Title must be 200 characters or fewer."
  - "Choose Read-aloud or Text."
  - "Choose who can see this Handout."
  - "Enter the Handout text." (no visible text) / "The text is too long. Shorten it and try again." (over 204,800 bytes)
  - Errors are inline (`aria-invalid`, and `aria-describedby` on the field or fieldset). Focus moves to the first invalid field; for a radio group, the first radio.
  - The server message "This text can't be saved. Shorten it or remove unsupported content." is shown at Text.
- **Actions:** primary "Add Handout" ("Adding..." while busy, disabled); secondary "Cancel", a link back to the Scene page.
- **Success:** navigate to the Scene page with the status "{title} added.", move focus to that Handout's link in the list, and invalidate the Scene.
- **Failure:** "We couldn't add the Handout. Try again." (`role=alert`), and the input is kept.
- **Finished:**
  - A submit refused because the Scene is Finished (409) shows the section 16 conflict alert.
  - Opening the page for a Finished Scene shows "This Scene is finished and can't be changed." and "Back to the Scene" instead of the form.
- **Unsaved input:** `useUnsavedChangesPrompt(isDirty)`.

## 44. Delete Handout (`delete-handout-dialog`, `AlertDialog`)

- Title "Delete {title}?", description "This can't be undone.", and the buttons "Cancel" and "Delete Handout" ("Deleting..." while busy, both disabled).
- **Success:** navigate to the Scene page with the status "{title} deleted.", move focus to the Handouts `h2`, and invalidate the Scene. A 404 counts as success.
- **Failure:** "We couldn't delete the Handout. Try again." (`role=alert`) in the dialog.
- **Refused (409):** "This Scene has been started, so this Handout can't be deleted." Closing the dialog refetches the Scene and moves focus to the `h1`, because "Delete Handout" is gone.
- **Cancel:** returns focus to "Delete Handout".

## 45. Handout content

| Key | Copy |
|---|---|
| Section | Handouts / Player-facing Handouts reach Players only when you reveal them. Keeper-facing Handouts are never revealed. / No Handouts yet. |
| Kinds | Read-aloud / Text |
| Kind descriptions | Text you read to the Players. It is shown as read-aloud text. / Any other text, such as a letter or a newspaper clipping. |
| Visibility | Player-facing / Keeper-facing |
| Visibility descriptions | Players can receive it when you reveal it. / Only you can read it. It is never revealed. |
| Actions | Add Handout / Edit / Save / Cancel / Delete Handout / Back to the Scene |
| Busy | Adding... / Saving... / Deleting... |
| Fields | Title / Kind / Who can see it / Text |
| Hints | You can format text and add links. |
| Errors | Enter a title. / Title must be 200 characters or fewer. / Choose Read-aloud or Text. / Choose who can see this Handout. / Enter the Handout text. / The text is too long. Shorten it and try again. / This text can't be saved. Shorten it or remove unsupported content. |
| Status | {title} added. / Handout saved. / {title} deleted. / {title} moved to position {n} of {total}. |
| Failures | We couldn't add the Handout. Try again. / We couldn't save the Handout. Try again. / We couldn't delete the Handout. Try again. / We couldn't load this Handout. / We couldn't change the order. Try again. |
| Stale | The Handouts changed in another window. Check the order and try again. |
| Conflicts | As section 16 / This Scene has been started, so this Handout can't be deleted. |
| Active | This Scene has been started, so its Handouts can't be deleted. |
| Finished | This Scene is finished and can't be changed. |
| Delete dialog | Delete {title}? / This can't be undone. / Cancel / Delete Handout |
| Move buttons | Move {title} up / Move {title} down |
| Not found | We couldn't find that Handout / Back to the Scene |
| Page | Add Handout / Scene: {title} |

## 46. Handout component mapping

| Element | Component |
|---|---|
| Section | New `scene-handout-section`, mounted by `scene-page` in view mode |
| Badges | New `handout-badges` (`Badge`, the label maps in `types/Handout.ts`) |
| Content | New `handout-content` (picks `read-aloud-text` or a plain "Text" heading) and `read-aloud-text`, in the slice |
| Handout page | New `handout-page`, route `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.handouts.$handoutId.tsx` |
| Add page | New `add-handout-page`, route `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.handouts.new.tsx` |
| Form | New `handout-form`, shared by add and edit |
| Delete dialog | New `delete-handout-dialog` (`AlertDialog`, like `remove-scene-dialog`) |
| Not found | New `handout-not-found`; existing `scene-not-found` |
| Reorder | Existing `move-controls`, `usePreparedOrderReordering`, `preparedOrder.ts` |
| Primitives | Existing only (`Badge`, `Button`, `Input`, `Label`, `RadioGroup`, `Alert`, `AlertDialog`, `Skeleton`) |

Stories cover:
- **`scene-handout-section`:** empty, several Handouts of both kinds and visibilities, Active, Finished, a long title at 320px, reorder saving, failure, and stale.
- **`handout-page`:** Read-aloud and Text on a Prepared, an Active, and a Finished Scene; edit; saved; the save refused as Finished; loading; error; not found.
- **`handout-form`:** empty, prefilled, every error, and busy.
- **`add-handout-page`:** idle, adding, failure, and Finished.
- **`delete-handout-dialog`:** idle, deleting, failure, and refused.
- **`read-aloud-text`:** with every allowed node.

## 47. Handout UX acceptance criteria

- **SP-UX-64** The Scene page shows "Handouts" after Keeper notes, listing each Handout in stored order as a link with its kind and visibility as text; with none, it shows "No Handouts yet.".
- **SP-UX-65** On a Prepared or Active Scene, "Add Handout" opens the add page. A valid submit returns to the Scene page with "{title} added.", the Handout is listed last, and its text and formatting show on its page after a reload.
- **SP-UX-66** An empty or over-200-character title, no kind, no visibility, empty text, or text over 204,800 bytes shows its message from section 45, focuses the first invalid field, and saves nothing. A server refusal shows its message at the field.
- **SP-UX-67** The add page preselects neither a kind nor a visibility. Every Handout shows "Player-facing" or "Keeper-facing" in the list and on its page.
- **SP-UX-68** A Read-aloud Handout's page shows its text in a panel headed "Read-aloud". A Text Handout's page shows it under "Text", without the panel.
- **SP-UX-69** "Edit" then "Save" stores the title, kind, visibility, and text, shows "Handout saved.", and survives a reload. The kind can change between Read-aloud and Text. "Cancel" discards the edits.
- **SP-UX-70** Moving Handouts behaves as SP-UX-11 to SP-UX-14, with Handout titles and the messages from section 45. The new order survives a reload.
- **SP-UX-71** Only a Prepared Scene's Handout page shows "Delete Handout". "Cancel" keeps the Handout. Confirming returns to the Scene page with "{title} deleted." and without the Handout. A refused delete shows "This Scene has been started, so this Handout can't be deleted.".
- **SP-UX-72** On an Active Scene, "Add Handout", "Edit", and the move buttons are offered, and "Delete Handout" is not; the Handout page says "This Scene has been started, so its Handouts can't be deleted.".
- **SP-UX-73** A Finished Scene shows its Handouts without "Add Handout", move buttons, "Edit", or "Delete Handout". The add page says the Scene can't be changed. A write refused because the Scene was finished meanwhile shows the conflict message.
- **SP-UX-74** A Player opening a Handout or add URL sees "We couldn't find that Scene". An unknown Handout id shows "We couldn't find that Handout".
- **SP-UX-75** While an add, save, delete, or move is in flight its button is disabled (`aria-disabled` for moves). A second activation does nothing.
- **SP-UX-76** Handout pages keep the Campaign header with Overview as the current tab (extends SP-UX-25).

## 48. Handout accessibility acceptance criteria (WCAG 2.2 AA)

- **SP-A11Y-37** Each page has exactly one `h1`. The section is a `section` labelled by its `h2`, and the list is an `ol`. On the Handout page the content is under an `h2` ("Read-aloud" or "Text"), and the text's headings are only `h3` and `h4` (1.3.1, 2.4.6).
- **SP-A11Y-38** Kind and visibility are text in badges, with `aria-hidden` icons. Read-aloud is identified by its visible "Read-aloud" heading, not by color. Panel text has a contrast of at least 4.5:1 and the rule at least 3:1 (1.3.1, 1.4.1, 1.4.3, 1.4.11).
- **SP-A11Y-39** Kind and "Who can see it" are each a `fieldset` with a `legend`, holding a `radiogroup`. Each radio is named by its label and described by its sentence. A group error is text connected to its fieldset with `aria-describedby`. The text field follows SP-A11Y-12 (1.3.1, 3.3.1, 3.3.2, 4.1.2).
- **SP-A11Y-40** Focus moves to the new Handout's link after Add; to Title on "Edit", and to "Edit" after Save or Cancel; to the Handouts `h2` after Delete; back to "Delete Handout" when the dialog is cancelled; to the `h1` after a refused delete or a save refused as Finished, once the refetch removes the control; to the first invalid field after a refused submit; and after moves as in SP-A11Y-15. It is never lost to `body` (2.4.3).
- **SP-A11Y-41** "{title} added.", "Handout saved.", and "{title} deleted." are announced through `role=status` without moving focus. Moves use the section's polite live region, and nothing is announced on first load. Failures and refusals use `role=alert` (4.1.3).
- **SP-A11Y-42** The move buttons include the title in their accessible names. Every control is at least 24 by 24 CSS pixels and has a visible focus ring (2.4.6, 2.4.7, 2.5.8).
- **SP-A11Y-43** At 320px and at 200% zoom, the section, the Handout page, the read-aloud panel, and the form fit without horizontal scrolling, and long titles wrap (1.4.10).

## 49. Handout open decisions and research gaps

- **Decided (U1, approved 2026-10-22):** the Kind radio has no default, so the Keeper always chooses deliberately. The alternative was preselecting "Text".
- **Deferred:**
  - file Handouts (PBI-SP-007) and Item Handouts (PBI-SP-008), which extend sections 41 to 44;
  - revealing a Handout, and a "revealed" marker (PBI-SPL-002);
  - Active and Finished journeys end to end (PBI-SPL-001);
  - previews of the text in the Scene list;
  - live updates across the Keeper's own tabs.
- **Research gap:** whether Keepers want to read all Read-aloud Handouts in sequence before play without opening each page. Option A's inline list is the fallback.

# UX Specification: Scenario Preparation (Scenarios)

Selected direction: **Option B (an Overview section with a dedicated Scenario page)**, chosen 2026-10-16 (PBI-SP-001). Alternatives considered:
- **Option A (a "Scenario" header tab):** rejected because it breaks the limit of three tab labels at 320px ([campaign-overview ux](../campaign-overview/ux.md) section 2, CO-A11Y-9).
- **Option C (a section in Settings):** rejected because Settings holds configuration, not preparation; Scenes (PBI-SP-002) would force a move later, and it is the least discoverable option.

Reorder control: **Move up / Move down buttons, saved per move**. Rejected: drag and drop (needs a new dependency and still needs buttons for WCAG 2.5.7) and a separate "Change order" mode with position selects (more steps for the usual one- or two-place change).

Behavior and rules: [spec.md](spec.md). Design record: [docs/scenario-preparation/issues/01-create-edit-scenario.design.md](../../docs/scenario-preparation/issues/01-create-edit-scenario.design.md). This document covers presentation only.

## 1. Information architecture

```
/campaigns/$campaignId                       Overview: Keeper-only "Scenarios" section (section 2)
/campaigns/$campaignId/scenarios/new         Create Scenario       -> Overview tab current
/campaigns/$campaignId/scenarios/$scenarioId Scenario (view/edit)  -> Overview tab current
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

# UX Specification: Investigator Creation and Character Approval

Selected direction: **Option A (linear stepper with live summary rail) with task-list resume behavior**, chosen 2026-10-02. Alternatives considered: task-list hub (GOV.UK "Complete multiple tasks" pattern) and a sheet canvas with guided focus. The sheet canvas was rejected for v1 because of its cognitive load and mobile cost.

Behavior and rules: [spec.md](spec.md) and [specs/campaign-play/spec.md](../campaign-play/spec.md). Rule sections are linked from those specs. This document does not restate rules. Copy that explains a rule to the Player shows values the backend computes from rule data, not hard-coded text.

Decisions from design review:
- Players enter the **raw dice total** (for example `11` for 3D6). The UI shows the resulting characteristic value. The Roll Record stores the raw total.
- The Keeper approves with **one click**, with no confirmation dialog.

## 1. Information architecture

| Route | Who | Purpose |
|---|---|---|
| `/campaigns/$campaignId` | Keeper, Player | Campaign page, rendered by role (section 3) |
| `/campaigns/$campaignId/investigator/$step` | Owning Player | Creation wizard; `$step` is one of `identity`, `characteristics`, `age`, `occupation`, `occupation-skills`, `personal-interests`, `sheet` |
| `/campaigns/$campaignId/investigator` | Owning Player | Redirects to the resume step (section 5.3), or to the read-only sheet when the Investigator is Submitted or Approved |
| `/campaigns/$campaignId/investigators/$investigatorId` | Keeper | Review screen |

Entry and exit:
- The Player enters only from the "Your Investigator" card. Every wizard step has "Save and exit", which returns to the Campaign page.
- The Keeper enters from the Investigators list. "Back to Campaign" returns to the list.
- Any Investigator the caller cannot see renders a not-found page: heading "We couldn't find that Investigator" and a link "Back to your Campaign".

Status labels (CONTEXT.md terms):

| Status | Player sees | Keeper sees |
|---|---|---|
| Draft | "Draft" | "In progress" (not openable) |
| Submitted | "Submitted - waiting for your Keeper" | "Submitted" |
| Changes Requested | "Changes requested" | "Changes requested" |
| Approved | "Approved - ready for play" | "Approved" |

Badges always show the text label. Colour is supplementary.

## 2. Create-campaign form: Rules options

Added to `create-campaign-form` below the Player limit field.

- A Collapsible trigger button with the label "Rules options" and a summary on the same line, for example "1920s - Standard rolling, Point buy, Quick fire". It is collapsed by default and uses `aria-expanded`.
- When expanded:
  - **Era**: read-only text "1920s". Help text: "The era can't be changed after the Campaign is created."
  - **Allowed creation methods**: a fieldset with the legend "Allowed creation methods" and three Checkboxes, all checked by default. Labels: "Standard rolling - Players roll dice at the table", "Point buy - Players spend a fixed pool of points", "Quick fire - Players assign a fixed set of values".
- Validation: if every method is unchecked, the error is "Choose at least one creation method." If the Player submits while the section is collapsed and this error is present, the section expands and focus moves to the first checkbox.
- The summary text updates when checkboxes change.

## 3. Campaign page by role

### 3.1 Keeper
The existing `InviteManagement` stays as is. Two sections are added below it, each with its own `h2`:

**Investigators**
- A list (Table on 640px and wider, stacked Cards below that) with columns Player, Investigator, Status, and an Action column.
- Sort order: Submitted first, then Changes Requested, then Approved, then In progress. Within each status, oldest update first.
- Submitted rows have a "Review" link. Changes Requested and Approved rows have "View". In progress rows show the Player name, "Not named yet" (or the name, once entered), and no action.
- Empty state: "No Investigators yet. Players create theirs after joining."

**Rules options**
- Read-only text: "Era: 1920s" and "Creation methods: ...".
- An "Edit creation methods" button opens a Dialog with the same fieldset as section 2 and the help text "Players with a draft that uses a method you turn off will need to switch method before submitting." Buttons: "Save" and "Cancel".
- After saving, the dialog closes, focus returns to the "Edit creation methods" button, and a status message "Creation methods updated." appears.

### 3.2 Player
- The Campaign name as `h1`.
- The **Your Investigator** card (`your-investigator-card`):

| State | Content | Primary action |
|---|---|---|
| No Investigator | "Create the Investigator you'll play in this Campaign." | "Create Investigator" (creates the Draft, then opens `identity`) |
| Draft | Name (or "Unnamed Investigator"), "Draft", "Step N of 7" | "Continue" |
| Submitted | Name, occupation, badge | "View" |
| Changes Requested | Name, badge, and an Alert headed "Your Keeper asked for changes" containing the comment | "Edit Investigator" (opens `sheet`) |
| Approved | Name, occupation, badge | "View" |

- Loading: a skeleton card with `aria-busy="true"`.
- Error: "We couldn't load your Investigator." with a "Try again" button.

## 4. Wizard layout

```text
<= 1023px                               >= 1024px
+---------------------------+          +----------------------------------+-------------+
| Stepper (horizontal,      |          | Stepper                                         |
| scrollable, current step  |          +----------------------------------+-------------+
| centered)                 |          | h1 Step title                    | Summary     |
| h1 Step title             |          | Keeper comment Alert (if any)    | rail        |
| Keeper comment (if any)   |          | Error summary (if any)           | (sticky,    |
| Error summary (if any)    |          | Step form                        |  18rem)     |
| Step form                 |          |                                  |             |
| [Summary] collapsible     |          | [Back] [Save and exit] [Save and continue]     |
| [Back][Save and exit]     |          +----------------------------------+-------------+
| [Save and continue]       |
+---------------------------+
```

- No sticky footer at any width (WCAG 2.4.11). On desktop the summary rail is sticky in its own column, so it never covers form fields.
- The main column is at most 42rem wide.

### 4.1 Stepper (`investigator-creation-stepper`)
- `nav` with `aria-label="Investigator creation steps"` containing an ordered list of 7 items: Identity, Characteristics, Age effects, Occupation, Occupation skills, Personal interests, Sheet and submit.
- Item states:
  - **Completed**: a link with a check icon. Visually hidden text ", completed".
  - **Current**: `aria-current="step"`, not a link.
  - **Needs attention**: a link with a warning icon. Visually hidden text ", needs attention". The step was completed but now has errors.
  - **Not started**: plain text, not focusable. Visually hidden text ", not started".
- Clicking a link saves the current step first (section 5.1).

### 4.2 Summary rail (`investigator-summary`)
- `aside` with the heading "Your Investigator".
- A definition list showing HP, MP, SAN, Luck, MOV, Build, Damage Bonus, Dodge, then "Occupation points left" and "Personal interest points left" once those budgets exist. Values that can't be calculated yet show an em dash with the visually hidden text "not yet calculated".
- The last line shows "No problems", or "2 problems" as a link to the error summary.
- Below 1024px the rail becomes a Collapsible button "Summary: HP 12, SAN 65, 120 points left" placed above the step actions, collapsed by default.
- Announcements: a single polite live region (`role="status"`) announces only budget changes, after the field loses focus, for example "120 occupation points left". Other rail values are not announced.

### 4.3 Step actions
- **Back**: secondary. Saves, then goes to the previous step. Hidden on `identity`.
- **Save and exit**: link-styled button. Saves, then returns to the Campaign page with the status message "Draft saved."
- **Save and continue**: primary. On the last step it is replaced by "Submit to Keeper" (section 6.7).
- A "Start over" link-styled destructive button sits at the bottom of the main column, only while the Investigator is a Draft (section 5.5).

## 5. Wizard interactions

### 5.1 Saving
- Every step change (Back, Save and continue, Save and exit, stepper link) sends `PUT .../character-sheet`. Buttons are disabled during the request, and the button that was pressed reads "Saving...".
- If the save succeeds and the step has no errors, the Player moves to the target step.
- If the save succeeds but the step has errors:
  - On **Save and continue**, the Player stays on the step and sees the error summary.
  - On **Back**, **Save and exit**, or a stepper link, the Player moves anyway (drafts save anything), and the step shows "Needs attention".
- If the save fails, the Player stays on the step, keeps every input, and sees the Alert "We couldn't save your Investigator. Your changes are still here - try again." with a "Try again" button.
- When the Player leaves the page with unsaved edits, the browser's native `beforeunload` prompt appears.

### 5.2 Validation display
- Server `ValidationError` items with severity `error` appear:
  - in an error summary at the top of the step (`role="alert"`, heading "There's a problem", one link per error that focuses its field), and
  - inline under each field, linked with `aria-describedby`, with `aria-invalid="true"` on the field.
- Warnings appear in a non-blocking Alert headed "Worth checking" and never use `role="alert"`.
- Client-side checks run on blur and show the same message text as the server. The server response is authoritative.

### 5.3 Resume
`/investigator` opens the first step that is not completed. If every step is completed, it opens `sheet`. Steps after the first incomplete one are Not started and can't be opened.

### 5.4 Changing an earlier step
Later inputs are kept. When the Player saves, any later step whose inputs became invalid switches to "Needs attention" in the stepper, and the status message "Some later steps need attention." is announced.

### 5.5 Destructive actions
- **Start over**: an AlertDialog titled "Start over?" with the body "This deletes your draft Investigator. You can't undo this." Buttons: "Delete draft" (destructive, sends `DELETE .../investigators/mine`) and "Keep draft" (default focus). On success the Player returns to the Campaign page with the status message "Draft deleted."
- **Changing the creation method** after values have been entered: an AlertDialog titled "Switch to Point buy?" with the body "Your characteristic values will be cleared." Buttons: "Switch and clear" and "Keep current method" (default focus). Choosing "Keep current method" puts the radio back to its previous value.
- Both dialogs return focus to the control that opened them when cancelled.

## 6. Steps

### 6.1 Identity (`identity`)
- Fields:
  - Investigator name (required)
  - Age (required, number input)
  - Gender, Residence, Birthplace (optional)
  - Player name: read-only, taken from the Account
- Age help text: "Age affects your characteristics. You'll see how in a later step." The age range error message comes from the server error.

### 6.2 Characteristics (`characteristics`)
- **Creation method**: a RadioGroup listing only the Campaign's allowed methods. It is hidden when only one method is allowed, and in that case the step shows "Creation method: Point buy" as text.
- **Standard rolling** (`dice-roll-input`, one row per roll): the label (for example "STR"), the dice expression from the rules data (for example "3D6 x 5"), a number input labelled "STR, 3D6 total" with a range hint taken from the dice expression, and the computed result as text ("= 55").
  - Rows: the eight characteristics plus Luck.
  - When the age is in the two-Luck-roll bracket, a second Luck row "Luck, second roll" appears, with the help text "Your age lets you roll Luck twice and keep the higher result." The value kept is shown.
- **Point buy**: eight number inputs and a budget counter (`point-budget-counter`) reading "Points used: 410 of 460". Server warnings for low INT or SIZ appear under the Worth checking Alert.
- **Quick fire**: eight Selects. Each Select offers the pool values not yet assigned elsewhere, plus its own current value. A line "Values left to assign: 50, 60" shows what remains.

### 6.3 Age effects (`age`)
- The intro line comes from the server, for example "At age 45 you lose 5 points from STR, CON or DEX, and APP is reduced by 5." It is computed from rule data, not hard-coded.
- **Deduction split**: one number input per eligible characteristic, and a counter "Still to deduct: 3". The adjusted value is shown next to each input.
- **EDU improvement checks**: one group per required check, headed "EDU check 1 of 2". The group has an input "D100 roll". If the roll is above the current EDU, a second input "1D10 gain" appears. Each group ends with a result line: "EDU 60 -> 67", or "No improvement".
- Fields hidden by these conditions are not rendered, rather than disabled.

### 6.4 Occupation (`occupation`)
- A search Input labelled "Search occupations" above a RadioGroup of option cards. Each card shows the name, "Credit Rating 30-70", and points computed from this Investigator's values (for example "280 occupation points").
- When the formula offers a choice, a nested RadioGroup inside the selected card shows the points for each option, for example "EDU x 2 + DEX x 2 = 260" and "EDU x 2 + STR x 2 = 240".
- The last option is "Custom occupation". Selecting it reveals:
  - Name
  - Point formula (Select from the formulas in the rules data)
  - Occupation skills (eight skill pickers, `skill-picker`)
  - Credit Rating minimum and maximum
  - The Alert: "Your Keeper will review a custom occupation before approving your Investigator."

### 6.5 Occupation skills (`occupation-skills`)
- At the top: choice controls for the occupation's open slots. For example, a Select "Choose 1 interpersonal skill". Specialized skills get a text Input with suggestions from a `datalist` ("Art/Craft specialization").
- Below that, the `skill-allocation-table`, with columns Skill, Base, Points (number input), Total. **Credit Rating comes first**, with the hint "Must be between 30 and 70".
- The budget counter reads "Occupation points left: 120 of 280". When it goes below zero it shows "40 over budget" with an error icon and text.

### 6.6 Personal interests (`personal-interests`)
- The same table covers all skills, filtered by a toggle "Show: All skills / Skills with points".
- The budget counter reads "Personal interest points left: 60 of 140".
- The Cthulhu Mythos row has a disabled input with the text "Not available at creation".
- An "Add another specialization" button (for example a second Language (Other)) adds a row whose specialization field receives focus.

### 6.7 Sheet and submit (`sheet`)
Uses the shared `character-sheet-view` in edit mode for its narrative sections and read-only mode for the rest. Sections, each with an `h2`:
1. **Summary**: identity, characteristics with Hard and Extreme values, and derived values. Each has a "Change" link to its wizard step.
2. **Skills**: read-only table of skills with points, plus a "Show all skills" toggle. "Change" links point to the two skills steps.
3. **Backstory**: a Textarea for each backstory field. **Key Connection** is a RadioGroup "Which of these is your Key Connection?" listing the backstory fields that are filled in.
4. **Weapons**: an "Add weapon" button adds a row with Name, Skill, Damage, Attacks, Range, Ammo, and Malfunction inputs, plus "Remove". Help text: "Enter weapon details from your rulebook. Your Keeper checks them when approving."
5. **Gear and possessions**: Textarea.
6. **Wealth**: read-only spending level, cash, and assets.

**Submit to Keeper**:
- It is disabled only while a request is in flight.
- If errors remain, pressing it shows the error summary, with each link opening the step that owns the field.
- On success, the Player returns to the Campaign page with the status message "Submitted. Your Keeper will review your Investigator."

When the Investigator is Changes Requested, a Keeper comment Alert appears at the top of every step.

## 7. Read-only sheet view and Keeper review

`character-sheet-view` in read-only mode is used for:
- the Player's View (Submitted or Approved), and
- the Keeper's review screen.

### 7.1 Keeper review screen (`investigator-review`)
- `h1` is the Investigator name. Below it: "Player: Ada Lovelace" and the status badge.
- A **Worth checking** Alert lists the warnings. Custom content is also listed there: "Custom occupation: Bootlegger" and "2 custom weapons".
- The sheet sections follow (as in 6.7, read-only).
- **Dice results** is a Collapsible, collapsed by default, containing a table with columns Rolled for, Dice, Result, Entered by ("Player").
- The actions sit at the end of the page, not sticky: "Request changes" (secondary) and "Approve" (primary). They appear only when the status is Submitted.
- **Approve** has no confirmation. While pending the button reads "Approving..." and both buttons are disabled. On success the badge changes to "Approved", the actions are removed, the status message "Harvey Walters is approved and ready for play." is announced, and focus moves to the status message.
- **Request changes** opens a Dialog titled "Request changes":
  - A Textarea labelled "What should the Player change?", required, at most 2000 characters, with a visible counter.
  - Buttons: "Send to Player" and "Cancel".
  - If empty, the error reads "Write what the Player should change."
  - On success the dialog closes, the badge changes to "Changes requested", the actions are removed, and the status message "Sent to the Player." appears.
- If the action fails because the status changed in the meantime: an Alert "This Investigator changed since you opened it." with a "Reload" button.
- Any other failure: "We couldn't update this Investigator. Try again."

## 8. Component mapping

| Element | Component |
|---|---|
| Buttons, text inputs | Existing `shared/components/ui/button.tsx`, `input.tsx` |
| Card, Badge, Alert, AlertDialog, Dialog, Checkbox, RadioGroup, Select, Textarea, Collapsible, Label, Table, Skeleton | Add from shadcn/ui into `shared/components/ui/` |
| `investigator-creation-stepper`, `investigator-summary`, `dice-roll-input`, `point-budget-counter`, `skill-allocation-table`, `skill-picker`, `character-sheet-view`, `your-investigator-card`, `investigator-list`, `investigator-review`, `rules-options` | New, in `frontend/src/campaign-play/components/<name>/` with a colocated story and test |

Tokens: add `--destructive` (it is already used as `text-destructive` but not defined in `frontend/src/index.css`) and `--warning`, each with at least 4.5:1 contrast against `--background`. Every warning and error also carries an icon and text.

## 9. Delivery by ticket

| Ticket | UX scope |
|---|---|
| PBI-CP-008 | Section 2; section 3.1 Rules options |
| PBI-CP-003 | Section 3 (both roles); sections 4 and 5; steps 6.1 and 6.2 (Point buy only); a minimal `sheet` step with Summary and Submit; section 7 |
| PBI-CP-009 | Steps 6.2 (Standard rolling, Quick fire) to 6.6; full summary rail |
| PBI-CP-010 | Step 6.7 Backstory, Weapons, Gear, Wealth; Dice results in 7.1 |

In PBI-CP-003 the stepper shows only Identity, Characteristics, and Sheet and submit.

## 10. UX acceptance criteria

- **UX-1** The create-campaign form submits with the 1920s Era and all three creation methods when Rules options is never opened.
- **UX-2** Unchecking every creation method blocks campaign creation with "Choose at least one creation method." and focuses the first checkbox.
- **UX-3** A Player with no Investigator sees "Create Investigator". After pressing it, the Identity step is shown and the Keeper's list shows the Player as "In progress".
- **UX-4** "Save and continue" on a step with no errors saves and opens the next step. On a step with errors it stays and shows the error summary.
- **UX-5** "Save and exit" saves and returns to the Campaign page with "Draft saved.". "Continue" then opens the first incomplete step.
- **UX-6** Not-started steps are not reachable from the stepper.
- **UX-7** Lowering EDU after allocating occupation points marks Occupation skills "Needs attention" and keeps the allocations.
- **UX-8** Switching the creation method after entering values requires confirmation. Cancelling keeps the method and the values.
- **UX-9** Entering a raw dice total shows the computed value, and the Roll Record stores the raw total.
- **UX-10** The creation method choice is hidden when the Campaign allows only one method.
- **UX-11** Submitting with errors lists each error with a link to the step that owns it. Submitting without errors returns to the Campaign page with the Submitted badge.
- **UX-12** A Submitted Investigator opens read-only for the Player, with no edit controls.
- **UX-13** The Keeper sees Submitted Investigators first, with "Review". In-progress rows have no action.
- **UX-14** Approve takes effect on one click, removes the actions, and announces that the Investigator is ready for play.
- **UX-15** Request changes cannot be sent without a comment. After it is sent, the Player's card shows the comment and "Edit Investigator".
- **UX-16** Start over requires confirmation, deletes the Draft, and returns the card to "Create Investigator".
- **UX-17** A failed save keeps every input and offers "Try again".
- **UX-18** Opening another Player's Investigator URL shows "We couldn't find that Investigator".

## 11. Accessibility acceptance criteria (WCAG 2.2 AA)

- **A11Y-1** Each wizard step and the review screen has a single `h1`, and focus moves to it after navigation (2.4.3).
- **A11Y-2** The stepper is a labelled `nav` with an ordered list. The current step has `aria-current="step"`, and each step's status is available as text (1.3.1, 4.1.2).
- **A11Y-3** Every input has a visible label. Dice inputs name the characteristic and dice, for example "STR, 3D6 total" (3.3.2).
- **A11Y-4** Errors are identified in text, linked from the error summary, and attached to their field with `aria-describedby` and `aria-invalid` (3.3.1, 3.3.3).
- **A11Y-5** Budget changes and save, submit, approve, and request-changes results are announced through a polite status region without moving focus, except for Approve, which focuses its message (4.1.3).
- **A11Y-6** Status badges, budget overruns, and warnings never rely on colour alone (1.4.1). Text and icons meet 4.5:1 and 3:1 contrast (1.4.3, 1.4.11).
- **A11Y-7** No sticky element covers a focused control at 320px to 1440px wide or at 200% zoom (2.4.11, 1.4.10).
- **A11Y-8** Dialogs trap focus, start on the safe action for destructive dialogs, close on Escape, and return focus to the control that opened them (2.4.3, 2.1.2).
- **A11Y-9** Interactive targets are at least 24 by 24 CSS pixels (2.5.8).
- **A11Y-10** Identity data entered in step 1 is never asked for again in later steps (3.3.7).
- **A11Y-11** Collapsibles expose `aria-expanded`, and the Rules options summary is part of the trigger's accessible name (4.1.2).

## 12. Open decisions and research gaps

- **Decided 2026-10-02:** the Change Request comment is limited to 2000 characters. The "skill above 90" warning stays as app-level advice, not a rule.
- **Research gap:** whether Players actually create Investigators over several sessions. Measure resumes per Draft before investing further in the task-list hub (Option B).
- **Research gap:** the one-click Approve has no undo. Watch for Keepers asking to revert an approval. Undo is not in the current lifecycle.
- **Research gap:** whether new Players understand the dice-entry rows without help. Test with one or two first-time Players before PBI-CP-009 ships.

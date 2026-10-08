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

The Campaign page layout is superseded by [specs/campaign-overview/ux.md](../campaign-overview/ux.md): Invite management and Rules options move to Settings, the Investigators list merges into "At the table", and the Your Investigator card becomes an attention item. The interactions, copy, and states below still apply where that document references them.

### 3.1 Keeper
The existing `InviteManagement` stays as is. Two sections are added below it, each with its own `h2`:

**Investigators**
- A list (Table on 640px and wider, stacked Cards below that) with columns Player, Investigator, Status, and an Action column.
- Sort order: Submitted first, then Changes Requested, then Approved, then In progress. Within each status, oldest update first.
- Submitted rows have a "Review" link. Changes Requested and Approved rows have "View". In progress rows show the Player name, "Not shown until submitted" in the Investigator column, and no action. A Draft stays private to its Player ([campaign-play spec](../campaign-play/spec.md), Investigator visibility), so its Investigator name is never shown to the Keeper.
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
| No Investigator, and none of the Campaign's allowed creation methods is available yet | An Info icon (decorative) followed by "You can't create your Investigator yet. This Campaign allows {allowed methods}, which aren't available yet. Ask your Keeper to also allow {available methods}." With a single allowed method the verb is singular ("which isn't available yet"). Method lists use the existing creation-method labels, for example "Standard rolling, Quick fire" and "Point buy". | None. No disabled button is shown; the text explains why. |
| No Investigator | "Create the Investigator you'll play in this Campaign." | "Create Investigator" (creates the Draft, then opens `identity`) |
| Draft | Name (or "Unnamed Investigator"), "Draft", "Step N of 7" | "Continue" |
| Submitted | Name, occupation, badge | "View" |
| Changes Requested | Name, badge, and an Alert headed "Your Keeper asked for changes" containing the comment | "Edit Investigator" (opens `sheet`) |
| Approved | Name, occupation, badge | "View" |

- The card is a `section` headed by an `h2` "Your Investigator".
- Loading: a skeleton card with `aria-busy="true"`.
- Error: "We couldn't load your Investigator." with a "Try again" button.
- The "creation methods not available" state is static text, not `role="alert"`, because it is not the result of an action. It reflects Keeper changes when the page is reloaded.
- If "Create Investigator" is refused because the Keeper changed the creation methods after the page loaded, the card reloads the Campaign and shows the "not available" state. If it is refused because a Draft already exists (for example from another tab), the card reloads the Investigator and shows the Draft state.

### 3.3 Campaign page states (both roles)
- Loading: a skeleton block with `aria-busy="true"` in place of the page content.
- Error: "We couldn't load this Campaign." with a "Try again" button.
- Not found (the caller is not a member, or the Campaign does not exist): `h1` "We couldn't find that Campaign" and a link "Back to Campaigns" to `/campaigns`, matching the Investigator not-found page in section 1.

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
- A definition list showing HP, MP, SAN, Luck, MOV, Build, Damage Bonus, Dodge, then "Occupation points left" and "Personal interest points left" once those budgets exist. With Quick fire there are no budgets; the rail shows "Skill values left" (the count of Quick fire skill values not yet assigned) and "Personal interests left" instead. Values that can't be calculated yet show an em dash with the visually hidden text "not yet calculated".
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

A step is completed when it is started and has no errors. A step is started once the Player has entered any of its inputs. Personal interests has no required input (unspent points only warn), so it also counts as started once Occupation skills is completed (decided 2026-10-07).

### 5.4 Changing an earlier step
Later inputs are kept. When the Player saves, any later step whose inputs became invalid switches to "Needs attention" in the stepper, and the status message "Some later steps need attention." is announced.

### 5.5 Destructive actions
- **Start over**: an AlertDialog titled "Start over?" with the body "This deletes your draft Investigator. You can't undo this." Buttons: "Delete draft" (destructive, sends `DELETE .../investigators/mine`) and "Keep draft" (default focus). On success the Player returns to the Campaign page with the status message "Draft deleted."
- **Changing the creation method** after values have been entered: an AlertDialog titled "Switch to Point buy?" with the body "Your characteristic values will be cleared." Buttons: "Switch and clear" and "Keep current method" (default focus). Choosing "Keep current method" puts the radio back to its previous value. When the switch is to or from Quick fire and skill values have been entered, the body adds "Your skill values will be cleared too.", because Quick fire's skill values are never mixed with occupation and personal interest points (PBI-CP-009).
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
  - **Luck (Point buy)**: below the eight inputs and the budget counter, outside the budget, an `h2` "Luck" with the help text "Luck isn't bought with points. Roll 3D6 at the table and enter the total." The dice expression in the help text comes from the rules data.
  - One `dice-roll-input` row labelled "Luck, 3D6 total" with the range hint from the dice expression (for example "3 to 18") and the computed result as text ("= 55").
  - When the age is in the two-Luck-roll bracket, a second row "Luck, second roll" appears with the help text "Your age lets you roll Luck twice and keep the higher result." The kept value is shown as "Luck kept: 65". The second row is not rendered for other ages.
  - Luck values are not counted in "Points used". Errors on the Luck rows appear in the step's error summary and inline, like any other field.
- **Quick fire**: eight Selects. Each Select offers the pool values not yet assigned elsewhere, plus its own current value. A line "Values left to assign: 50, 60" shows what remains.

### 6.3 Age effects (`age`)
- The intro line is built from the age bracket the server returns, for example "At age 45 you lose 5 points from STR, CON or DEX, and APP is reduced by 5." Every number and characteristic in it comes from rule data, not hard-coded text. Parts that don't apply to the bracket are left out (for example ages 20 to 39 read "At age 25 you make 1 EDU check.").
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
Choices first, then values, in one guided list (selected 2026-10-08, option A of three; alternatives were values that follow the slot, and inline guidance only). The step has two sections, each with an `h2`:
- **"1. Make your skill choices"**: the choice controls for the occupation's open slots. For example, a Select "Choose 1 interpersonal skill". Specialized skills get a text Input with suggestions from a `datalist` ("Art/Craft specialization").
- **"2. Assign values"**: the `skill-allocation-table`, with columns Skill, Base, Points (number input), Total.
  - **Credit Rating comes first**, with the hint "Must be between 30 and 70". The other rows follow the occupation's skill slots in catalog order (a custom occupation's eight skills in their order), so rows never reorder after a save.
  - A row whose slot has no skill chosen yet is named after the slot (for example "Choose 1 interpersonal skill"), its input is disabled, and it reads "Choose this skill above first".
  - The budget counter reads "Occupation points left: 120 of 280". When it goes below zero it shows "40 over budget" with an error icon and text.
- **"No longer occupation skills"** (an `h3` under section 2, shown only when needed): every skill that still holds occupation points but is no longer an occupation skill (after a slot choice, a specialization, or the occupation changed). Each row shows the skill, its points, its error, and a "Remove value" button (accessible name "Remove value from {skill}") that clears them. The error summary link focuses that button.

### 6.6 Personal interests (`personal-interests`)
- The same table covers all skills, filtered by a toggle "Show: All skills / Skills with points".
- The budget counter reads "Personal interest points left: 60 of 140".
- The Cthulhu Mythos row has a disabled input with the text "Not available at creation".
- **"No longer personal interests"** (an `h3`, shown only when needed): personal interest points on Credit Rating ([project_ruleset.md section 4.6](../../docs/game-rules/project_ruleset.md#46-credit-rating-takes-occupation-points-only)) or Cthulhu Mythos, each with its error and a "Remove" button (accessible name "Remove personal interest points from {skill}"). The error summary link focuses that button.
- An "Add another specialization" button (for example a second Language (Other)) opens a "Skill to specialize" Select, which receives focus, and the specialization field for the chosen skill; "Add row" then adds the row.

### 6.5a Quick fire skills (selected 2026-10-07, option A of three: table with value Selects; alternatives were a value-centred list and drag-and-drop chips)
Quick fire assigns fixed values instead of spending points ([spec.md](spec.md), Delivery scope PBI-CP-009). The steps reuse `skill-allocation-table`:
- **Occupation** (`occupation`): the option cards hide the points line and the formula choice, because Quick fire has no occupation points.
- **Occupation skills** (`occupation-skills`): the same two sections and row order as 6.5. In the table the Points column is replaced by a Select labelled "{skill}, Quick fire value" on Credit Rating (first) and on each chosen occupation skill. Each Select offers "No value" (which clears the row), the values not yet assigned elsewhere, and its own current value, like the Quick fire characteristics in 6.2. Credit Rating shows the hint "Must be {value} for this occupation". A line "Values left to assign: 50, 40" shows what remains.
  - When the occupation's Credit Rating does not take a Quick fire value, the last row is "Extra skill (freed {value})": its control is a skill picker "Extra skill for the freed {value}" with the help text "Your Credit Rating doesn't use a Quick fire value, so the freed {value} goes to one more skill of your choice." The chosen skill is stored as the extra skill and takes the freed value; its Total shows that value.
  - "No longer occupation skills" lists every skill that still holds a Quick fire value but is no longer an occupation skill, with the value, its error, and "Remove value".
- **Personal interests** (`personal-interests`): the Points column is replaced by a Checkbox "{skill}, +{bonus}" on every skill that is not an occupation skill, Credit Rating, or Cthulhu Mythos. The counter reads "Personal interests chosen: 2 of 4" and counts every stored choice. A chosen skill that can no longer be a personal interest (it became an occupation skill, the extra skill, or took a Quick fire value, or it is chosen twice) is listed under "No longer personal interests" with its error and a "Remove" button (accessible name "Remove {skill} from your personal interests"), which the error summary link focuses. When it reaches the count, the unchecked Checkboxes stay enabled, and choosing another shows the error from the server and the client validator. The Total column shows the base plus the bonus.
- Every number in this copy comes from the rules data.

### 6.7 Sheet and submit (`sheet`)
Uses the shared `character-sheet-view` in edit mode for its narrative sections and read-only mode for the rest. Sections, each with an `h2`:
1. **Summary**: identity, characteristics with Hard and Extreme values, and derived values (including Idea and Know). Each has a "Change" link to its wizard step.
2. **Skills**: read-only table of skills with points, plus a "Show all skills" toggle. "Change" links point to the two skills steps.
3. **Backstory**: a Textarea for "My Story" and for each Background entry, in the order of the rules section, each at most 2000 characters. **Key Connection** is a RadioGroup "Which of these is your Key Connection?" listing the Background entries that are filled in (not My Story), plus "None". Before any entry is filled in, it reads "Fill in a Background entry to choose your Key Connection." instead. Emptying the chosen entry clears the choice.
4. **Weapons**: an "Add weapon" button adds a weapon, shown as a fieldset with the legend "Weapon 1" and the inputs Name, Skill, Damage, Attacks, Range, Ammo, and Malfunction (labels such as "Weapon 1 name"), plus a "Remove weapon 1" button. The inputs wrap into a grid, one column below 640px. Focus moves to the new weapon's Name after "Add weapon", and to "Add weapon" after a removal. Help text: "Enter weapon details from your rulebook. Your Keeper checks them when approving." A weapon without a name shows the `WeaponNameRequired` error inline and in the error summary on Submit.
5. **Gear and possessions**: Textarea, at most 2000 characters.
6. **Wealth**: read-only spending level, cash, and assets, from the server's values. Amounts that are a lower bound read "$5,000,000 or more"; no assets read "None". Before Credit Rating is calculable, each shows an em dash with the visually hidden text "not yet calculated".

In read-only mode (section 7) sections 3 to 5 show the text with its line breaks, with no inputs. The Key Connection entry is marked "(Key Connection)" after its heading. An empty Backstory, Weapons, or Gear section reads "None recorded.". Each weapon is a row of a table with the columns Weapon, Skill, Damage, Attacks, Range, Ammo, and Malfunction.

**Worth checking** (selected 2026-10-08, option A of three: an Alert at the top of the step; alternatives were warnings inline in each section and a confirmation dialog on Submit): when the sheet has warnings, the "Worth checking" Alert (section 5.2) sits below the error summary and above the sheet, listing every warning from every step. It does not block or confirm Submit.

**Submit to Keeper**:
- It saves the step's inputs first, as "Save and continue" does, then submits. If the save fails, the save failure Alert of section 5.1 appears and nothing is submitted.
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
- A **Worth checking** Alert lists the warnings. Custom content is also listed there: "Custom occupation: Bootlegger" and "2 custom weapons" ("1 custom weapon"). The custom content lines appear only on the Keeper's review; with no warnings and no custom content the Alert is not shown.
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

Tokens: `--destructive` (defined) and `--warning` (added in PBI-CP-003), each with at least 4.5:1 contrast against `--background`. Every warning and error also carries an icon and text.

## 9. Delivery by ticket

| Ticket | UX scope |
|---|---|
| PBI-CP-008 | Section 2; section 3.1 Rules options |
| PBI-CP-003 | Section 3 (both roles); sections 4 and 5, including the summary rail without the occupation and personal interest budget lines; step 6.1; step 6.2 for Point buy, including its Luck rows; step 6.3 Age effects; a `sheet` step with Summary and Submit; section 7, including Dice results |
| PBI-CP-009 | Step 6.2 (Standard rolling, Quick fire, the creation method RadioGroup, and the switch confirmation); steps 6.4 to 6.6 and 6.5a, including UX-22 to UX-26; the summary rail's budget lines; step 6.7 Skills (read-only, also on the Keeper's review) |
| PBI-CP-010 | Step 6.7 Backstory, Weapons, Gear, Wealth, Idea and Know, Worth checking, and save before submit; section 7.1 custom content lines; UX-27 to UX-30 |

In PBI-CP-009:
- The stepper shows all seven steps, so the Draft card reads "Step N of 7".
- Every creation method is available, so the state of UX-19 can't occur while every method is supported. Its card state is kept for a future method that isn't available yet.

In PBI-CP-003:
- The stepper shows Identity, Characteristics, Age effects, and Sheet and submit, so the Draft card reads "Step N of 4".
- Point buy is the only creation method available, so the step shows "Creation method: Point buy" as text and the RadioGroup is not rendered.
- The Submitted and Approved cards show the name and badge without an occupation.
- The summary rail shows HP, MP, SAN, Luck, MOV, Build, Damage Bonus, Dodge, and the problems line. Its values are the server's values from the latest save. The rail's live region has no budget to announce yet.
- The Summary section of `sheet` shows identity, each characteristic's assigned value, its value after age effects with Hard and Extreme values, and the derived values from the rail. Its "Change" links go to Identity, Characteristics, and Age effects.
- "Worth checking" lists the Point buy warnings only.
- Before a valid age is saved, the Age effects step shows "Your age effects appear once a valid age is saved on the Identity step." instead of its inputs.
- Dice results with no Roll Records reads "No dice results yet."; the review screen ends with a "Back to Campaign" link.
- The Player's read-only View (Submitted or Approved) shows the Investigator name as `h1`, the status badge, the read-only `character-sheet-view`, and a "Back to Campaign" link.

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
- **UX-19** When the Campaign allows no creation method that is available yet, the Your Investigator card explains it, names the methods to ask the Keeper for, and offers no create action.
- **UX-20** A Point buy Player enters Luck on the Characteristics step; Luck is not counted in "Points used", and a second Luck row appears only in the two-roll age bracket.
- **UX-21** A non-member opening a Campaign URL sees "We couldn't find that Campaign" with a link back to Campaigns.
- **UX-22** On Occupation skills, a row whose slot has no skill chosen is disabled and reads "Choose this skill above first"; rows keep the occupation's slot order after every save.
- **UX-23** A Quick fire value Select offers "No value", which clears the row and returns its value to "Values left to assign".
- **UX-24** Changing a slot choice after assigning moves the old skill to "No longer occupation skills" with its value, its error, and "Remove value"; removing it returns the value to the pool.
- **UX-25** When Credit Rating frees a Quick fire value, "Extra skill (freed {value})" is a row of the table; the chosen skill takes the freed value.
- **UX-26** A personal interest choice the rules no longer allow (a Quick fire personal interest that became an occupation skill, the extra skill, or a valued skill, or one chosen twice; personal interest points on Credit Rating or Cthulhu Mythos) is listed under "No longer personal interests" with its error and "Remove"; removing it updates the count.
- **UX-27** On Sheet and submit, the Player records My Story, Background entries, a Key Connection chosen from the filled-in entries, Custom Weapons, and Gear; "Submit to Keeper" saves them before submitting.
- **UX-28** The read-only sheet (Player's View and Keeper's review) shows the Backstory with its Key Connection, the weapons table, Gear, and Wealth, with no inputs.
- **UX-29** On Sheet and submit, every warning is listed in "Worth checking"; a sheet with warnings and no errors submits.
- **UX-30** The Keeper's "Worth checking" lists the custom occupation and the number of custom weapons with the warnings.

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

Occupation skills (6.5, 6.5a) and Personal interests (6.6) against these criteria ("No longer personal interests" follows the same pattern as "No longer occupation skills"): the two sections are headed (`h2`) and "No longer occupation skills" is an `h3` (A11Y-1, 1.3.1); every control keeps a label naming its skill, and a disabled row says why in text (A11Y-3); each error is linked from the error summary to its row control, including the "Remove value" button (A11Y-4); clearing or removing a value is announced through the step's polite status region as the new "Values left to assign" or points left (A11Y-5); disabled and left-over states are shown with text, never colour alone (A11Y-6); "Remove value" and the Select options are at least 24 by 24 pixels (A11Y-9).

## 12. Open decisions and research gaps

- **Decided 2026-10-02:** the Change Request comment is limited to 2000 characters. The "skill above 90" warning stays as app-level advice, not a rule.
- **Research gap:** whether Players actually create Investigators over several sessions. Measure resumes per Draft before investing further in the task-list hub (Option B).
- **Research gap:** the one-click Approve has no undo. Watch for Keepers asking to revert an approval. Undo is not in the current lifecycle.
- **Research gap:** whether new Players understand the dice-entry rows without help. Test with one or two first-time Players before PBI-CP-009 ships.

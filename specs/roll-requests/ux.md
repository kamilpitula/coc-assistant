# UX Specification: Roll Requests

Selected direction: **Option A (roll tool inline on Run)**, chosen 2026-11-12 from a clickable prototype of three options (see section 12). Alternatives considered:
- **Option B ("Request a roll..." dialog with a per-Investigator table, Keeper rolls from the Wall card):** rejected at the gate. It adds a step to every request, and Waiting rolls are tracked only on cards, which fall out of the 5-entry Wall preview.
- **Option C (a "Rolls" sub-tab with the form and actionable cards):** rejected at the gate. Requesting means leaving Run, and Run's slot reserved for play tools ([scene-play ux](../scene-play/ux.md) section 21, human decisions of 2026-11-04) would stay empty.

Human decisions (2026-11-12):
- The Keeper also gets a waiting-rolls count on the Campaign "Active Scene" tab.
- Skill-roll rows on the card show "Experience check earned" when their Roll Record earns one.
- Cancelling, and cancelling on finish or removal, stay in PBI-DICE-007 (section 10).
- The request form leaves out each Investigator's target value; the values appear on the card (section 12, deviation 1).

Human decisions (2026-11-13, PBI-DICE-006), chosen from a clickable prototype (section 12.1):
- **Option A (a visibility choice in the form)** for hidden rolls (sections 3.1 and 5.2). Option B (two submit actions, "Request roll" and "Make a hidden roll") and Option C (two form modes with inline results) were rejected at the gate.
- The visibility choice is kept after each request, not reset to Public. Keepers often make several hidden rolls in a row; the risk is handled at the commit point (section 3.1).
- The hidden-roll status shows the results inline. It leaves out "Experience check earned", which the card shows.
- No game rule covers hidden rolls; the authority is [spec.md](spec.md), Hidden roll, and the root CONTEXT.md glossary ("Hidden roll").

Human decisions (2026-11-14, PBI-DICE-007), section 17:
- **Option A (an immediate "Cancel" in each "Waiting rolls" row)**. Option B (a confirmation dialog) and Option C (an inline two-step confirm in the row) were rejected at the gate:
  - Option B adds a dialog to an action that a re-request undoes, which is heavier than the irreversible "Roll for", which has no confirmation.
  - Option C is a new in-row state pattern with no precedent, and its focus handling is harder.
- Removing an Investigator present saves first and then reports how many waiting rolls were cancelled. There is no warning before saving.
- Starting another Scene with "Finish {title} first" also cancels the finished Scene's waiting rolls. The start page shows the count (scene-play ux section 24).
- The Player side is silent: a cancelled roll just leaves the panel and the badge.

Behavior and rules: [specs/roll-requests/spec.md](spec.md). This document covers presentation only. Rules are cited, never restated: [skill rolls](../../docs/game-rules/coc7_skill_rolls_rules.md) sections 2 to 5 and 7, [project_ruleset.md](../../docs/game-rules/project_ruleset.md) sections 4.2, 4.7, 4.8, and 4.9, and [character rules section 16.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#161-skill-experience-tick-during-play).

## 1. Information architecture

```
/campaigns/$campaignId/active-scene   Run (Keeper): "Request a roll" and "Waiting rolls" in the left column
/campaigns/$campaignId/active-scene   Player view: "Rolls waiting for you" first after the h1
/campaigns/$campaignId/wall           Wall page: Roll Request cards in the entry list
Every Campaign page                   Campaign tab "Active Scene" with the waiting count badge; the assertive region
```

- **Keeper:** creates a Roll Request on Run, rolls Waiting Requested Rolls for any Investigator from "Waiting rolls", and reads every card.
- **Player:** rolls their own Investigator's Requested Rolls from "Rolls waiting for you", and reads Public cards. A Player never sees a control that acts on another Investigator.
- The Keeper sub-tabs To reveal, Keeper reference, and Revealed are unchanged and show no roll tool.
- Entry points: Run; the "Active Scene" tab with its badge; the announcement. Exit: the Campaign tabs.

## 2. Run layout change (Keeper)

```
>= 1024px                                                   < 1024px (one column)
+--------------------------------------+------------------+  Keeper notes
| Keeper notes            [Hide]  (h2) | Wall        (h2) |  Request a roll
+--------------------------------------+ (cards inline)   |  Waiting rolls
| Request a roll                  (h2) |                  |  Investigators present
| ...form (section 3)...               +------------------+  Wall
+--------------------------------------+ Investigators    |
| Waiting rolls  [2]              (h2) | present (h2)     |
| Lucy Ward . Spot Hidden . Hard .     |                  |
|   1 Penalty Die      [Roll for Lucy Ward]               |
+--------------------------------------+------------------+
```

- Amends [scene-play ux](../scene-play/ux.md) section 21.3: "Future play tools" in the left column under Keeper notes become "Request a roll" and then "Waiting rolls", each a bordered `section` card labelled by its `h2`.
- DOM order: Keeper notes, Request a roll, Waiting rolls, Investigators present, Wall. From 1024px the right column is unchanged (Wall above Investigators present). Below 1024px it is one column in DOM order.

## 3. "Request a roll" form (`roll-request-form`)

```
Request a roll                                        (h2)
What to roll   [ Spot Hidden            v ]   Language [ Latin ]  (only when needed)
Message (optional)
[                                                   ]
0 / 2000
For everyone                                          (fieldset)
  Difficulty  (o) Regular  ( ) Hard  ( ) Extreme
  Bonus Dice [0 v]   Penalty Dice [0 v]
  (Luck only) Luck rolls are always Regular, with no Bonus or Penalty Dice.
Who rolls                                             (fieldset)
  [x] Harvey Walters      Regular . no Bonus or Penalty Dice     [Change for Harvey]
  [x] Lucy Ward           Hard . 1 Penalty Die (changed)         [Done]
      +-- Difficulty [Hard v]  Bonus Dice [0 v]  Penalty Dice [1 v]  [Use the defaults]
  [ ] Cy Holloway
Choose at least one Investigator.                     (hint, only while none is checked)
                                                      [ Request roll from 2 ]
```

- **What to roll:** a shadcn `Select` with three groups: "Skills" (the Era's skill catalog from `GET /api/campaigns/{campaignId}/rules/skills`, alphabetical), "Characteristics" (STR, CON, DEX, APP, POW, SIZ, INT, EDU), and "Luck". Default: the first skill the first time the form is shown. It keeps the last value after each request.
- **Specialization:** an `Input` labelled with the family name (for example "Language") that shows only for a skill whose catalog entry needs a specialization ([project_ruleset.md section 4.2](../../docs/game-rules/project_ruleset.md#42-weapons-gear-and-specializations-without-catalogs)). A closed family (for example Fighting) shows a `Select` of its allowed specializations instead. It is required while shown.
- **Message:** a `Textarea` (2 rows) labelled "Message (optional)" with the counter "{n} / 2000". No `maxLength`. Over 2000 characters the counter becomes the error "Messages can be at most 2000 characters." (`aria-invalid`, destructive colour plus text) and the submit button is disabled. Same pattern as [campaign-wall ux](../campaign-wall/ux.md) section 4.2.
- **For everyone:** a `fieldset` with legend "For everyone". It holds a `RadioGroup` "Difficulty" (Regular default) and two `Select`s "Bonus Dice" and "Penalty Dice" (0, 1, 2; default 0; limits per [skill rolls section 5](../../docs/game-rules/coc7_skill_rolls_rules.md#5-bonus-and-penalty-dice)).
- **Luck:** while Luck is chosen, Difficulty shows Regular and both dice show 0. All three are `disabled`, and the fieldset's `aria-describedby` points to the hint "Luck rolls are always Regular, with no Bonus or Penalty Dice." ([project_ruleset.md section 4.8](../../docs/game-rules/project_ruleset.md#48-luck-rolls)). The per-Investigator "Change for ..." buttons are not shown. Choosing another target restores the earlier defaults.
- **Who rolls:** a `fieldset` with legend "Who rolls" and one row per Investigator present, in the Active Scene's order:
  - A `Checkbox` labelled with the Investigator's name. Unchecked by default.
  - When checked, a summary line in muted text: "{Difficulty} . {dice}", for example "Hard . 1 Penalty Die". When the row differs from the defaults it gets " (changed)" in normal text.
  - When checked (not for Luck), a ghost button "Change for {first name}" (accessible name "Change Difficulty and dice for {name}", `aria-expanded`). It opens an inline group (`role="group"`, accessible name "Changes for {name}") with Difficulty, Bonus Dice, and Penalty Dice `Select`s, plus "Use the defaults". While open the button reads "Done".
  - A row follows the defaults until one of its own values is changed. "Use the defaults" clears its changes and closes the group.
  - No target values are shown in the form. They appear on the card once the request exists (section 5; see section 12, deviation 1).
- **Submit:** the primary `Button` "Request roll", or "Request roll from {n}" when more than one is checked. It is disabled while no Investigator is checked (`aria-describedby` points to the hint "Choose at least one Investigator."), while a required specialization is empty, while the message is over 2000 characters, and while a request is in flight. While in flight it reads "Requesting...".
- **Success** (confirmed, not optimistic):
  - The page `role=status` paragraph says "{target} roll requested from {names}." ({names}: "Harvey Walters", "Harvey Walters and Lucy Ward", "Harvey Walters, Lucy Ward and Cy Holloway").
  - The card appears on the Wall, and the rows join "Waiting rolls".
  - The form clears the message, the checks, and every per-Investigator change, and resets the defaults to Regular and 0. It keeps the target.
  - Focus moves to "What to roll". The submit button can't keep focus, because it is disabled once nothing is checked.
- **Errors:**
  - 400: an inline `Alert` in the form, "We couldn't request that roll: {reason}.", where {reason} comes from the problem details. Known reasons: "an Investigator is no longer present", "that skill needs a specialization", "that specialization isn't allowed". Everything the Keeper entered is kept. If an Investigator present was removed meanwhile, the form refreshes the rows and keeps the other choices.
  - 409 (no Active Scene): the page shows the no-Active-Scene state with focus on the `h1`, as for a Reveal ([scene-play ux](../scene-play/ux.md) section 13).
  - Network or 5xx: the `Alert` "We couldn't request that roll. Your choices are still here. Try again."
- **Leaving Run** (another sub-tab or page) discards the form, including the visibility choice (section 3.1). There is no unsaved-changes prompt.

### 3.1 Who can see the roll (PBI-DICE-006)

```
Who rolls                                             (fieldset)
  [x] Harvey Walters ...
Who can see this roll?                                (radiogroup)
  (o) Public - Players roll it themselves and everyone sees the result.
  ( ) Keeper only (hidden roll) - The app rolls it now. Only you see it.
Keeper only: the app rolls this now and only you see the results.   (only in Keeper only)
                                                      [ Roll now for 2 ]
```

- **Control:** the shared `VisibilityChoice`, a `RadioGroup` labelled by the visible text "Who can see this roll?", placed after "Who rolls" and before the hints and the submit.
  - Options: "Public", described as "Players roll it themselves and everyone sees the result.", and "Keeper only (hidden roll)", described as "The app rolls it now. Only you see it."
  - Each description is linked to its option with `aria-describedby`.
  - Players never see the form (RR-UX-14).
- **Default:** "Public" whenever the form appears: on page load, on entering Run, and after a new Scene starts.
- **After a request (human decision, 2026-11-13): the choice is kept.** It stays as last chosen across requests and errors, like the target.
  - It returns to "Public" only when the form unmounts: when the Keeper leaves Run (another sub-tab or page), reloads, or the Active Scene ends.
  - It is never stored on the server or in the browser.
- **Why the choice is kept, and how the risk is handled:**
  - Keepers often make several hidden rolls in a row, and resetting would make each of them risk going out Public.
  - A mistaken hidden roll costs only a re-request: no Player sees anything.
  - A mistaken Public roll shows a secret to every Player and can't be undone, because visibility never changes ([spec.md](spec.md), Constraints).
  - So the commit point always states the mode in text:
    - With "Keeper only" chosen, the submit reads "Roll now", or "Roll now for {n}" with more than one Investigator ("Rolling..." while in flight).
    - The line "Keeper only: the app rolls this now and only you see the results." sits directly above the submit, in normal text with a leading `EyeOff` icon (`aria-hidden`), and is linked to the submit with `aria-describedby`.
    - With "Public" chosen, the submit reads "Request roll" or "Request roll from {n}" and the line is absent.
- **Submit rules:** the disabled rules are unchanged (RR-UX-5).
- **Success for a hidden roll** (confirmed, not optimistic):
  - The page `role=status` paragraph reads "{target} hidden roll: {name} rolled {result}: {outcome}; {name} rolled {result}: {outcome}." Investigators appear in the request's row order, joined with "; ", and the sentence ends with ".".
    - Example: "Psychology hidden roll: Harvey Walters rolled 34: Regular success; Lucy Ward rolled 81: Failure."
    - The text comes from the 201 response. The outcome copy is section 5's, and an unnamed Investigator is "Unnamed Investigator".
  - "Experience check earned" is not in the status; the card shows it.
  - **Several Investigators:** the paragraph wraps (`break-words`), is never truncated, and has no inner list. It is one `role=status` region, so screen readers read the whole sentence once, politely. With 3 or more Investigators it runs to several lines; that is accepted.
  - Otherwise as section 3: the card appears on the Wall; the message, checks, per-Investigator changes, and defaults clear; the target and the visibility stay; focus moves to "What to roll".
  - Nothing joins "Waiting rolls", and the tab badge does not change.
- **Errors:** 400, 409, and network errors are as in section 3, with the same copy. The visibility choice is kept.

## 4. "Waiting rolls" list (`waiting-rolls`, Keeper)

- A `section` with `h2` "Waiting rolls" and a count `Badge`. The count is part of the heading text: "Waiting rolls, 2" through visually hidden text.
- An `ul` of every Waiting Requested Roll of the Active Scene's Roll Requests, oldest request first, then in the request's row order. Each `li` shows "{name} . {target} . {Difficulty} . {dice}", the request time (`time`, as [campaign-wall ux](../campaign-wall/ux.md) section 3), and the message clamped to one line when there is one.
- Action: a secondary `Button` "Roll for {name}" (accessible name "Roll {target} for {name}").
  - On click it is disabled and reads "Rolling...". On success the row leaves the list, the status paragraph says "{name} rolled {result} for {target}: {outcome}." (outcome copy in section 5), and focus moves to the next row's button, then the previous one, then the `h2` (`tabIndex=-1`).
  - On 409 (already rolled, for example by the Player): the row leaves the list, and the status says "{name}'s {target} roll was already made." with the same focus rule.
  - On a network error: the button returns and an inline `Alert` under the row says "We couldn't roll that. Try again.".
- Second action (PBI-DICE-007): a ghost `Button` "Cancel" after "Roll for {name}" (section 17.1).
- **Empty:** "No rolls waiting." (muted). The section stays.
- **Live:** rows come and go in place without announcement and never move focus, except as described above when the focused row leaves.

## 5. Roll Request card (`roll-request-card`)

```
+--| Spot Hidden roll                          19:14 . Eleanor Hart  |
|  | Something moves upstairs.                                       |
|  |-----------------------------------------------------------------|
|  | Harvey Walters                       (check) 25: Hard success   |
|  | Regular . no Bonus or Penalty Dice . target 60 / 30 / 12        |
|  | Tens 20, units 5 = 25                                           |
|  | Rolled by Ana Duarte                                            |
|  | Experience check earned                                         |
|  |-----------------------------------------------------------------|
|  | Lucy Ward                                            Waiting    |
|  | Hard . 1 Penalty Die . target 45 / 22 / 9                       |
+-----------------------------------------------------------------------+
```

- **Where:** the entry for a `RollRequest` Wall Entry on the Wall page list ([campaign-wall ux](../campaign-wall/ux.md) section 2) and in `wall-preview` (section 7 there, and the Run Wall of scene-play ux section 21.8). It is the same component in both places and is never clamped.
- **Structure:** an `article` labelled by its `h3` "{target} roll" (for example "Spot Hidden roll", "Language (Latin) roll", "DEX roll", "Luck roll"). The header line has the `time` and the Keeper's display name. The message, when present, is plain text (`whitespace-pre-line`, `break-words`). The rows are a `ul`, one `li` per Requested Roll in the request's order. The card has a strong left border to set it apart from text entries; this is not the only cue, because the heading says "roll".
- **Row content:**
  - Line 1: the Investigator's name (bold), and at the end the status:
    - Waiting: "Waiting" in warning colour, as text.
    - Rolled: a check icon (`aria-hidden`) and "{result}: {outcome}" for a success, or a cross icon and the same text for a failure.
    - Cancelled (PBI-DICE-007): "Cancelled" in muted text, with no icon (section 17.2).
  - Line 2 (muted): "{Difficulty} . {dice} . target {regular} / {hard} / {extreme}" ([skill rolls section 2](../../docs/game-rules/coc7_skill_rolls_rules.md#2-target-values)). When the Investigator lacks the skill it adds " (base value)" ([character rules section 6.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#61-standard-1920s-investigator-sheet-skill-base-values)). Luck rows read "Regular . no Bonus or Penalty Dice . target ..." like any other row.
  - Rolled only, line 3: the faces. With one tens die: "Tens {tens}, units {units} = {result}". With more: "Tens {t1} and {t2}, units {units} - kept {result}" ([skill rolls section 5](../../docs/game-rules/coc7_skill_rolls_rules.md#5-bonus-and-penalty-dice)). Tens print as two digits ("00", "20").
  - Rolled only, line 4: "Rolled by {display name}". It names the Keeper when the Keeper rolled.
  - Rolled skill rows whose Roll Record earns a check, line 5: "Experience check earned" in success colour plus text. Nothing is shown when no check is earned.
- **Outcome copy** (from `successLevel` and `isSuccess`, [skill rolls section 4.3](../../docs/game-rules/coc7_skill_rolls_rules.md#43-resolving-a-roll)):
  - a success: "{Level} success" (for example "Hard success", "Critical success");
  - Failure: "Failure"; Fumble: "Fumble";
  - a level below the Difficulty: "{Level} - not enough for {Difficulty}" (for example "Regular - not enough for Hard").
- **No actions on the card in this PBI**, for anyone. No "Remove" either: a `RollRequest` entry never offers "Remove" ([campaign-play spec](../campaign-play/spec.md), Wall Entry kinds). This amends WL-UX-7 (section 9).
- **Loading:** the Wall lists the entry with its id. The card body loads the Roll Request on its own: the heading area shows a two-line `Skeleton` inside `aria-busy="true"`. If the load fails: "We couldn't load this roll." with "Try again". If the read returns 404 (gone or not visible): the card renders nothing.
- **Live:** results replace the row in place with no animation (CO-A11Y-10), and nothing is announced on the card itself (section 8).

### 5.1 Placeholder states for later PBIs (not built in PBI-DICE-005)

Defined here so that later PBIs add data and controls only:

| State (PBI) | Row status text | Extra row line | Card header |
|---|---|---|---|
| Cancelled (DICE-007, built: section 17.2) | "Cancelled" (muted) | none | - |
| Push asked (DICE-009) | "Push asked" (warning) | "Push justification: "{text}"" | - |
| Pushed (DICE-009) | "Pushed - waiting for the pushed roll" (warning) | the first result's lines stay above | - |
| Pushed roll rolled (DICE-009) | as Rolled | the first result, then "Pushed roll:" with the second result's lines | - |

Keeper actions for these states (Cancel, Approve or Decline a push) belong to the "Waiting rolls" list of section 4, not to the card. Each PBI specifies them in this document. The hidden roll state is specified in section 5.2.

### 5.2 Hidden roll card (PBI-DICE-006)

- **Header:** after the Keeper's display name, an outline `Badge` "Keeper only". Only the Keeper is ever sent a hidden card.
- **Rows:** always Rolled. Line 4 reads "Rolled by {Keeper display name} (hidden roll)". Every other line is as in section 5.
- **Hosts:** `wall-entry-list` and `wall-preview` are unchanged. They render the card instead of the entry header for `RollRequest` entries, so the card's badge is the only "Keeper only" badge shown.
- **Player:** the Wall query excludes the entry and a read by id returns 404, so the card renders nothing (section 5, Loading). There is no placeholder, gap, count, announcement, panel row, or badge (as [campaign-wall ux](../campaign-wall/ux.md) WL-UX-4 and WL-UX-12).

## 6. "Rolls waiting for you" panel (`waiting-rolls-panel`, Player)

```
The Corbitt House                                     (h1)
+---------------------------------------------------------------+
| Rolls waiting for you  [1]                              (h2)  |
| Listen . Regular . no Bonus or Penalty Dice                   |
| "A creak on the stairs."                    [ Roll Listen ]   |
+---------------------------------------------------------------+
| Your last roll                                       (h3)  |
| You rolled 25: Hard success. Experience check earned. (status)|
+---------------------------------------------------------------+
```

- **Where:** in both Player views of the Active Scene ([scene-play ux](../scene-play/ux.md) sections 4.1 and 4.2, 21.9), directly after the `h1` (and after Location when present), before "Investigators present". Removing an Investigator from the Investigators present cancels their Waiting rolls, so they leave the panel (section 17.3).
- **Shown when:** the Player's `GET .../investigators/mine/requested-rolls` returns at least one roll, or a result from this tab is still in its status line. Otherwise it is not rendered: no empty box and no placeholder.
- **Structure:** a `section` labelled by its `h2` "Rolls waiting for you", with a count `Badge` that is part of the heading's accessible name ("Rolls waiting for you, 1"). The panel is drawn with a warning-colour border and tinted background, and the heading text carries the meaning. Under it is an `ul` of rolls, oldest first. Each `li` has "{target} . {Difficulty} . {dice}", the message in quotes when present, and a primary `Button` "Roll {target}". When two rows share a target, the accessible name adds the time: "Roll Listen, requested 19:21". The result notice lives in its own `section` labelled by its `h3` "Your last roll", separated from the queue by spacing and a divider, so it never reads as another row.
- **Rolling:** the button is disabled and reads "Rolling..." (no optimistic result). On success the row leaves the list, and the panel's status line (`p`, `role="status"`, `tabIndex=-1`) says "You rolled {result}: {outcome}." plus " Experience check earned." when earned. Focus moves to that line. The line stays until the next roll or until the page is left.
- **409** (already rolled, for example by the Keeper): the row leaves the list, and the status line says "Your {target} roll was already made by the Keeper." Focus goes to the status line.
- **404** (no longer visible): the row leaves the list without a message.
- **Network error:** the button returns, and an inline `Alert` under the row says "We couldn't roll that. Try again.".
- **Live:** new rolls are appended in place. They never move focus and are announced as in section 8.

## 7. Campaign tab badge (`campaign-header`)

```
Overview   Active Scene (Live) (2)   Scene History   Wall   Settings
```

- The "Active Scene" link gets a count `Badge` (solid, tabular numbers) after the Live badge when the count is above 0:
  - Keeper: the number of Waiting Requested Rolls in the Active Scene.
  - Player: the number of their own Waiting Requested Rolls.
- Accessible name: "Active Scene, live, {n} rolls waiting" ("1 roll waiting"). Without a count the name stays "Active Scene, live" (NAV-UX-3). The count is never shown without an Active Scene.
- It is shown on every Campaign page, updates live, and never moves focus. Amends [navigation ux](../navigation/ux.md) section 2 and NAV-UX-3 (count added, Live unchanged).

## 8. Announcements

- **Assertive region:** one visually hidden `div` with `aria-live="assertive"` and `aria-atomic="true"`, mounted once in `campaign-layout` for Players. It is always in the DOM, so it is present before its text changes.
- **What is announced:** a Requested Roll for the Player's Investigator that appears after the Player's waiting list has been fetched since the page opened. Nothing is announced on first load, for cached data shown first, or on reconnect catch-up of rolls that were already waiting.
  - One: "Roll requested for {Investigator name}: {target}. Roll it on the Active Scene." On the Active Scene page itself: "Roll requested for {Investigator name}: {target}."
  - Several within one 5-second window: "{n} rolls requested for {Investigator name}. Roll them on the Active Scene." The window is the merge rule of [campaign-wall ux](../campaign-wall/ux.md) section 4.5.
- **Not announced assertively:** results, rolls leaving the list, and anything for the Keeper. The Keeper creates the requests and sees the status line.
- **Polite:** the new `RollRequest` Wall Entry is a Wall Entry, so the Wall preview and the Wall page announce it as "New Wall Entry from {Keeper}." (WL-UX-14, unchanged). Results are not announced politely to other members.

## 9. Amendments to other UX specifications

- [campaign-wall ux](../campaign-wall/ux.md):
  - WL-UX-7: "Remove" is never shown on a `RollRequest` entry.
  - Section 7: a `RollRequest` entry in the preview is the card of section 5, not clamped.
- [scene-play ux](../scene-play/ux.md) section 21.3: the "Future play tools" slot holds sections 3 and 4. SPL-UX-50 becomes "Keeper notes, Request a roll, Waiting rolls, Investigators present, Wall".
- [navigation ux](../navigation/ux.md) NAV-UX-3: the tab may also carry the count of section 7.
- [campaign-overview ux](../campaign-overview/ux.md) CO-A11Y-7: Roll Request announcements to the targeted Player use the assertive region of section 8. Every other live change stays polite.

## 10. Cancelling (PBI-DICE-007)

Specified in section 17:
- the Keeper's "Cancel" and the Cancelled card row;
- the silent removal for Players;
- the automatic cancellation on Finish Scene, on starting another Scene with "Finish {title} first", and on removing an Investigator present.

The finish-dialog count, the present-save report, and the start-page hint are in [scene-play ux](../scene-play/ux.md) section 24.

## 11. Content

| Element | Copy |
|---|---|
| Form heading | "Request a roll" |
| Target label | "What to roll" |
| Groups | "Skills", "Characteristics", "Luck" |
| Message label | "Message (optional)" |
| Defaults legend | "For everyone" |
| Who legend | "Who rolls" |
| Luck hint | "Luck rolls are always Regular, with no Bonus or Penalty Dice." |
| None-checked hint | "Choose at least one Investigator." |
| Override toggle | "Change for {first name}" / "Done"; "Use the defaults" |
| Submit | "Request roll" / "Request roll from {n}" / "Requesting..." |
| Created status | "{target} roll requested from {names}." |
| Dice | "no Bonus or Penalty Dice", "1 Bonus Die", "2 Bonus Dice", "1 Penalty Die", "2 Penalty Dice", joined with ", " |
| Waiting heading | "Waiting rolls"; empty "No rolls waiting." |
| Keeper roll | "Roll for {name}" / "Rolling..."; status "{name} rolled {result} for {target}: {outcome}." |
| Card heading | "{target} roll" |
| Row status | "Waiting"; "{result}: {outcome}" |
| Target line | "{Difficulty} . {dice} . target {r} / {h} / {e}"; suffix " (base value)" |
| Faces | "Tens {t}, units {u} = {result}"; "Tens {t1} and {t2}, units {u} - kept {result}" |
| Roller | "Rolled by {display name}" |
| Check | "Experience check earned" |
| Player panel | "Rolls waiting for you"; "Roll {target}"; "You rolled {result}: {outcome}." |
| Announcement | "Roll requested for {name}: {target}. Roll it on the Active Scene." |
| Visibility legend (DICE-006) | "Who can see this roll?" |
| Visibility options | "Public" / "Keeper only (hidden roll)" |
| Visibility descriptions | "Players roll it themselves and everyone sees the result." / "The app rolls it now. Only you see it." |
| Mode line | "Keeper only: the app rolls this now and only you see the results." |
| Hidden submit | "Roll now" / "Roll now for {n}" / "Rolling..." |
| Hidden status | "{target} hidden roll: {name} rolled {result}: {outcome}; ..." |
| Hidden card | badge "Keeper only"; roller "Rolled by {Keeper} (hidden roll)" |
| Keeper cancel (DICE-007) | "Cancel" / "Cancelling..."; accessible name "Cancel {target} roll for {name}" |
| Cancel statuses (DICE-007) | "{name}'s {target} roll was cancelled." / "{name}'s {target} roll was already made." / "{name}'s {target} roll was already cancelled." |
| Cancel error (DICE-007) | "We couldn't cancel that. Try again." |
| Cancelled row (DICE-007) | "Cancelled" |

## 12. Prototype validation

- **Question:** what should requesting, waiting for, and showing a Roll Request look like (Keeper form placement, where the Keeper rolls for absent Players, Player panel, badge, card)?
- **Branch:** UI (prototype skill, UI.md). It was a single self-contained HTML file with `?variant=A|B|C`, a floating switcher (option, role, width 1280 or 375, later-PBI placeholders), and a debug strip for announcements and badge counts. It was built outside the repository at the human's request instead of on the `/active-scene` route.
- **Throwaway branch:** `prototype/dice-005-roll-requests` (local, never merged), file `specs/roll-requests/prototype/roll-requests-prototype.html`. Open it in a browser with `?variant=A`, `B`, or `C`.
- **Verdict:** Option A, with no changes requested.
- **Date and deciding human:** 2026-11-12, the project owner.
- **Deviations of this specification from the prototype:**
  1. The form shows no target values per Investigator, because they would need a new values preview read. They appear on the card from creation. The human confirmed this on 2026-11-12.
  2. The panel is not rendered when empty; the prototype showed an empty box only as a demonstration.
  3. The empty-hint and status copy were refined.

### 12.1 Prototype validation (PBI-DICE-006)

- **Question:** how should the Keeper choose a hidden roll in "Request a roll", what happens to the choice after a request, and what does the status say?
- **Branch:** UI (prototype skill, UI.md). A single self-contained HTML file with `?variant=A|B|C`, plus switches for the role, the after-request behaviour (reset or keep), the status copy (short or inline results), and the width (1280 or 375). A debug strip shows which action a submit fired and which audiences received live signals.
- **Throwaway branch:** `prototype/dice-006-hidden-rolls` (local, never merged), commit `f588457`, file `specs/roll-requests/prototype/hidden-rolls-prototype.html`. Open it in a browser with `?variant=A`, `B`, or `C`.
- **Verdict:** Option A; the choice is kept after a request; the results are inline in the status.
- **Date and deciding human:** 2026-11-13, the project owner.
- **Deviations of this specification from the prototype:**
  1. The mode line above the submit was added to offset the risk of keeping the choice (section 3.1).
  2. The prototype left out the per-Investigator changes and six characteristics; section 3 is unchanged.
  3. The prototype's status had no experience-check text; this specification matches it.

## 13. Component mapping

| Element | Component | Notes |
|---|---|---|
| Request form | new `roll-request-form` (roll-requests slice) | shadcn `Select`, `RadioGroup`, `Checkbox`, `Textarea`, `Input`, `Button`, `Alert`; the per-Investigator changes are an inline `role="group"` toggled by a button with `aria-expanded` |
| Visibility choice (DICE-006) | new shared `visibility-choice` (`src/shared/components/visibility-choice/`), extracted from `wall-entry-composer` | `RadioGroup`; used by the Wall composer and `roll-request-form` |
| Waiting rolls | new `waiting-rolls` (roll-requests slice) | `Card`, `Badge`, `Button` |
| Card | new `roll-request-card` (roll-requests slice) | hosted by `wall-entry-list` and `wall-preview` (the ADR 0028 host-adapts pattern); an outline `Badge` "Keeper only" for a hidden roll (section 5.2) |
| Player panel | new `waiting-rolls-panel` (roll-requests slice) | hosted by `active-scene-player-view` |
| Tab badge | `campaign-header` (`CampaignNavLink` gains a count) | `Badge` |
| Assertive region | `campaign-layout` | the reducer of `wallEntryAnnouncementThrottle`, generalized |
| Run slot | `run-view` | left column |

## 14. UX acceptance criteria

- **RR-UX-1** On Run the Keeper sees "Request a roll" and "Waiting rolls" under Keeper notes. Below 1024px the order is Keeper notes, Request a roll, Waiting rolls, Investigators present, Wall.
- **RR-UX-2** "What to roll" offers the Era's skills, the eight characteristics, and Luck. A skill that needs a specialization asks for it, and "Request roll" stays disabled until it is given.
- **RR-UX-3** Choosing Luck disables Difficulty (Regular) and both dice (0) and shows the Luck hint. The per-Investigator changes are hidden.
- **RR-UX-4** Checking an Investigator shows the defaults on their row. "Change for {first name}" changes only that row and marks it "(changed)". "Use the defaults" restores it.
- **RR-UX-5** "Request roll" is disabled with no Investigator checked and shows "Choose at least one Investigator.". With several checked it reads "Request roll from {n}".
- **RR-UX-6** A Public request shows "{target} roll requested from {names}.", adds one card to the Wall with every row Waiting, adds the rows to "Waiting rolls", clears the checks, message, and changes, and keeps the target.
- **RR-UX-7** "Roll for {name}" rolls the row. It leaves "Waiting rolls", the card shows the result for every member without reloading, and the card names the Keeper as the roller.
- **RR-UX-8** A Player whose Investigator has Waiting rolls sees "Rolls waiting for you" after the `h1` with one "Roll {target}" per roll. A Player without any sees no panel.
- **RR-UX-9** Rolling from the panel shows "You rolled {result}: {outcome}." (plus " Experience check earned." when earned) and removes the row. A second attempt that the server refuses says the roll was already made.
- **RR-UX-10** The card shows per row the status, Difficulty, dice, the three target values (with "(base value)" for a skill the Investigator lacks), and once rolled every tens face, the units face, the kept result, the outcome, and who rolled. It never shows "Remove".
- **RR-UX-11** A skill row whose Roll Record earns a check shows "Experience check earned". Characteristic and Luck rows never do.
- **RR-UX-12** The "Active Scene" tab shows the waiting count for the Keeper (all Waiting rolls) and for a Player (their own) on every Campaign page, and updates without reloading.
- **RR-UX-13** A targeted Player on any Campaign page hears the assertive announcement once per new roll, merged within 5 seconds, and never on first load.
- **RR-UX-14** A Player sees no control that rolls for another Investigator, and never sees the request form or "Waiting rolls".
- **RR-UX-15** (PBI-DICE-006) The form shows "Who can see this roll?" with "Public" (the default whenever the form appears) and "Keeper only (hidden roll)", each with its description.
- **RR-UX-16** (PBI-DICE-006) With "Keeper only" chosen, the submit reads "Roll now" or "Roll now for {n}" and the mode line shows directly above it. With "Public" chosen, the submit reads "Request roll" or "Request roll from {n}" and there is no mode line.
- **RR-UX-17** (PBI-DICE-006) After any request, or after an error, the visibility choice stays as chosen. After leaving Run and coming back, or after a reload, it is "Public".
- **RR-UX-18** (PBI-DICE-006) A hidden roll shows "{target} hidden roll: {name} rolled {result}: {outcome}; ..." in the status paragraph, adds one card whose rows are all rolled, with "Keeper only" in the header and "Rolled by {Keeper} (hidden roll)" on each row, and adds nothing to "Waiting rolls" or the tab badge.
- **RR-UX-19** (PBI-DICE-006) A Player on any Campaign page receives nothing for a hidden roll: no card on the Wall or in the preview, no panel row, no badge, and no assertive or polite announcement.
- **RR-UX-20** (PBI-DICE-007) Each "Waiting rolls" row shows "Cancel". Activating it removes the row, says "{name}'s {target} roll was cancelled.", and moves focus as for "Roll for". When the server refuses, the status reads "... was already made." or "... was already cancelled." and the row leaves. A network error shows "We couldn't cancel that. Try again." under the row.
- **RR-UX-21** (PBI-DICE-007) A cancelled roll's card row shows "Cancelled" and its target line, with no result lines, for every member who can see the card, without reloading.
- **RR-UX-22** (PBI-DICE-007) A cancelled roll leaves the Player's "Rolls waiting for you" panel and both tab badges without reloading and without any announcement or message to the Player.
- **RR-UX-23** (PBI-DICE-007) Finishing the Scene, starting another Scene with "Finish {title} first", or removing an Investigator present cancels the affected Waiting rolls, and their card rows show "Cancelled". Each of these journeys shows the count as in [scene-play ux](../scene-play/ux.md) section 24.

## 15. Accessibility acceptance criteria (WCAG 2.2 AA)

- **RR-A11Y-1** The form is a `form` labelled by its `h2`. "For everyone", "Who rolls", and each per-Investigator change are `fieldset`/`legend` or `role="group"` with an accessible name. Every control has a visible label (1.3.1, 3.3.2).
- **RR-A11Y-2** Disabled Luck controls are explained by text linked through `aria-describedby`. The disabled submit is linked to its hint (3.3.2, 4.1.2).
- **RR-A11Y-3** "Change for {first name}" has `aria-expanded` and an accessible name with the full Investigator name. "Roll for {name}" and "Roll {target}" names include the target and, where ambiguous, the time (2.4.6, 4.1.2).
- **RR-A11Y-4** After a request, focus is on "What to roll". After "Roll for", focus follows section 4. After a Player roll, focus is on the panel's status line. Focus never lands on `body` (2.4.3).
- **RR-A11Y-5** The assertive region is mounted before any text is placed in it and is used only for the Player's new Requested Rolls. Every other live change stays polite or silent (4.1.3).
- **RR-A11Y-6** Success, failure, Waiting, and "Experience check earned" are conveyed by text. Colour and icons are extra cues only (1.4.1), and status colours meet 4.5:1 for text (1.4.3).
- **RR-A11Y-7** The card is an `article` with an `h3`, and its rows are a list. The panel and the Waiting list are `section`s labelled by their `h2`, with the count in the accessible name (1.3.1).
- **RR-A11Y-8** All buttons are at least 44px high and keyboard reachable in visual order (2.1.1, 2.5.8).
- **RR-A11Y-9** At 320px and 200% zoom the form, the Waiting list, the panel, and the card reflow to one column without horizontal page scrolling (1.4.10).
- **RR-A11Y-10** Live insertions and removals use no motion (2.3.3).
- **RR-A11Y-11** (PBI-DICE-006) The visibility `RadioGroup` has a visible accessible name, has descriptions linked by `aria-describedby`, and is operable with the keyboard (1.3.1, 2.1.1, 3.3.2).
- **RR-A11Y-12** (PBI-DICE-006) The submit's accessible name changes with the mode, and the mode line is linked to the submit by `aria-describedby` (2.4.6, 4.1.2).
- **RR-A11Y-13** (PBI-DICE-006) The inline-results status is read once through the polite `role=status`. At 320px and 200% zoom it wraps without horizontal scrolling (4.1.3, 1.4.10).
- **RR-A11Y-14** (PBI-DICE-006) "Keeper only" and "(hidden roll)" are conveyed by text; colour and icons are extra cues only (1.4.1).
- **RR-A11Y-15** (PBI-DICE-007) "Cancel" has the accessible name "Cancel {target} roll for {name}", which starts with its visible label. It is at least 44px high and follows "Roll for {name}" in focus order (2.5.3, 2.5.8, 2.4.3).
- **RR-A11Y-16** (PBI-DICE-007) "Cancelled" is conveyed by text, not colour alone (1.4.1). When a live removal takes away the row that holds focus, focus moves to the panel's `h2`, or to the page `h1` when the panel unmounts. It never lands on `body` (2.4.3).

## 16. Open decisions and research gaps

- **Research gap:** whether merged assertive announcements are too interruptive in a busy scene. Validate with a screen-reader user at the table.
- **Open (DICE-009):** the Keeper's push rulings live in "Waiting rolls" (section 5.1), and PBI-DICE-009 confirms their copy. The copy for Cancel is confirmed in section 17.
- **Research gap (DICE-007):** whether Keepers cancel by mistake when "Cancel" sits next to "Roll for". A mistaken cancel costs a re-request. If it happens, revisit the rejected confirm options (Human decisions, 2026-11-14).
- **Research gap (DICE-006):** whether Keepers who leave the form on "Keeper only" send an unintended hidden roll. The opposite mistake, a Public roll meant to be hidden, is the one the mode line and the "Roll now" label guard against (section 3.1). Check with early Keepers.

## 17. Cancelling waiting rolls (PBI-DICE-007)

Behavior: [spec.md](spec.md), Lifecycle with the Scene and the cancel contract. Design: [PBI-DICE-007 design record](../../docs/dice/issues/07-cancel-waiting-rolls.design.md).

### 17.1 "Cancel" in "Waiting rolls" (Keeper)

```
Waiting rolls  [2]                                          (h2)
Lucy Ward . Spot Hidden . Hard . 1 Penalty Die   19:14  [Roll for Lucy Ward] [Cancel]
```

- **Control:** a ghost `Button` "Cancel", placed after "Roll for {name}", `min-h-11`.
  - Accessible name: "Cancel {target} roll for {name}".
  - No confirmation: a mistaken cancel costs only a re-request.
- **In flight:** the button reads "Cancelling...". Both of the row's buttons are disabled while either a roll or a cancel of that row is in flight.
- **Success** (confirmed, not optimistic): the row leaves the list, and the section's `role=status` paragraph says "{name}'s {target} roll was cancelled.". Focus moves as after "Roll for" (section 4): the next row's "Roll for" button, else the previous one, else the `h2`.
- **409, the roll was already made:** the status says "{name}'s {target} roll was already made.". The row leaves, and focus moves as on success.
- **409, the roll was already cancelled** (for example from another tab): the status says "{name}'s {target} roll was already cancelled.". The row leaves, and focus moves as on success.
- **409 (no Active Scene), network error, or 5xx:** the buttons return, and an inline `Alert` under the row says "We couldn't cancel that. Try again.". A Scene that ended moves the page through the live `activeScene` signal, as for "Roll for".
- **"Roll for" on a roll that was cancelled meanwhile:** the status says "{name}'s {target} roll was cancelled.". The row leaves, and focus moves as on success.

### 17.2 Cancelled row on the card

- **Row:** the status at the end of line 1 is "Cancelled" in muted text, with no icon.
  - Line 2 (Difficulty, dice, and target values) stays.
  - There are no faces, no "Rolled by", and no experience line.
- **Who sees it:** every member who can see the card, without reloading, through the `rollRequests` signal. A cancelled roll is never removed from its card.

### 17.3 Player side (silent)

- A cancelled roll leaves "Rolls waiting for you" and the tab badge through the `myRequestedRolls` signal. There is no status line, no assertive or polite announcement, and no message.
- **"Roll {target}" on a roll that was cancelled meanwhile:** the row leaves without a message, as for a 404 (section 6).
- **Focus:**
  - When the removed row's button had focus, focus moves to the panel's `h2` "Rolls waiting for you" (`tabIndex=-1`).
  - If the panel unmounts because it is empty, focus moves to the page `h1`.

### 17.4 Automatic cancellation

- **What cancels:**
  - Finishing the Active Scene cancels all of its Waiting rolls.
  - Starting another Scene with "Finish {title} first" cancels all of the finished Scene's Waiting rolls.
  - Saving the Investigators present cancels the Waiting rolls of every Investigator who is no longer present.
- **What the user sees:**
  - The cancelled rows show "Cancelled" on their cards (section 17.2), and they leave "Waiting rolls", the panels, and the badges.
  - The Keeper's counts and messages are in [scene-play ux](../scene-play/ux.md) section 24.

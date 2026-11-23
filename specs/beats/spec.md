# Feature: Beats

## Blueprint

### Context
A Keeper running a Scene needs to see how far the story has got. Has the Investigators' arrival at the house happened, have they found the diary, did they skip the cellar? Beats are the Keeper's ordered list of steps the Keeper expects or wants to happen in a Scene. The Keeper writes them while preparing and marks them as Reached or Skipped during play. Beats are Keeper-only: showing them would give away the Keeper's plan.

### Architecture
- **Domain:** a Beat is a child entity of the Scene aggregate in Scenario Preparation, beside its Handouts and links ([ADR 0019](../../docs/adr/0019-scene-links-are-child-entities-with-in-context-foreign-keys.md)). It is stored in Scenario Preparation's database.
  - A Beat has:
    - `title`: plain text, 1-200 characters after trimming;
    - `detail`: optional plain text, up to 1,000 characters;
    - a position in the Scene's Beat order ([ADR 0014](../../docs/adr/0014-order-preparation-records-by-stored-position-with-tie-break.md));
    - a state, `Pending`, `Reached`, or `Skipped`;
    - `stateChangedAt`, set when the state becomes Reached or Skipped and cleared on reset to Pending.
  - The Scene enforces the rules by status:

    | Scene status | Add | Edit | Reorder | Remove | Mark Reached or Skipped, reset to Pending |
    | --- | --- | --- | --- | --- | --- |
    | Prepared | yes | yes | yes | yes | no |
    | Active | yes | yes | yes | Pending Beats only | yes |
    | Finished | no | no | no | no | no |

  - A Scene has at most 50 Beats.
  - Beat changes never touch the Scene version ([ADR 0025](../../docs/adr/0025-one-active-scene-per-campaign-through-a-filtered-index-and-a-scene-version.md)): a Prepared Scene's Beats are all Pending, so a change racing a start loses nothing.
- **Beat API:** Keeper only, under the Scene, with the [Scene API](../scenario-preparation/spec.md) 404 rule. The 400 keys are `title` and `detail` ([ADR 0018](../../docs/adr/0018-scenario-preparation-validation-problems-keyed-by-request-path.md)).
  - `GET /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}` also returns `beats`, each `{id, title, detail, state, stateChangedAt}`, in Beat order.
  - `POST .../scenes/{sceneId}/beats` with `{title, detail}` adds a Pending Beat at the end.
    - 201 with the Beat.
    - 409 when the Scene is Finished, before any 400.
    - 400 for a title or detail outside its limits, or when the Scene already has 50 Beats.
  - `PUT .../scenes/{sceneId}/beats/{beatId}` with `{title, detail}` replaces them and keeps the state; 409 when the Scene is Finished.
  - `DELETE .../scenes/{sceneId}/beats/{beatId}` removes a Beat. It answers 409 when the Scene is Finished, or when the Scene is Active and the Beat is not Pending.
  - `PUT .../scenes/{sceneId}/beats/order` replaces the Beat order with the complete list of the Scene's Beat ids; a list that is not exactly that set is refused with 400; 409 when the Scene is Finished.
  - `PUT .../scenes/{sceneId}/beats/{beatId}/state` with `{state}` sets `Pending`, `Reached`, or `Skipped`.
    - 200 with the Beat.
    - 409 unless the Scene is Active.
    - 400 for an unknown state.
    - Setting the current state again changes nothing and answers 200.
  - Concurrent changes to one Beat are last-write-wins; there is no version per Beat.
- **Scene History:** `GET /api/campaigns/{campaignId}/scene-history` gives the Keeper, per Scene, `beats: {reached, skipped, total}` ([scene-play spec](../scene-play/spec.md), API Contracts). A Player never receives it.
- **Live updates:** every Beat change publishes `scenes` to `campaign:{campaignId}:keeper` ([scene-play spec](../scene-play/spec.md), Live updates), and the Keeper's tabs refetch the Scene, the Active Scene, and the Scene History. No Campaign-wide topic is published for a Beat.
- **Views:**
  - The preparation Scene page has a Beats section, where the Keeper writes Beats while the Scene is Prepared or Active.
  - Run on the Keeper's Active Scene page has a Beats section with one-action Reached and Skipped and a summary such as "3 of 6 reached, 1 skipped".
  - The Keeper's Scene History shows the summary line on each Scene.
  - Player views show none of it.
- **UX specification:** [ux.md](ux.md), written by the UX designer skill before implementation. It covers the Beat rows, one-action marking and reset, and the summary.
- **Dependencies:**
  - Depends on [Scenario Preparation](../scenario-preparation/spec.md) for the Scene aggregate and its status.
  - Depends on [Scene Play](../scene-play/spec.md) for Run and the Scene History.
  - Depends on Campaign Play for the Campaign hub.
  - Nothing depends on Beats.

### Constraints
- Beats, their states, their counts, and any live signal about them reach only the Keeper.
- Marking a Beat creates no Wall Entry, Reveal, or Scene History entry; only the Keeper's Beat counts change.
- A Finished Scene's Beats never change.
- Only a Pending Beat can be removed from an Active Scene, so a Reached or Skipped Beat stays in the record.

## Contract

### Definition of Done
- [ ] The Keeper can add, edit, reorder, and remove Beats on a Prepared Scene from the preparation Scene page.
- [ ] The Keeper can add, edit, and reorder Beats on an Active Scene, and remove its Pending Beats.
- [ ] On Run, the Keeper marks a Beat Reached or Skipped in one action and can reset it to Pending.
- [ ] Run and the Keeper's Scene History show the Scene's reached, skipped, and total Beat counts.
- [ ] Every Beat change on a Finished Scene is refused with 409.
- [ ] Marking is refused with 409 unless the Scene is Active.
- [ ] A 51st Beat is refused with 400.
- [ ] A Player or another Campaign's Keeper gets 404 from every Beat endpoint and never receives Beat counts in the Scene History.
- [ ] A Beat change in one Keeper tab appears in the Keeper's other tabs without reloading.

### Regression Guardrails
- Beats never reach a Player.
- A Finished Scene's Beats never change.
- A Reached or Skipped Beat is never removed.
- A Beat change never changes the Scene version.
- A Beat change never creates a Wall Entry or a Reveal.

### Scenarios
```gherkin
Scenario: The Keeper prepares Beats
  Given the Scene "The Corbitt House" is Prepared
  When the Keeper adds the Beats "Arrive at the house", then "Find the diary"
  Then the Scene has both Beats, Pending, in that order

Scenario: A Beat needs a title
  Given the Scene "The Corbitt House" is Prepared
  When the Keeper adds a Beat with an empty title
  Then the addition is refused with 400 and the Scene has no new Beat

Scenario: A Scene has at most 50 Beats
  Given the Scene "The Corbitt House" has 50 Beats
  When the Keeper adds another Beat
  Then the addition is refused with 400

Scenario: The Keeper marks a Beat Reached during play
  Given "The Corbitt House" is Active with the Pending Beat "Find the diary"
  When the Keeper marks "Find the diary" Reached on Run
  Then "Find the diary" is Reached with the time it was marked
  And Run shows "1 of 2 reached"

Scenario: The Keeper marks a Beat Skipped
  Given "The Corbitt House" is Active with the Pending Beat "Search the cellar"
  When the Keeper marks "Search the cellar" Skipped
  Then "Search the cellar" is Skipped and counts as skipped in the summary

Scenario: The Keeper resets a Beat marked by mistake
  Given "The Corbitt House" is Active and "Find the diary" is Reached
  When the Keeper resets "Find the diary" to Pending
  Then "Find the diary" is Pending with no time

Scenario: The Keeper improvises a Beat during play
  Given "The Corbitt House" is Active
  When the Keeper adds the Beat "Lucy confronts Knott"
  Then the Beat is Pending at the end of the Scene's Beats

Scenario: A Reached Beat cannot be removed during play
  Given "The Corbitt House" is Active and "Find the diary" is Reached
  When the Keeper removes "Find the diary"
  Then the removal is refused with 409 and the Beat is unchanged

Scenario: Beats cannot be marked before the Scene starts
  Given the Scene "The Corbitt House" is Prepared with the Beat "Find the diary"
  When the Keeper marks "Find the diary" Reached
  Then the change is refused with 409

Scenario: A Finished Scene's Beats are read-only
  Given the Scene "Meeting Knott" is Finished with Beats
  When the Keeper adds, edits, reorders, removes, or marks a Beat
  Then the change is refused with 409 and the Beats are unchanged

Scenario: The Keeper sees Beat progress in the Scene History
  Given "Meeting Knott" is Finished with 6 Beats, 3 Reached and 1 Skipped
  When the Keeper opens the Scene History
  Then "Meeting Knott" shows "3 reached, 1 skipped, of 6"

Scenario: Players never see Beats
  Given "Meeting Knott" is Finished with Beats
  When "Harvey Walters"'s Player opens the Active Scene or the Scene History
  Then the Player receives no Beat and no Beat counts
  And the Player receives no live signal when the Keeper marks a Beat

Scenario: Marking a Beat leaves no trace on the Wall
  Given "The Corbitt House" is Active
  When the Keeper marks a Beat Reached
  Then the Campaign Wall has no new Wall Entry
```

# Feature: Mentions

## Blueprint

### Context
During play the Keeper writes Scene Keeper notes that refer to the people and material of the Campaign: "@Mr. Knott lies about the cellar", "@Harvey Walters has @Walter Corbitt's diary". A Mention makes such a reference a live part of the notes. It always shows the target's current name. Hovering over it or focusing it shows a Keeper-only summary, and clicking it opens the target without losing the Keeper's place. Mentions are Keeper-only because Keeper notes are ([CONTEXT.md](../../CONTEXT.md), Keeper notes).

### Architecture
- **Scope:** Mentions exist only in Scene Keeper notes. Item and NPC Profile Keeper notes and Beats do not accept them; both are backlog follow-ups.
- **Mention targets:**
  - Approved Investigators of the Campaign.
  - Non-Player Entities: the Human NPC's NPC Profile or the Mythos Creature's Monster Profile, never a Scene's Non-Player Entity link.
  - Items of the Campaign.
  - Handouts of the Campaign, whether owned by a Scene or by an Item.
- **Mention node:** a new inline Lexical node in the rich-text allowlist ([ADR 0015](../../docs/adr/0015-store-rich-text-as-validated-lexical-json.md), amended for it).
  - Frontend: registered in `RICH_TEXT_NODES` in `frontend/src/shared/services/richText.ts`.
  - Backend: a rule in `RichTextNodeRules.ByType` in `backend/src/ScenarioPreparation/CocAssistant.ScenarioPreparation.Domain/RichTextNodeRules.cs`, accepted only when validating Scene Keeper notes.
  - The node holds:
    - `targetType`: `Investigator`, `HumanNpc`, `MythosCreature`, `Item`, or `Handout`;
    - `targetId`;
    - `lastKnownName`: 1-200 characters, the name when the Mention was made or last resolved;
    - for a Handout only, `ownerType` (`Scene` or `Item`) and `ownerId`.
  - It is a leaf, allowed wherever text is allowed.
- **Save:** the Keeper notes endpoint ([scenario-preparation spec](../scenario-preparation/spec.md), Scene API) checks each Mention's shape only: the target type, the ids, the last known name, and the Handout owner fields. It never checks that the target exists, so a target deleted in another tab never blocks a save.
- **Resolution:** `GET .../scenarios/{scenarioId}/scenes/{sceneId}` returns `keeperNotesMentions`, one entry per distinct target in the Keeper notes, as `{targetType, targetId, ownerType?, ownerId?, name}`.
  - `name` is the target's current name when the target exists in this Campaign.
  - `name` is null when the target is missing or belongs to another Campaign. The UI then shows "Removed: <lastKnownName>".
  - Resolution is scoped to the Scene's Campaign, so no name from another Campaign is ever returned.
  - Investigator names come from Campaign Play through a consumer-owned port, the same way Scene Play reads Investigators.
- **Suggestions:** typing "@" in the Scene Keeper notes editor opens a typeahead (Lexical `LexicalTypeaheadMenuPlugin`) filtered by name as the Keeper types.
  - First group, this Scene's material:
    - the Investigators present, or the Approved Investigators while the Scene is Prepared;
    - the Non-Player Entities this Scene links;
    - the Items this Scene links;
    - this Scene's Handouts and the Handouts of its linked Items.
  - Second group, the rest of the Campaign: every other Approved Investigator, Non-Player Entity, Item, and Handout. Handouts are grouped by their owning Scene or Item.
  - Candidates come from one new Keeper-only endpoint, `GET /api/campaigns/{campaignId}/mention-targets`, returning `{investigators, nonPlayerEntities, items, handouts}`. Each Handout carries `{id, title, kind, visibility, owner: {type, id, title}}`. The client ranks this Scene's material first.
- **Click:**
  - On the Keeper's Active Scene page, a Mention opens the existing side panel ([ADR 0027](../../docs/adr/0027-side-panels-and-origins-are-url-search-params.md)) when one fits:
    - an Investigator present opens `?panel=clues&investigator=<id>`;
    - a Non-Player Entity this Scene links opens `?panel=entity&link=<first link id>`;
    - an Item this Scene links opens `?panel=item&item=<id>`;
    - a Handout of this Scene or of a linked Item opens `?panel=handout&handout=<id>`.
  - Anywhere else, the Mention navigates to the target's page:
    - Investigator: `/campaigns/$campaignId/investigators/$investigatorId`;
    - Human NPC: `/campaigns/$campaignId/human-npcs/$humanNpcId`;
    - Mythos Creature: `/campaigns/$campaignId/mythos-creatures/$mythosCreatureId`;
    - Item: `/campaigns/$campaignId/items/$itemId`;
    - Handout: `.../scenes/$sceneId/handouts/$handoutId` or `/campaigns/$campaignId/items/$itemId/handouts/$handoutId`, by its owner.
  - Ctrl+click, Cmd+click, and middle-click always open the full page in a new tab.
  - A removed target is not a link.
- **Hover summary:** opens on pointer hover and on keyboard focus, using Radix HoverCard, added to `frontend/src/shared/components/ui`. On touch, a tap opens it as a Radix Popover containing a link to the target's page. It shows:
  - Investigator: name, Player, Occupation, and current Hit Points, Sanity, Magic Points, and Luck from the Character Sheet, plus whether the Investigator is present in this Scene;
  - Human NPC: name, age, and the first lines of its short description, plus the Player-facing name of its link when this Scene links it;
  - Mythos Creature: name, Creature Kind, and the first lines of its description, plus the Player-facing name of its link when this Scene links it;
  - Item: name, holder (or "No one"), the first lines of its Player-facing description, and whether it is in play;
  - Handout: title, kind, Player-facing or Keeper-facing, its owner, and, for a Player-facing Handout of an Active or Finished Scene, how many Investigators present it reached ("Revealed to 2 of 3 present");
  - Removed target: "Removed: <lastKnownName>".
- **UX specification:** [ux.md](ux.md), written by the UX designer skill before implementation. It covers the "@" typeahead, the hover summary and touch fallback, and the Removed state.
- **Dependencies:**
  - Depends on [Scenario Preparation](../scenario-preparation/spec.md) for Scene Keeper notes, the Keeper notes endpoint, Non-Player Entities, Items, and Handouts.
  - Depends on Campaign Play for Approved Investigators and their Character Sheets.
  - Depends on [Scene Play](../scene-play/spec.md) for the Investigators present, the Reveals, and the Active Scene side panels.
  - Depended on by the Run view's Keeper notes editor and the preparation Scene page.

### Constraints
- Mentions, their resolved names, their summaries, and `mention-targets` are Keeper-only; every other caller gets 404, as for the Scene API.
- A Mention stores the target's id and last known name; the name shown is always the current one while the target exists.
- Resolution never returns a name from another Campaign.
- A Mention never adds a Scene link, a Reveal, or any other change to the Scene; it is text in the Keeper notes.
- Only Approved Investigators are offered as Mention targets.
- Mentions count toward the 200 KB Keeper notes limit; they have no separate limit.

## Contract

### Definition of Done
- [ ] Typing "@" in Scene Keeper notes offers this Scene's Investigators, Non-Player Entities, Items, and Handouts first, then the rest of the Campaign, filtered by the typed name.
- [ ] Choosing a suggestion inserts a Mention that is saved with the Keeper notes and shown with the target's current name.
- [ ] Hovering over or focusing a Mention shows the summary for its target type; on touch, tapping shows it.
- [ ] On the Active Scene page, clicking a Mention of linked material opens its side panel; elsewhere it opens the target's page; a modifier click or middle-click opens a new tab.
- [ ] A Mention of a renamed target shows the new name; a Mention of a deleted target shows "Removed: <last known name>" and is not a link.
- [ ] The server accepts the Mention node in Scene Keeper notes and refuses it with 400 in every other rich-text field.
- [ ] A Player or another Campaign's Keeper gets 404 from `mention-targets` and never receives a resolved Mention.

### Regression Guardrails
- A Mention, its resolved name, and its summary never reach a Player.
- Resolution is always scoped to the Scene's Campaign.
- A save is never refused because a Mention's target no longer exists.
- A Mention of a Non-Player Entity always points at its profile, never at a Scene link.

### Scenarios
```gherkin
Scenario: The Keeper mentions a linked Non-Player Entity
  Given the Scene "The Corbitt House" links the Human NPC "Mr. Knott"
  When the Keeper types "@kno" in its Keeper notes and chooses "Mr. Knott"
  Then the Keeper notes hold a Mention of "Mr. Knott"
  And after saving, the Scene shows the Mention as "Mr. Knott"

Scenario: This Scene's material is suggested first
  Given the Scene "The Corbitt House" links the Item "Walter Corbitt's diary"
  And the Campaign also has the Item "Walter's ring", linked to no Scene
  When the Keeper types "@walter" in the Keeper notes of "The Corbitt House"
  Then "Walter Corbitt's diary" is listed under this Scene before "Walter's ring"

Scenario: Only Approved Investigators can be mentioned
  Given the Campaign has the Approved Investigator "Harvey Walters" and the Submitted Investigator "Lucy Ward"
  When the Keeper types "@" in Scene Keeper notes
  Then "Harvey Walters" is suggested and "Lucy Ward" is not

Scenario: A Mention shows the target's current name
  Given the Keeper notes of "The Corbitt House" mention the Item "Old diary"
  When the Keeper renames the Item to "Walter Corbitt's diary"
  Then the Mention shows "Walter Corbitt's diary"

Scenario: A Mention of a deleted target shows as removed
  Given the Keeper notes of "Meeting Knott" mention the Human NPC "Mr. Knott"
  And "Mr. Knott" is deleted
  When the Keeper opens "Meeting Knott"
  Then the Mention shows "Removed: Mr. Knott" and is not a link

Scenario: A save with a Mention of a deleted target is accepted
  Given the Keeper notes being edited mention the Item "Walter's ring"
  And "Walter's ring" was deleted in another tab
  When the Keeper notes are saved
  Then the save succeeds and keeps the Mention

Scenario: Clicking a Mention on the Active Scene opens its side panel
  Given "The Corbitt House" is Active and links the Item "Walter Corbitt's diary"
  And its Keeper notes mention "Walter Corbitt's diary"
  When the Keeper clicks the Mention on Run
  Then the Item side panel for "Walter Corbitt's diary" opens and Run stays open

Scenario: Clicking a Mention of unlinked material opens its page
  Given the Keeper notes of "The Corbitt House" mention the Mythos Creature "Ghoul", which the Scene does not link
  When the Keeper clicks the Mention on Run
  Then the Monster Profile page of "Ghoul" opens

Scenario: Hovering over a Mention shows its summary
  Given the Keeper notes mention the Item "Walter Corbitt's diary", held by "Harvey Walters"
  When the Keeper hovers over or focuses the Mention
  Then a summary shows "Walter Corbitt's diary", its holder "Harvey Walters", and the start of its Player-facing description

Scenario: A Handout summary shows its Reveal status
  Given "The Corbitt House" is Active with "Harvey Walters", "Lucy Ward", and "Cy Hart" present
  And the Player-facing Handout "Diary page" has reached "Harvey Walters" and "Lucy Ward"
  When the Keeper hovers over a Mention of "Diary page"
  Then the summary shows "Revealed to 2 of 3 present"

Scenario: Mentions are refused outside Scene Keeper notes
  Given a Keeper is editing an Item's Keeper notes
  When the Keeper saves rich text containing a Mention node
  Then the save is refused with 400 and the Item is unchanged

Scenario: Mentions never resolve across Campaigns
  Given the Keeper notes of a Scene in Campaign A mention an Item id of Campaign B
  When the Keeper opens the Scene
  Then the Mention shows as removed and no name from Campaign B is returned

Scenario: Mention targets are the Keeper's alone
  Given a Campaign with Items and Handouts
  When a Player of that Campaign requests its mention targets
  Then the request returns 404
```

# Feature: Scenario Preparation

## Blueprint

### Context
Scenario Preparation lets a Keeper turn a Call of Cthulhu 7th Edition Scenario into usable Scene material. In v1 the Keeper enters the material manually; later work may extract structured Scenes and Non-Player Entities from uploaded source material without changing the domain shape used during play. Running a Scene at the table (starting and finishing it, Reveals, Clues, and who holds an Item) belongs to [Scene Play](../scene-play/spec.md); this feature owns the authored content and the Scene status that Scene Play changes.

### Architecture
- **Domain relationships:** A Campaign has zero or more Scenarios in a set order; they are linked parts of the Campaign's story. A Scenario contains Scenes in a prepared order. A Scene may reference multiple Non-Player Entities, and a Non-Player Entity may appear in multiple Scenes, including Scenes of different Scenarios, within the same Campaign. A Scene has ordered Handouts. An Item belongs to the Campaign, may be linked to the Scenes where it matters, and may have its own Handouts.
- **Campaign readiness:** A Campaign may have no Scenario yet, for example while Players create their Investigators; it is not ready to play until it has one. Nothing is blocked by this in v1.
- **Scenario API:** Keeper only; every other caller, including a Player, another Campaign's Keeper, and a request for a Scenario of another Campaign, gets 404.
  - `GET /api/campaigns/{campaignId}/scenarios` lists the Campaign's Scenarios in order.
  - `POST /api/campaigns/{campaignId}/scenarios` creates a Scenario at the end of the order.
  - `GET /api/campaigns/{campaignId}/scenarios/{scenarioId}` returns one Scenario.
  - `PUT /api/campaigns/{campaignId}/scenarios/{scenarioId}` replaces its title and Keeper notes.
  - `PUT /api/campaigns/{campaignId}/scenarios/order` replaces the order with the complete list of the Campaign's Scenario ids; a list that is not exactly that set is refused.
- **Scene API:** Keeper only, with the same 404 rule as the Scenario API, including for a Scene of another Scenario. Scenes follow the ordering contract of [ADR 0014](../../docs/adr/0014-order-preparation-records-by-stored-position-with-tie-break.md).
  - `GET /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes` lists the Scenario's Scenes in prepared order, each with `{id, title, status, startedAt, finishedAt}`.
  - `POST /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes` creates a Prepared Scene at the end of the prepared order.
  - `GET /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}` returns one Scene with its title, location, Keeper notes, status, and dates.
  - `PUT /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}` replaces its title, location, and Keeper notes; 409 when the Scene is Finished.
  - `DELETE /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}` removes a Prepared Scene; 409 when it is Active or Finished.
  - `PUT /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/order` replaces the prepared order with the complete list of the Scenario's Scene ids, as for Scenarios.
- **Scene status:** A Scene is Prepared, Active, or Finished, and moves only Prepared -> Active -> Finished. The Scene aggregate owns the status and the editing rules that follow from it; Scene Play triggers the transitions. How Scene Play reaches the Scene aggregate, and where Reveals and their snapshots are stored, is decided in an architect decision record before PBI-SPL-001.
- **Rich text:** Scene Keeper notes, rich-text Handouts, Item descriptions, and Player-facing descriptions of Non-Player Entities in a Scene are stored as Lexical serialized editor state (JSON). The frontend edits it with Lexical and renders it with a read-only Lexical renderer that registers the same nodes. Choosing Lexical is recorded in an ADR.
- **Handout kinds:** Read-aloud and Text hold rich text (PBI-SP-005). Image, Document, and Map hold a file in Azure Blob Storage (PBI-SP-007). A Map is shown prominently in Scene Play; it is a static image.
- **UX specification:** [ux.md](ux.md). The Keeper's Scenario page lists the Scenario's Scenes in prepared order with each Scene's status and, once played, its start and finish dates; the Scene layout is in [ux.md](ux.md) sections 11 to 20.
- **Manual preparation:** v1 provides Keeper-managed Scene, Handout, Human NPC, Mythos Creature, and Item records.
- **File storage:** Azure Blob Storage stores file Handouts in v1 and uploaded Scenario source documents in the later extraction flow.
- **LLM extraction boundary:** The later extraction flow uses direct structured-output calls to a Microsoft Foundry model and maps results into the same Scenario, Scene, Human NPC, and Mythos Creature concepts used by manual preparation.
- **Dependencies:** Depends on Campaign Play for Campaign ownership and Keeper authorization. Scene Play depends on this feature for Scenes, their status transitions, Handouts, Non-Player Entity links, and Items. Campaign Play depends on this feature for prepared Scene and Non-Player Entity context.

### Constraints
- v1 requires manual Scenario preparation; PDF and text extraction is deferred to a later version.
- A Scenario has a required title (1-200 characters) and optional Keeper notes (up to 10,000 characters), both Keeper-facing.
- **[DEPRECATED 2026-10-17]**
  ~~Each Scene has a title, Keeper-facing description or read-aloud text, an order, optional Handouts, and links to relevant Non-Player Entities.~~
  Replaced by: a Scene has a required title (1-200 characters), an optional free-text location (up to 200 characters), optional rich-text Keeper notes, a position in the prepared order, a status, ordered Handouts, links to Non-Player Entities, and links to Items. Read-aloud text is a Handout of kind Read-aloud, so each passage can be revealed on its own.
- The prepared order is a suggestion: any Prepared Scene can be started, and the order Scenes were played in is kept by Scene Play as the Scene History.
- The Keeper edits a Scene and its Handouts, links, and Items while the Scene is Prepared or Active. A Finished Scene is read-only for everyone and is never reopened.
- A Scene can be removed only while it is Prepared.
- The prepared order belongs to the Scenario: reordering may move Active and Finished Scenes, and a Scene's position is not part of its content.
- A Non-Player Entity, Item, or Handout linked to an Active or Finished Scene cannot be deleted, and an Item that an Investigator holds cannot be deleted. Material linked only to Prepared Scenes can be deleted freely.
- Rich text uses only these Lexical nodes: paragraph, heading (two levels), quote, bulleted and numbered list, list item, line break, link, and text with bold, italic, underline, or strikethrough formatting. Links use `http` or `https` and open in a new tab with `rel="noopener noreferrer"`. The server refuses with 400 a document that contains any other node, a link with another scheme, or more than 200 KB of serialized JSON. Images are never embedded in rich text; an image is its own Handout.
- Human NPCs and Mythos Creatures are distinct profiles. A Human NPC uses relevant human [characteristics](../../docs/game-rules/coc7_character_creation_and_development_rules.md#2-characteristics) and [skills](../../docs/game-rules/coc7_character_creation_and_development_rules.md#6-skills); a Mythos Creature may have attacks, armor, special abilities, and sanity loss.
- Non-Player Entity profile rules are taken from [docs/game-rules](../../docs/game-rules/README.md). Mythos Creature profile rules are not yet documented there and are added to `docs/game-rules/` before Mythos Creature profiles are implemented.
- Non-Player Entities and Items are scoped to one Campaign and are not reusable across Campaigns in v1.
- A Non-Player Entity's link to a Scene carries a Player-facing name and a Player-facing rich-text description. These are the only parts of a Non-Player Entity a Player ever receives; the profile is Keeper-only.
- An Item has a required name (1-200 characters), a Player-facing rich-text description, optional rich-text Keeper notes, and optional Handouts. It is held by at most one Investigator or by no one; Scene Play changes the holder.
- **[DEPRECATED 2026-10-17]**
  ~~Handouts may be player-facing or Keeper-facing; Keeper-facing material must not be exposed to Players before the Keeper reveals it.~~
  Replaced by: every Handout has a visibility of Player-facing or Keeper-facing. A Player-facing Handout reaches a Player only through a Reveal in Scene Play; a Keeper-facing Handout is Keeper reference material and is never revealed.
- Later model extraction uses structured output and direct model calls rather than an agentic orchestration layer.

## Contract

### Definition of Done
- [ ] The Keeper can create, edit, and reorder the Scenarios of a Campaign; new Scenarios are added at the end of the Campaign's order.
- [ ] The Keeper can create, edit, reorder, and remove Scenes in a Scenario; new Scenes are added at the end of the prepared order, and only Prepared Scenes can be removed.
- [ ] A Scene stores its title, location, Keeper notes, status, ordered Handouts, linked Non-Player Entities with their Player-facing name and description, and linked Items.
- [ ] A Finished Scene and everything on it refuses every change with 409.
- [ ] The Keeper can create both Human NPC and Mythos Creature profiles with their distinct required information.
- [ ] The Keeper can create rich-text Handouts of kind Read-aloud and Text, and file Handouts of kind Image, Document, and Map, each with an explicit visibility.
- [ ] File Handouts are stored durably in Azure Blob Storage and associated with a Scene or an Item.
- [ ] The Keeper can create and edit Campaign Items and link them to Scenes.
- [ ] Rich text outside the allowed Lexical nodes, links, or size is refused with 400.
- [ ] Scenario material, Non-Player Entities, and Items remain scoped to their Campaign.

### Regression Guardrails
- Scene order is stable and unambiguous within a Scenario.
- Scenario order is stable and unambiguous within a Campaign.
- Scenarios and Scenes are never returned to Players or to another Campaign's Keeper through the Scenario Preparation API.
- A Mythos Creature is never forced into the Human NPC profile shape; attacks, armor, special abilities, and sanity loss remain representable independently.
- Keeper-facing Scenario material and Handouts are not exposed to Players by default.
- A Non-Player Entity profile never reaches a Player; only its Player-facing name and description in a Scene do, and only through a Reveal.
- A Finished Scene's content never changes; its position in the prepared order may.
- Material that an Active or Finished Scene refers to is never deleted.
- Manual preparation remains valid without an LLM or uploaded source document.
- Structured extraction, when added, produces the same domain concepts as manual preparation rather than a parallel scenario model.

### Scenarios
```gherkin
# Scenario scenarios trace to ux.md section 8 (SP-UX-n).
Scenario: Keeper creates a Scenario
  # SP-UX-2, SP-UX-3
  Given a Keeper owns a Campaign with no Scenario
  When the Keeper creates a Scenario titled "The Haunting"
  Then the Scenario is stored in that Campaign as its first Scenario

Scenario: New Scenarios follow the existing ones
  # SP-UX-1, SP-UX-4
  Given a Keeper's Campaign has the Scenario "The Haunting"
  When the Keeper creates the Scenario "Edge of Darkness"
  Then the Campaign's Scenarios are "The Haunting", then "Edge of Darkness"

Scenario: Keeper edits a Scenario
  # SP-UX-6
  Given a Keeper's Campaign has the Scenario "The Haunting"
  When the Keeper changes its title and Keeper notes
  Then the Scenario shows the new title and Keeper notes

Scenario: Keeper reorders the Scenarios
  # SP-UX-11, SP-UX-12
  Given a Keeper's Campaign has the Scenarios "The Haunting", then "Edge of Darkness"
  When the Keeper moves "Edge of Darkness" up
  Then the Campaign's Scenarios are "Edge of Darkness", then "The Haunting"
  And the order is kept when the Keeper returns

Scenario: Scenarios are the Keeper's alone
  # SP-UX-9, SP-UX-10
  Given a Campaign with a Scenario
  When a Player of that Campaign or the Keeper of another Campaign lists, opens, creates, edits, or reorders its Scenarios
  Then the Scenario is reported as not found and nothing changes

# Scene scenarios trace to ux.md section 18 (SP-UX-n).
Scenario: Keeper prepares a Scene
  # SP-UX-15, SP-UX-16, SP-UX-21, SP-UX-25
  Given a Keeper owns a Campaign with the Scenario "The Haunting"
  When the Keeper creates a Scene titled "The Corbitt House" at the location "Arkham, Boston Road"
  Then the Scene is stored in that Scenario as Prepared
  And it is last in the Scenario's prepared order

Scenario: Keeper reorders the Scenes
  # SP-UX-24
  Given the Scenario "The Haunting" has the Scenes "Meeting Knott", then "The Corbitt House"
  When the Keeper moves "The Corbitt House" up
  Then the Scenario's Scenes are "The Corbitt House", then "Meeting Knott"
  And the order is kept when the Keeper returns

Scenario: Keeper removes a Prepared Scene
  # SP-UX-23
  Given the Scenario "The Haunting" has the Prepared Scene "Meeting Knott"
  When the Keeper removes it
  Then the Scenario no longer has the Scene "Meeting Knott"

Scenario: A played Scene cannot be removed
  # SP-UX-23
  Given the Scene "Meeting Knott" is Active or Finished
  When the Keeper removes it
  Then the removal is refused and the Scene is unchanged

# The Handout parts of the next three scenarios are covered by PBI-SP-004 and PBI-SP-005.
Scenario: A Finished Scene is read-only
  # SP-UX-22
  Given the Scene "Meeting Knott" is Finished
  When the Keeper changes its title, a Handout, or a Non-Player Entity link
  Then the change is refused and the Scene is unchanged

Scenario: The Keeper edits an Active Scene
  # SP-UX-22
  Given the Scene "The Corbitt House" is Active
  When the Keeper adds a Text Handout to it
  Then the Handout is stored on the Scene

Scenario: The Keeper edits an Active Scene's Keeper notes
  # SP-UX-22
  Given the Scene "The Corbitt House" is Active
  When the Keeper changes its Keeper notes
  Then the Scene shows the new Keeper notes

Scenario: Scenes are the Keeper's alone
  # SP-UX-26
  Given a Scenario with a Scene
  When a Player of that Campaign or the Keeper of another Campaign lists, opens, creates, edits, reorders, or removes its Scenes
  Then the Scene is reported as not found and nothing changes

Scenario: Keeper links a Mythos Creature to a Scene
  Given a Mythos Creature belongs to the Campaign
  When the Keeper links it to a Scene with the Player-facing name "A shape in the cellar"
  Then the Scene shows the Mythos Creature as a relevant Non-Player Entity
  And the link carries the Player-facing name and description
  And the Mythos Creature retains its attacks, armor, special abilities, and sanity loss

Scenario: Read-aloud passages are separate Handouts
  Given a Keeper is editing a Scene
  When the Keeper adds two Read-aloud Handouts
  Then the Scene has both Handouts in the order they were added
  And each has its own visibility

Scenario: Keeper attaches a file Handout
  Given a Keeper is editing a Scene
  When the Keeper attaches a Map Handout with an image file
  Then the file is durably stored and associated with the Scene
  And the Handout has an explicit Player-facing or Keeper-facing visibility

Scenario: Scene Keeper notes outside the allowed nodes are refused
  # SP-UX-18, SP-UX-19
  Given a Keeper is editing a Scene
  When the Keeper saves Keeper notes that contain an image node or a "javascript:" link
  Then the save is refused with 400 and the Scene is unchanged

# The Handout part is covered by PBI-SP-005.
Scenario: Rich text outside the allowed nodes is refused
  Given a Keeper is editing a Text Handout
  When the Keeper saves rich text that contains an image node or a "javascript:" link
  Then the save is refused with 400 and the Handout is unchanged

Scenario: Keeper prepares an Item
  Given a Keeper owns a Campaign
  When the Keeper creates the Item "Walter Corbitt's diary" and links it to the Scene "The Corbitt House"
  Then the Item belongs to the Campaign and is held by no one
  And the Scene lists the Item

Scenario: Material a played Scene refers to cannot be deleted
  Given the Human NPC "Mr. Knott" is linked to a Finished Scene
  When the Keeper deletes the Human NPC
  Then the deletion is refused and the Human NPC is unchanged

Scenario: A held Item cannot be deleted
  Given an Investigator holds the Item "Walter Corbitt's diary"
  When the Keeper deletes the Item
  Then the deletion is refused and the Item is unchanged

Scenario: Campaign boundaries isolate Scenario material
  Given a Human NPC and an Item belong to Campaign A
  When a Keeper prepares Scenario material for Campaign B
  Then the Human NPC and the Item are not available to link from Campaign B

Scenario: Manual preparation works without extraction
  Given no Scenario source document has been uploaded
  When the Keeper enters Scenes and Non-Player Entities manually
  Then the Scenario is usable for Campaign preparation
```

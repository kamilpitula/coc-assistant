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
  - `GET /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}` returns one Scene with its title, location, Keeper notes, status, and dates, and its Non-Player Entity links, each `{id, nonPlayerEntity: {id, type, name}, playerFacingName, playerFacingDescription}`, in the order they were linked, its Item links, each `{id, item: {id, name}}`, in the order they were linked, and its Handouts, each `{id, kind, visibility, title}`, in stored order ([ADR 0014](../../docs/adr/0014-order-preparation-records-by-stored-position-with-tie-break.md)), without their text.
  - `PUT /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}` replaces its title, location, and Keeper notes; 409 when the Scene is Finished.
  - `DELETE /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}` removes a Prepared Scene; 409 when it is Active or Finished.
  - `PUT /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/order` replaces the prepared order with the complete list of the Scenario's Scene ids, as for Scenarios.
  - `POST /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}/non-player-entity-links` links a Non-Player Entity of the same Campaign; `PUT` and `DELETE .../non-player-entity-links/{linkId}` replace its Player-facing name and description or unlink it; 409 when the Scene is Finished; 400 for a Non-Player Entity that is not in the Campaign (PBI-SP-004).
  - `POST /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}/item-links` with `{itemId}` links an Item of the same Campaign:
    - 201 with the new link;
    - 200 with the existing link when the Item is already linked;
    - 409 when the Scene is Finished;
    - 400 keyed `itemId` for an Item that is not in the Campaign.

    `DELETE .../item-links/{linkId}` unlinks it, with 409 when the Scene is Finished (PBI-SP-008).
  - `GET`, `PUT`, and `DELETE /api/campaigns/{campaignId}/scenarios/{scenarioId}/scenes/{sceneId}/handouts/{handoutId}` and `POST .../scenes/{sceneId}/handouts` read one Handout with its text, replace its kind, visibility, title, and text, delete it, or add one at the end; `PUT .../scenes/{sceneId}/handouts/order` replaces the Scene's Handout order with the complete list of its Handout ids. Writes answer 409 when the Scene is Finished; `DELETE` answers 409 unless the Scene is Prepared; 400 for a missing or unknown kind or visibility, a title outside 1-200 characters, or missing, empty, or invalid text (PBI-SP-005). `POST` and `PUT` accept `multipart/form-data` with `kind`, `visibility`, `title`, and `file` for Image, Document, and Map (the file optional on `PUT`); `GET .../handouts/{handoutId}/file` streams the stored image or PDF to the Keeper; 400 for a missing, unsupported, or too large file or a kind change across Read-aloud/Text and Image/Map/Document; 413 for a body over the limit; 503 when storage fails, with no Handout added or changed (PBI-SP-007).
- **Non-Player Entity API:** Keeper only, with the same 404 rule as the Scenario API, including for a profile of another Campaign or a profile addressed with the wrong type. Responses include the computed derived values; requests never carry them.
  - `GET /api/campaigns/{campaignId}/non-player-entities` lists the Campaign's Human NPCs and Mythos Creatures, each with `{id, type, name}`.
  - `POST /api/campaigns/{campaignId}/human-npcs` creates a Human NPC; `GET`, `PUT`, and `DELETE /api/campaigns/{campaignId}/human-npcs/{humanNpcId}` read, replace, and delete its NPC Profile.
  - `POST /api/campaigns/{campaignId}/mythos-creatures` creates a Mythos Creature; `GET`, `PUT`, and `DELETE /api/campaigns/{campaignId}/mythos-creatures/{mythosCreatureId}` read, replace, and delete its Monster Profile.
  - `POST .../human-npcs/{humanNpcId}/duplicate` and `POST .../mythos-creatures/{mythosCreatureId}/duplicate` create a copy (PBI-SP-010).
  - `DELETE` answers 409 when the profile is linked to an Active or Finished Scene (from PBI-SP-004).
- **Item API:** Keeper only, with the same 404 rule as the Scenario API, including for an Item of another Campaign (PBI-SP-008). The 400 keys are `name`, `playerFacingDescription`, and `keeperNotes` ([ADR 0018](../../docs/adr/0018-scenario-preparation-validation-problems-keyed-by-request-path.md)).
  - `GET /api/campaigns/{campaignId}/items` lists the Campaign's Items, each with `{id, name, sceneCount}`.
  - `POST /api/campaigns/{campaignId}/items` creates an Item.
  - `GET /api/campaigns/{campaignId}/items/{itemId}` returns `{id, name, playerFacingDescription, keeperNotes, holder, handouts, scenes}`:
    - `holder` is null while no one holds the Item;
    - `handouts` lists its Handouts as `{id, kind, visibility, title}` in stored order;
    - `scenes` lists the Scenes that link it as `{scenarioId, scenarioTitle, id, title, status}`, in Scenario order then Scene order.
  - `PUT .../items/{itemId}` replaces its name, Player-facing description, and Keeper notes.
  - `DELETE .../items/{itemId}` deletes it; 409 while the Item is in play.
  - `.../items/{itemId}/handouts` offers the same Handout operations as `.../scenes/{sceneId}/handouts`, with the same 400, 413, and 503 answers. There is no Finished refusal, and `DELETE` answers 409 while the Item is in play.
- **Non-Player Entity profiles:** Human NPC and Mythos Creature are separate aggregates, each stored as a row with its Campaign id, type, and name beside a validated JSON document holding the rest of its profile, following the Character Sheet storage pattern. A profile's type is fixed at creation. Rule calculations shared with Campaign Play (derived values, difficulty levels, dice notation) live in a shared game-rules kernel ([ADR 0017](../../docs/adr/0017-shared-game-rules-kernel-for-derived-values-and-dice-notation.md)). Profile edits are not pushed over SignalR: profiles are Keeper-only and only the Keeper edits them, so there is no other viewer to update; the Player-facing parts reach Players through Scene links and Reveals, which carry their own real-time rules.
- **Scene status:** A Scene is Prepared, Active, or Finished, and moves only Prepared -> Active -> Finished. The Scene aggregate owns the status and the editing rules that follow from it; Scene Play triggers the transitions. How Scene Play reaches the Scene aggregate, and where Reveals and their snapshots are stored, is decided in an architect decision record before PBI-SPL-001.
- **Rich text:** Scene Keeper notes, rich-text Handouts, Item descriptions, and Player-facing descriptions of Non-Player Entities in a Scene are stored as Lexical serialized editor state (JSON). The frontend edits it with Lexical and renders it with a read-only Lexical renderer that registers the same nodes. Choosing Lexical is recorded in an ADR.
- **Handout kinds:** Read-aloud and Text hold rich text (PBI-SP-005). Image, Document, and Map hold a file in Azure Blob Storage (PBI-SP-007). A Map is shown prominently in Scene Play; it is a static image.
- **UX specification:** [ux.md](ux.md). The Keeper's Scenario page lists the Scenario's Scenes in prepared order with each Scene's status and, once played, its start and finish dates; the Scene layout is in [ux.md](ux.md) sections 11 to 20, the Non-Player Entity list, create page, and profile pages in sections 21 to 30, linking Non-Player Entities on the Scene page in sections 31 to 39, Handouts on the Scene page and their own pages in sections 40 to 49, Image, Document, and Map Handouts in sections 50 to 58, and Items, their Handouts, and linking Items on the Scene page in sections 59 to 70.
- **Manual preparation:** v1 provides Keeper-managed Scene, Handout, Human NPC, Mythos Creature, and Item records.
- **File storage:** Azure Blob Storage stores file Handouts in v1 and uploaded Scenario source documents in the later extraction flow. Each upload is stored under a new key and never overwritten; Scenario Preparation deletes a Scene's stored file only while the Scene is Prepared, and an Item's stored file only while the Item is not in play. So a file that could have been revealed is never deleted ([ADR 0021](../../docs/adr/0021-handout-files-are-immutable-blobs-behind-a-storage-port.md), [ADR 0022](../../docs/adr/0022-items-are-guarded-by-play-usage-read-through-ports.md)).
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
- An Item is in play while a Scene that links it is Active or Finished, or while an Investigator holds it.
  - An Item in play cannot be deleted, and neither can its Handouts.
  - Replacing the file of one of its Handouts keeps the old stored file.
  - Deleting an Item that is not in play removes its Scene links, its Handouts, and their files.
  - Removing a Prepared Scene removes its Item links but not the Items ([ADR 0022](../../docs/adr/0022-items-are-guarded-by-play-usage-read-through-ports.md)).
- Rich text uses only these Lexical nodes: paragraph, heading (two levels), quote, bulleted and numbered list, list item, line break, link, and text with bold, italic, underline, or strikethrough formatting. Links use `http` or `https` and open in a new tab with `rel="noopener noreferrer"`. The server refuses with 400 a document that contains any other node, a link with another scheme, or more than 200 KB of serialized JSON. Images are never embedded in rich text; an image is its own Handout.
- Human NPCs and Mythos Creatures are distinct profiles. A Human NPC uses relevant human [characteristics](../../docs/game-rules/coc7_character_creation_and_development_rules.md#2-characteristics) and [skills](../../docs/game-rules/coc7_character_creation_and_development_rules.md#6-skills); a Mythos Creature may have attacks, armor, special abilities, and sanity loss.
- **[DEPRECATED 2026-10-17]**
  ~~Non-Player Entity profile rules are taken from [docs/game-rules](../../docs/game-rules/README.md). Mythos Creature profile rules are not yet documented there and are added to `docs/game-rules/` before Mythos Creature profiles are implemented.~~
  Replaced by: Non-Player Entity profile rules are taken from [coc_7e_npc_and_monster_creation_ruleset.md](../../docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md) as applied by [project_ruleset.md section 5](../../docs/game-rules/project_ruleset.md#5-non-player-entity-profiles), which sets the supported profiles, value ranges, derived values and overrides, dice notation, spells, NPC skills and weapons, and what validation blocks a save.
- An NPC Profile has a required name (1-200 characters) and a required age, optional plain-text profession or role (with the Era's Occupations offered as suggestions), short description, goal, relationship to the Investigators, what the NPC knows, what the NPC hides, and behavior cue, optional rich-text Keeper notes, and optional Characteristics, Skills, Combat, and Spells sections. Combat holds Dodge, armor points, a tactics and morale note, and weapons.
- A Monster Profile has a required name (1-200 characters), an optional Creature Kind, optional plain-text description and sensory cues, origin, goal and typical behavior, signs and traces, defeat outcome, and specimen-range notes, optional rich-text Keeper notes, characteristics, movement modes, attacks per round, Dodge, attacks, armor points and an armor note, immunities, vulnerabilities, skills, spells, powers, sanity loss, Hit Points not applicable, and Derived Value Overrides ([project_ruleset.md sections 5.2, 5.4, and 5.9](../../docs/game-rules/project_ruleset.md#54-derived-values-and-overrides)).
- Profile text limits: each plain-text field up to 4,000 characters, each list entry's text and each override value up to 1,000 characters, an override reason 1-500 characters, and at most 100 entries in each list. Rich-text Keeper notes follow the rich-text constraint below.
- Duplicating a profile creates a profile of the same type in the same Campaign named "<name> (copy)", with the name shortened so the whole name fits 200 characters, with every profile field including overrides and their reasons. Scene links are never copied.
- Non-Player Entities and Items are scoped to one Campaign and are not reusable across Campaigns in v1.
- A Non-Player Entity's link to a Scene carries a Player-facing name and a Player-facing rich-text description. These are the only parts of a Non-Player Entity a Player ever receives; the profile is Keeper-only.
- A Non-Player Entity may be linked to a Scene more than once; each link has its own id, a required Player-facing name (1-200 characters), and an optional Player-facing description. A Reveal of a Non-Player Entity names the link. Deleting a Non-Player Entity linked only to Prepared Scenes removes those links, and removing a Prepared Scene removes its links.
- **[DEPRECATED 2026-10-23]**
  ~~An Item has a required name (1-200 characters), a Player-facing rich-text description, optional rich-text Keeper notes, and optional Handouts. It is held by at most one Investigator or by no one; Scene Play changes the holder.~~
  Replaced by:
  - An Item has:
    - a required name (1-200 characters), which Players see;
    - a required Player-facing rich-text description with visible text;
    - optional rich-text Keeper notes;
    - optional Handouts, ordered per [ADR 0014](../../docs/adr/0014-order-preparation-records-by-stored-position-with-tie-break.md).
  - It is held by at most one Investigator or by no one. Scene Play changes the holder, and Scenario Preparation reads it through a port ([ADR 0022](../../docs/adr/0022-items-are-guarded-by-play-usage-read-through-ports.md)).
  - A Scene links an Item at most once, and the link has no fields of its own.
  - The Item and its Handouts stay editable whatever the status of the Scenes that link it.
- **[DEPRECATED 2026-10-17]**
  ~~Handouts may be player-facing or Keeper-facing; Keeper-facing material must not be exposed to Players before the Keeper reveals it.~~
  Replaced by: every Handout has a visibility of Player-facing or Keeper-facing. A Player-facing Handout reaches a Player only through a Reveal in Scene Play; a Keeper-facing Handout is Keeper reference material and is never revealed.
- A rich-text Handout has a kind, Read-aloud or Text, which may change between the two; a visibility, chosen explicitly with no default; a required title (1-200 characters); and required rich text with visible text. A Scene's Handouts are ordered per [ADR 0014](../../docs/adr/0014-order-preparation-records-by-stored-position-with-tie-break.md); reordering them changes the Scene's content, so a Finished Scene refuses it. A Scene's Handout can be deleted only while its Scene is Prepared, and removing a Prepared Scene removes its Handouts.
- An Image or Map Handout holds one PNG, JPEG, WebP, or GIF image and a Document Handout one PDF, each up to 20 MB (20,971,520 bytes), recognized by its content, never SVG. Image and Map may change into each other; no other kind change crosses between rich text and a file, and a Document stays a Document. A Reveal of a file Handout snapshots the stored file's key, name, media type, and size; it never copies the file.
- Later model extraction uses structured output and direct model calls rather than an agentic orchestration layer.

## Contract

### Definition of Done
- [ ] The Keeper can create, edit, and reorder the Scenarios of a Campaign; new Scenarios are added at the end of the Campaign's order.
- [ ] The Keeper can create, edit, reorder, and remove Scenes in a Scenario; new Scenes are added at the end of the prepared order, and only Prepared Scenes can be removed.
- [ ] A Scene stores its title, location, Keeper notes, status, ordered Handouts, linked Non-Player Entities with their Player-facing name and description, and linked Items.
- [ ] A Finished Scene and everything on it refuses every change with 409.
- [ ] The Keeper can create, edit, delete, and duplicate both Human NPC and Mythos Creature profiles with their distinct required information, and sees their computed derived values.
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
- A Human NPC never becomes a Mythos Creature or the reverse.
- An NPC Profile's derived values always follow the shared formulas; only a Monster Profile has Derived Value Overrides, and each has a reason.
- Non-Player Entity profiles are never returned to Players or to another Campaign's Keeper through the Scenario Preparation API.
- Keeper-facing Scenario material and Handouts are not exposed to Players by default.
- A stored Handout file is never overwritten, and a file of an Active or Finished Scene is never deleted.
- No Player-visible API returns a Handout: a Player-facing Handout reaches a Player only as a Reveal in Scene Play, and a Keeper-facing Handout never does.
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
  # SP-UX-22, SP-UX-73
  Given the Scene "Meeting Knott" is Finished
  When the Keeper changes its title, a Handout, or a Non-Player Entity link
  Then the change is refused and the Scene is unchanged

Scenario: The Keeper edits an Active Scene
  # SP-UX-22, SP-UX-72
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

# Non-Player Entity profile scenarios (PBI-SP-003, PBI-SP-009, PBI-SP-010).
# They trace to ux.md section 28 (SP-UX-n).
Scenario: Keeper creates a narrative Human NPC
  # SP-UX-31, SP-UX-32
  Given a Keeper owns a Campaign
  When the Keeper creates the Human NPC "Mr. Knott" aged 62 with only the profession "Landlord" and the goal "Rent the Corbitt House"
  Then the Human NPC belongs to the Campaign
  And its NPC Profile has no Characteristics, Skills, Combat, or Spells section

Scenario: A Human NPC needs a name and an age
  # SP-UX-31
  Given a Keeper owns a Campaign
  When the Keeper creates a Human NPC without a name or without an age
  Then the creation is refused and no Human NPC is stored

Scenario: A Human NPC's derived values follow the rules
  # SP-UX-36
  Given the Human NPC "Thug" has STR 70, CON 60, SIZ 65, DEX 55, and POW 50 and is aged 30
  When the Keeper opens its NPC Profile
  Then it shows the Hit Points, Magic Points, Damage Bonus, Build, and MOV computed from those values
  And those values cannot be overridden

Scenario: MOV is not computed outside the covered ages
  # SP-UX-36
  Given the Human NPC "Old Whateley" has STR, DEX, and SIZ and is aged 95
  When the Keeper opens its NPC Profile
  Then MOV is shown as not covered by the rules

Scenario: An Opposing Value shows the Investigator's difficulty
  # SP-UX-36
  Given the Human NPC "Desk sergeant" has the skill Spot Hidden at 55
  When the Keeper opens its NPC Profile
  Then Spot Hidden shows that an Investigator needs a Hard success

Scenario: A firearm weapon cannot add Damage Bonus
  # SP-UX-35
  Given the Human NPC "Gangster" has the skill Firearms (Handgun)
  When the Keeper saves a weapon using that skill with the damage "1D10+DB"
  Then the save is refused and the NPC Profile is unchanged

Scenario: Keeper creates a Mythos Creature
  # SP-UX-32, SP-UX-36
  Given a Keeper owns a Campaign
  When the Keeper creates the Mythos Creature "Ghoul" with the Creature Kind Mythos, 3 attacks per round, a claw attack "Fighting 40%, 1D6+DB", armor 0, and sanity loss "0/1D6"
  Then the Mythos Creature belongs to the Campaign with those attacks, armor, and sanity loss
  And its Monster Profile shows the Hit Points, Magic Points, Damage Bonus, and Build computed from its characteristics

Scenario: Malformed dice notation is refused
  # SP-UX-35
  Given a Keeper is editing a Monster Profile
  When the Keeper saves the sanity loss "1D6" or the attack damage "D"
  Then the save is refused and the Monster Profile is unchanged

Scenario: A Derived Value Override needs a reason
  # SP-UX-35, SP-UX-36
  Given a Keeper is editing a Monster Profile
  When the Keeper overrides its Hit Points without a reason
  Then the save is refused
  When the Keeper overrides its Hit Points with the reason "Swollen with stolen life"
  Then the Monster Profile shows the override beside the computed Hit Points

Scenario: A Mythos Creature's firearm attack cannot add Damage Bonus
  # SP-UX-35
  Given a Keeper is editing a Monster Profile with an attack using the skill "Firearms (Rifle)"
  When the Keeper saves the damage "2D6+DB" for that attack
  Then the save is refused and the Monster Profile is unchanged

Scenario: Hit Points not applicable needs a defeat outcome
  # SP-UX-35
  Given a Keeper is editing a Monster Profile without a defeat outcome
  When the Keeper marks its Hit Points not applicable
  Then the save is refused until a defeat outcome is recorded

Scenario: Keeper finds a profile in the list
  # SP-UX-29, SP-UX-30
  Given the Campaign has the Human NPC "Mr. Knott" and the Mythos Creature "Ghoul"
  When the Keeper searches the Non-Player Entity list for "kno" with the type Human NPCs
  Then only "Mr. Knott" is listed

Scenario: Keeper adds and removes optional sections
  # SP-UX-33
  Given a Keeper is editing the NPC Profile of "Mr. Knott" with no Combat section
  When the Keeper adds the Combat section, enters a weapon, and saves
  Then the NPC Profile shows the Combat section
  When the Keeper removes the Combat section and saves
  Then the NPC Profile has no Combat section

Scenario: Keeper deletes an unlinked profile
  # SP-UX-37
  Given the Human NPC "Mr. Knott" is linked to no Scene
  When the Keeper deletes the Human NPC
  Then the Campaign no longer has the Human NPC "Mr. Knott"

Scenario: Keeper duplicates a profile
  # SP-UX-38
  Given the Mythos Creature "Ghoul" has an overridden Hit Points value and is linked to a Scene
  When the Keeper duplicates it
  Then the Campaign has the Mythos Creature "Ghoul (copy)" with the same profile and override
  And "Ghoul (copy)" is linked to no Scene

Scenario: Non-Player Entity profiles are the Keeper's alone
  # SP-UX-28, SP-UX-39
  Given a Campaign with a Human NPC and a Mythos Creature
  When a Player of that Campaign or the Keeper of another Campaign lists, opens, creates, edits, deletes, or duplicates them
  Then the profile is reported as not found and nothing changes

# Scene link scenarios (PBI-SP-004) trace to ux.md section 37 (SP-UX-n).
Scenario: Keeper links a Mythos Creature to a Scene
  # SP-UX-50, SP-UX-52
  Given a Mythos Creature belongs to the Campaign
  When the Keeper links it to a Scene with the Player-facing name "A shape in the cellar"
  Then the Scene shows the Mythos Creature as a relevant Non-Player Entity
  And the link carries the Player-facing name and description
  And the Mythos Creature retains its attacks, armor, special abilities, and sanity loss

Scenario: Keeper edits and unlinks a Non-Player Entity link
  # SP-UX-55, SP-UX-56
  Given the Scene "The Corbitt House" links the Human NPC "Mr. Knott" as "The landlord"
  When the Keeper changes the Player-facing name to "An old man with keys"
  Then the Scene shows the link as "An old man with keys"
  When the Keeper unlinks it
  Then the Scene no longer links "Mr. Knott"
  And the Campaign still has the Human NPC "Mr. Knott"

Scenario: A Non-Player Entity can be linked to a Scene twice
  # SP-UX-54
  Given the Scene "The Corbitt House" links the Mythos Creature "Ghoul" as "A shape in the cellar"
  When the Keeper links "Ghoul" to the same Scene as "A second shape"
  Then the Scene shows both links

Scenario: Read-aloud passages are separate Handouts
  # SP-UX-65, SP-UX-67, SP-UX-68
  Given a Keeper is editing a Scene
  When the Keeper adds two Read-aloud Handouts
  Then the Scene has both Handouts in the order they were added
  And each has its own visibility

Scenario: Keeper edits, reorders, and deletes Handouts
  # SP-UX-69, SP-UX-70, SP-UX-71
  Given the Prepared Scene "The Corbitt House" has the Handouts "The front door" and "Diary page"
  When the Keeper changes "Diary page" from Text to Read-aloud
  And moves "Diary page" above "The front door"
  And deletes "The front door"
  Then the Scene has only the Read-aloud Handout "Diary page"

Scenario: A Handout on an Active Scene cannot be deleted
  # SP-UX-72
  Given the Scene "The Corbitt House" is Active with the Handout "The front door"
  When the Keeper deletes "The front door"
  Then the deletion is refused and the Handout is unchanged

Scenario: A Handout needs an explicit visibility
  # SP-UX-66, SP-UX-67
  Given a Keeper is adding a Handout to a Scene
  When the Keeper saves it without choosing Player-facing or Keeper-facing
  Then the save is refused and no Handout is added

Scenario: Handouts are the Keeper's alone
  # SP-UX-74
  Given the Scene "The Corbitt House" has the Player-facing Handout "The front door"
  When a Player or another Campaign's Keeper requests the Scene or the Handout
  Then each gets not found and no Handout content

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
  # SP-UX-66
  Given a Keeper is editing a Text Handout
  When the Keeper saves rich text that contains an image node or a "javascript:" link
  Then the save is refused with 400 and the Handout is unchanged

Scenario: Keeper prepares an Item
  # SP-UX-90, SP-UX-92, SP-UX-97, SP-UX-98
  Given a Keeper owns a Campaign
  When the Keeper creates the Item "Walter Corbitt's diary" and links it to the Scene "The Corbitt House"
  Then the Item belongs to the Campaign and is held by no one
  And the Scene lists the Item

Scenario: Material a played Scene refers to cannot be deleted
  # SP-UX-58
  Given the Human NPC "Mr. Knott" is linked to a Finished Scene
  When the Keeper deletes the Human NPC
  Then the deletion is refused and the Human NPC is unchanged

Scenario: Deleting a profile linked only to Prepared Scenes removes its links
  # SP-UX-58
  Given the Human NPC "Mr. Knott" is linked only to the Prepared Scene "Meeting Knott"
  When the Keeper deletes the Human NPC
  Then the Campaign no longer has the Human NPC "Mr. Knott"
  And the Scene "Meeting Knott" no longer links it

Scenario: A held Item cannot be deleted
  # SP-UX-95
  Given an Investigator holds the Item "Walter Corbitt's diary"
  When the Keeper deletes the Item
  Then the deletion is refused and the Item is unchanged

Scenario: Keeper gives an Item a Handout
  # SP-UX-100
  Given the Item "Walter Corbitt's diary" belongs to the Campaign
  When the Keeper adds the Player-facing Text Handout "The last entry" to the Item
  Then the Item lists the Handout

Scenario: An Item in a played Scene cannot be deleted
  # SP-UX-95
  Given the Item "Walter Corbitt's diary" is linked to a Finished Scene
  When the Keeper deletes the Item or one of its Handouts
  Then the deletion is refused and nothing is deleted

Scenario: Deleting an Item linked only to Prepared Scenes removes its links
  # SP-UX-101
  Given the Item "Walter Corbitt's diary" is linked only to the Prepared Scene "The Corbitt House"
  When the Keeper deletes the Item
  Then the Campaign no longer has the Item
  And the Scene "The Corbitt House" no longer lists it

Scenario: Campaign boundaries isolate Scenario material
  # SP-UX-51, SP-UX-102
  Given a Human NPC and an Item belong to Campaign A
  When a Keeper prepares Scenario material for Campaign B
  Then the Human NPC and the Item are not available to link from Campaign B

Scenario: Manual preparation works without extraction
  Given no Scenario source document has been uploaded
  When the Keeper enters Scenes and Non-Player Entities manually
  Then the Scenario is usable for Campaign preparation
```

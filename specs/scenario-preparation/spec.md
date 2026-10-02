# Feature: Scenario Preparation

## Blueprint

### Context
Scenario Preparation lets a Keeper turn a Call of Cthulhu 7th Edition Scenario into usable Scene material before a Campaign begins. In v1 the Keeper enters the material manually; later work may extract structured Scenes and Non-Player Entities from uploaded source material without changing the domain shape used during play.

### Architecture
- **Domain relationships:** A Campaign has one Scenario. A Scenario contains ordered Scenes. A Scene may reference multiple Non-Player Entities, and a Non-Player Entity may appear in multiple Scenes within the same Campaign.
- **Manual preparation:** v1 provides Keeper-managed Scene, Handout, Human NPC, and Mythos Creature records.
- **File storage:** Azure Blob Storage stores Scene Handouts in v1 and uploaded Scenario source documents in the later extraction flow.
- **LLM extraction boundary:** The later extraction flow uses direct structured-output calls to a Microsoft Foundry model and maps results into the same Scenario, Scene, Human NPC, and Mythos Creature concepts used by manual preparation.
- **Dependencies:** Depends on Campaign Play for Campaign ownership and Keeper authorization. Campaign Play depends on this feature for prepared Scene and Non-Player Entity context.

### Constraints
- v1 requires manual Scenario preparation; PDF and text extraction is deferred to a later version.
- Each Scene has a title, Keeper-facing description or read-aloud text, an order, optional Handouts, and links to relevant Non-Player Entities.
- Human NPCs and Mythos Creatures are distinct profiles. A Human NPC uses relevant human [characteristics](../../docs/game-rules/coc7_character_creation_and_development_rules.md#2-characteristics) and [skills](../../docs/game-rules/coc7_character_creation_and_development_rules.md#6-skills); a Mythos Creature may have attacks, armor, special abilities, and sanity loss.
- Non-Player Entity profile rules are taken from [docs/game-rules](../../docs/game-rules/README.md). Mythos Creature profile rules are not yet documented there and are added to `docs/game-rules/` before Mythos Creature profiles are implemented.
- Non-Player Entities are scoped to one Campaign and are not reusable across Campaigns in v1.
- Handouts may be player-facing or Keeper-facing; Keeper-facing material must not be exposed to Players before the Keeper reveals it.
- Later model extraction uses structured output and direct model calls rather than an agentic orchestration layer.

## Contract

### Definition of Done
- [ ] The Keeper can create and edit a Scenario for a Campaign.
- [ ] The Keeper can create, edit, order, and remove Scenes in a Scenario.
- [ ] A Scene can store its title, description or read-aloud text, optional Handouts, and linked Human NPCs or Mythos Creatures.
- [ ] The Keeper can create both Human NPC and Mythos Creature profiles with their distinct required information.
- [ ] Handouts are stored durably and can be associated with a Scene.
- [ ] Scenario material and Non-Player Entities remain scoped to their Campaign.

### Regression Guardrails
- Scene order is stable and unambiguous within a Scenario.
- A Mythos Creature is never forced into the Human NPC profile shape; attacks, armor, special abilities, and sanity loss remain representable independently.
- Keeper-facing Scenario material and Handouts are not exposed to Players by default.
- Manual preparation remains valid without an LLM or uploaded source document.
- Structured extraction, when added, produces the same domain concepts as manual preparation rather than a parallel scenario model.

### Scenarios
```gherkin
Scenario: Keeper prepares an ordered Scene
  Given a Keeper owns a Campaign with a Scenario
  When the Keeper creates a Scene with a title, description, and order
  Then the Scene is stored in that Scenario
  And the Scene appears in the requested order

Scenario: Keeper links a Mythos Creature to a Scene
  Given a Mythos Creature belongs to the Campaign
  When the Keeper links it to a Scene
  Then the Scene shows the Mythos Creature as a relevant Non-Player Entity
  And the Mythos Creature retains its attacks, armor, special abilities, and sanity loss

Scenario: Keeper attaches a Handout
  Given a Keeper is editing a Scene
  When the Keeper attaches a Handout
  Then the Handout is durably associated with the Scene
  And the Handout has an explicit player-facing or Keeper-facing visibility

Scenario: Campaign boundaries isolate Scenario material
  Given a Human NPC belongs to Campaign A
  When a Keeper prepares Scenario material for Campaign B
  Then the Human NPC is not available to link from Campaign B

Scenario: Manual preparation works without extraction
  Given no Scenario source document has been uploaded
  When the Keeper enters Scenes and Non-Player Entities manually
  Then the Scenario is usable for Campaign preparation
```

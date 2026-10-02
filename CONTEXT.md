# Call of Cthulhu Campaign Assistant

This context describes the shared language for preparing and running Call of Cthulhu 7th Edition campaigns. It keeps the persistent story, individual game nights, participants, characters, scenario material, and play record distinct.

Game rules are defined only in [docs/game-rules](docs/game-rules/README.md). This glossary names concepts and links to the rules that govern them; it does not restate rules.

## Identity and Access

**Account**:
The authenticated identity issued by Entra ID for a person, existing independently of any Campaign. A person has exactly one Account. An Account becomes a Keeper by creating a Campaign, and becomes a Player by joining one.
_Avoid_: User, profile, login

## Campaign Structure

**Campaign**:
A persistent story container owned by one Keeper. It contains the scenario preparation, investigators, non-player entities, scenes, play sessions, and shared play record for an ongoing campaign.
_Avoid_: Session, game

**Play Session**:
A dated instance of play within a Campaign. It is the boundary for one game night while the Campaign and its characters continue across multiple Play Sessions.
_Avoid_: Campaign, session

**Keeper**:
The person who prepares and runs a Campaign, reveals the world, controls non-player entities, and moderates the shared play record.
_Avoid_: Game Master, GM, referee

**Player**:
A participant who joins a Campaign and controls an Investigator. A Player may contribute actions to the shared play record but does not control the Campaign.
_Avoid_: User, gamer

**Campaign Invite**:
The join mechanism issued by a Keeper for a Campaign. Anyone with an active invite may join until the Keeper revokes or replaces it, subject to the Campaign's player limit.
_Avoid_: Session link, invitation code

## People and Entities

**Investigator**:
A player-controlled human character in a Campaign, represented by a Call of Cthulhu 7th Edition investigator sheet. An Investigator belongs to exactly one Campaign and must be approved by its Keeper before being considered ready for play.
_Avoid_: Player character, character, PC

**Human NPC**:
A human entity controlled by the Keeper rather than a Player. It uses human [characteristics](docs/game-rules/coc7_character_creation_and_development_rules.md#2-characteristics) and only the [skills](docs/game-rules/coc7_character_creation_and_development_rules.md#6-skills) and details relevant to that entity's role in the Campaign.
_Avoid_: NPC character, enemy

**Mythos Creature**:
A non-human or supernatural entity controlled by the Keeper. It has a creature-specific profile that may include attacks, armor, special abilities, and sanity loss caused by witnessing it.
_Avoid_: Monster, creature NPC, enemy

**Non-Player Entity**:
The umbrella term for a Human NPC or Mythos Creature. Non-Player Entities belong to one Campaign and are not shared between Campaigns.
_Avoid_: NPC

## Scenario Preparation

**Scenario**:
The prepared mystery or adventure that gives a Campaign its intended situation, locations, clues, scenes, and entities. A Campaign may begin with manually entered scenario material and may later be prepared from an uploaded source.
_Avoid_: Adventure, module

**Scene**:
An ordered unit of a Scenario with a title, Keeper-facing description or read-aloud text, optional Handouts, and links to the Non-Player Entities present or relevant there.
_Avoid_: Chapter, encounter

**Handout**:
A piece of player-facing or Keeper-facing material attached to a Scene, such as an image, document, clue, or illustration.
_Avoid_: Attachment, asset, file

## Play Record

**Wall Entry**:
A chronological record of an action, decision, discovery, consequence, or world event during a Play Session. It identifies its author and has a visibility of Public or Keeper-only.
_Avoid_: Event, log message, note

**Public Wall Entry**:
A Wall Entry visible to the Players in the Campaign.
_Avoid_: Shared note

**Keeper-Only Wall Entry**:
A Wall Entry visible only to the Keeper, used for secrets, unrevealed consequences, and other information that should not yet be exposed to Players.
_Avoid_: Private note, hidden event

**Presence**:
The current participation state of a Campaign member while connected to the live Campaign experience.
_Avoid_: Availability, status

## Character Readiness

**Character Sheet**:
The complete Call of Cthulhu 7th Edition record for an Investigator, as defined by the [investigator data model](docs/game-rules/coc7_character_creation_and_development_rules.md#1-investigator-data-model).
_Avoid_: Player card, stat block

**Character Approval**:
The Keeper's decision that an Investigator's submitted Character Sheet is acceptable and ready for play. An Investigator remains unapproved until the Keeper explicitly approves it.
_Avoid_: Activation, verification

**Monster Profile**:
The Call of Cthulhu 7th Edition record for a Mythos Creature, including its characteristics where applicable, attacks, armor, special abilities, and sanity loss.
_Avoid_: Monster sheet, character sheet

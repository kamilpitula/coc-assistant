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

**Era**:
The historical period a Campaign is set in, such as the 1920s. It decides which [era-specific rule data](docs/game-rules/coc7_character_creation_and_development_rules.md#11-identity--sheet-fields) applies to the Campaign's Character Sheets and is fixed once the Campaign is created.
_Avoid_: Setting, period, timeline

**Play Session**:
A dated instance of play within a Campaign. It is the boundary for one game night while the Campaign and its characters continue across multiple Play Sessions.
_Avoid_: Campaign, session

**Keeper**:
The person who prepares and runs a Campaign, reveals the world, controls non-player entities, and moderates the shared play record.
_Avoid_: Game Master, GM, referee

**Player**:
A participant who joins a Campaign and controls an Investigator. A Player may contribute actions to the shared play record but does not control the Campaign.
_Avoid_: User, gamer

**Campaign Member**:
The Keeper or a Player of a Campaign. Only Campaign Members see the Campaign, its members, and their Presence.
_Avoid_: Participant, user

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
The current participation state of a Campaign Member while connected to the live Campaign experience: Connected while any of their connections is open on the Campaign, otherwise Not connected.
_Avoid_: Availability, status, online, offline

## Character Readiness

**Character Sheet**:
The complete Call of Cthulhu 7th Edition record for an Investigator, as defined by the [investigator data model](docs/game-rules/coc7_character_creation_and_development_rules.md#1-investigator-data-model).
_Avoid_: Player card, stat block

**Character Approval**:
The Keeper's decision that an Investigator's submitted Character Sheet is acceptable and ready for play. An Investigator remains unapproved until the Keeper explicitly approves it.
_Avoid_: Activation, verification

**Creation Method**:
The official procedure used to generate an Investigator's characteristics: Standard Rolling, Point Buy, or Quick Fire, as defined in the [characteristics rules](docs/game-rules/coc7_character_creation_and_development_rules.md#2-characteristics). The Keeper decides which Creation Methods a Campaign allows. User-facing copy writes them in sentence case ("Point buy").
_Avoid_: Creation mode, generation type

**Occupation**:
The profession an Investigator follows, which determines their occupation skills, skill point formula, and Credit Rating range per the [occupation rules](docs/game-rules/coc7_character_creation_and_development_rules.md#7-occupation-creation-rules). It is either a catalog Occupation for the Campaign's Era or a custom Occupation defined by the Player and judged by the Keeper.
_Avoid_: Job, class, profession

**Roll Record**:
A recorded dice result used to create or develop an Investigator, naming what it was rolled for, the dice, the result, and who produced it.
_Avoid_: Dice log, roll history

**Validation Error**:
A problem the [creation validation rules](docs/game-rules/coc7_character_creation_and_development_rules.md#15-character-creation-validation-rules) find on a Character Sheet, with a code, the field it concerns, a message, and a severity. An Error blocks submission; a Warning never does and is shown to both the Player and the Keeper.
_Avoid_: Rule violation, lint, issue

**Draft**:
The status of an Investigator whose Character Sheet the Player is still building. A Draft is private to its Player.
_Avoid_: Unsaved, pending

**Submitted**:
The status of an Investigator whose Character Sheet the Player has handed to the Keeper for Character Approval. The Player cannot change a Submitted Character Sheet.
_Avoid_: Pending, in review

**Changes Requested**:
The status of an Investigator the Keeper has returned to its Player with a Change Request.
_Avoid_: Rejected, declined

**Approved**:
The status of an Investigator that has received Character Approval and is ready for play.
_Avoid_: Active, verified, ready

**Change Request**:
The Keeper's comment explaining why a Submitted Character Sheet is returned to its Player.
_Avoid_: Rejection, review note

**Monster Profile**:
The Call of Cthulhu 7th Edition record for a Mythos Creature, including its characteristics where applicable, attacks, armor, special abilities, and sanity loss.
_Avoid_: Monster sheet, character sheet

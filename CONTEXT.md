# Call of Cthulhu Campaign Assistant

This context describes the shared language for preparing and running Call of Cthulhu 7th Edition campaigns. It keeps the persistent story, individual game nights, participants, characters, scenario material, and play record distinct.

Game rules are defined only in [docs/game-rules](docs/game-rules/README.md). This glossary names concepts and links to the rules that govern them; it does not restate rules.

## Identity and Access

**Account**:
The authenticated identity issued by Entra ID for a person, existing independently of any Campaign. A person has exactly one Account. An Account becomes a Keeper by creating a Campaign, and becomes a Player by joining one.
_Avoid_: User, profile, login

## Campaign Structure

**Campaign**:
A persistent story container owned by one Keeper. It contains its Scenarios (and through them their Scenes), investigators, non-player entities, Items, play sessions, and shared play record for an ongoing campaign.
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
A human entity controlled by the Keeper rather than a Player. It uses human [characteristics](docs/game-rules/coc7_character_creation_and_development_rules.md#2-characteristics) and only the [skills](docs/game-rules/coc7_character_creation_and_development_rules.md#6-skills) and details relevant to that entity's role in the Campaign. Its record is an NPC Profile.
_Avoid_: NPC character, enemy

**NPC Profile**:
The Keeper-only record for a Human NPC: a narrative core plus only the characteristics, skills, combat details, and spells the Scenario needs, per the [NPC creation rules](docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#4-human-npc-creation-procedure) and [project_ruleset.md section 5](docs/game-rules/project_ruleset.md#5-non-player-entity-profiles). It is not a Character Sheet.
_Avoid_: NPC sheet, stat block, character sheet

**Mythos Creature**:
A non-human or supernatural entity controlled by the Keeper, including mundane beasts and folklore creatures as well as Mythos monsters and unique entities. It has a creature-specific profile that may include attacks, armor, special abilities, and sanity loss caused by witnessing it. The game-rules documents keep the published word "monster".
_Avoid_: Monster, creature NPC, beast NPC, enemy

**Monster Profile**:
The Keeper-only Call of Cthulhu 7th Edition record for a Mythos Creature, including its characteristics where applicable, movement, attacks, armor, immunities, vulnerabilities, spells, powers, sanity loss, and defeat outcome, per the [monster creation rules](docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#5-monster-creation-procedure) and [project_ruleset.md section 5](docs/game-rules/project_ruleset.md#5-non-player-entity-profiles).
_Avoid_: Monster sheet, character sheet

**Creature Kind**:
An optional label on a Monster Profile (Beast, Folklore, Mythos, or Unique) that only organizes profiles and has no game effect.
_Avoid_: Creature class, Mythos classification, creature type

**Opposing Value**:
A Non-Player Entity's skill or characteristic value that sets the difficulty an Investigator faces when acting against it, per the [difficulty rules](docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#34-skill-difficulty-for-an-investigator-opposing-an-npc-or-monster).
_Avoid_: Target number, DC

**Investigator Difficulty**:
The Regular, Hard, or Extreme success an Investigator needs when acting against an Opposing Value, set by that value per the [difficulty rules](docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md#34-skill-difficulty-for-an-investigator-opposing-an-npc-or-monster) and shown on NPC Profiles and Monster Profiles per [project_ruleset.md sections 5.7](docs/game-rules/project_ruleset.md#57-npc-profile-skills-and-weapons) and [5.9](docs/game-rules/project_ruleset.md#59-monster-profile-skills-and-attacks). It is not a roll; the app rolls no dice for profiles.
_Avoid_: Difficulty class, DC, target level

**Derived Value Override**:
A Keeper-entered replacement, with its reason, for a computed Hit Points, Magic Points, Damage Bonus, or Build value on a Monster Profile, per [project_ruleset.md section 5.4](docs/game-rules/project_ruleset.md#54-derived-values-and-overrides). NPC Profiles have none.
_Avoid_: Manual stat, custom value

**Non-Player Entity**:
The umbrella term for a Human NPC or Mythos Creature. Non-Player Entities belong to one Campaign and are not shared between Campaigns.
_Avoid_: NPC

## Scenario Preparation

**Scenario**:
A prepared mystery that gives part of a Campaign its intended situation, locations, clues, scenes, and entities. A Campaign has zero or more Scenarios, played in a set order as linked parts of its story. A Scenario may be entered manually and may later be prepared from an uploaded source.
_Avoid_: Adventure, module

**Scene**:
The basic unit of play in a Scenario: a situation at a location with a title, Keeper notes, ordered Handouts, links to the Non-Player Entities present or relevant there, and links to Items. Scenes have a suggested prepared order within their Scenario, and each Scene is Prepared, Active, or Finished.
_Avoid_: Chapter, encounter

**Keeper notes**:
The Keeper's own notes on a Scenario, a Scene, or an Item; never shown to Players. Plain text on a Scenario, rich text on a Scene or an Item.

**Location**:
Where a Scene takes place, as free text.

**Prepared Scene**:
A Scene that has not been played yet. Only a Prepared Scene can be started or removed, and Players never see it.
_Avoid_: Draft scene, planned scene

**Active Scene**:
The Scene being played. A Campaign has at most one Active Scene.
_Avoid_: Current scene, live scene, open scene

**Finished Scene**:
A Scene that has been played. It is read-only for everyone and is never reopened; returning to a place is a new Scene.
_Avoid_: Closed scene, past scene, archived scene

**Handout**:
A piece of Player-facing or Keeper-facing material on a Scene or an Item, either rich text or a file. Its kind is Read-aloud, Text, Image, Document, or Map. A Player-facing Handout reaches Players only through a Reveal; a Keeper-facing Handout never does. An Image, Document, or Map Handout holds one file; 'file' names that stored content, never the Handout itself, and UI copy says 'image', 'PDF', or 'document' instead.
_Avoid_: Attachment, asset, file, article

**Read-aloud Handout**:
A rich-text Handout the Keeper reads to the Players, revealed separately from the Scene's other parts.
_Avoid_: Boxed text, narration

**Map**:
A Handout holding a static image of a place, shown prominently when revealed.
_Avoid_: Battle map, floor plan

**Item**:
A story object in a Campaign, such as a key, a diary, or an idol, that the Keeper creates and that may be needed to move the story forward. Players see its name and Player-facing description only when it is revealed or given; its Keeper notes and Keeper-facing Handouts never reach them. It is held by at most one Investigator or by no one, and only the Keeper changes its holder. Ordinary belongings are Gear, not Items.
_Avoid_: Gear, loot, inventory, artifact

## Scene Play

**Investigators present**:
The Approved Investigators taking part in the Active Scene, chosen by the Keeper. A split party is played by switching between Scenes.
_Avoid_: Party, participants, scene members

**Reveal**:
The Keeper's act of giving chosen Investigators present a Player-facing Handout, a Non-Player Entity's Player-facing description, or an Item. It keeps the content exactly as it was when revealed and is never withdrawn.
_Avoid_: Share, publish, unlock

**Clue**:
Something an Investigator received through a Reveal. Clues belong to the Investigator, not to its Player.
_Avoid_: Knowledge, journal, notes

**Scene History**:
The Active and Finished Scenes of a Campaign in the order they were started, across its Scenarios. Each Campaign Member sees it within the limits of their Investigator's Clues.
_Avoid_: Timeline, log, play order

**Roll Request**:
The Keeper's request that an Investigator make a roll, whose result is a Roll Record. Not yet specified: the rules for [skill rolls during play](docs/game-rules/README.md) are not yet documented.
_Avoid_: Skill test, check request

**Combat**:
A fight between Investigators and Non-Player Entities. Not yet specified: combat resolution is not yet documented in [docs/game-rules](docs/game-rules/README.md).
_Avoid_: Fight, battle

## Play Record

**Campaign Wall**:
The chronological record of a Campaign's Wall Entries, shared by its Campaign Members within the limits of each entry's visibility.
_Avoid_: Feed, log, timeline

**Wall Entry**:
A chronological record of an action, decision, discovery, consequence, or world event in a Campaign, optionally tied to the Play Session in which it happened. It identifies its author and has a visibility of Public or Keeper-only.
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

**Credit Rating**:
The skill that measures an Investigator's wealth and social standing, set at creation within its Occupation's range per the [Credit Rating rules](docs/game-rules/coc7_character_creation_and_development_rules.md#73-credit-rating).
_Avoid_: Wealth score, money

**Occupation Points**:
The creation budget an Investigator spends on its Occupation's skills and Credit Rating, computed from the Occupation's [skill point formula](docs/game-rules/coc7_character_creation_and_development_rules.md#71-occupation-skill-points).
_Avoid_: Skill points, career points

**Personal Interest Points**:
The creation budget an Investigator spends on [personal interest skills](docs/game-rules/coc7_character_creation_and_development_rules.md#8-personal-interest-skills).
_Avoid_: Hobby points, free points

**Wealth**:
The spending level, cash, and assets that follow from an Investigator's Credit Rating and the Campaign's Era, per the [finances rules](docs/game-rules/coc7_character_creation_and_development_rules.md#11-finances-gear-and-possessions).
_Avoid_: Money, finances

**Backstory**:
The Player-written narrative of an Investigator: My Story and the Background entries of the [backstory fields](docs/game-rules/coc7_character_creation_and_development_rules.md#12-backstory-fields).
_Avoid_: Bio, history, lore

**Key Connection**:
The one Backstory entry selected as the Investigator's especially important connection, per the [backstory fields](docs/game-rules/coc7_character_creation_and_development_rules.md#12-backstory-fields).
_Avoid_: Anchor, key link, main bond

**Custom Weapon**:
A weapon whose details the Player enters as free text because no weapon catalog exists, approved by the Keeper through Character Approval per [project_ruleset.md section 4.2](docs/game-rules/project_ruleset.md#42-weapons-gear-and-specializations-without-catalogs).
_Avoid_: Homebrew weapon, house weapon

**Gear**:
The significant possessions an Investigator carries, recorded as free text per the [finances rules](docs/game-rules/coc7_character_creation_and_development_rules.md#11-finances-gear-and-possessions).
_Avoid_: Inventory, equipment list. An Item is a different concept.

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

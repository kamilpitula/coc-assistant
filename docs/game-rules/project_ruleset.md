# Project Ruleset Configuration

## Purpose

This document records which parts of the Call of Cthulhu 7th Edition rules this
project supports, and every project restriction or house rule applied on top of
[coc7_character_creation_and_development_rules.md](coc7_character_creation_and_development_rules.md)
and [coc_7e_npc_and_monster_creation_ruleset.md](coc_7e_npc_and_monster_creation_ruleset.md).
Anything not listed here follows those documents unchanged.

# 1. Supported Eras

| Era | Status | Era-specific data |
|---|---|---|
| 1920s | Supported | [Skill bases](catalogs/skills.1920s.json) ([section 6.1](coc7_character_creation_and_development_rules.md#61-standard-1920s-investigator-sheet-skill-base-values)), [wealth table](catalogs/wealth.1920s.json) ([section 11](coc7_character_creation_and_development_rules.md#11-finances-gear-and-possessions)), [occupation catalog](catalogs/occupations.1920s.json) |

Adding an Era requires its skill bases, wealth table, and occupation catalog
here before a Campaign can select it.

# 2. Creation Methods

Standard Rolling, Point Buy, and Quick Fire
([section 2](coc7_character_creation_and_development_rules.md#2-characteristics))
are supported. The Keeper chooses which ones a Campaign allows.

# 3. Optional rules

All optional rules are **disabled** and cannot be enabled per Campaign yet:

- Height of human potential
  ([section 2.4](coc7_character_creation_and_development_rules.md#24-optional-height-of-human-potential-rule)).
- Maximum starting skill value
  ([section 9](coc7_character_creation_and_development_rules.md#9-skill-post-processing)).
- Keeper permission for Cthulhu Mythos creation points
  ([section 8](coc7_character_creation_and_development_rules.md#8-personal-interest-skills)).

# 4. Project restrictions (house rules)

## 4.1 Investigator age at creation

**House rule.** The age at creation must be within the normal range of
[section 3.1](coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets)
up to 89. Ages that the core rules leave to Keeper adjudication (90 and above,
or below 15) are rejected rather than routed to the Keeper, because the project
has no Keeper adjudication mechanism for creation yet.

## 4.2 Weapons, gear, and specializations without catalogs

**House rule.** Until a weapon and equipment catalog exists
([section 20](coc7_character_creation_and_development_rules.md#20-canonical-data-sources-the-implementation-should-maintain)),
every weapon is a Player-entered custom entry, as permitted by
[section 10.2](coc7_character_creation_and_development_rules.md#102-weapon-assignment-algorithm).
Character Approval by the Keeper is the explicit approval that section requires.
Gear is free text. Skill specializations are free text, with these exceptions
and suggestions:

- Fighting and Firearms specializations must be one of the specializations in
  [catalogs/skill-specializations.json](catalogs/skill-specializations.json)
  ([section 6.2](coc7_character_creation_and_development_rules.md#62-common-specialization-base-values)),
  because their base values differ by specialization and the rules give no base
  for any other specialization.
- The other specialized skills (the open families in that catalog) take free
  text and start at their family's base value from the Era's skill catalog;
  specializations named in the Era's Occupation catalog are offered as
  suggestions.

## 4.3 Dice results at creation

Dice results are rolled at the table and entered by the Player. The rules do
not specify who rolls, so this is a project choice rather than a deviation;
each result is kept as a Roll Record for the Keeper to review.

## 4.4 Characteristic floor after age effects

**House rule.** The core rules do not say how low a characteristic may fall
when the age modifiers of
[section 3.1](coc7_character_creation_and_development_rules.md#31-character-creation-age-brackets)
are applied. In this project the floor is **0** for every characteristic:

- The APP modifier may not take APP below 0.
- The physical deduction may not take any characteristic it is taken from
  below 0. The Player distributes the deduction across the named
  characteristics as section 3.1 describes.

A Character Sheet whose age effects would take a characteristic below the floor
is invalid; it is reported as a validation error and is not corrected
automatically
([section 15](coc7_character_creation_and_development_rules.md#15-character-creation-validation-rules)).

## 4.5 Occupation skill choices

**House rule (project assumption).** The rules do not say whether one skill may
fill two occupation skill slots. In this project an occupation's skills are all
different: a slot cannot be filled with a skill (with the same specialization)
that is already an occupation skill, and no slot can be filled with Cthulhu
Mythos
([section 8](coc7_character_creation_and_development_rules.md#8-personal-interest-skills)).
An "any" slot accepts any other skill; Credit Rating always takes occupation
points separately
([section 7.2](coc7_character_creation_and_development_rules.md#72-occupation-skill-allocation)).

## 4.6 Credit Rating takes occupation points only

**House rule (resolves a conflict).**
[Section 8](coc7_character_creation_and_development_rules.md#8-personal-interest-skills)
allows Personal Interest points on any skill except Cthulhu Mythos, while
[section 9](coc7_character_creation_and_development_rules.md#9-skill-post-processing)
sets Credit Rating to the allocated occupation points. In this project Credit
Rating is raised only with occupation points; Personal Interest points spent on
Credit Rating are reported as a validation error.

# 5. Non-Player Entity profiles

This section applies
[coc_7e_npc_and_monster_creation_ruleset.md](coc_7e_npc_and_monster_creation_ruleset.md)
(the NPC ruleset below) to the NPC Profile of a Human NPC and the Monster
Profile of a Mythos Creature.

## 5.1 Supported profiles and creation methods

**Project choice.**

- The Human NPC preparation profiles A to E of NPC ruleset
  [section 2.1](coc_7e_npc_and_monster_creation_ruleset.md#21-human-npc-profiles)
  are not stored. An NPC Profile has a narrative core and optional
  Characteristics, Skills, Combat, and Spells sections; the Keeper adds only the
  sections the Scenario needs, as section 4.3 of the NPC ruleset advises.
- The creature profiles G to K of NPC ruleset
  [section 2.2](coc_7e_npc_and_monster_creation_ruleset.md#22-creature-profiles)
  share one Monster Profile. Its optional Creature Kind (Beast, Folklore,
  Mythos, or Unique) only organizes profiles and has no game effect, per NPC
  ruleset section 8 item 8.
- Groups (profiles F and L) are not supported: one profile may stand for a
  group, with the count in its description.
- The app rolls no dice for profiles; the Keeper enters fixed values (NPC
  ruleset section 5.2: "choose a fixed result").
- Concept-first creation is supported. The template method is supported only by
  duplicating an existing profile of the same Campaign. Published stat blocks,
  the *Malleus Monstrorum* random-inspiration tables, and creature catalogs are
  not provided, because they are published book content; the Keeper copies
  values from their own books.

## 5.2 Value ranges

**House rule (project assumption).** The rules set no maximum for Non-Player
Entity values. In this project:

| Value | Range |
|---|---|
| Human NPC age | Required whole number, 0-150 |
| Human NPC characteristic or skill value | Whole number, 0-100 |
| Mythos Creature characteristic, skill, attack skill, or Dodge value | Whole number, 0-2000 |
| Armour points | Whole number, 0-2000 |
| Movement rate (per mode) | Whole number, 0-999 |
| Attacks per round | Whole number, 1-99 |

Each characteristic is optional on its own. A Monster Profile offers STR, CON,
SIZ, DEX, INT, and POW, and APP and EDU only when the Keeper adds them (NPC
ruleset section 5.3). Half and fifth values are not stored or shown for a
Mythos Creature (NPC ruleset section 5.3).

## 5.3 Human movement outside the covered ages

**Rules gap.** The age penalty of
[section 5.7](coc7_character_creation_and_development_rules.md#57-movement-rate)
covers ages up to the 80s and says nothing about ages below 15 or of 90 and
above. MOV is computed for a Human NPC aged 15-89. For any other age it is not
computed and is shown as not covered by the rules; no extension is invented. A
house rule is needed before MOV can be computed for those ages.

## 5.4 Derived values and overrides

**Project choice.**

- A Human NPC's Hit Points, Magic Points, Damage Bonus, Build, and MOV are always
  computed (NPC ruleset sections 3.2 and 3.3) and cannot be overridden. Each is
  shown only when the characteristics (and, for MOV, the age) it needs are
  present.
- A Mythos Creature's Hit Points, Magic Points, Damage Bonus, and Build are
  computed the same way, and the Keeper may override each one separately with a
  reason. The computed value stays visible beside the override. This is the
  "clear exception for a custom entity" of NPC ruleset section 5.4.
- A Mythos Creature's Hit Points may be marked not applicable only when its
  defeat outcome is recorded (NPC ruleset section 5.9).
- A Mythos Creature's movement is entered per mode (Walk, Swim, Fly, Burrow, or
  Other with a label), never computed (NPC ruleset section 5.3). No modes means
  no ordinary movement.

## 5.5 Dice notation

**Project convention** for recording dice values; it adds no rule.

```text
term       = dice | constant | "DB"
dice       = [count] "D" sides          // case-insensitive; no count means 1
expression = term { ("+" | "-") term }  // for example 1D6+1D4+DB, 2D6-1
sanityLoss = side "/" side              // success "/" failure, for example 0/1D6
side       = expression without "DB"    // a constant, including 0, or dice
```

- `DB` (the attacker's Damage Bonus) is allowed only in damage. It is not allowed
  in the damage of an NPC Profile weapon that uses a Firearms skill, because
  Damage Bonus does not apply to firearms
  ([section 10.3](coc7_character_creation_and_development_rules.md#103-damage-bonus-interaction)).
- Sanity loss is optional; no Sanity loss means the Mythos Creature calls for no
  Sanity roll (NPC ruleset section 5.8).
- **Rules gap.** Half Damage Bonus for thrown weapons is not documented in
  `docs/game-rules/` and is not supported.

## 5.6 Spells and powers without a catalog

**Project choice.** No spell catalog or spell rules exist yet (see the
[README](README.md)). NPC Profiles and Monster Profiles record spells as free
text: a name, a Magic Point cost, and an effect. Monster Profiles record powers
in a separate list with the same shape plus limits, because NPC ruleset
section 5.7 keeps spells and powers apart. No spell or power effect is enforced.

## 5.7 NPC Profile skills and weapons

**Project choice.**

- NPC Profile skills are chosen from the Campaign Era's
  [skill catalog](catalogs/skills.1920s.json) or entered as a custom name.
  Fighting and Firearms specializations must come from
  [catalogs/skill-specializations.json](catalogs/skill-specializations.json),
  as in section 4.2, so a weapon's skill family is always known.
- Each skill shows the Investigator difficulty it sets (NPC ruleset
  [section 3.4](coc_7e_npc_and_monster_creation_ruleset.md#34-skill-difficulty-for-an-investigator-opposing-an-npc-or-monster)).
  The advice that a profession-related skill is 50 or higher is guidance for the
  Keeper and is not checked.
- NPC Profile weapons use the fields of
  [section 10.1](coc7_character_creation_and_development_rules.md#101-weapon-data-model)
  entered by the Keeper, as section 4.2 allows: a name, the NPC skill it uses,
  damage in the notation of section 5.5, attacks per round, and optional range,
  ammunition, malfunction value, and impaling. Investigator Custom Weapons are
  unchanged.

## 5.8 Profile validation

**Project choice.** Only structural problems block saving a profile: values
outside section 5.2, notation outside section 5.5, a weapon without its skill or
damage, an attack without its skill value or without damage (unless the attack
is a manoeuvre), and an override without a reason. The checklists of NPC
ruleset section 7 are Keeper guidance and are not checked.

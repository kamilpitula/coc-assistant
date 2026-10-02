# Project Ruleset Configuration

## Purpose

This document records which parts of the Call of Cthulhu 7th Edition rules this
project supports, and every project restriction or house rule applied on top of
[coc7_character_creation_and_development_rules.md](coc7_character_creation_and_development_rules.md).
Anything not listed here follows that document unchanged.

# 1. Supported Eras

| Era | Status | Era-specific data |
|---|---|---|
| 1920s | Supported | [Skill bases](coc7_character_creation_and_development_rules.md#61-standard-1920s-investigator-sheet-skill-base-values), [wealth table](coc7_character_creation_and_development_rules.md#11-finances-gear-and-possessions), [occupation catalog](catalogs/occupations.1920s.json) |

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
Gear and skill specializations are free text; the specializations in
[section 6.2](coc7_character_creation_and_development_rules.md#62-common-specialization-base-values)
are offered as suggestions only.

## 4.3 Dice results at creation

Dice results are rolled at the table and entered by the Player. The rules do
not specify who rolls, so this is a project choice rather than a deviation;
each result is kept as a Roll Record for the Keeper to review.

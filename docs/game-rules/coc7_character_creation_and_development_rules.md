# Call of Cthulhu 7th Edition — Investigator Character Creation & Development Rules

## Purpose

This document is an implementation-oriented summary of the **standard Call of Cthulhu 7th Edition** investigator creation and advancement rules. It is written as a reference for a Game Master assistant / consuming agent rather than as a player-facing rulebook.

The document deliberately uses **pseudocode and data schemas** instead of reproducing the rulebook. It separates:

- values that are **rolled or allocated**;
- values that are **derived automatically**;
- values that come from **occupation/era/weapon data**;
- fields that are **tracked during play**;
- rules for **skill development after play**.

### Scope assumptions

- Ruleset: **Call of Cthulhu 7th Edition, standard rules**, not Pulp Cthulhu.
- Default creation method: the **standard rolling method** from the Keeper Rulebook.
- Other official creation methods are also specified where they materially affect implementation: point buy and Quick Fire.
- Era is treated as a required configuration because occupations, equipment, weapons, prices, and wealth depend on the period. The standard Chaosium investigator sheet used as the schema reference is the **1920s-era sheet**.
- Weapon statistics must come from a trusted weapon catalog. The character creator should **not invent weapon statistics from a weapon name**.

---

# 1. Investigator data model

The consuming agent should model an investigator as a structured object rather than as a flat collection of UI fields.

```text
Investigator {
    identity
    creationContext
    characteristics
    derived
    skills[]
    combat
    weapons[]
    gear[]
    wealth
    backstory
    conditions
    advancement
    fellowInvestigators[]
    storyNotes
}
```

## 1.1 Identity / sheet fields

These correspond to the standard Chaosium investigator sheet and should be represented explicitly:

| Field | Type | Creation rule |
|---|---|---|
| `name` | string | Player supplied or generated. |
| `playerName` | string | Optional; useful for campaign tooling. |
| `occupation` | occupation reference | Must be selected before occupation skill allocation. |
| `age` | integer | Normally 15–90; Keeper adjudicates outside this range. |
| `gender` | string/enumeration | Narrative field; no core numeric effect. |
| `residence` | string | Narrative field. |
| `birthplace` | string | Narrative field. |
| `portrait` | asset reference | Optional. |
| `era` | enum/reference | Required by the implementation because skills, occupations, gear, weapons, and wealth can be era-specific. |

The official Chaosium standard sheet uses Name, Occupation, Residence, Birthplace, Age, Gender, and a portrait area. It also includes the sections described below. [Chaosium investigator sheet](https://downloads.chaosium.com/call-of-cthulhu/cha2300-investigator-sheets/CoC7_Investigator_Sheet_Standard_autocalc.pdf)

---

# 2. Characteristics

The eight core characteristics are:

```text
STR = Strength
CON = Constitution
DEX = Dexterity
APP = Appearance
POW = Power
SIZ = Size
INT = Intelligence
EDU = Education
```

Each characteristic has three stored values:

```text
regular = full percentile value
hard    = floor(regular / 2)
extreme  = floor(regular / 5)
```

### 2.1 Standard rolling method

Roll:

```text
STR, CON, DEX, APP, POW = 3D6 × 5
SIZ, INT, EDU            = (2D6 + 6) × 5
Luck                     = 3D6 × 5
```

These are the standard 7th Edition creation formulas. [Call of Cthulhu 7e Core Rules](https://www.chaosium.com/call-of-cthulhu-keeper-rulebook-hardcover/)

### 2.2 Point-buy alternative

The core rules provide a point-buy option:

```text
budget = 460
for each of the 8 characteristics:
    choose integer value in [15, 90]
require sum(characteristics) == 460
```

The rules recommend (but do not absolutely require) at least 40 in INT and SIZ unless the Keeper agrees otherwise.

### 2.3 Quick Fire alternative

For rapid creation:

```text
pool = [40, 50, 50, 50, 60, 60, 70, 80]
assign each value exactly once to STR/CON/DEX/APP/POW/SIZ/INT/EDU
```

Then apply age rules and the normal derived-value calculations.

The Quick Fire method is an official 7th Edition alternative; do not accidentally mix its fixed skill allocation with the full standard occupation-point method unless the user explicitly asks for that variant.

### 2.4 Optional “height of human potential” rule

An optional rule allows an additional `1D10` points to be distributed among characteristics, allowing a normally dice-generated maximum of 90 to be pushed as high as 99.

This should be modeled as an explicit optional ruleset flag:

```text
if options.allowExceptionalCharacteristics:
    bonus = roll(1D10)
    distribute bonus among characteristics
    cap each characteristic at 99
```

---

# 3. Age and Education rules

Age is applied **after the initial characteristics are generated/assigned and before derived values are finalized**.

Normal investigator age range: **15–90**. Values outside that range require Keeper adjudication.

## 3.1 Character creation age brackets

Use the applicable bracket only; creation does **not** cumulatively apply all previous age brackets.

| Age | Physical modifiers | APP | EDU improvement checks | Luck |
|---|---|---:|---:|---|
| 15–19 | subtract total 5 points from STR and/or SIZ | unchanged | none | roll twice, keep higher |
| 20–39 | none | unchanged | 1 | normal |
| 40–49 | subtract total 5 from STR/CON/DEX | -5 | 2 | normal |
| 50–59 | subtract total 10 from STR/CON/DEX | -10 | 3 | normal |
| 60–69 | subtract total 20 from STR/CON/DEX | -15 | 4 | normal |
| 70–79 | subtract total 40 from STR/CON/DEX | -20 | 4 | normal |
| 80–89 | subtract total 80 from STR/CON/DEX | -25 | 4 | normal |
| 90 | Keeper adjudication / use the applicable high-age rules | Keeper decision | Keeper decision | normal unless modified |

For the physical deduction, the player may distribute the total deduction across the named characteristics; e.g. a 40-year-old can subtract 3 STR and 2 DEX rather than taking all 5 from one characteristic.

### 3.2 EDU improvement check

For every required EDU improvement check:

```text
roll = D100
if roll > current EDU:
    EDU = min(99, EDU + roll(1D10))
else:
    EDU unchanged
```

Run the required number of checks independently.

### 3.3 Age modifier ordering

Recommended implementation order:

```text
generate characteristics
choose age
apply age physical modifiers
apply APP modifier
perform EDU improvement checks
calculate regular/half/fifth values
calculate all derived characteristics
```

This matters because EDU is used to calculate Own Language and occupation skill points, and the modified EDU must therefore be the value used by those calculations.

---

# 4. Characteristic derived values

For every characteristic:

```text
hard = floor(regular / 2)
extreme = floor(regular / 5)
```

The standard 7th Edition sheet stores all three values because Regular, Hard, and Extreme successes are used repeatedly during play.

---

# 5. Secondary / derived attributes

## 5.1 Idea and Know

These are direct characteristic-derived reference values:

```text
Idea = INT
Know = EDU
```

## 5.2 Starting Sanity

```text
startingSAN = POW
currentSAN = startingSAN
maxSAN = 99 - CthulhuMythos
```

A new investigator has normally `CthulhuMythos = 0`, therefore normally:

```text
maxSAN = 99
```

The maximum can fall permanently as Cthulhu Mythos knowledge increases.

## 5.3 Magic Points

```text
maxMP = floor(POW / 5)
currentMP = maxMP
```

## 5.4 Hit Points

```text
maxHP = floor((CON + SIZ) / 10)
currentHP = maxHP
```

The sheet should also track current HP separately from maximum HP.

## 5.5 Luck

Normal creation:

```text
Luck = 3D6 × 5
currentLuck = Luck
```

For age 15–19:

```text
luck1 = 3D6 × 5
luck2 = 3D6 × 5
currentLuck = max(luck1, luck2)
```

The original starting Luck value is not a permanent reset point during play; Luck can change over time.

## 5.6 Dodge

Starting Dodge is derived from DEX:

```text
Dodge = floor(DEX / 2)
```

It is also recorded as a normal skill that can receive skill points.

## 5.7 Movement Rate

First determine base MOV:

```text
if STR < SIZ and DEX < SIZ:
    MOV = 7
else if STR > SIZ and DEX > SIZ:
    MOV = 9
else:
    MOV = 8
```

Then apply the creation-age penalty:

```text
if age in 40s: MOV -= 1
if age in 50s: MOV -= 2
if age in 60s: MOV -= 3
if age in 70s: MOV -= 4
if age in 80s: MOV -= 5
```

MOV is a derived value and should be recalculated whenever STR, DEX, SIZ, or age changes in a way that affects it.

## 5.8 Damage Bonus and Build

Calculate:

```text
strengthSize = STR + SIZ
```

Then use this table:

| STR + SIZ | Damage Bonus | Build |
|---:|---:|---:|
| 2–64 | -2 | -2 |
| 65–84 | -1 | -1 |
| 85–124 | 0 | 0 |
| 125–164 | +1D4 | 1 |
| 165–204 | +1D6 | 2 |
| 205–284 | +2D6 | 3 |
| 285–364 | +3D6 | 4 |
| 365–444 | +4D6 | 5 |
| 445–524 | +5D6 | 6 |

Above 524:

```text
extra = ceil((STR + SIZ - 524) / 80)
DB = +5D6 + extra D6
Build = 6 + extra
```

Damage Bonus applies to melee/unarmed attacks, **not firearms**.

---

# 6. Skills

Every skill has:

```text
Skill {
    name
    specialization?       // e.g. Science (Physics), Fighting (Sword)
    baseChance
    pointsAllocated
    regular
    hard
    extreme
    checkedForDevelopment
    sourceFlags            // occupation / personalInterest / innate / advancement
}
```

## 6.1 Standard 1920s investigator-sheet skill base values

The standard Chaosium 1920s sheet contains the following main skill bases:

| Skill | Base |
|---|---:|
| Accounting | 5 |
| Anthropology | 1 |
| Archaeology | 1 |
| Appraise | 5 |
| Art/Craft | 5 |
| Charm | 15 |
| Climb | 20 |
| Credit Rating | 0 |
| Cthulhu Mythos | 0 |
| Disguise | 5 |
| Dodge | half DEX |
| Drive Auto | 20 |
| Electrical Repair | 10 |
| Fast Talk | 5 |
| Fighting (Brawl) | 25 |
| Firearms (Handgun) | 20 |
| Firearms (Rifle/Shotgun) | 25 |
| First Aid | 30 |
| History | 5 |
| Intimidate | 15 |
| Jump | 20 |
| Language (Other) | 1 |
| Language (Own) | EDU |
| Law | 5 |
| Library Use | 20 |
| Listen | 20 |
| Locksmith | 1 |
| Mechanical Repair | 10 |
| Medicine | 1 |
| Natural World | 10 |
| Navigate | 10 |
| Occult | 5 |
| Operate Heavy Machinery | 1 |
| Persuade | 10 |
| Pilot | 1 |
| Psychoanalysis | 1 |
| Psychology | 10 |
| Ride | 5 |
| Science | 1 |
| Sleight of Hand | 10 |
| Spot Hidden | 25 |
| Stealth | 20 |
| Survival | 10 |
| Swim | 20 |
| Throw | 20 |
| Track | 10 |

Source: official Chaosium 1920s investigator sheet and 7th Edition skill list.

Important: skills such as Art/Craft, Fighting, Firearms, Language, Pilot, Science, and Survival are **specialized skills**. Their specialization matters.

### 6.2 Common specialization base values

The core skill list establishes different starting values for individual Fighting and Firearms specializations. For the common specializations:

```text
Fighting:
    Axe       = 15
    Brawl     = 25
    Chainsaw  = 10
    Flail     = 10
    Garrote   = 15
    Spear     = 20
    Sword     = 20
    Whip      = 5

Firearms:
    Bow              = 15
    Handgun          = 20
    Heavy Weapons    = 10
    Flamethrower     = 10
    Machine Gun      = 10
    Rifle/Shotgun    = 25
    Submachine Gun   = 15
```

Use the rulebook's specialization data as the authoritative source when adding era-specific or uncommon specializations.

For `Language (Other)`, `Pilot`, and `Science`, the base specialization starts at the relevant base value and points are allocated to the selected specialization.

---

# 7. Occupation creation rules

An occupation contains at minimum:

```text
Occupation {
    name
    eraRestrictions?
    creditRatingMin
    creditRatingMax
    occupationPointFormula
    skills[]
    selectableSkillChoices[]
}
```

The occupation is **data**, not hardcoded logic. The same algorithm should work for all occupations.

## 7.1 Occupation skill points

The full 7th Edition rules calculate occupation points using the formula attached to the selected occupation.

Common formulas include:

```text
EDU × 4
EDU × 2 + DEX × 2
EDU × 2 + STR × 2
EDU × 2 + APP × 2
EDU × 2 + POW × 2
EDU × 2 + one of (APP × 2, DEX × 2, STR × 2)
```

Some occupations permit more than one possible characteristic or choice.

Therefore:

```text
occupationPoints = evaluate(occupation.occupationPointFormula, characteristics)
```

Do **not** assume `EDU × 4` for every occupation.

## 7.2 Occupation skill allocation

Occupation points can be spent on:

- the occupation's listed skills;
- skills selected through the occupation's explicit “any one / any two / one interpersonal skill / specialty” choices;
- Credit Rating, subject to the occupation's Credit Rating range.

Points are added to the relevant skill's **base value**.

Example algorithm:

```text
for each occupationAllocation in playerChoice:
    require occupationAllocation.skill in allowedOccupationSkills
    skill.regular += occupationAllocation.points

require creditRating >= occupation.creditRatingMin
require creditRating <= occupation.creditRatingMax
```

Unused occupation points are lost.

### 7.3 Credit Rating

Credit Rating starts at 0 and is raised with occupation points.

It is both:

- a percentile-style skill/measure;
- an indicator of wealth, social position, and living standard.

Typical bands are:

```text
0       = penniless
1–9     = poor
10–49   = average
50–89   = wealthy
90–98   = rich
99      = super rich
```

The occupation's own min/max range is authoritative at character creation.

Credit Rating is **not** a normal experience-check skill.

---

# 8. Personal Interest Skills

Personal Interest points are:

```text
personalInterestPoints = INT × 2
```

They may be allocated to any skill, including skills already raised through occupation points, **except Cthulhu Mythos** during ordinary character creation unless the Keeper explicitly allows otherwise.

```text
for allocation in personalInterestAllocations:
    require allocation.skill != CthulhuMythos
    targetSkill.regular += allocation.points
```

Unused points are lost.

Personal Interest points are **one-for-one percentage points**.

---

# 9. Skill post-processing

After all creation allocations are complete:

```text
for each skill:
    skill.hard = floor(skill.regular / 2)
    skill.extreme = floor(skill.regular / 5)
```

Important special cases:

```text
OwnLanguage = EDU
Dodge = floor(DEX / 2) + any allocated points
CthulhuMythos = 0 at standard character creation
CreditRating = allocated occupation points, within occupation range
```

The optional rule for a maximum starting skill value (for example 75%) should be represented as a ruleset configuration, not as an unconditional 75% cap.

---

# 10. Combat and weapon fields

The standard sheet contains a combat table with these fields:

```text
Weapon
Skill
Damage
# of Attacks
Range
Ammo
Malf.
```

It also provides:

```text
Move
Build
Dodge (Regular / Hard / Extreme)
Damage Bonus
```

## 10.1 Weapon data model

Represent a weapon as:

```text
WeaponDefinition {
    id
    name
    eraRestrictions?
    skill {
        family       // Fighting / Firearms / Throw / other
        specialization
    }
    damageFormula
    attacksPerRound
    range
    ammunitionCapacity?
    malfunctionValue?
    impaling?
    specialRules[]
    priceByEra?
}
```

Represent the investigator's owned weapon as:

```text
InvestigatorWeapon {
    weaponDefinitionId
    displayName
    skillValue           // copied/resolved from investigator skill
    ammoCurrent?
    equipped
    notes
}
```

## 10.2 Weapon assignment algorithm

Weapon statistics are **catalog data**, not character-generated values.

```text
function addWeapon(investigator, weaponDefinition):
    require weaponDefinition is valid for investigator.era

    skill = resolveSkill(
        weaponDefinition.skill.family,
        weaponDefinition.skill.specialization
    )

    require skill exists

    weapon.skillValue = skill.regular
    weapon.damage = weaponDefinition.damageFormula
    weapon.attacksPerRound = weaponDefinition.attacksPerRound
    weapon.range = weaponDefinition.range
    weapon.ammo = weaponDefinition.ammunitionCapacity
    weapon.malfunction = weaponDefinition.malfunctionValue

    add weapon to investigator.weapons
```

### Critical implementation rule

The agent should **never infer weapon statistics from the weapon's real-world name**. If the catalog has no authoritative entry:

```text
askKeeperForWeaponDefinition()
```

or present the weapon as a custom/house-rule entry requiring explicit approval.

## 10.3 Damage Bonus interaction

For melee/unarmed attacks:

```text
damage = weaponBaseDamage + DB
```

For firearms:

```text
damage = firearmDamage
// do NOT add investigator DB
```

The exact weapon table also determines range, attacks per round, ammunition, malfunction value, and special rules. [Chaosium 7e weapon reference](https://cthulhuwiki.chaosium.com/equipment/weapons.html)

---

# 11. Finances, gear, and possessions

The sheet tracks:

```text
wealth.spendingLevel
wealth.cash
wealth.assets
gear[]
```

Credit Rating determines the appropriate wealth band. Exact cash/assets/spending-level values depend on the **era**.

For the standard 1920s table:

| Credit Rating | Cash | Assets | Spending Level |
|---|---:|---:|---:|
| 0 or less | $0.50 | none | $0.50 |
| 1–9 | CR × 1 | CR × 10 | $2 |
| 10–49 | CR × 2 | CR × 50 | $10 |
| 50–89 | CR × 5 | CR × 500 | $50 |
| 90–98 | CR × 20 | CR × 2000 | $250 |
| 99 | $50,000 | $5M+ | $5,000 |

For modern-day games the core rules use a different table, so a modern-era implementation must not reuse the 1920s multipliers.

The Keeper determines what ordinary equipment is naturally owned because of the investigator's occupation/living standard. The character only needs to record significant gear rather than every mundane possession.

---

# 12. Backstory fields

The current standard Chaosium sheet provides space for:

```text
My Story

Background:
    Personal Description
    Traits
    Ideology & Beliefs
    Injuries & Scars
    Significant People
    Phobias & Manias
    Meaningful Locations
    Arcane Tomes & Spells
    Treasured Possessions
    Encounters with Strange Entities

Gear & Possessions

Wealth:
    Spending Level
    Cash
    Assets

Fellow Investigators:
    character
    player
```

A **Key Connection** should also be represented in the data model even though it is not a separate large field on the sheet. One backstory entry is selected as the investigator's especially important connection.

Backstory is primarily narrative rather than numeric, so the creation agent should generate it only after the mechanical identity is coherent enough to support it.

Recommended generation sequence:

```text
mechanical creation complete
        -> infer character themes from occupation + high skills + characteristics
        -> ask / generate backstory details
        -> select one key connection
        -> add gear and narrative details
```

---

# 13. Conditions and tracked state

The sheet explicitly tracks:

```text
maxSanity
currentSanity
startingSanity
currentHitPoints
maxHitPoints
currentMagicPoints
maxMagicPoints
currentLuck

temporaryInsanity
indefiniteInsanity
majorWound
unconscious
dying
```

For combat/healing support, the current Chaosium sheet also summarizes:

```text
Major Wound = damage >= half maximum HP from one attack
HP reaches 0 + Major Wound => Dying
HP reaches 0 without Major Wound => Unconscious
```

Those are play-state rules rather than character-creation rules, but the fields should exist from day one because the character sheet is expected to track them.

---

# 14. Complete character creation algorithm

The following is the recommended reference algorithm for a consuming agent.

```text
function createInvestigator(request, ruleset):

    validateRuleset(ruleset)

    context = resolveCreationContext(request)
    // required/important:
    //   era
    //   creationMethod
    //   occupation or occupation concept
    //   optional house rules

    investigator = new Investigator()

    # ------------------------------------------------------------
    # 1. Identity
    # ------------------------------------------------------------
    investigator.identity = collectIdentity(context)

    # ------------------------------------------------------------
    # 2. Characteristics
    # ------------------------------------------------------------
    if creationMethod == STANDARD_ROLLING:
        STR = roll(3D6) * 5
        CON = roll(3D6) * 5
        DEX = roll(3D6) * 5
        APP = roll(3D6) * 5
        POW = roll(3D6) * 5
        SIZ = (roll(2D6) + 6) * 5
        INT = (roll(2D6) + 6) * 5
        EDU = (roll(2D6) + 6) * 5

    else if creationMethod == POINT_BUY:
        require sum(assignedValues) == 460
        require every value in [15, 90]
        assign values to the eight characteristics

    else if creationMethod == QUICK_FIRE:
        pool = [40,50,50,50,60,60,70,80]
        assign each value exactly once

    else if creationMethod == CUSTOM:
        ask for / load explicit house-rule generator

    if ruleset.allowExceptionalCharacteristics:
        distribute roll(1D10) among characteristics
        cap each at 99

    # ------------------------------------------------------------
    # 3. Age
    # ------------------------------------------------------------
    age = investigator.identity.age
    applyCreationAgeModifiers(characteristics, age)

    for i in 1..requiredEDUImprovementChecks(age):
        performEDUImprovementCheck()

    if age in 15..19:
        roll Luck twice
        Luck = max(luckRoll1, luckRoll2)
    else:
        Luck = roll(3D6) * 5

    # ------------------------------------------------------------
    # 4. Characteristic thresholds
    # ------------------------------------------------------------
    for characteristic in allCharacteristics:
        characteristic.hard = floor(characteristic.regular / 2)
        characteristic.extreme = floor(characteristic.regular / 5)

    # ------------------------------------------------------------
    # 5. Secondary attributes
    # ------------------------------------------------------------
    Idea = INT
    Know = EDU
    startingSAN = POW
    currentSAN = startingSAN
    maxSAN = 99
    maxHP = floor((CON + SIZ) / 10)
    currentHP = maxHP
    maxMP = floor(POW / 5)
    currentMP = maxMP
    currentLuck = Luck
    Dodge = floor(DEX / 2)
    Move = calculateMove(STR, DEX, SIZ, age)
    (DB, Build) = calculateDamageBonusAndBuild(STR, SIZ)

    # ------------------------------------------------------------
    # 6. Initialize skill catalog
    # ------------------------------------------------------------
    skills = loadSkillCatalog(context.era)
    initializeSkillsWithBaseValues(skills, characteristics)

    # Own Language and Dodge are characteristic-derived bases.
    skills[OwnLanguage].regular = EDU
    skills[Dodge].regular = floor(DEX / 2)

    # ------------------------------------------------------------
    # 7. Occupation
    # ------------------------------------------------------------
    occupation = resolveOccupation(context.occupation, context.era)
    investigator.occupation = occupation

    occupationPoints = evaluate(
        occupation.occupationPointFormula,
        characteristics
    )

    allowedOccupationSkills = resolveOccupationSkillChoices(
        occupation,
        context.playerSkillChoices
    )

    allocateOccupationPoints(
        skills,
        occupationPoints,
        allowedOccupationSkills,
        occupation.creditRatingMin,
        occupation.creditRatingMax
    )

    # ------------------------------------------------------------
    # 8. Personal Interests
    # ------------------------------------------------------------
    personalPoints = INT * 2
    allocatePersonalInterestPoints(
        skills,
        personalPoints,
        forbid=[CthulhuMythos]
    )

    # ------------------------------------------------------------
    # 9. Skill thresholds
    # ------------------------------------------------------------
    for skill in skills:
        skill.hard = floor(skill.regular / 2)
        skill.extreme = floor(skill.regular / 5)

    # ------------------------------------------------------------
    # 10. Wealth
    # ------------------------------------------------------------
    investigator.wealth = calculateWealth(
        era=context.era,
        creditRating=skills[CreditRating].regular
    )

    # ------------------------------------------------------------
    # 11. Gear and weapons
    # ------------------------------------------------------------
    investigator.gear = resolveStartingGear(
        occupation,
        context.era,
        investigator.wealth,
        context.playerChoices
    )

    for weaponChoice in context.weaponChoices:
        weaponDefinition = lookupWeapon(weaponChoice, context.era)
        addWeapon(investigator, weaponDefinition)

    # ------------------------------------------------------------
    # 12. Backstory
    # ------------------------------------------------------------
    investigator.backstory = createBackstory(
        occupation,
        characteristics,
        skills,
        context.playerConcept
    )

    investigator.backstory.keyConnection = chooseKeyConnection()

    # ------------------------------------------------------------
    # 13. Conditions / advancement state
    # ------------------------------------------------------------
    investigator.conditions = clearAllConditions()
    investigator.advancement.checkedSkills = {}

    # ------------------------------------------------------------
    # 14. Validation
    # ------------------------------------------------------------
    validateInvestigator(investigator, ruleset)

    return investigator
```

---

# 15. Character creation validation rules

A valid standard investigator should satisfy at least the following:

```text
VALID:

- exactly 8 core characteristics exist
- characteristics are valid under selected creation method
- age is valid or explicitly Keeper-approved
- age modifiers have been applied exactly once during creation
- EDU improvement checks were performed when required
- HP = floor((CON + SIZ) / 10)
- SAN starts at POW
- Max SAN starts at 99 when Cthulhu Mythos == 0
- MP = floor(POW / 5)
- Luck was generated according to age rules
- Dodge starts from half DEX before additional skill points
- Move is consistent with STR / DEX / SIZ / age
- DB and Build match STR + SIZ
- occupation exists and is compatible with the era
- occupation points were calculated from the selected occupation formula
- Credit Rating is inside occupation range
- Cthulhu Mythos received no creation points unless Keeper explicitly allowed it
- personal interest points == INT × 2 before allocation
- no personal-interest points were spent on Cthulhu Mythos unless explicitly allowed
- skill half/fifth values have been recalculated after all allocations
- weapon stats exactly match the selected weapon definition
- firearm attacks do not receive Damage Bonus
```

The validator should return structured failures rather than silently correcting invalid input.

Example:

```text
ValidationError {
    code
    field
    message
    expected?
    actual?
    severity = error | warning
}
```

---

# 16. Investigator development / advancement

7th Edition does not primarily advance skills through a generic “level-up” system. Instead, skills improve through **experience checks**, training, and story-driven development.

## 16.1 Skill experience tick during play

Whenever an investigator successfully uses a skill, the player can normally mark that skill as checked for later improvement.

Important restrictions:

```text
if the success used a Bonus Die:
    do not award a skill check

if an opposed roll:
    only the winner receives the skill check

Credit Rating:
    never receives a normal skill check

Cthulhu Mythos:
    never receives a normal skill check
```

At most **one improvement attempt per skill per development phase** is performed, regardless of how many successful uses occurred during the period.

## 16.2 Investigator Development Phase

Typically performed at the end of a scenario or an appropriate campaign chapter.

Algorithm:

```text
function investigatorDevelopmentPhase(investigator):

    for skill in investigator.skills:
        if skill.checkedForDevelopment == false:
            continue

        if skill.name in [CreditRating, CthulhuMythos]:
            continue

        roll = D100

        if roll > skill.regular OR roll > 95:
            oldValue = skill.regular
            increase = roll(1D10)
            skill.regular += increase

            skill.hard = floor(skill.regular / 2)
            skill.extreme = floor(skill.regular / 5)

            if oldValue < 90 AND skill.regular >= 90:
                investigator.currentSAN += roll(2D6)
                investigator.currentSAN = min(
                    investigator.currentSAN,
                    investigator.maxSAN
                )
        else:
            // no improvement

        skill.checkedForDevelopment = false

    applyOtherDevelopmentPhaseOptions(investigator)
```

The core rule allows skills to rise **above 100% through experience**, so this is not the same as a creation-time cap.

## 16.3 Training / self-study

Training is a separate advancement route intended for campaign play.

Core rule pattern:

```text
trainingInterval ≈ 4 months
successfulCompletion -> improvement check
improvement amount = 1D10 skill points
```

The Keeper can adjust learning speed when there is an exceptional teacher or other strong in-fiction justification.

Self-study follows the same broad improvement-check pattern after the required study period.

## 16.4 Luck recovery

Luck can recover through the development/recovery rules:

```text
roll = D100
if roll > currentLuck:
    currentLuck = min(99, currentLuck + roll(1D10))
```

Do not reset Luck automatically to the original starting value.

## 16.5 Cthulhu Mythos development

Cthulhu Mythos is intentionally different from ordinary skills.

It is normally increased through exposure to Mythos knowledge, encounters, forbidden books, or related story events rather than ordinary skill ticks.

Whenever Mythos increases:

```text
maxSAN = 99 - CthulhuMythos
```

The consuming agent should therefore treat Cthulhu Mythos as a **special advancement channel**, not an ordinary skill-improvement target.

## 16.6 Credit Rating development

Credit Rating is also a special case.

It should not gain ordinary skill ticks. Changes are normally driven by employment, finances, status, scandal, campaign events, or Keeper adjudication.

When Credit Rating changes, recompute the era-specific:

```text
spendingLevel
cash
assets
livingStandard
```

as appropriate.

---

# 17. Campaign aging (optional)

Campaigns spanning long periods can apply aging rules when an investigator crosses a decade boundary.

This is different from creation-age handling: **in-play aging is cumulative**.

A reference implementation should model it as an event:

```text
ageInvestigatorTo(newAge)
```

and apply the age-transition rules for each crossed threshold (20, 40, 50, 60, 70, 80, etc.) instead of simply rebuilding the character from scratch.

The 7th Edition rules also distinguish ordinary aging from magical/sudden aging; the Keeper may apply physical aging effects without granting the normal educational benefit for unnatural aging.

---

# 18. Ruleset separation: standard vs Quick Fire

This distinction is important for the GM assistant.

## Standard full rules

```text
Characteristics = dice or point buy
Occupation skill points = occupation-specific formula
Personal interest points = INT × 2
Skills = base + allocated points
```

## Quick Fire

```text
Characteristics = 40,50,50,50,60,60,70,80
Occupation skills + Credit Rating = direct 70/60/60/50/50/50/40/40/40 allocation
Personal interest = four non-occupation skills +20 each
```

If the selected occupation's Credit Rating minimum is below 40%, set Credit Rating to the appropriate lower value and redistribute the freed difference among the other occupation allocations as allowed by the Quick Fire rules. Do not treat the Quick Fire direct values as additive to the printed skill base values.


These are **different generation algorithms**.

The agent should ask which method the Keeper wants when it is not already configured.

---

# 19. Recommended agent interaction policy

When character creation is requested, the agent should gather the minimum missing configuration rather than asking for every field at once.

### Required / materially important questions

1. **Era** — e.g. 1920s, modern day, Gaslight, etc.
2. **Creation method** — standard rolling, point buy, Quick Fire, or a configured house rule.
3. **Character concept / occupation** — enough information to select or build an occupation.

Optional later questions:

- desired name and personal identity details;
- preferred occupation if not already given;
- weapons/equipment preferences;
- backstory themes;
- whether the Keeper permits optional creation rules.

### Recommended defaults for an assistant

If no preference is supplied and the project configuration permits defaults:

```text
ruleset      = Call of Cthulhu 7e Standard
creationMode = Standard Rolling
era          = configured campaign era
```

Do not silently assume an era if doing so changes occupation availability, weapon availability, wealth, or equipment.

---

# 20. Canonical data sources the implementation should maintain

For reliable generation, keep the rules engine data-driven. At minimum maintain these catalogs:

```text
CharacteristicsRules
AgeRules
SkillCatalog
SkillSpecializationCatalog
OccupationCatalog
WeaponCatalog
EquipmentCatalog
WealthTablesByEra
BackstoryPromptCatalog
RulesetOptions
```

Each catalog should carry provenance:

```text
RuleDataEntry {
    id
    sourceBook
    edition
    pageReference?
    era?
    lastVerified
    data
}
```

This avoids mixing:

- standard 7e with Pulp Cthulhu;
- 1920s weapons with modern weapons;
- Quick Fire skills with full-rule occupation points;
- house rules with published rules.

---

# 21. Source notes

Primary / authoritative sources used for this implementation summary:

1. **Chaosium — Official Call of Cthulhu RPG Wiki, Investigator Characteristics**
   https://cthulhuwiki.chaosium.com/investigators/step-one-investigator-characteristics.html

2. **Chaosium — Official Call of Cthulhu RPG Wiki, Occupation and Skills**
   https://cthulhuwiki.chaosium.com/investigators/step-three-occupation-and-skills.html

3. **Chaosium — Official Call of Cthulhu RPG Wiki, Backstory**
   https://cthulhuwiki.chaosium.com/investigators/step-four-backstory.html

4. **Chaosium — Official Call of Cthulhu weapons reference**
   https://cthulhuwiki.chaosium.com/equipment/weapons.html

5. **Chaosium — Official 1920s standard investigator sheet (2025)**
   https://downloads.chaosium.com/call-of-cthulhu/cha2300-investigator-sheets/CoC7_Investigator_Sheet_Standard_autocalc.pdf

6. **Chaosium — Call of Cthulhu Keeper Rulebook, 7th Edition**
   https://www.chaosium.com/call-of-cthulhu-keeper-rulebook-hardcover/

The detailed formulas for standard character generation, age modifiers, derived attributes, occupation point formulas, finances, and investigator development are based on the 7th Edition Keeper Rulebook. The official Chaosium sheet and wiki are used to align the implementation model with the actual sheet fields and public reference material.

---

# 22. Implementation checklist

A first implementation should support, at minimum:

```text
[ ] standard characteristic rolling
[ ] point-buy characteristics
[ ] Quick Fire characteristics
[ ] age modifiers
[ ] EDU improvement checks
[ ] Regular / Hard / Extreme values
[ ] Idea / Know
[ ] HP / MP / SAN / Luck
[ ] Move / Build / Damage Bonus / Dodge
[ ] skill catalog + bases
[ ] skill specializations
[ ] occupation catalog + formulas + choices
[ ] occupation points allocation
[ ] Credit Rating range validation
[ ] personal interest point allocation
[ ] weapon catalog lookup
[ ] weapon skill resolution
[ ] combat-sheet fields
[ ] era-specific wealth calculation
[ ] gear / possessions
[ ] backstory / key connection
[ ] investigator conditions
[ ] experience ticks
[ ] investigator development phase
[ ] training / self-study support
[ ] Cthulhu Mythos advancement
[ ] Credit Rating changes
[ ] validation + structured errors
[ ] ruleset/era provenance for generated data
```

# Call of Cthulhu 7th Edition — NPC and Monster Creation Ruleset

**Purpose:** A rules-grounded specification for creating Keeper-controlled human NPCs and non-human creatures for *Call of Cthulhu* 7th Edition.

**Ruleset edition:** English-language 7th Edition, using the *Keeper Rulebook* and *Malleus Monstrorum: Cthulhu Mythos Bestiary, Volume I*. Page references below use the printed English pagination; translations or revised printings may differ.

**Important distinction:** This document paraphrases published rules and guidance. It is not a replacement for the books. It separates (1) core mechanics, (2) advice and optional creation methods from *Malleus Monstrorum*, and (3) practical builder categories introduced here to make the instructions usable in software or repeatable prep. The builder categories are **not** official game classes unless explicitly stated otherwise.

**Project use:** Which of these profiles and methods this project supports, and the value ranges and gaps it applies, are recorded in [project_ruleset.md section 5](project_ruleset.md#5-non-player-entity-profiles). Formulas shared with Investigators (characteristics, Hit Points, Magic Points, Damage Bonus and Build, human movement) are defined once in [coc7_character_creation_and_development_rules.md](coc7_character_creation_and_development_rules.md) and only referenced here. This document keeps the published wording "monster"; project artifacts use the term Mythos Creature from `CONTEXT.md`.

---

## 1. Source hierarchy and rule-grounding

Use these sources in this order when a question comes up:

1. **Core mechanics:** *Call of Cthulhu Keeper Rulebook*, 7th Edition. Use it for skill/characteristic rolls, derived statistics, combat, Sanity and the core monster catalogue. Relevant places include Chapter 3 (investigator generation and derived values), Chapter 5 (game system), Chapter 8 (Sanity), Chapter 10 (Playing the Game; NPC guidance, especially pp. 188–193), Chapter 14 (Monsters, Beasts, and Alien Gods, beginning at p. 276), and the conversion appendix.
   - Publisher page: https://www.chaosium.com/call-of-cthulhu-keeper-rulebook-pdf/
2. **Monster creation guidance:** *Malleus Monstrorum: Volume I — Monsters of the Mythos*. Chapter 1, **Using and Creating Monsters**, begins on p. 9; its *Creating Monsters* section is around pp. 17–23. This is the primary source for a repeatable approach to inventing creatures, for its two creation methods, and for advice about monster goals, attacks, armour, powers, spells and vulnerabilities.
   - Publisher page: https://www.chaosium.com/malleus-monstrorum-cthulhu-mythos-bestiary-pdf/
3. **Optional worksheet:** Chaosium's free *Monster Master Sheet* supplies fields for a monster's name, description, Sanity loss, characteristics, movement, hit points, attacks, powers, armour, skills, Magic Points and spells.
   - Official PDF: https://www.chaosium.com/content/FreePDFs/CoC/CHA23170%20-%20Malleus%20Monstrorum/Malleus%20Monstrorum%20-%20Monster%20Master%20Sheet.pdf
4. **Optional group worksheet:** Chaosium's *Minion Master Sheet* records four minions in one place. It is a worksheet/layout aid, not evidence of a universal minion class or a separate minion combat system.
   - Official PDF: https://www.chaosium.com/content/FreePDFs/CoC/CHA23170%20-%20Malleus%20Monstrorum/Malleus%20Monstrorum%20-%20Minion%20Master%20Sheet%20-%20Writeable.pdf

### 1.1 What the rules do and do not require

- The Keeper Rulebook says an NPC often needs statistics **only when opposing an Investigator**. A conversation or background appearance can be run without a numeric profile. (Keeper Rulebook, Chapter 10, NPC guidance, pp. 188–193.)
- A short-form NPC is explicitly supported: name, profession, and a few relevant characteristics or skills can be enough for a scene. If combat is expected, combat skills, weapons and hit points should be prepared or generated quickly. (Keeper Rulebook, p. 193.)
- The core book's published monster characteristics describe average specimens, and the Keeper can vary those values or create lesser/greater specimens. The Keeper may alter monster entries rather than treating them as immutable. (Keeper Rulebook, Chapter 14, around pp. 276–279.)
- *Malleus Monstrorum* describes both a **template-based quick method** and a **random-inspiration method** for creating monsters. Its random tables are optional prompts; the book does not require the Keeper to roll on all of them. (Volume I, Chapter 1, especially pp. 17–23.)
- The core game does **not** define a universal challenge-rating or point-buy budget for creatures. Monster strength is not required to be symmetrical with Investigator capability. Use the published guidance to understand threat, then fit the creature to the scenario and intended horror.
- *Malleus Monstrorum* discusses historical monster classifications for reference, but does not classify every entry in its main bestiary. Do not treat an old-style Mythos classification as a required game statistic. Its bestiary chapters separate Mythos monsters, folklore monsters and beasts; Volume II covers deities of the Mythos.

---

## 2. Creation types and when to use each one

The types below are **practical creation profiles** for a consistent workflow. They are not new mechanical categories. Select the lowest-detail profile that can handle the likely scene, and add statistics only where the game needs them.

### 2.1 Human NPC profiles

| Type | When to use it | Short description | Minimum information to create |
|---|---|---|---|
| **A. Narrative / background NPC** | The NPC provides atmosphere, a name, a service, a brief conversation or a clue, and no consequential opposed roll is expected. | A person represented primarily through roleplay. | Name or identifier; profession/role; one-sentence description; what they want or know; optional mannerism. No stats required unless play makes them necessary. |
| **B. Quick / pick-up NPC** | The Keeper needs someone improvised during play or a simple NPC for one scene. | A lightweight archetype; the published rules explicitly permit a name, profession and a few key characteristics/skills. | Name; profession; scene purpose; 1–3 relevant skills/characteristics. Add more if called for. |
| **C. Skill-opposition NPC** | An Investigator must sneak past, persuade, deceive, intimidate, outwit or otherwise oppose the NPC. | A limited numeric profile designed to set a 7e difficulty level. | Name/role; opposing skill or characteristic; relevant professional expertise; likely response to success/failure. Combat stats are not required unless combat may happen. |
| **D. Combat-ready human NPC** | A fight, armed confrontation, chase or other dangerous physical conflict is likely. | A profile with the statistics needed to run combat without pausing to invent key values. | Characteristics/derived values as needed; relevant Fighting or firearm skill; Dodge if used; weapons and damage; hit points; armour if any; movement; tactics/motivation. |
| **E. Key / recurring NPC** | The NPC is central to the scenario, may appear in multiple scenes, controls an important lead, or is a major ally, rival or antagonist. | A deeper narrative profile, with only the useful mechanics filled in. | Identity; goal; methods; what they know and conceal; relationship to Investigators; distinctive behaviour; likely scene interactions; relevant skills; combat profile if applicable. |
| **F. Human adversary group** | Several guards, cultists, thugs or other humans act together and individual detail would slow play. | A batch of similar combat or opposition NPCs. | Shared template and group purpose; count; important differences for named individuals; use the combat-ready fields for any combatant whose actions matter. This is a prep convenience, not a special rules subsystem. |

### 2.2 Creature profiles

| Type | When to use it | Short description | Creation guidance |
|---|---|---|---|
| **G. Mundane beast / animal** | A real animal is an obstacle, threat, clue or environmental presence. | A biological creature represented by the relevant characteristics, movement, attacks and skills. | Start from the Keeper Rulebook or the Beasts chapter in *Malleus Monstrorum*; adapt the published profile if needed. Include Sanity loss only where the scenario or rules call for it. |
| **H. Folklore creature** | The threat draws on folklore or a traditional supernatural creature rather than a newly invented Mythos entity. | A creature whose supernatural traits are expressed through its profile and special rules. | Use a published folklore entry as a template, then change only the values, powers and weaknesses needed. |
| **I. Mythos monster / species** | Investigators face an alien creature, servitor, predator, race or recurring class of Mythos being. | A profile built around physical/mental characteristics, attacks and potentially alien powers or immunities. | Use a *Malleus Monstrorum* entry as a template, or use its creation prompts/tables. Decide motivation and behaviour as well as statistics. |
| **J. Unique / deity-level entity** | The being is a major supernatural power, a campaign-scale presence or an entity whose existence may exceed ordinary physical combat. | A distinctive entity whose scenario role may be more important than its ordinary combat statistics. | Consult *Malleus Monstrorum Volume II* for deities, and Volume I / the Keeper Rulebook for general profile conventions. Define what damage can and cannot accomplish; do not assume that reaching zero hit points must mean ordinary death. Follow a published entry where one exists. |
| **K. Variant specimen** | A published species is encountered in an unusual form, or a scenario requires a weaker, stronger, altered or exceptional individual. | A variant made by editing an established profile. | Copy the closest stat block; alter selected characteristics, attacks or powers; state what changed and why. Published monster values are averages and can be varied. |
| **L. Minion / supporting-creature group** | Several minor creatures should be prepared together, especially where their individual stats are similar. | A practical grouping for scenario prep, with each creature still using normal creature rules. | Use the official Minion Master Sheet if helpful. Record separate values when creatures differ; do not infer a separate official minion action economy from the sheet. |

---

## 3. Shared 7th-edition mechanics for human NPCs and monsters

### 3.1 Characteristics and levels of detail

The main characteristics commonly used for humans and many creatures are STR, CON, SIZ, DEX, INT and POW. Humans may also have APP and EDU; monster entries can omit APP or EDU when they do not meaningfully describe the entity. These values are used to resolve actions and derive statistics.

Do not generate a complete Investigator-like sheet by default. Generate only the values needed for the intended scene. If a fully detailed human NPC is genuinely useful, the Keeper can use the normal Investigator characteristic-generation process ([standard rolling method](coc7_character_creation_and_development_rules.md#21-standard-rolling-method), with the age rules if the full procedure is used) as a compatible starting point; this is an implementation option, not a requirement imposed on all NPCs.

Do not apply human movement-by-age rules to non-human creatures.

### 3.2 Derived values

When a profile needs the normal derived statistics, calculate them with the same core 7e rules used for Investigators:

- Hit Points: [section 5.4](coc7_character_creation_and_development_rules.md#54-hit-points).
- Magic Points: [section 5.3](coc7_character_creation_and_development_rules.md#53-magic-points).
- Damage Bonus and Build: [section 5.8](coc7_character_creation_and_development_rules.md#58-damage-bonus-and-build), whose table lives in [catalogs/characteristics-rules.json](catalogs/characteristics-rules.json), including the progression above 524 that large creatures reach.

Damage Bonus applies to hand-to-hand damage, including natural attacks and melee weapons where relevant; it does not apply to firearm damage ([section 10.3](coc7_character_creation_and_development_rules.md#103-damage-bonus-interaction)). Build helps represent scale and matters for suitable manoeuvres and other interactions.

### 3.3 Human movement

A human uses the core Investigator movement formula, including its age penalty: [section 5.7](coc7_character_creation_and_development_rules.md#57-movement-rate).

This formula is for humans; the Keeper Rulebook expressly says not to apply it to non-humans. Give a monster a movement rate appropriate to its body and movement modes instead (e.g. walking, swimming, flying, tunnelling, or no ordinary movement).

### 3.4 Skill difficulty for an Investigator opposing an NPC or monster

The Keeper Rulebook recommends using an NPC's relevant opposing skill/characteristic to choose the Investigator's difficulty. For NPCs, use professional context to decide what is a key skill: a skill or characteristic directly related to the NPC's profession should be rated at **50% or higher**, meaning an Investigator normally needs a Hard success to overcome it. The usual thresholds are:

| Opposing skill / characteristic | Investigator difficulty | Target |
|---|---|---|
| Below 50% | Regular | Full value |
| 50–89% | Hard | Half value |
| 90% or higher | Extreme | One-fifth value |

This is a difficulty-setting shortcut for the Keeper, not an instruction to fully stat every NPC. Use a relevant opposing value; do not create unrelated numbers just to make the sheet look complete.

---

## 4. Human NPC creation procedure

### 4.1 Information to decide first

For every NPC, define the following narrative elements before deciding how much mechanics to prepare:

1. **Role in the scenario:** Why does this person exist in the scene or campaign?
2. **Immediate goal:** What do they want now? The Keeper Rulebook's NPC advice emphasizes that NPCs have wants, problems and requests of their own.
3. **Relationship to the Investigators:** stranger, contact, ally, obstacle, witness, suspect, rival, antagonist, etc.
4. **Information:** what they know, what they believe, what they hide, and what might make them reveal it.
5. **Likely interactions:** conversation, persuasion, deception, stealth opposition, investigation, chase, combat or some combination.
6. **Preparation profile:** choose one of Types A–F in Section 2.1.

These are preparation prompts rather than numeric game stats. Use them to make the NPC playable and scenario-relevant.

### 4.2 NPC pseudocode

```text
function createNPC(input):
    npc.name        = input.name or generateName()
    npc.profession  = input.professionOrRole
    npc.description = input.shortDescription
    npc.goal        = input.immediateGoal
    npc.relationships = input.relationships
    npc.knowledge   = input.knownInformation
    npc.secrets     = input.secrets
    npc.behavior    = input.behaviorCue

    interactions = inferLikelyInteractions(input.scenarioRole)
    profileType = chooseLowestSufficientNPCProfile(interactions)

    if profileType == NARRATIVE_BACKGROUND:
        npc.numericStats = none
        return npc

    if profileType in [QUICK_PICKUP, SKILL_OPPOSITION, KEY_RECURRING]:
        for each likely opposition in interactions:
            skillOrCharacteristic = chooseRelevantOpposingValue(opposition)

            if skillOrCharacteristic is directly related to npc.profession:
                choose value >= 50
            else:
                choose a case-appropriate value; do not invent a full skill list

            if value >= 90:
                expectedInvestigatorDifficulty = EXTREME
            else if value >= 50:
                expectedInvestigatorDifficulty = HARD
            else:
                expectedInvestigatorDifficulty = REGULAR

            record(skillOrCharacteristic, value, expectedInvestigatorDifficulty)

    if combat is plausible or required by the planned scene:
        prepare relevant human characteristics / derived statistics
        prepare Fighting or appropriate firearm skill
        prepare Dodge if it is likely to be used
        record weapon, damage, ammunition/other relevant gear
        calculate HP (section 3.2)
        calculate DamageBonus and Build (section 3.2)
        calculate human MOV (section 3.3) if movement is needed
        record armour, tactics, morale/self-preservation and likely objectives

    if profileType == KEY_RECURRING:
        ensure the profile records how the NPC's goal, knowledge and relationships can affect later scenes

    return npc
```

### 4.3 NPC implementation rules

- **Do not use PC creation as a mandatory template.** The published rules support abbreviated NPCs. Use full characteristic generation only when it helps.
- **Do not roll for an NPC when the rules do not require it.** Often the Keeper's task is to establish the Investigator's difficulty, not to play out a separate NPC roll.
- **Choose opposition values for the actual conflict.** A librarian may need Library Use or relevant knowledge; a guard watching a door may need Spot Hidden; a combatant needs values for the actions that can occur in the encounter.
- **Prepare combat before combat begins when practical.** The core rulebook specifically advises deciding combat skills, weapons and hit points in advance or generating them quickly in play.
- **Use goals to guide reactions.** A witness who fears exposure, a cultist guarding a ritual, and a hired guard paid to protect a door should not respond identically to intimidation, bribery, danger or a failed roll.
- **For groups, reuse a shared profile only where appropriate.** Named or exceptional members can have separate values. The group-profile convention here is a preparation shortcut, not a special 7e group mechanic.

---

## 5. Monster creation procedure

### 5.1 Step 1 — Define the creature's concept

Before assigning numbers, answer the most relevant of these questions. They follow the design prompts in *Malleus Monstrorum*, Chapter 1:

- Is it related to an existing Mythos monster or species, or is it a wholly new being?
- Was it created by magic, science, a deity, or something unknown?
- What does it want? For example, to feed, escape, acquire an artifact, obtain information, reproduce, serve a power, build something, or change human society.
- Is it bestial, human-level intelligent, superhumanly intelligent, or impossible to understand?
- What does it look and sound like? Is it visible, disguised, shapeshifting, partly familiar, or completely alien?
- How large is it relative to a human? Remember that SIZ represents mass and scale as well as apparent size.
- Where does it come from: Earth, space, another dimension, or somewhere else?
- What can it do that ordinary humans or animals cannot?
- Are there powers, fuel requirements, magic-point costs, conditions, limitations or weaknesses?
- How does it usually act when it meets the Investigators: attack, flee, ignore them, investigate them, manipulate them, or pursue another goal?

Not every question requires an elaborate answer. Use whatever is necessary to make the creature coherent and useful in the scenario.

### 5.2 Step 2 — Choose a creation method

*Malleus Monstrorum* provides two main methods; either is valid.

#### Method A: Template-based / quick creation

Use when the Keeper already knows the intended role and wants a usable stat block quickly.

1. Search the Keeper Rulebook or *Malleus Monstrorum* for the closest published creature by size, anatomy, threat, movement and/or powers.
2. Copy the relevant statistics as a starting point.
3. Keep the fields that fit the new concept; alter only those that need to differ.
4. Decide the creature's unique goal, appearance, attack descriptions, powers, spells, armour and weaknesses.
5. Give the creature a distinct description and behaviour; merely changing a name without giving it a distinct role is not the goal of the method.

This is the fastest route explicitly recommended by *Malleus Monstrorum*.

#### Method B: Random-inspiration creation

Use when the concept is not yet developed or the Keeper wants unexpected ideas. Start with the characteristics, then consult any of the book's trait tables that are useful. The *Malleus Monstrorum* tables cover:

- scale;
- speed;
- intelligence;
- power and spellcasting;
- attacks;
- armour and immunities;
- healing;
- special abilities;
- goals.

The book says these tables can be used selectively, or ignored when unnecessary. The results are **creative inspiration**, not a mandatory character-generation procedure or a formal point-buy system. Choose a fixed result for a particular creature once the profile is finalized; do not randomly re-roll its defining attributes each time it appears unless you intentionally want different specimens.

### 5.3 Step 3 — Assign characteristics and movement

Common profile characteristics are STR, CON, SIZ, DEX, INT and POW. Include APP or EDU only if those concepts make sense for the entity. Published monster entries often give averages and/or characteristic dice ranges. The Keeper can use a listed average, roll a particular specimen within the guide range, or deliberately choose a lesser/greater individual.

Guidance:

- Use STR for physical force, CON for endurance, SIZ for overall scale/mass, DEX for speed/reaction, INT for reasoning/awareness, and POW for will and the supernatural abilities it supports.
- Use the human scale as a comparison only. *Malleus Monstrorum* uses an average human SIZ of about 65 as a point of reference and gives larger-size comparisons; the relation between SIZ and apparent height is not one-to-one.
- Keep full characteristic values in the monster profile. The Keeper Rulebook says monster/NPC values are mainly used to set Investigator roll difficulty; half and fifth values are not normally preprinted for creatures.
- Assign movement appropriate to the creature's locomotion. Use separate movement rates where the creature's entry makes them relevant (such as land/water/flight); some entities may be stationary or have movement that cannot be represented in ordinary terms.
- Do not apply the human MOV-by-STR/DEX/SIZ-and-age formula to non-human creatures.

### 5.4 Step 4 — Calculate derived statistics

For an ordinary creature profile, derive Hit Points, Magic Points, and Damage Bonus and Build where relevant, using the rules referenced in section 3.2. MOV is creature-specific (section 5.3); do not apply the human formula or its age modifiers to non-humans.

Some exceptional entries may define how their hit points, movement, damage or existence works differently. Follow the published creature rules or state a clear exception for a custom entity. Do not add ordinary derived statistics that have no use for the creature.

### 5.5 Step 5 — Design attacks and combat behavior

Each monster that might fight needs clear instructions for how its attacks work. For each attack, record:

- attack name/type (bite, claw, tentacle, weapon, crush, grab, etc.);
- skill chance used to resolve it;
- damage and whether Damage Bonus applies;
- whether the attack grapples, restrains, drains, poisons, carries, crushes, changes the target, or triggers another effect;
- any conditions for escape, resistance, or subsequent damage;
- attacks per round, if more than one;
- whether the attack is a manoeuvre/special action rather than an ordinary damaging strike.

*Malleus Monstrorum* treats **Fighting** as the generic monster combat skill by default, covering natural attacks such as claws, teeth and tentacles, except where a particular creature has an exception or a specific skill is listed. Use the published entry's attack instructions where available.

**Optional attack-count heuristic from Malleus Monstrorum:** its advice suggests about one attack per round for creatures with SIZ up to 100, two for SIZ over 100 through 200, three for SIZ over 200 through 400, and more for larger creatures; very low DEX (below 50) suggests reducing this by one, with a minimum of one attack. This is a **guideline**, not a hard core rule. A different number is appropriate when the creature's concept or published entry calls for it.

When judging lethality, consider the whole Investigator group, not only a single Investigator. *Malleus Monstrorum* discusses the trade-off between more lower-damage attacks and fewer high-damage attacks. Treat it as threat-design guidance: avoid assuming every creature must be a fair fight, but ensure that the scenario gives appropriate warning, alternatives or consequences where the fiction calls for them.

Monster behaviour should be consistent with its goals. If it wants to kill, it may attack; if it seeks escape, preservation or passage to another task, it may dodge or disengage. Some intelligent Mythos entities may regard the Investigators as insignificant rather than automatically trying to kill everyone. The monster's motivation should drive its action selection.

### 5.6 Step 6 — Set armour, immunities and vulnerabilities

Record armour points and the types of harm the creature resists or ignores. Use the 7e damage rules for armour: armour reduces incoming damage as specified by the rules/profile. A custom profile must state special immunities clearly enough that a Keeper can tell whether a weapon or effect works.

*Malleus Monstrorum* offers the following **design guidance**, not mandatory target values:

- Armour in the region of 3–6 points is presented as a moderate-to-tough defence in many encounters.
- Values around 8–10 points can make ordinary harm difficult and may require exceptional results or a different approach.
- Immunity is a strong story choice. Use it to express the creature's otherworldliness or force the Investigators to research and solve a problem, not as a routine feature of every monster.
- Give a monster vulnerabilities when they make sense for its story. *Malleus Monstrorum* suggests keeping the number limited (usually one or two at most) rather than creating a long checklist of exploitable weaknesses.

For every immunity or vulnerability, write its scope and trigger. Examples of helpful precision are “ordinary bullets inflict no damage,” “fire causes normal damage,” or “the creature is disrupted only while a named ritual condition is met.” Those examples are illustrative custom wording, not universal rules from the books.

### 5.7 Step 7 — Add spells and special powers

Spells and powers are optional. Do not give every creature magic just because it is supernatural.

**Core Keeper Rulebook guidance:** a monster's chance of knowing spells tends to increase with POW and INT. As a guide, a creature with POW and INT in the 50–100 range might know 1D6 spells. Choose spells based on the creature's nature and purpose. The core rulebook permits adjusting spell effects to suit a particular Mythos creature. When a monster casts a spell, no casting roll is required for its initial casting; pay the spell's Magic Point cost, but ignore Sanity costs and Sanity rolls for the monster. (Keeper Rulebook, Chapter 14, Monster Spells.)

**Malleus Monstrorum guidance:** intelligent monsters may commonly have around 1D4–1D6 spells, not all combat spells; the text suggests assuming only a few are combat-focused. It also discusses designing one to three distinctive powers for a creature, with powers affecting other beings often limited by a Magic Point cost. Some transformations can be at will or take time rather than a cost. Treat these quantities as guidelines rather than mandatory quotas.

For each spell/power, record:

- name and effect;
- range, target, duration and triggering condition where relevant;
- Magic Point cost or other fuel/cost, if any;
- whether it is a normal spell using the core spell rules or a unique monster power;
- how an Investigator can resist, avoid, interrupt or counter it, if applicable;
- whether the ability has a use limit, recovery condition or other restriction.

Keep **spells** separate from **powers/special abilities** in the data model. *Malleus Monstrorum* explicitly distinguishes a creature power from casting a spell even when the power has a spell-like effect.

### 5.8 Step 8 — Record Sanity loss

If seeing, encountering or interacting with the creature calls for a Sanity roll, record the Sanity loss in the normal 7e notation:

```text
SAN loss = loss on a successful roll / loss on a failed roll
Example: 0/1D6 means lose 0 SAN on a success, or roll 1D6 SAN loss on a failure.
```

Use the creature's published entry where one exists. For a custom creature, assign loss appropriate to the experience described and the creature's intended psychological impact; the rules do not supply a formula that derives Sanity loss from STR, SIZ, armour or damage. The Keeper Rulebook treats Sanity loss as dependent on the entity or situation and uses the same encounter-level loss for seeing multiple creatures of the same kind, rather than automatically multiplying the loss by creature count.

### 5.9 Step 9 — Define what “defeating” the creature means

Do not assume every Mythos creature must die in the same way as a human. Some creatures may flee, vanish, appear dead, recover, be dispelled or return later, depending on the creature's nature and the scenario. *Malleus Monstrorum* and the core bestiary both discuss cases where ordinary physical damage may not equate to permanent destruction. For each custom unique entity, define the result of reaching zero HP or otherwise losing a conflict: death, unconsciousness, retreat, banishment, temporary disruption, or another explicitly described result.

This is not a blanket rule that every supernatural entity survives zero HP. Use a special outcome only when the creature's concept or published entry warrants it.

### 5.10 Monster profile checklist

Use this as the final record. Fields marked “if relevant” may be omitted.

```text
IDENTITY
  name
  aliases/species (if relevant)
  short description / sensory cues
  origin and scenario role
  goal and typical behaviour

CHARACTERISTICS
  STR, CON, SIZ, DEX, INT, POW (as relevant)
  APP, EDU (only if meaningful)
  MOV by mode (as relevant)
  HP
  Magic Points (if relevant)
  Damage Bonus
  Build

COMBAT
  attacks per round
  attack name | skill | damage | special effect
  armour points
  immunities and resistance conditions
  vulnerabilities
  defensive actions / Dodge (if relevant)

ABILITIES
  skills
  spells (with costs)
  unique powers (with costs/limits)
  healing / regeneration
  other special rules

HORROR / SCENARIO
  Sanity loss (success/failure notation)
  motivation and decision cues
  signs/traces left behind
  what happens at zero HP / when defeated
  optional variants and specimen ranges
```

This checklist combines the fields used by monster profiles and Chaosium's official Monster Master Sheet with narrative fields needed to use the creature in play. It is a useful data schema, not a claim that every official monster must contain every field.

### 5.11 Monster creation pseudocode

```text
function createMonster(input):
    monster.name = input.name or generateName()
    monster.creatureType = input.type  // beast, folklore, Mythos, deity/unique, variant
    monster.description = input.description
    monster.origin = input.origin
    monster.goal = input.goal
    monster.behavior = input.behavior
    monster.sensoryCues = input.appearanceAndSigns

    if input.creationMethod == TEMPLATE:
        base = findClosestPublishedCreature(
            bySize = input.targetScale,
            byBody = input.anatomy,
            byThreat = input.intendedThreat,
            byPowers = input.desiredPowers
        )
        copyRelevantFields(base, monster)
        alterOnlyFieldsNeededForNewConcept(monster)

    else if input.creationMethod == RANDOM_INSPIRATION:
        use optional Malleus tables for any of:
            scale, speed, intelligence, power/spellcasting,
            attacks, armour/immunities, healing, special abilities, goals
        treat results as prompts, not mandatory rules
        choose and finalize fixed creature values

    else:  // concept-first custom creation
        define the role, body, size, intelligence, goals and powers
        use published profiles as numerical comparisons where helpful

    choose characteristics relevant to creature:
        STR, CON, SIZ, DEX, INT, POW
        include APP/EDU only if meaningful

    if any needed characteristic is unspecified:
        choose a fixed value or use a relevant published dice range

    monster.HP = hitPoints(CON, SIZ) if ordinary HP rules apply  // section 3.2
    monster.MagicPoints = magicPoints(POW) if used               // section 3.2
    monster.DamageBonus, monster.Build = damageBonusAndBuild(STR + SIZ)  // section 3.2
    monster.MOV = defineForCreatureAndMovementModes()

    define motivation-led behaviour and combat objective
    define attacks:
        attack skill, damage, special effect, attacks per round
        use Malleus attack-count advice only as a heuristic
    define armour, immunities and vulnerabilities
    define skills needed for likely rolls
    define optional spells and powers with costs/limits
    define Sanity loss if the encounter warrants a Sanity roll
    define defeat/zero-HP outcome if not ordinary death

    review each special rule for clarity and consistent triggers
    remove unused fields; do not add abilities without a scenario purpose
    return monster
```

---

## 6. Type-specific creation pseudocode

These short routines can be used as an implementation dispatch layer. They select a preparation path but do not change the underlying 7e rules.

```text
function buildCharacter(input):
    if input.kind == "human_npc":
        if input.sceneImpact == "background":
            return createNPC(profile = NARRATIVE_BACKGROUND)
        if input.expectedConflict == "social_or_skill_opposition":
            return createNPC(profile = SKILL_OPPOSITION)
        if input.expectedConflict in ["combat", "chase", "physical_danger"]:
            return createNPC(profile = COMBAT_READY)
        if input.recursAcrossScenario:
            return createNPC(profile = KEY_RECURRING)
        return createNPC(profile = QUICK_PICKUP)

    if input.kind == "mundane_beast":
        return createMonster(type = BEAST, method = TEMPLATE_OR_CUSTOM)

    if input.kind == "folklore_creature":
        return createMonster(type = FOLKLORE, method = TEMPLATE_OR_CUSTOM)

    if input.kind == "mythos_monster":
        return createMonster(type = MYTHOS, method = TEMPLATE_OR_RANDOM_INSPIRATION)

    if input.kind == "deity_or_unique_entity":
        return createMonster(type = UNIQUE_ENTITY, method = TEMPLATE_OR_CUSTOM,
                            requireDefeatOutcome = true)

    if input.kind == "variant":
        return createMonster(type = VARIANT, method = TEMPLATE,
                            baseCreature = input.baseCreature)

    if input.kind == "supporting_creature_group":
        return createGroupFromSharedCreatureTemplate(input.members)

    raise ValidationError("Unknown character kind")
```

---

## 7. Final validation rules

Before marking a profile ready, check the following.

### NPC validation

- [ ] Does the NPC have a purpose, immediate goal or useful scene role?
- [ ] Are statistics limited to those the scenario may actually use?
- [ ] For opposed actions, is the relevant skill/characteristic identifiable and is the resulting Regular/Hard/Extreme difficulty clear?
- [ ] If combat is expected, are combat skills, weapons/damage and HP ready?
- [ ] Can the Keeper infer how the NPC responds to pressure from the NPC's goals and personality?

### Monster validation

- [ ] Is the monster based on a published template or a clear concept?
- [ ] Are relevant characteristics and derived values present and consistent with 7e formulas?
- [ ] Is movement appropriate for a non-human, rather than mechanically copied from the human movement formula?
- [ ] Does each attack have a skill, damage and clearly worded effects?
- [ ] Are attacks per round a deliberate choice? If the optional size heuristic was used, is it treated as guidance rather than an absolute rule?
- [ ] Are armour, immunities and vulnerabilities explicit and purposeful?
- [ ] Are each spell and special power distinguishable, with costs or limits stated where appropriate?
- [ ] Is Sanity loss in the normal success/failure format when relevant?
- [ ] Is the creature's motivation clear enough to determine whether it attacks, retreats, manipulates, investigates or ignores the Investigators?
- [ ] Is the consequence of defeating the creature clear, including any special exception to normal death?
- [ ] Have unnecessary fields or arbitrary abilities been removed?

---

## 8. Rules that must not be invented by a builder

To keep generated content faithful to 7th Edition:

1. **Do not require every NPC to have a complete stat block.** The core rulebook supports quick, incomplete NPCs.
2. **Do not claim that template copying or random monster tables are mandatory.** *Malleus Monstrorum* explicitly presents these as alternative methods and the tables as optional prompts.
3. **Do not introduce a point-buy system, level, challenge rating or encounter budget** and label it as official CoC 7e. The cited core rules and bestiary guidance do not establish a universal such system.
4. **Do not give every Mythos creature the same number of attacks, powers or spells.** The published guidance provides tendencies and heuristics, not universal quotas.
5. **Do not derive Sanity loss from combat statistics.** Use a published value or choose one based on the horror of the encounter.
6. **Do not assume every monster is killed at zero HP.** Use an exception only where the creature's nature, published entry or scenario specifies one.
7. **Do not treat a Monster/Minion Master Sheet as a new mechanic.** The sheets organize information; their fields do not by themselves create new resolution rules.
8. **Do not treat old Mythos taxonomies as a required stat.** Use creature categories to organize a library if useful, but they are not compulsory rules fields.

---

## 9. References

### Primary rules sources

- Chaosium, *Call of Cthulhu Keeper Rulebook*, 7th Edition (2016), ISBN 978-1-56882-430-7. See Chapter 3 for characteristics/derived statistics; Chapter 5 for the core roll system; Chapter 8 for Sanity; Chapter 10, NPC guidance (especially pp. 188–193); Chapter 14, *Monsters, Beasts, and Alien Gods* (beginning p. 276).
  - Official publisher page: https://www.chaosium.com/call-of-cthulhu-keeper-rulebook-pdf/
- Chaosium, *Malleus Monstrorum: Cthulhu Mythos Bestiary, Volume I — Monsters of the Mythos* (2020). See Chapter 1, *Using and Creating Monsters*, especially the creation guidance around pp. 17–23; the profile convention is described later in the chapter. Its main bestiary contains Mythos monsters, folklore creatures and beasts.
  - Official publisher page: https://www.chaosium.com/malleus-monstrorum-cthulhu-mythos-bestiary-pdf/
- Chaosium, *Malleus Monstrorum: Cthulhu Mythos Bestiary, Volume II — Deities of the Mythos* (2020). Use as the dedicated reference for major Mythos deities and entities.
  - Start from the publisher's Malleus Monstrorum product page above.

### Official worksheets

- *Malleus Monstrorum — Monster Master Sheet*: https://www.chaosium.com/content/FreePDFs/CoC/CHA23170%20-%20Malleus%20Monstrorum/Malleus%20Monstrorum%20-%20Monster%20Master%20Sheet.pdf
- *Malleus Monstrorum — Minion Master Sheet*: https://www.chaosium.com/content/FreePDFs/CoC/CHA23170%20-%20Malleus%20Monstrorum/Malleus%20Monstrorum%20-%20Minion%20Master%20Sheet%20-%20Writeable.pdf

**Source-use note:** The publisher's product pages establish the identity and edition of the books and worksheets. The actual rules instructions in this document are grounded in the referenced chapters and page ranges. Where this document labels guidance as a heuristic, implementation recommendation or builder category, it is intentionally distinguishing that guidance from a mandatory 7e mechanic.

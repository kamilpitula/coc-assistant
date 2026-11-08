# Call of Cthulhu 7th Edition - Skill Rolls During Play

## Purpose

This document is an implementation-oriented summary of the **standard Call of
Cthulhu 7th Edition** rules for rolling skills, characteristics, and Luck
during play. Like the other documents in this folder it uses pseudocode
instead of reproducing the rulebook.

### Scope

- Ruleset: Call of Cthulhu 7th Edition, standard rules, not Pulp Cthulhu.
- Source: *Call of Cthulhu Keeper Rulebook*, 7th Edition (2016), Chapter 5
  (Game System). Page references are still to be added during verification
  against the book.
- Covered: the percentile roll, target values, Difficulty, Success Levels,
  Critical and Fumble, Bonus and Penalty Dice, Pushing a roll, and Luck rolls.
- Not covered: see [section 8](#8-not-covered).

**Verification status:** verified by the project owner against the Keeper
Rulebook, Chapter 5, on 2026-11-08; page references still to be added.

---

# 1. Percentile roll

A skill, characteristic, or Luck roll is one percentile roll (`1D100`) made
with one tens die and one units die.

```text
tensFace  in {00, 10, 20, ..., 90}
unitsFace in {0, 1, ..., 9}

result = tensFace + unitsFace
if result == 0:
    result = 100            // "00" and "0" read as 100

// result is always 1..100
```

A lower result is better.

---

# 2. Target values

The roll is made against a **target value**: the Investigator's skill value,
characteristic value, or Luck.

Every target value has three levels, computed as for characteristics in
[character rules section 4](coc7_character_creation_and_development_rules.md#4-characteristic-derived-values):

```text
regularTarget = value
hardTarget    = floor(value / 2)
extremeTarget = floor(value / 5)
```

---

# 3. Difficulty

The Keeper sets the **Difficulty** of a roll before it is made:

| Difficulty | The roll succeeds when the result is at or below |
|---|---|
| Regular | `regularTarget` |
| Hard | `hardTarget` |
| Extreme | `extremeTarget` |

Regular is the default. When an Investigator acts against a Non-Player Entity,
the Difficulty follows from the entity's Opposing Value per
[NPC ruleset section 3.4](coc_7e_npc_and_monster_creation_ruleset.md#34-skill-difficulty-for-an-investigator-opposing-an-npc-or-monster).

```text
requiredTarget(difficulty) =
    regularTarget  if difficulty == Regular
    hardTarget     if difficulty == Hard
    extremeTarget  if difficulty == Extreme
```

---

# 4. Success Levels

## 4.1 Levels

A roll has exactly one **Success Level**, from worst to best:

```text
Fumble < Failure < Regular < Hard < Extreme < Critical
```

## 4.2 Critical and Fumble

```text
Critical: result == 1

Fumble:
    if requiredTarget(difficulty) < 50:
        result >= 96
    else:
        result == 100
```

The Fumble range depends on the target needed at the roll's Difficulty, not
on the full value.

## 4.3 Resolving a roll

```text
function successLevel(result, value, difficulty):
    if result == 1:
        return Critical
    if isFumble(result, requiredTarget(difficulty)):
        return Fumble
    if result <= floor(value / 5):
        return Extreme
    if result <= floor(value / 2):
        return Hard
    if result <= value:
        return Regular
    return Failure

function isSuccess(level, difficulty):
    return level != Fumble
       and level >= levelFor(difficulty)   // Regular, Hard, or Extreme
       // Critical always meets every Difficulty
```

A result that reaches a lower level than the Difficulty asks for is a failed
roll, although its Success Level still names the level reached.

---

# 5. Bonus and Penalty Dice

The Keeper may give a roll **Bonus Dice** (favourable circumstances) or
**Penalty Dice** (unfavourable circumstances). Difficulty reflects the
opposition; Bonus and Penalty Dice reflect circumstances.

```text
net = bonusDice - penaltyDice      // one Bonus Die cancels one Penalty Die
limit: -2 <= net <= 2              // at most two Bonus or two Penalty Dice apply

roll one units die
roll 1 + abs(net) tens dice

candidates = [ readResult(tens, unitsFace) for tens in tensFaces ]
            // readResult applies the "00" and "0" = 100 rule of section 1

result =
    min(candidates)   if net > 0
    max(candidates)   if net < 0
    the only candidate if net == 0
```

All tens dice share the one units die. The kept result is then resolved as in
[section 4.3](#43-resolving-a-roll).

A success that used a Bonus Die earns no experience check
([character rules section 16.1](coc7_character_creation_and_development_rules.md#161-skill-experience-tick-during-play)).

---

# 6. Pushing a roll

After a failed roll, the Player may **push** it: they justify a new attempt
(more time, a different approach, greater effort), and the Keeper agrees or
refuses.

```text
canPush(roll) =
    roll is not a success
    and roll has not been pushed
    and roll is a skill roll or a characteristic roll
    and roll is not a Luck roll
    and roll is not a Sanity roll
    and roll is not a combat roll

pushed roll:
    same target value and Difficulty
    the Keeper sets the Bonus and Penalty Dice for the new circumstances
    a pushed roll cannot be pushed again
```

When a pushed roll fails, the Keeper applies a serious consequence. Its
content is narrative and is decided by the Keeper; this document does not
define it.

---

# 7. Luck rolls

A Luck roll is a percentile roll against the Investigator's current Luck,
resolved as in [section 4.3](#43-resolving-a-roll). It cannot be pushed
([section 6](#6-pushing-a-roll)). In this project it is always Regular with no
Bonus or Penalty Dice
([project_ruleset.md section 4.8](project_ruleset.md#48-luck-rolls)). Spending Luck to change a result is an
optional rule; see [project_ruleset.md section 3](project_ruleset.md#3-optional-rules).

---

# 8. Not covered

These rules from the Keeper Rulebook, Chapter 5 and Chapter 8 are not yet
documented. Add them here before specifying behavior that depends on them:

- Opposed rolls (comparing two Success Levels).
- Combined rolls (one result checked against two skills).
- Spending Luck (an optional rule).
- Sanity rolls and Sanity loss during play.
- Combat rolls and combat resolution.

---

# 9. Rules gaps

The rules leave these cases open. The project decisions are recorded in
[project_ruleset.md](project_ruleset.md):

- **A target value of 0** (for example Cthulhu Mythos at creation). Every
  target level is 0, so only a Critical (01) could succeed. Decided in
  [project_ruleset.md section 4.7](project_ruleset.md#47-rolls-against-a-target-value-of-0).
- **Difficulty and dice limits on Luck rolls.** Whether the Keeper may set a
  Hard or Extreme Difficulty, or Bonus and Penalty Dice, on a Luck roll.
  Decided in [project_ruleset.md section 4.8](project_ruleset.md#48-luck-rolls).

---

# 10. Sources

- Chaosium, *Call of Cthulhu Keeper Rulebook*, 7th Edition (2016),
  ISBN 978-1-56882-430-7, Chapter 5 (Game System): the skill roll, Difficulty
  levels, levels of success, Critical and Fumble, Bonus and Penalty Dice, and
  pushing rolls. Page references to be added during verification.

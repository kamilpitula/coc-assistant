# Feature: Dice

## Blueprint

### Context
Every dice result in the app is produced by the server, so no Player or Keeper can influence a result and the Keeper can trust every Roll Record. Character creation, Roll Requests during Scene Play, and later Combat and the development phase all need dice. This feature is the one shared place that rolls dice and turns a percentile roll into a Success Level, so each consumer adds its own purposes and storage instead of its own dice engine. It replaces Player-entered dice results ([project_ruleset.md section 4.3](../../docs/game-rules/project_ruleset.md#43-dice-results-at-creation), to be rewritten as "the app rolls, server-side, on the roller's action").

### Architecture
- **Module:** `backend/src/GameRules/CocAssistant.GameRules.Domain/Dice/`, next to the existing `DiceExpression` and `DiceNotation` ([project_ruleset.md section 5.5](../../docs/game-rules/project_ruleset.md#55-dice-notation)). It has no knowledge of Campaigns, Accounts, Investigators, or Scenes.
- **Components:**
  - `IDiceRoller` - rolls one die with a given number of sides. The production implementation, `SecureDiceRoller`, uses `System.Security.Cryptography.RandomNumberGenerator`. Tests inject a scripted roller that returns queued faces. It is registered once in the API composition root.
  - Dice expression rolling - rolls a `DiceExpression` with an `IDiceRoller` and returns a `DiceRoll`: `{dice, faces, total}`, where `faces` lists every die face in roll order.
  - Percentile roll resolver - a pure function. Input: `{targetValue, difficulty, bonusDice, penaltyDice, unitsFace, tensFaces}`. Output: `PercentileRoll {targetValue, regularTarget, hardTarget, extremeTarget, difficulty, bonusDice, penaltyDice, unitsFace, tensFaces, keptTens, result, successLevel, isSuccess}`. The roller only produces faces; every rule decision is in the resolver. Rules: the skill rolls document (`docs/game-rules/coc7_skill_rolls_rules.md`, to be added by the rules PBI): percentile roll, Difficulty, Success Levels, Critical and Fumble, Bonus and Penalty Dice.
  - `Difficulty`: `Regular`, `Hard`, `Extreme`.
  - `SuccessLevel`: `Fumble`, `Failure`, `Regular`, `Hard`, `Extreme`, `Critical`. `isSuccess` is true when the Success Level meets the Difficulty, as the skill rolls document defines.
- **Roll Record:** every consumer stores its dice results as Roll Records with this shape: `{purpose, dice, faces, result, source, rolledByAccountId, rolledAt}`, plus `percentile` (a `PercentileRoll`) for a percentile roll against a target value. `source` is `Server` for every new result. `PlayerEntered` exists only for results typed in before this feature; such records have no `faces` and no `rolledAt`. Each consumer owns its storage and its purposes; this module owns the value objects.
- **Consumers:**
  - [Character Sheet](../character-sheet/spec.md): characteristics, Luck, and EDU improvement checks at creation.
  - [Roll Requests](../roll-requests/spec.md): skill, characteristic, and Luck rolls in the Active Scene.
  - Later: Combat and the development phase (development rolls of [section 16](../../docs/game-rules/coc7_character_creation_and_development_rules.md#16-investigator-development--advancement)), which are out of scope until specified.
- **Dependencies:**
  - Depends on: .NET `RandomNumberGenerator`; `DiceExpression` and `DiceNotation` in `CocAssistant.GameRules.Domain`.
  - Depended on by: Character Sheet, Roll Requests.

### Constraints
- `IDiceRoller` is the only source of random numbers in the backend.
- Every dice result is produced on the server. No API accepts a dice result from a client.
- The percentile roll resolver is deterministic: the same input always gives the same `PercentileRoll`.
- Code implementing a roll rule carries a comment pointing to its section of the skill rolls document, and its tests name that section.
- A Roll Record is never changed after it is created.

## Contract

### Definition of Done
- [ ] `SecureDiceRoller` returns faces from 1 to the number of sides using `RandomNumberGenerator`, and it is the only `IDiceRoller` registered in the API.
- [ ] Rolling a `DiceExpression` returns every face and the total, and unit tests cover every expression form in project_ruleset.md section 5.5.
- [ ] The percentile roll resolver has unit tests for every Success Level, for each Difficulty, and for Bonus and Penalty Dice, each naming its section of the skill rolls document.
- [ ] No backend code outside `SecureDiceRoller` creates `Random` or calls `RandomNumberGenerator`.

### Regression Guardrails
- No dice result is ever accepted from a client.
- Every new Roll Record has source `Server`, its faces, who produced it, and when.
- The Dice module never references a Campaign, an Account, an Investigator, or a Scene type.

### Scenarios
```gherkin
Scenario: Rolling a dice expression records every face
  Given a scripted dice roller that returns 2, 5, and 6
  When the expression "3D6" is rolled
  Then the result has the faces 2, 5, and 6 and the total 13

Scenario: A percentile roll at or below the Hard target is a Hard success
  # Rule: skill rolls document, Success Levels
  Given a target value of 60 and Regular difficulty
  When the percentile roll result is 25
  Then the Success Level is Hard
  And the roll is a success

Scenario: A Hard difficulty roll that only reaches Regular fails
  # Rule: skill rolls document, Difficulty
  Given a target value of 60 and Hard difficulty
  When the percentile roll result is 45
  Then the Success Level is Regular
  And the roll is not a success

Scenario: A result of 01 is a Critical
  # Rule: skill rolls document, Critical and Fumble
  Given a target value of 40 and Regular difficulty
  When the percentile roll result is 1
  Then the Success Level is Critical

Scenario: A Bonus Die keeps the better tens die
  # Rule: skill rolls document, Bonus and Penalty Dice
  Given a target value of 50 and one Bonus Die
  When the units die shows 3 and the tens dice show 20 and 70
  Then the kept result is 23
  And both tens dice are recorded on the percentile roll

Scenario: A Penalty Die keeps the worse tens die
  # Rule: skill rolls document, Bonus and Penalty Dice
  Given a target value of 50 and one Penalty Die
  When the units die shows 3 and the tens dice show 20 and 70
  Then the kept result is 73
  And the Success Level is Failure
```

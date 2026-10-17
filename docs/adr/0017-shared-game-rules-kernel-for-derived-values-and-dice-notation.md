# A shared game-rules kernel holds derived values and dice notation

Status: Accepted

Human NPC and Mythos Creature profiles in Scenario Preparation need the same rule calculations as the Character Sheet in Campaign Play: Hit Points, Magic Points, Damage Bonus and Build, and human MOV ([NPC ruleset section 3](../game-rules/coc_7e_npc_and_monster_creation_ruleset.md#3-shared-7th-edition-mechanics-for-human-npcs-and-monsters)), plus the Regular, Hard, and Extreme difficulty levels and a dice notation ([project_ruleset.md section 5.5](../game-rules/project_ruleset.md#55-dice-notation)). Today these calculations live in `CocAssistant.CampaignPlay.Domain` (`CharacterSheets/DerivedValueRules.cs`, `CharacterSheets/DiceExpression.cs`, and the Damage Bonus and Build catalog model in `RuleData/CharacteristicsRules.cs`), and `CocAssistant.ScenarioPreparation.Domain` does not reference Campaign Play.

A new project, `CocAssistant.GameRules.Domain`, holds the rule calculations and their value types only: no aggregates, repositories, or persistence. The Campaign Play calculations and the catalog model move there unchanged, and both Campaign Play and Scenario Preparation reference it. The dice notation of project_ruleset.md section 5.5 is added there beside the existing `nDm` parsing used at creation. The frontend shows the values the server computes and does not repeat the formulas.

## Considered Options
- Scenario Preparation references `CocAssistant.CampaignPlay.Domain`. Rejected: it couples Scenario Preparation to the Character Sheet aggregate and everything else in that project.
- Copy the calculations into Scenario Preparation. Rejected: two copies of one rule drift, against DRY and the game-rules README.
- A shared game-rules kernel (chosen).

## Consequences
- The move is a refactor commit with no behavior change at the start of PBI-SP-003; the existing Campaign Play tests prove nothing changed.
- Both modules change together when a shared rule changes. The kernel only grows with rules that more than one module needs.
- The catalog reader in `CocAssistant.CampaignPlay.Infrastructure` may stay where it is or move with the model; PBI-SP-003 decides by where Scenario Preparation loads the catalog.

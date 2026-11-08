# Dice are rolled only on the server, through IDiceRoller in the game-rules kernel

Status: Accepted

## Context

**The trust problem:**
- Until now, every dice result at creation was rolled at the table and typed in by the Player ([project_ruleset.md section 4.3](../game-rules/project_ruleset.md#43-dice-results-at-creation)).
- The Keeper had to trust typed totals, and the validator could only check that a total was possible.

**What the dice feature requires** ([specs/dice/spec.md](../../specs/dice/spec.md)):
- Every dice result is produced by the server.
- No API accepts a dice result from a client.
- Every Roll Record keeps its die faces, who produced it, and when.

**Who needs dice:**
- Character creation now: characteristics, then Luck and EDU improvement checks.
- Roll Requests in the Active Scene, later.
- Combat and the development phase, after that.

So the roller and the Roll Record shape are shared by more than one bounded context.

**The existing shared code:**
- The game-rules kernel of [ADR 0017](0017-shared-game-rules-kernel-for-derived-values-and-dice-notation.md) already holds `DiceExpression` and `DiceNotation` ([project_ruleset.md section 5.5](../game-rules/project_ruleset.md#55-dice-notation)).

## Decision

**The roller:**
- `CocAssistant.GameRules.Domain/Dice/` holds the port `IDiceRoller`, which rolls one die with a given number of sides.
- Its production implementation is `SecureDiceRoller`, which uses `System.Security.Cryptography.RandomNumberGenerator`.
- `SecureDiceRoller` is registered once, in the API composition root (`CocAssistant.Api/Program.cs`).
- Tests inject a scripted roller.

**Rolling expressions:**
- `DiceRolling` rolls a `DiceNotation`, or a `DiceExpression`, with an `IDiceRoller`.
- It returns a `DiceRoll {dice, faces, total}`.
- A Damage Bonus term can't be rolled without its value, so it throws.

**The Roll Record:**
- The Roll Record value object, `RollRecord` with `RollSource`, lives in the kernel beside the roller.
- Its shape is `{purpose, dice, faces, result, source, rolledByAccountId, rolledAt}`.
- Each consumer owns its purposes and its storage.
- Every new record has source `Server`.
- `PlayerEntered` exists only for results typed in before this decision; those records have no faces and no time.
- `rolledByAccountId` is a `Guid`, so the kernel never references an Account, Campaign, Investigator, or Scene type.

**Rolling happens on server actions:**
- Results are rolled only by server actions that the roller triggers, for example `POST .../character-sheet/rolls/characteristics`.
- No request body carries a dice result.

**`IDiceRoller` is the only source of random numbers in the backend:**
- A unit test in `CocAssistant.Api.Tests` scans `backend/src` and fails on `Random` or `RandomNumberGenerator` anywhere except `SecureDiceRoller.cs`.
- `Guid.NewGuid()` for entity ids, invite tokens, and file names is an identifier, not a game random number, and is out of scope.
- The template sample `WeatherForecastController` is removed.

## Considered Options

- **Roll in the browser and send the result.** Rejected: a client can send any result, which is the trust problem this decision solves.
- **Each consumer rolls with its own random source.** Rejected:
  - copies of one concern drift, against DRY;
  - there would be no single place to audit.
- **Ban the APIs with Microsoft.CodeAnalysis.BannedApiAnalyzers.** Rejected for now:
  - it adds a package dependency;
  - `SecureDiceRoller` would need a suppression with a written justification.

  The analyzer is semantic and checks at build time, so revisit this if the textual scan misses a case.
- **Keep the Roll Record in Campaign Play.** Rejected: Roll Requests in another context reuse it, and the dice spec makes the Dice module own it.

## Consequences

**What changes for players and dice:**
- Players can no longer use physical dice for any result the app rolls.
- Rolling needs the server, so there is no offline rolling.

**Testing:**
- Tests that need specific results use a scripted `IDiceRoller`.
- Integration and E2E tests run against `SecureDiceRoller`, so they check the shape and ranges of a result, not its values.

**The random-source guard:**
- It is textual. A deliberately obscured alias could evade it.
- It keeps the rule visible and has no dependency.

**Consumers and the kernel:**
- Every new consumer adds its own purposes and storage fields. It does not add a roller.
- Changes to the Roll Record shape change the kernel and every consumer's storage together, each with its own schema upgrade (Character Sheet: ADR 0007).

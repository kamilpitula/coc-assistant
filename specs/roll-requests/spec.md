# Feature: Roll Requests

## Blueprint

### Context
During the Active Scene, the Keeper often asks one or more Investigators to roll a skill, a characteristic, or Luck. Roll Requests let the Keeper send that request from the app, let each targeted Player roll with server-produced dice, and record the request and its results live on the Campaign Wall, so the whole table sees the same result and nobody types in dice. The Keeper can also roll in secret. The dice and the Success Level come from the [Dice](../dice/spec.md) module, and the rules come from the [skill rolls document](../../docs/game-rules/coc7_skill_rolls_rules.md).

### Architecture
- **Domain relationships:**
  - A **Roll Request** belongs to the Active Scene of a Campaign. It has a target, an optional message, a visibility (`Public` or `KeeperOnly`), a creation time, and one Requested Roll per targeted Investigator present.
  - A **target** is a skill (catalog skill plus optional specialization), a characteristic (`STR`, `CON`, `DEX`, `APP`, `POW`, `SIZ`, `INT`, `EDU`), or Luck. Sanity rolls are not a target until the rules cover them.
  - A **Requested Roll** is one Investigator's part of a Roll Request. It has its own Difficulty, number of Bonus Dice, and number of Penalty Dice (the request's defaults, changeable per Investigator), a status, its Roll Records, and, after a push, the push justification.
  - **Requested Roll status:** `Waiting` -> `Rolled`; `Waiting` -> `Cancelled`; after a failed roll, `Rolled` -> `PushAsked` -> `Pushed` (the Keeper approved; waiting for the pushed roll) -> `Rolled`, or `PushAsked` -> `Rolled` when the Keeper declines. A Requested Roll is pushed at most once. Which rolls can be pushed is defined in [skill rolls section 6](../../docs/game-rules/coc7_skill_rolls_rules.md#6-pushing-a-roll).
  - **Target value:** the Investigator's Approved Character Sheet ([character-sheet spec](../character-sheet/spec.md)). A skill uses the sheet's skill value for that skill and specialization; a skill the Investigator lacks uses its base value from the Era's skill catalog ([section 6.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#61-standard-1920s-investigator-sheet-skill-base-values), [section 6.2](../../docs/game-rules/coc7_character_creation_and_development_rules.md#62-common-specialization-base-values)). A characteristic uses its value after age effects. Luck uses the sheet's Luck. A target value of 0 resolves per [project_ruleset.md section 4.7](../../docs/game-rules/project_ruleset.md#47-rolls-against-a-target-value-of-0). No in-play current values exist yet.
  - **Roll Record:** each roll is a Roll Record ([Dice spec](../dice/spec.md), Roll Record) with purpose `RollRequest:{rollRequestId}:{investigatorId}` (and `:Push` for the pushed roll), a `percentile` part, and `earnsExperienceCheck`. `earnsExperienceCheck` is true when a skill roll succeeds and [section 16.1](../../docs/game-rules/coc7_character_creation_and_development_rules.md#161-skill-experience-tick-during-play) allows a check. Nothing on the Character Sheet changes; a future development feature reads the flag.
  - **Hidden roll:** a `KeeperOnly` Roll Request is rolled for every targeted Investigator when it is created. Its Requested Rolls go straight to `Rolled`, with the Keeper as the roller. The targeted Players are not notified, and a hidden roll cannot be pushed, because pushing is asked by the Player.
- **Ownership:** Scene Play owns Roll Requests, their use cases, API, and rules. The aggregate is stored beside the Scene in Scenario Preparation and reached through a provider service ([ADR 0032](../../docs/adr/0032-roll-requests-are-an-aggregate-beside-the-scene-in-scenario-preparation.md), within [ADR 0024](../../docs/adr/0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md); [PBI-DICE-005 design record](../../docs/dice/issues/05-request-a-roll-in-the-active-scene.design.md), D1). Investigator values come from Campaign Play through a read port.
- **Campaign Wall:** creating a Roll Request creates one Wall Entry of kind `RollRequest` with the request's visibility and the Keeper as author ([campaign-play spec](../campaign-play/spec.md), Wall Entry API). The entry carries the Roll Request id, and the card reads the Roll Request through `GET .../roll-requests/{rollRequestId}` ([ADR 0033](../../docs/adr/0033-wall-entries-reference-play-records-by-id-and-the-client-composes-their-card.md)). The card shows the request and each Requested Roll; results are added as they arrive and are never changed. A `RollRequest` Wall Entry cannot be removed.
- **Visibility of results:** on a Public card, every Campaign Member sees, per Investigator: the status, the Difficulty, the Bonus and Penalty Dice, every die face, the kept result, the target values, the Success Level, and any push justification. A `KeeperOnly` card and everything in it reach only the Keeper.
- **Scene History:** each Roll Request is listed inside its Scene in the [Scene History](../scene-play/spec.md). A Player sees Public Roll Requests only. Roll Requests create no Clues.
- **Lifecycle with the Scene:** finishing the Active Scene, or removing an Investigator from the Investigators present, cancels that Scene's (or that Investigator's) `Waiting` and `Pushed` Requested Rolls and declines its `PushAsked` ones, in the same transaction. Before finishing, the Keeper's UI confirms with the number of Requested Rolls that will be cancelled. **Until PBI-DICE-007:** finishing the Active Scene or removing an Investigator present leaves their Requested Rolls as they are. A Waiting roll of a Finished Scene can no longer be rolled (409), leaves the waiting-rolls panel and the badge, and its card keeps showing Waiting. PBI-DICE-007 removes this note.
- **Notification:** a Player whose Investigator has a `Waiting` or `Pushed` Requested Roll sees a waiting-rolls panel on the Active Scene (each with its target, message, Difficulty, Bonus and Penalty Dice, and a Roll button), a badge with the count on the Campaign navigation, and an assertive screen-reader announcement when a new one arrives. UX: [specs/roll-requests/ux.md](ux.md).
- **API Contracts:** Campaign members only; non-members and missing Campaigns get 404 on every call. Keeper-only calls return 404 to a Player. A Player gets 404 for a `KeeperOnly` Roll Request.
  - `POST /api/campaigns/{campaignId}/active-scene/roll-requests` - Keeper only. Body `{target: {kind, skill?, specialization?, characteristic?}, message?, visibility?, difficulty, bonusDice, penaltyDice, investigators: [{investigatorId, difficulty?, bonusDice?, penaltyDice?}]}`. `kind` is `Skill`, `Characteristic`, or `Luck`. `visibility` defaults to `Public`; until PBI-DICE-006, `KeeperOnly` returns 400 and nothing is created. `message` is trimmed plain text of at most 2000 characters, or null. Returns 201 with the Roll Request as the Keeper sees it; a `KeeperOnly` request is already rolled. 409 when no Scene is Active. 400 for an empty or duplicate `investigators` list, an Investigator not present, an unknown skill or characteristic, a skill specialization the catalog does not allow ([project_ruleset.md section 4.2](../../docs/game-rules/project_ruleset.md#42-weapons-gear-and-specializations-without-catalogs)), an unknown Difficulty, a Luck target with a Difficulty other than Regular or with Bonus or Penalty Dice ([project_ruleset.md section 4.8](../../docs/game-rules/project_ruleset.md#48-luck-rolls)), or Bonus or Penalty Dice outside the limits of [skill rolls section 5](../../docs/game-rules/coc7_skill_rolls_rules.md#5-bonus-and-penalty-dice).
  - `GET /api/campaigns/{campaignId}/roll-requests/{rollRequestId}` - the Roll Request as the caller may see it.
  - `GET /api/campaigns/{campaignId}/active-scene/roll-requests` - Keeper only. The Active Scene's Roll Requests, oldest first, as the Keeper sees them; an empty list when no Scene is Active (PBI-DICE-005 design record, D5).
  - `GET /api/campaigns/{campaignId}/investigators/mine/requested-rolls` - Player only; the caller's Investigator's `Waiting` and `Pushed` Requested Rolls in the Active Scene, oldest first, each with its Roll Request's target and message. 404 for a Player without an Approved Investigator.
  - `POST /api/campaigns/{campaignId}/roll-requests/{rollRequestId}/requested-rolls/{investigatorId}/roll` - the Investigator's Player or the Keeper. Rolls a `Waiting` or `Pushed` Requested Roll and returns the Requested Roll. 409 for any other status.
  - `POST .../requested-rolls/{investigatorId}/cancel` - Keeper only. Cancels a `Waiting` Requested Roll. 409 for any other status.
  - `POST .../requested-rolls/{investigatorId}/push` - the Investigator's Player only. Body `{justification}`, trimmed, 1 to 2000 characters, otherwise 400. Moves a failed, not yet pushed, pushable `Rolled` Requested Roll of a Public Roll Request to `PushAsked`. 409 otherwise.
  - `POST .../requested-rolls/{investigatorId}/push/approve` and `.../push/decline` - Keeper only. `PushAsked` -> `Pushed`, or `PushAsked` -> `Rolled`. 409 for any other status.
  - Every state change answers 409 when the Roll Request's Scene is no longer Active.
- **Live updates:** extends the closed topic set of the Campaign hub ([ADR 0009](../../docs/adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md)); the publication policy decides each audience:
  - `rollRequests` to `campaign:{campaignId}` for a Public Roll Request, or to `campaign:{campaignId}:keeper` for a `KeeperOnly` one, whenever it is created or any of its Requested Rolls changes. A new Roll Request also publishes `wallEntries` to the same audience.
  - `myRequestedRolls` to `account:{accountId}` of each Player whose Investigator gains, rolls, or loses a `Waiting` or `Pushed` Requested Roll of a Public Roll Request.
- **Dependencies:**
  - Depends on: [Dice](../dice/spec.md); [Scene Play](../scene-play/spec.md) for the Active Scene and the Investigators present; [Campaign Play](../campaign-play/spec.md) for membership, Approved Character Sheets, the Campaign Wall, and the Campaign hub; [Character Sheet](../character-sheet/spec.md) for skill and characteristic values; the [skill rolls document](../../docs/game-rules/coc7_skill_rolls_rules.md).
  - Depended on by: Pushing (PBI after Roll Requests); the Opposing Value helper (later); Combat (later).

### Constraints
- A Roll Request exists only in the Active Scene and targets only Investigators present.
- Only the Keeper creates, cancels, or rules on a push for a Roll Request. Only the Investigator's Player or the Keeper rolls a Requested Roll. Only the Investigator's Player asks to push. All are enforced server-side.
- Every roll is produced by the server through the Dice module; no dice result is accepted from a client.
- A Roll Record, a Roll Request's target, message, and visibility, and a `RollRequest` Wall Entry never change after they are created.
- A `KeeperOnly` Roll Request, its Wall Entry, its results, and its live signals reach only the Keeper.
- Rule decisions (Success Level, Bonus and Penalty Dice, which rolls can be pushed) come only from the [skill rolls document](../../docs/game-rules/coc7_skill_rolls_rules.md).
- Out of scope: rolls nobody requested (by a Player or the Keeper), Sanity rolls, opposed and combined rolls, spending Luck, the Opposing Value helper, and browser push notifications.

## Contract

### Definition of Done
- [ ] The Keeper can create a Public Roll Request for a skill, a characteristic, or Luck for one or more Investigators present, with an optional message, a default Difficulty and Bonus and Penalty Dice, and per-Investigator changes.
- [ ] A targeted Player sees the Requested Roll in the waiting-rolls panel, a badge on the Campaign navigation, and an assertive announcement, without reloading.
- [ ] The Player, or the Keeper on the Player's behalf, rolls it; the Roll Record names who rolled.
- [ ] The Roll Request appears as one card on the Campaign Wall, on the Active Scene's Wall, and in the Scene History, and each result is added to the card for every connected Campaign Member without reloading.
- [ ] A `KeeperOnly` Roll Request is rolled at creation and is never visible or signalled to a Player.
- [ ] The Keeper can cancel a `Waiting` Requested Roll; finishing the Scene or removing an Investigator present cancels its waiting rolls.
- [ ] A Player can ask to push a failed, pushable roll with a justification, and the Keeper can approve or decline it.
- [ ] Every Roll Record of a skill roll states whether it earns an experience check per section 16.1.
- [ ] A `RollRequest` Wall Entry cannot be removed.

### Regression Guardrails
- A Player never receives a `KeeperOnly` Roll Request, its Wall Entry, its results, or a live signal about it.
- A Roll Record is never changed or removed.
- No Roll Request exists outside an Active Scene, and none targets an Investigator who was not present when it was created.
- A Player can never roll, push, or cancel for an Investigator that is not theirs.
- Roll Requests never cross Campaign boundaries.

### Scenarios
```gherkin
Scenario: Keeper requests a skill roll from two Investigators
  Given "The Corbitt House" is Active with "Harvey Walters" and "Lucy Ward" present
  When the Keeper requests a Spot Hidden roll from both with the message "Something moves upstairs."
  Then the Campaign Wall has one Public Roll Request card for Spot Hidden with both Investigators Waiting
  And the Players of Harvey and Lucy each see the Requested Roll in their waiting-rolls panel without reloading

Scenario: A Player rolls a Requested Roll
  Given Harvey's Player has a Waiting Spot Hidden Requested Roll at Regular difficulty
  And Harvey's Spot Hidden on his Approved Character Sheet is 60
  When Harvey's Player rolls it and the server rolls 25
  Then the Requested Roll is Rolled with the Success Level Hard
  And every connected Campaign Member sees 25, the target values, and Hard on the card without reloading
  And the Roll Record names Harvey's Player as the roller

Scenario: The Keeper rolls for an absent Player
  Given Lucy's Player is Not connected and Lucy has a Waiting Requested Roll
  When the Keeper rolls it
  Then the Requested Roll is Rolled
  And the Roll Record names the Keeper as the roller

Scenario: Per-Investigator Difficulty and Penalty Die
  Given "Harvey Walters" and "Lucy Ward" are present
  When the Keeper requests a Climb roll at Regular difficulty with one Penalty Die for "Lucy Ward" only
  Then Harvey's Requested Roll has Regular difficulty and no Penalty Die
  And Lucy's Requested Roll has Regular difficulty and one Penalty Die

Scenario: A skill the Investigator lacks uses its catalog base value
  # Rule: character rules section 6.1
  Given "Harvey Walters" has no Language (Latin) skill on his Character Sheet
  When the Keeper requests a Language (Latin) roll from him
  Then Harvey's target value is the base value of that skill in the Era's skill catalog

Scenario: A hidden roll is rolled at once and stays Keeper-only
  Given "Harvey Walters" is present
  When the Keeper creates a Keeper-only Psychology Roll Request for him
  Then the Requested Roll is already Rolled with the Keeper as the roller
  And Harvey's Player receives no Requested Roll, no Wall Entry, and no live signal

Scenario: A Player cannot read a hidden Roll Request
  Given a Keeper-only Roll Request exists
  When a Player requests it by id
  Then the request returns 404

Scenario: Keeper cancels a waiting roll
  Given Lucy has a Waiting Requested Roll
  When the Keeper cancels it
  Then the card shows Lucy's Requested Roll as Cancelled
  And it leaves Lucy's Player's waiting-rolls panel without reloading

Scenario: Finishing the Scene cancels waiting rolls
  Given the Active Scene has two Waiting Requested Rolls
  When the Keeper finishes the Scene and confirms that 2 waiting rolls will be cancelled
  Then the Scene is Finished and both Requested Rolls are Cancelled

Scenario: Removing an Investigator present cancels their waiting rolls
  Given Lucy has a Waiting Requested Roll in the Active Scene
  When the Keeper removes "Lucy Ward" from the Investigators present
  Then Lucy's Requested Roll is Cancelled

Scenario: A Player cannot roll for another Investigator
  Given Lucy has a Waiting Requested Roll
  When Harvey's Player tries to roll it
  Then the request returns 404 and the Requested Roll is still Waiting

Scenario: A Requested Roll is rolled only once
  Given Harvey's Requested Roll is Rolled
  When Harvey's Player rolls it again
  Then the request returns 409 and no Roll Record is added

Scenario: A Player asks to push a failed roll and the Keeper approves
  # Rule: skill rolls section 6
  Given Harvey's Library Use Requested Roll is Rolled with the Success Level Failure
  When Harvey's Player asks to push it with the justification "I search every shelf through the night."
  And the Keeper approves the push
  And Harvey's Player rolls again
  Then the Requested Roll is Rolled with two Roll Records, the second one marked as pushed
  And the card shows the justification and both results

Scenario: The Keeper declines a push
  Given Harvey's Requested Roll is PushAsked
  When the Keeper declines the push
  Then the Requested Roll is Rolled with its first result only

Scenario: A successful skill roll earns an experience check
  # Rule: character rules section 16.1
  Given Harvey's Spot Hidden Requested Roll has no Bonus Die
  When it is rolled with a success
  Then its Roll Record earns an experience check
  And Harvey's Character Sheet is unchanged

Scenario: A success with a Bonus Die earns no experience check
  # Rule: character rules section 16.1; project_ruleset.md section 4.9
  Given Harvey's Spot Hidden Requested Roll has one Bonus Die and no Penalty Die
  When it is rolled with a success
  Then its Roll Record earns no experience check

Scenario: A Roll Request needs an Active Scene
  Given no Scene is Active
  When the Keeper creates a Roll Request
  Then the request returns 409 and nothing is created

Scenario: Only Investigators present can be targeted
  Given "The Corbitt House" is Active with only "Harvey Walters" present
  When the Keeper creates a Roll Request for "Lucy Ward"
  Then the request returns 400 and nothing is created

Scenario: A Roll Request card cannot be removed
  Given the Campaign Wall has a Roll Request card
  When the Keeper removes that Wall Entry
  Then the removal returns 409 and the card stays on the Wall

Scenario: Players cannot create Roll Requests
  Given a Player of a Campaign with an Active Scene
  When the Player creates a Roll Request
  Then the request returns 404 and nothing is created
```

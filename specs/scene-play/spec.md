# Feature: Scene Play

## Blueprint

### Context
Scene Play lets a Keeper run a prepared Scene at the table and lets Players experience it through their Investigators. The Keeper starts and finishes Scenes, chooses the Investigators present, reveals Handouts, Non-Player Entities, and Items to chosen Investigators, and gives Items to them. What an Investigator has received stays with that Investigator as Clues, and the Scenes played so far form the Scene History. Scene content is authored in [Scenario Preparation](../scenario-preparation/spec.md); this feature never edits it.

### Architecture
- **Domain relationships:** A Campaign has at most one Active Scene. An Active or Finished Scene has a set of Investigators present and a list of Reveals. A Reveal has a subject (a Handout, a Non-Player Entity link, or an Item), a snapshot of the subject's Player-facing content as it was when revealed, the Investigators it reached, and a time. A Reveal of an Image, Document, or Map Handout snapshots the stored file's key, name, media type, size, and, for an Image or Map, its image description, and reads the file through a Scenario Preparation port; Scene Play never copies, overwrites, or deletes it ([ADR 0021](../../docs/adr/0021-handout-files-are-immutable-blobs-behind-a-storage-port.md)). An Investigator's Clues are every Reveal that reached it. An Item is held by at most one Investigator or by no one. An Item's Player-facing content is its name and Player-facing description ([scenario-preparation spec](../scenario-preparation/spec.md), Constraints).
- **Ownership:** The Scene aggregate, its status, and its content stay in Scenario Preparation. Scene Play owns the use cases, the API, and the rules for the Investigators present, Reveals, Clues, and who holds an Item, and triggers Scene status transitions. The Investigators present and the Reveals are stored as child entities of the Scene aggregate in Scenario Preparation's database, and Scene Play reaches them through consumer-owned ports onto Scenario Preparation's `SceneLifecycleService`, so that finishing, starting, and choosing who is present are one transaction ([ADR 0024](../../docs/adr/0024-scene-play-runs-the-scene-aggregate-through-a-provider-command-service.md)). At most one Scene per Campaign is Active, enforced by a filtered unique index and a Scene version ([ADR 0025](../../docs/adr/0025-one-active-scene-per-campaign-through-a-filtered-index-and-a-scene-version.md)). The design is in the [PBI-SPL-001 design record](../../docs/scene-play/issues/01-start-and-finish-a-scene.design.md). Who holds an Item is stored on the Item in Scenario Preparation's database. It changes only through a Scenario Preparation provider service that Scene Play calls, in the same transaction as the give's Reveal ([ADR 0029](../../docs/adr/0029-item-holders-live-on-the-item-and-change-through-a-provider-service.md)). Scenario Preparation reads it to refuse deleting a held Item or its Handouts ([ADR 0022](../../docs/adr/0022-items-are-guarded-by-play-usage-read-through-ports.md)). The design is in the [PBI-SPL-003 design record](../../docs/scene-play/issues/03-give-and-take-back-items.design.md).
- **API Contracts:** Campaign members only; non-members and Campaigns that do not exist get 404 on every call. Keeper-only calls return 404 to a Player.
  - `POST /api/campaigns/{campaignId}/scenes/{sceneId}/start` - Keeper only. Body `{presentInvestigatorIds, finishActiveScene}`. Starts a Prepared Scene of any Scenario of the Campaign with the given Investigators present. 409 when the Scene is not Prepared, and 409 when another Scene is Active unless `finishActiveScene` is true, in which case the Active Scene is finished and the new one started in one transaction, cancelling the finished Scene's waiting Requested Rolls ([roll-requests spec](../roll-requests/spec.md), Lifecycle with the Scene). 400 when `presentInvestigatorIds` is empty or names an Investigator that is not Approved in the Campaign.
  - `POST /api/campaigns/{campaignId}/active-scene/finish` - Keeper only. Finishes the Active Scene; 409 when there is none.
  - `PUT /api/campaigns/{campaignId}/active-scene/present-investigators` - Keeper only. Replaces the Investigators present with the same validation as starting.
  - `GET /api/campaigns/{campaignId}/active-scene` - 204 when no Scene is Active. The Keeper gets the full Active Scene with its Investigators present and Reveals. A Player whose Investigator is present gets the title, location, Investigators present by name, and the Reveals that reached their Investigator. A Player whose Investigator is not present gets only `{title, isPresent: false}`. The exact shapes, the error order, and the present-list validation are in the [PBI-SPL-001 design record](../../docs/scene-play/issues/01-start-and-finish-a-scene.design.md), Single-option decisions; the Reveal views in `reveals` are in the [PBI-SPL-002 design record](../../docs/scene-play/issues/02-reveal-to-investigators-and-clues.design.md), D5. A Player's Reveal view never carries the subject id or the recipients.
  - `POST /api/campaigns/{campaignId}/active-scene/reveals` - Keeper only. Body `{subject: {type, id}, investigatorIds?}` where `type` is `Handout`, `NonPlayerEntity`, or `Item` and the subject belongs to the Active Scene (an Item belongs to it when the Scene links the Item, and a Handout of an Item belongs to it when the Scene links that Item). Before an Item or an Item's Handout can be revealed, an Item with a Reveal must also count as in play (ADR 0022). `investigatorIds` defaults to every Investigator present and may only name Investigators present. Returns the created Reveal as the Keeper sees it. 409 when no Scene was Active before the Reveal (nothing is revealed); 400 for a Keeper-facing Handout, a subject not on the Active Scene, or an empty, duplicate, or not-present `investigatorIds`. An Item Reveal snapshots the Item's name and Player-facing description.
  - `GET /api/campaigns/{campaignId}/reveals/{revealId}/file` - the Keeper, or a Player whose Approved Investigator the Reveal reached; streams the file snapshotted by the Reveal; 404 for anyone else and for a Reveal without a file ([ADR 0026](../../docs/adr/0026-revealed-files-are-served-by-scene-play-from-the-reveal-snapshot.md)).
  - `GET /api/campaigns/{campaignId}/investigators/mine/clues` - Player only; the caller's Investigator's name and Clues across the Campaign's Scenes, newest first, each with its Scene; 404 for a Player without an Approved Investigator.
  - `GET /api/campaigns/{campaignId}/investigators/{investigatorId}/clues` - Keeper only; the same for an Approved Investigator of the Campaign.
  - `POST /api/campaigns/{campaignId}/items/{itemId}/give` - Keeper only. Body `{investigatorId}`.
    - Needs an Active Scene that links the Item, and the Investigator present.
    - The Investigator becomes the holder and receives a Reveal of the Item in the Active Scene.
    - Giving an Item someone else holds moves it; the former holder keeps the Clue.
    - Errors: 404 for an Item not in the Campaign; 409 when no Scene is Active (nothing is given) or the Item changed meanwhile; 400 at `itemId` when the Active Scene doesn't link it; 400 at `investigatorId` when the Investigator isn't present or already holds it.
    - Returns the created Reveal as the Keeper sees it ([PBI-SPL-003 design record](../../docs/scene-play/issues/03-give-and-take-back-items.design.md)).
  - `POST /api/campaigns/{campaignId}/items/{itemId}/take-back` - Keeper only; the Item is held by no one, and the former holder keeps the Clue.
    - Needs no Active Scene and no Investigator present, and creates no Reveal.
    - Answers 204 also when no one held the Item; 404 for an Item not in the Campaign.
  - `GET /api/campaigns/{campaignId}/investigators/mine/items` - Player only; the Items the caller's Investigator holds, newest first, each as it was when given (the give Reveal's snapshot). 404 for a Player without an Approved Investigator.
  - `GET /api/campaigns/{campaignId}/investigators/{investigatorId}/items` - Keeper only; the same for an Approved Investigator of the Campaign, with each Item's id.
  - `GET /api/campaigns/{campaignId}/scene-history` - Active and Finished Scenes of every Scenario, newest started first, each with its Scenario title, Scene title, and start and finish times (`finishedAt` is null for the Active Scene). The Keeper gets every Reveal and each Scene's Investigators present (as they were when it finished, or now for the Active Scene). A Player gets, per Scene, only the Reveals that reached their Investigator, and never the Investigators present; a Player without an Approved Investigator gets every Scene with no Reveals. Prepared Scenes never appear. The exact shapes, the order, and its tie-break are in the [PBI-SPL-004 design record](../../docs/scene-play/issues/04-scene-history.design.md).
- **Campaign Wall:** Starting a Scene and finishing a Scene each create a Public Wall Entry authored by the Keeper that names only the Scene title, through the Campaign Play Wall Entry behavior ([campaign-play spec](../campaign-play/spec.md), Wall Entry API). Reveals and Item changes create no Wall Entries.
- **Live updates:** Extends the closed topic set of the Campaign hub ([ADR 0009](../../docs/adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md)); the publication policy decides each audience:
  - `activeScene` to `campaign:{campaignId}` when a Scene starts or finishes or the Investigators present change.
  - `sceneHistory` to `campaign:{campaignId}` when a Scene starts or finishes or the Investigators present change. A Reveal reaches the Scene History through `myClues` and `sceneReveals`, never through a Campaign-wide signal.
  - `myClues` to `account:{accountId}` of each Player whose Investigator a Reveal reached, including the Investigator given an Item.
  - `sceneReveals` to `campaign:{campaignId}:keeper` when a Reveal is made or an Item changes holder.
  - `myItems` to `account:{accountId}` of each Player whose Investigator gains or loses an Item.
  - `rollRequests` and `myRequestedRolls` when a Scene change cancels waiting Requested Rolls ([roll-requests spec](../roll-requests/spec.md), Live updates).
  - `scenes` to `campaign:{campaignId}:keeper` when Scene content, the prepared order, links, or Items change.
- **UX specification:** [ux.md](ux.md) covers starting, the Active Scene page, and the overview card (PBI-SPL-001), and Reveals, revealed content, and the Clues pages (PBI-SPL-002). Items in play (PBI-SPL-003: giving, taking back, and revealing Items, and the Investigator's Items) are section 22. Scene History (PBI-SPL-004) is [section 23](ux.md#23-scene-history-pbi-spl-004). The Active Scene redesign (PBI-SPL-006, PBI-SPL-007) is section 21: the Keeper's page is split into Run, To reveal, Keeper reference, and Revealed, with the Campaign Wall on Run, following the app-wide [navigation](../navigation/spec.md) pattern. Each later PBI with UI goes through the UX designer skill before it is built and extends it. Views: an Active Scene page for the Keeper (run controls) and for Players (what reached their Investigator, with a Map shown prominently and Read-aloud Handouts styled as read-aloud text), a Scene History page for every Campaign Member, an Investigator's Clues and Items, and an Active Scene card on the Campaign overview ([campaign-overview spec](../campaign-overview/spec.md)).
- **Dependencies:** Depends on Scenario Preparation for Scenes, Handouts, Non-Player Entity links, Items, and Scene status transitions; on Campaign Play for membership, Investigator approval, the Campaign Wall, and the Campaign hub; on Identity and Access for authentication. Depended on by [Roll Requests](../roll-requests/spec.md) for the Active Scene and the Investigators present.

### Constraints
- At most one Scene is Active in a Campaign at any time, including under concurrent start requests.
- Only Approved Investigators can be present. A started Scene has at least one Investigator present.
- An Investigator added to the Active Scene receives no earlier Reveal automatically; an Investigator removed from it keeps its Clues.
- Every part of a Scene reaches Players only through a Reveal made by the Keeper; starting a Scene reveals nothing.
- A Reveal is a snapshot. Later edits to its subject, and taking an Item back, never change what an Investigator received. A Reveal is never withdrawn.
- A Reveal reaches only the Investigators the Keeper chose; it is never projected or signalled to any other Player.
- Clues belong to the Investigator, not to the Player.
- A Finished Scene may contain material that was never revealed; it stays Keeper-only.
- Only the Keeper starts or finishes a Scene, changes the Investigators present, reveals, gives an Item, or takes it back. All are enforced server-side.
- The Keeper sees every Investigator's Clues.
- Giving an Item needs an Active Scene that links the Item and the Investigator present; taking it back needs neither (Refinement Protocol, 2026-11-06). Giving a held Item to another Investigator moves it, and giving it to its current holder is refused.
- Giving reveals only the Item's name and Player-facing description, never its Handouts or Keeper notes. An Item's Player-facing Handouts reach Players only through their own Reveals.
- **[DEPRECATED 2026-11-08]** ~~Roll Requests, Combat, interactive maps, and Sanity rolls during play are outside this feature in v1. Each needs its rules in [docs/game-rules](../../docs/game-rules/README.md) first: skill rolls and difficulty levels during play, combat resolution, and Sanity rolls during play are listed there as not yet covered. Roll Request results will be Roll Records.~~ Replaced by: Roll Requests in the Active Scene are specified in [specs/roll-requests/spec.md](../roll-requests/spec.md) and follow the [skill rolls document](../../docs/game-rules/coc7_skill_rolls_rules.md). Combat, interactive maps, and Sanity rolls during play stay outside this feature, each needing its rules in [docs/game-rules](../../docs/game-rules/README.md) first. Reason: the dice roll system design of 2026-11-08.
- Finishing the Active Scene, starting another Scene with `finishActiveScene`, or removing an Investigator from the Investigators present, cancels the affected waiting Requested Rolls in the same transaction ([roll-requests spec](../roll-requests/spec.md), Lifecycle with the Scene). The Scene History lists each Scene's Roll Requests within their visibility.

## Contract

### Definition of Done
- [ ] The Keeper can start any Prepared Scene with chosen Approved Investigators present, and finish the Active Scene.
- [ ] Starting a Scene while another is Active is refused with 409, unless the Keeper asks to finish the Active Scene first, which happens in the same transaction.
- [ ] The Keeper can change the Investigators present while the Scene is Active.
- [ ] The Keeper can reveal a Player-facing Handout, a Non-Player Entity's Player-facing name and description, or an Item to all or some of the Investigators present.
- [ ] A Player receives only the Reveals that reached their Investigator, both in the Active Scene and as Clues.
- [ ] The Keeper can give an Item to an Investigator and take it back; the holder's Player sees the Item among their Investigator's Items.
- [ ] Every Campaign Member sees the Scene History in the order Scenes were started, filtered to their Investigator's Clues for a Player.
- [ ] Starting and finishing a Scene each create a Public Wall Entry naming the Scene title.
- [ ] Connected Campaign Members receive Active Scene, Scene History, Clue, and Item changes without reloading, within their visibility.
- [ ] The Keeper's Active Scene keeps material off the main view: Player-facing material waits under "To reveal" until it has reached every Investigator present, Keeper-only material is under "Keeper reference", and Reveals are under "Revealed".
- [ ] Campaign Members read and post to the Campaign Wall from the Active Scene, within each entry's visibility.

### Regression Guardrails
- A Campaign never has two Active Scenes.
- A Prepared Scene, its title, and its content never reach a Player.
- A Scenario's title reaches a Player only through the Scene History, and only once one of its Scenes has started.
- A Reveal, its snapshot, and its live signal never reach a Player whose Investigator it did not reach.
- A Keeper-facing Handout and a Non-Player Entity profile are never revealed.
- What an Investigator received never changes after the Reveal.
- An unapproved Investigator is never present in a Scene.
- A Player can never perform a Keeper action of this feature.
- Scene Play data never crosses Campaign boundaries.

### Scenarios
```gherkin
Scenario: Keeper starts a Scene
  Given a Campaign with the Approved Investigators "Harvey Walters" and "Lucy Ward" and no Active Scene
  When the Keeper starts the Prepared Scene "The Corbitt House" with both Investigators present
  Then "The Corbitt House" is Active with both Investigators present
  And the Campaign Wall has a Public Wall Entry naming "The Corbitt House"

Scenario: Scenes can be started out of prepared order
  Given the Scenario "The Haunting" has the Prepared Scenes "Meeting Knott", then "The Corbitt House"
  When the Keeper starts "The Corbitt House"
  Then "The Corbitt House" is Active and "Meeting Knott" is still Prepared

Scenario: A second Active Scene is refused
  Given the Scene "Meeting Knott" is Active
  When the Keeper starts "The Corbitt House" without finishing the Active Scene
  Then the start is refused with 409
  And "Meeting Knott" is still Active and "The Corbitt House" is still Prepared

Scenario: Keeper finishes the current Scene and starts the next one
  Given the Scene "Meeting Knott" is Active
  When the Keeper starts "The Corbitt House" and asks to finish the Active Scene
  Then "Meeting Knott" is Finished and "The Corbitt House" is Active

Scenario: Concurrent starts leave one Active Scene
  Given no Scene is Active in a Campaign
  When the Keeper starts two different Prepared Scenes at the same time
  Then exactly one of them is Active

Scenario: Only Approved Investigators can be present
  Given "Lucy Ward" is Submitted
  When the Keeper starts a Scene with "Lucy Ward" present
  Then the start is refused with 400 and no Scene is Active

Scenario: Starting a Scene reveals nothing
  Given the Scene "The Corbitt House" has a Player-facing Read-aloud Handout
  When the Keeper starts the Scene
  Then a present Player sees the Scene title and location and no Handout

Scenario: Keeper reveals a Handout to one Investigator
  Given "The Corbitt House" is Active with "Harvey Walters" and "Lucy Ward" present
  When the Keeper reveals the Handout "Diary page" to "Harvey Walters" only
  Then Harvey's Player sees "Diary page" in the Active Scene and among Harvey's Clues
  And Lucy's Player receives neither the Handout nor a live signal about it

Scenario: A Reveal defaults to every Investigator present
  Given "The Corbitt House" is Active with "Harvey Walters" and "Lucy Ward" present
  When the Keeper reveals the Read-aloud Handout "The front door" without choosing Investigators
  Then both Players see "The front door"

Scenario: A Keeper-facing Handout cannot be revealed
  Given the Active Scene has the Keeper-facing Handout "Corbitt's true nature"
  When the Keeper reveals it
  Then the Reveal is refused with 400 and no Player receives it

Scenario: A revealed Handout keeps its revealed content
  Given "Harvey Walters" has the Clue "Diary page"
  When the Keeper edits the text of the Handout "Diary page"
  Then Harvey's Player still sees the text as it was revealed

Scenario: Revealing a Non-Player Entity shows only its Player-facing description
  Given the Mythos Creature linked to the Active Scene has the Player-facing name "A shape in the cellar"
  When the Keeper reveals it to every Investigator present
  Then the Players see "A shape in the cellar" and its Player-facing description
  And no Player receives its attacks, armor, special abilities, or sanity loss

Scenario: A Player whose Investigator is not present sees only the title
  Given "The Corbitt House" is Active with only "Harvey Walters" present
  When Lucy's Player opens the Active Scene
  Then Lucy's Player sees only that "The Corbitt House" is in progress

Scenario: An Investigator added later receives no earlier Reveals
  Given the Active Scene has a Reveal that reached only "Harvey Walters"
  When the Keeper adds "Lucy Ward" to the Investigators present
  Then Lucy's Player does not receive that Reveal

Scenario: Keeper gives an Item to an Investigator
  Given the Item "Walter Corbitt's diary" is held by no one
  When the Keeper gives it to "Harvey Walters"
  Then Harvey holds the Item and his Player sees it among Harvey's Items and Clues

Scenario: Keeper takes an Item back
  Given "Harvey Walters" holds the Item "Walter Corbitt's diary"
  When the Keeper takes it back
  Then the Item is held by no one
  And Harvey's Player still has the Item's Clue

Scenario: Giving a held Item to another Investigator moves it
  Given "Harvey Walters" holds the Item "Walter Corbitt's diary"
  And "Lucy Ward" is present in the Active Scene that links it
  When the Keeper gives it to "Lucy Ward"
  Then Lucy holds the Item and Harvey no longer does
  And Harvey's Player still has the Item's Clue

Scenario: Taking an Item back needs no Active Scene
  Given "Harvey Walters" holds the Item "Walter Corbitt's diary" and no Scene is Active
  When the Keeper takes it back
  Then the Item is held by no one

Scenario: An Item can only be given to an Investigator present
  Given "The Corbitt House" is Active with only "Harvey Walters" present and links the Item "Walter Corbitt's diary"
  When the Keeper gives the Item to "Lucy Ward"
  Then the give is refused with 400 and no one holds the Item

Scenario: Keeper reveals an Item's Handout
  Given the Active Scene links the Item "Walter Corbitt's diary" with the Player-facing Handout "The last entry"
  When the Keeper reveals "The last entry" to every Investigator present
  Then the Players see "The last entry" and nobody holds the Item

Scenario: Players see the Scene History filtered to their Clues
  Given "Meeting Knott" is Finished and "Harvey Walters" received one of its two Reveals
  When Harvey's Player opens the Scene History
  Then the Player sees "Meeting Knott" with its dates and only the Reveal Harvey received
  And no Prepared Scene is listed

Scenario: A Finished Scene with unrevealed material keeps it Keeper-only
  Given "Meeting Knott" is Finished with a Player-facing Handout that was never revealed
  When a Player opens the Scene History
  Then that Handout is absent from the Player's result

Scenario: Players cannot run Scenes
  Given a Player of a Campaign with a Prepared Scene
  When the Player starts the Scene, reveals, gives an Item, or reads another Investigator's Clues
  Then the request returns 404 and nothing changes

Scenario: A Reveal is delivered live only to its Investigators
  Given the Keeper and the Players of "Harvey Walters" and "Lucy Ward" are connected
  When the Keeper reveals a Handout to "Harvey Walters" only
  Then Harvey's Player sees it without reloading
  And Lucy's Player receives no signal

Scenario: Scene Play stays within its Campaign
  Given a Scene is Active in Campaign A
  When a member of Campaign B requests the Active Scene or Scene History of Campaign A
  Then the request returns 404

Scenario: Material reached by everyone present leaves "To reveal"
  Given "The Corbitt House" is Active with "Harvey Walters" and "Lucy Ward" present
  And "The front door" has been revealed to "Harvey Walters" only
  Then "The front door" is under "To reveal" with "not yet: Lucy Ward"
  When the Keeper reveals "The front door" to "Lucy Ward"
  Then "The front door" is no longer under "To reveal"
  And it is under "Revealed"

Scenario: An Investigator added later brings material back to "To reveal"
  Given "The Corbitt House" is Active with "Harvey Walters" present
  And "The front door" has been revealed to "Harvey Walters"
  When the Keeper adds "Lucy Ward" to the Investigators present
  Then "The front door" is under "To reveal" with "not yet: Lucy Ward"

Scenario: Keeper-only material is never offered for a Reveal
  Given the Active Scene has the Keeper-facing Handout "The secret door"
  Then "The secret door" is under "Keeper reference" without "Reveal..."

Scenario: The Keeper posts to the Wall from the Active Scene
  Given "The Corbitt House" is Active
  When the Keeper adds the Public Wall Entry "The front door slams shut." from the Active Scene
  Then the entry is at the top of the Wall on the Active Scene and on the Wall page
  And every connected Player sees it without reloading

Scenario: A Player never sees a Keeper-only Wall Entry on the Active Scene
  Given the Keeper added the Keeper-only Wall Entry "Corbitt has noticed Cy."
  When "Harvey Walters"'s Player opens the Active Scene
  Then the Wall on the page does not show "Corbitt has noticed Cy."
```

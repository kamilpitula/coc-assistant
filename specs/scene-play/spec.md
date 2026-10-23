# Feature: Scene Play

## Blueprint

### Context
Scene Play lets a Keeper run a prepared Scene at the table and lets Players experience it through their Investigators. The Keeper starts and finishes Scenes, chooses the Investigators present, reveals Handouts, Non-Player Entities, and Items to chosen Investigators, and gives Items to them. What an Investigator has received stays with that Investigator as Clues, and the Scenes played so far form the Scene History. Scene content is authored in [Scenario Preparation](../scenario-preparation/spec.md); this feature never edits it.

### Architecture
- **Domain relationships:** A Campaign has at most one Active Scene. An Active or Finished Scene has a set of Investigators present and a list of Reveals. A Reveal has a subject (a Handout, a Non-Player Entity link, or an Item), a snapshot of the subject's Player-facing content as it was when revealed, the Investigators it reached, and a time. A Reveal of an Image, Document, or Map Handout snapshots the stored file's key, name, media type, and size and reads the file through a Scenario Preparation port; Scene Play never copies, overwrites, or deletes it ([ADR 0021](../../docs/adr/0021-handout-files-are-immutable-blobs-behind-a-storage-port.md)). An Investigator's Clues are every Reveal that reached it. An Item is held by at most one Investigator or by no one.
- **Ownership:** The Scene aggregate, its status, and its content stay in Scenario Preparation. Scene Play owns the Investigators present, Reveals, Clues, and who holds an Item, and triggers Scene status transitions. The cross-functionality boundary (a consumer-owned port per [ADR 0008](../../docs/adr/0008-cross-functionality-reads-through-a-consumer-owned-port.md), or another shape) is decided in an architect decision record before PBI-SPL-001.
- **API Contracts:** Campaign members only; non-members and Campaigns that do not exist get 404 on every call. Keeper-only calls return 404 to a Player.
  - `POST /api/campaigns/{campaignId}/scenes/{sceneId}/start` - Keeper only. Body `{presentInvestigatorIds, finishActiveScene}`. Starts a Prepared Scene of any Scenario of the Campaign with the given Investigators present. 409 when the Scene is not Prepared, and 409 when another Scene is Active unless `finishActiveScene` is true, in which case the Active Scene is finished and the new one started in one transaction. 400 when `presentInvestigatorIds` is empty or names an Investigator that is not Approved in the Campaign.
  - `POST /api/campaigns/{campaignId}/active-scene/finish` - Keeper only. Finishes the Active Scene; 409 when there is none.
  - `PUT /api/campaigns/{campaignId}/active-scene/present-investigators` - Keeper only. Replaces the Investigators present with the same validation as starting.
  - `GET /api/campaigns/{campaignId}/active-scene` - 204 when no Scene is Active. The Keeper gets the full Active Scene with its Investigators present and Reveals. A Player whose Investigator is present gets the title, location, Investigators present by name, and the Reveals that reached their Investigator. A Player whose Investigator is not present gets only `{title, isPresent: false}`.
  - `POST /api/campaigns/{campaignId}/active-scene/reveals` - Keeper only. Body `{subject: {type, id}, investigatorIds?}` where `type` is `Handout`, `NonPlayerEntity`, or `Item` and the subject belongs to the Active Scene. `investigatorIds` defaults to every Investigator present and may only name Investigators present. 400 for a Keeper-facing Handout.
  - `GET /api/campaigns/{campaignId}/investigators/mine/clues` - Player only; the caller's Investigator's Clues, newest first.
  - `GET /api/campaigns/{campaignId}/investigators/{investigatorId}/clues` - Keeper only; that Investigator's Clues.
  - `POST /api/campaigns/{campaignId}/items/{itemId}/give` - Keeper only. Body `{investigatorId}`; the Investigator becomes the holder and receives a Reveal of the Item.
  - `POST /api/campaigns/{campaignId}/items/{itemId}/take-back` - Keeper only; the Item is held by no one. The former holder keeps the Clue.
  - `GET /api/campaigns/{campaignId}/investigators/mine/items` - Player only; the Items the caller's Investigator holds.
  - `GET /api/campaigns/{campaignId}/scene-history` - Active and Finished Scenes of every Scenario in the order they were started, each with its Scenario title, Scene title, and start and finish times. The Keeper gets every Reveal; a Player gets, per Scene, only the Reveals that reached their Investigator. Prepared Scenes never appear.
- **Campaign Wall:** Starting a Scene and finishing a Scene each create a Public Wall Entry authored by the Keeper that names only the Scene title, through the Campaign Play Wall Entry behavior ([campaign-play spec](../campaign-play/spec.md), Wall Entry API). Reveals and Item changes create no Wall Entries.
- **Live updates:** Extends the closed topic set of the Campaign hub ([ADR 0009](../../docs/adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md)); the publication policy decides each audience:
  - `activeScene` to `campaign:{campaignId}` when a Scene starts or finishes or the Investigators present change.
  - `sceneHistory` to `campaign:{campaignId}` when a Scene finishes.
  - `myClues` to `account:{accountId}` of each Player whose Investigator a Reveal reached.
  - `sceneReveals` to `campaign:{campaignId}:keeper` when a Reveal is made or an Item changes holder.
  - `myItems` to `account:{accountId}` of the Player whose Investigator receives or loses an Item.
  - `scenes` to `campaign:{campaignId}:keeper` when Scene content, the prepared order, links, or Items change.
- **UX specification:** Not yet recorded. Each PBI with UI goes through the UX designer skill before it is built. Views: an Active Scene page for the Keeper (run controls) and for Players (what reached their Investigator, with a Map shown prominently and Read-aloud Handouts styled as read-aloud text), a Scene History page for every Campaign Member, an Investigator's Clues and Items, and an Active Scene card on the Campaign overview ([campaign-overview spec](../campaign-overview/spec.md)).
- **Dependencies:** Depends on Scenario Preparation for Scenes, Handouts, Non-Player Entity links, Items, and Scene status transitions; on Campaign Play for membership, Investigator approval, the Campaign Wall, and the Campaign hub; on Identity and Access for authentication.

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
- Roll Requests, Combat, interactive maps, and Sanity rolls during play are outside this feature in v1. Each needs its rules in [docs/game-rules](../../docs/game-rules/README.md) first: skill rolls and difficulty levels during play, combat resolution, and Sanity rolls during play are listed there as not yet covered. Roll Request results will be Roll Records.

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

### Regression Guardrails
- A Campaign never has two Active Scenes.
- A Prepared Scene, its title, and its content never reach a Player.
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
```

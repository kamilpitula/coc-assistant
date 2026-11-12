# Wall Entries reference play records by id and the client composes their card

Status: Accepted

A Roll Request is recorded on the Campaign Wall as one card whose results arrive after the entry exists ([specs/roll-requests/spec.md](../../specs/roll-requests/spec.md), Campaign Wall). A Wall Entry never changes after it is created, and a `RollRequest` entry cannot be removed ([specs/campaign-play/spec.md](../../specs/campaign-play/spec.md), Wall Entry kinds). The Roll Request is owned by Scene Play and stored beside the Scene ([ADR 0032](0032-roll-requests-are-an-aggregate-beside-the-scene-in-scenario-preparation.md)). Hidden rolls, cancelling, and pushing will each change what the card shows. Reads are authorized by REST, and live updates only invalidate ([ADR 0009](0009-live-updates-through-campaign-hub-with-invalidation-topics.md)). The design is recorded in the [PBI-DICE-005 design record](../dice/issues/05-request-a-roll-in-the-active-scene.design.md), D2.

## Decision
- **The entry:**
  - A Wall Entry has a `kind`: `Text` or `RollRequest`. A `RollRequest` entry has no text and carries the Roll Request id. A unique index allows one entry per Roll Request.
  - Its visibility is the Roll Request's.
  - It is created only by Roll Requests, through a Scene Play port onto Campaign Play.
  - Removing it returns 409 to the Keeper. A non-Keeper still gets 404 first.
- **The read:** the Wall read returns `kind` and `rollRequestId`, never the Roll Request itself. The frontend's Wall hosts the `roll-request-card` of the roll-requests slice, which reads the Roll Request through Scene Play's `GET /api/campaigns/{campaignId}/roll-requests/{rollRequestId}`. That GET applies the caller's visibility.
- **Live updates:**
  - Creating the entry publishes `wallEntries`.
  - Every Roll Request change publishes `rollRequests`, which invalidates only the Roll Request reads, so a result refreshes its card without refetching the Wall.
- **Future play records on the Wall** (for example Combat) follow the same shape: a new `kind`, an id, a card in their own slice, and their own topic.

## Considered Options
- **The Wall query embeds the Roll Request view through a Campaign Play port:** rejected. Campaign Play would carry a copy of the card's shape, a second JSON mapping, and a dependency onto Scene Play, and every later Roll Request PBI would change Campaign Play.
- **Snapshotting the Roll Request into the Wall Entry:** rejected. The entry must never change, and results arrive later.
- **An id on the entry, with the card composed by the client (chosen).**

## Consequences
- A Wall page makes one extra read per visible card. Each read is cached and refreshed on its own.
- Campaign Play knows nothing of a Roll Request beyond its id and visibility. Changes to the card don't touch the Wall contract.
- A card whose read fails or is no longer visible shows its own error or nothing; the Wall list is unaffected.
- Embedding the view later would be an additive change to the Wall contract.

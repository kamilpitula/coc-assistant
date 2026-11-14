# The Scene History embeds play records within visibility, and their cards render from data

Status: Accepted

## Context

- The Scene History lists each played Scene with its Reveals, and from PBI-DICE-008 also with its Roll Requests ([specs/roll-requests/spec.md](../../specs/roll-requests/spec.md), Scene History; [specs/scene-play/ux.md](../../specs/scene-play/ux.md) section 23.11). The Keeper sees every Roll Request, and a Player sees the Public ones only.
- [ADR 0033](0033-wall-entries-reference-play-records-by-id-and-the-client-composes-their-card.md) makes Wall Entries reference a Roll Request by id, and the client composes its card by reading `GET .../roll-requests/{id}`. Its reason was the boundary: embedding would have put the card's shape into Campaign Play.
- The Scene History is different on three points:
  - It is a Scene Play read, the same context that owns the Roll Request view, so ADR 0033's cross-context reason does not apply.
  - It is unpaged, and every card is shown open. A read per card would be one request per Roll Request in the Campaign (hundreds for a long Campaign).
  - Each Scene must decide its empty sentence and hide Cancelled rows (human decisions, 2026-11-14), which needs the card data at the Scene level, not inside each card.
- The design is recorded in the [PBI-DICE-008 design record](../dice/issues/08-roll-requests-in-the-scene-history.design.md), D1.

## Decision

- **The read embeds:** the Scene History response carries each Scene's Roll Requests as the same view `GET .../roll-requests/{id}` returns, projected by the same Scene Play projection. Visibility is applied once, in the Scene History projection, through the same rule the GET uses: a Player gets Public only.
- **The card renders from data:** the roll-requests slice's card is split into `RollRequestCardView`, which renders a Roll Request it is given, and `RollRequestCard`, which loads one by id and renders the view. The Wall keeps `RollRequestCard`. The Scene History renders `RollRequestCardView` with data from its own read. Host-specific presentation (hiding Cancelled rows) is done by the host on the data before rendering, as [ADR 0028](0028-panel-bodies-live-in-the-subject-slice-and-hosts-adapt.md) has hosts adapt.
- **Live updates:** the client maps `rollRequests` to the Scene History query too. The server's publication policy is unchanged, so a Player is never signalled for a Keeper-only Roll Request.
- **Later play records shown in the Scene History** (for example Combat) follow the same shape: their view is embedded in the history read within visibility, and their card has a view that renders from data.

## Considered Options

- **References in the history and a card per id (the ADR 0033 shape):** rejected. It makes one read per card on an unpaged page, and a Scene could not decide its empty sentence or hide Cancelled rows without waiting for every card.
- **A single discriminated "items" list per Scene from the server:** rejected. It replaces the working `reveals` contract. The client merges two newest-first arrays instead.
- **Embed the views, with a card that renders from data (chosen).**

## Consequences

- There are two ways a Roll Request reaches a card: by id on the Wall, embedded in the Scene History. Both use one server projection and one card view, so the card's look and the visibility rule exist once.
- The Scene History response grows with the Campaign's Roll Requests. It costs one more query and one account-names lookup per read.
- Every Roll Request change during the Active Scene also refetches an open Scene History, within the audience `rollRequests` already has.
- A change to the Roll Request view (for example push states) changes the Scene History contract too, and its strict client schemas must follow.
- Given up: the Scene History no longer gets per-card loading or retry. A failed history read fails the whole page, as before.

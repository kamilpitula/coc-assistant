# Side panels and origins are URL search params validated per route with non-throwing zod schemas

Status: Accepted

## Context

[specs/navigation/ux.md](../../specs/navigation/ux.md) sections 3 to 5 make two navigation rules the app-wide default:

- A lookup opened during a task opens in a side panel that is kept in the URL, survives a reload, and closes with browser back.
- A full page opened from a known origin shows a back link to that origin.

Until now, no route reads search params; every route uses `Route.useParams` only. The first panel host is the Active Scene (PBI-NAV-002), and PBI-SPL-005 and PBI-SPL-006 add more panels. Any later host or origin will copy whatever this first one does.

`frontend/src/shared` imports no slice, and that must stay true even though the panel bodies and the origin labels come from slices.

The design is recorded in the [PBI-NAV-002 design record](../navigation/issues/02-side-panel-and-origin-back-links.design.md), D1, D2, and D6.

## Decision

- **Panel params are owned by the host route.** Each page that hosts panels declares `validateSearch` with the shared `sidePanelSearchSchema`. `useSidePanel` parses the params into a discriminated union of open panels. Invalid or incomplete params open no panel.
- **Origins are owned by the target route.** Each full page that can show an origin back link declares `validateSearch: originSearchSchema` and passes `from` to its component as a prop. `from` is a zod enum allow-list (today: `active-scene`). It is never a URL.
- **Schemas never throw.** Every key is optional and falls back with `.catch(undefined)`, so a bad link degrades to "no panel" or "structural back link" silently, and existing `Link`s need no `search` prop.
- **Params carry identifiers only.** Each panel body loads and authorizes through the same queries as its full page.
- **History:** opening a panel pushes an entry with the history-state marker `sidePanelOpenedHere`. Opening a second panel replaces the entry and keeps the marker. Closing calls `history.back()` when the marker is present; otherwise it navigates with `replace` and without the panel params.
- **Shared stays slice-free.** `shared` holds the panel shell, the param and origin schemas, and a pure `resolveBackLink(from, fallback, originTargets)`. The host slice maps panel types to bodies. A slice hook (`campaign-play/hooks/useOriginBackLink`) supplies the origin labels, such as the Active Scene title.

## Considered Options

- **Panel params on the root route.** Rejected: panels become a global URL concern that most pages cannot serve.
- **Reading `location.search` directly.** Rejected: untyped, and every reader would repeat the parsing.
- **Always replacing on close.** Rejected: browser back after a close would reopen the panel, against ux.md section 3.
- **An in-memory panel history stack.** Rejected: lost on reload.
- **Shared reading the Active Scene from the query cache.** Rejected: it would be the first slice import in `shared`.
- **Per-route schemas, a history-state marker, and an allow-list resolved by a pure function (chosen).**

## Consequences

- **Typed, shareable URLs:** a panel or an origin can be linked, reloaded, and tested by URL.
- **Every new host or origin edits a schema and ux.md:** a new panel type or origin updates ux.md sections 1, 3, and 4, the zod schema, and its tests together.
- **Given up:** a generic, untyped "back to the previous page" link. Only allow-listed origins get a back link; everything else gets the page's structural back link.
- **Not covered here:** focus return, the panel shell and body dispatch, heading offsets, and the entry-point element are reversible and stay in the design record.

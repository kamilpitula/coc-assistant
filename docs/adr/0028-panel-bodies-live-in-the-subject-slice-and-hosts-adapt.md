# Panel bodies live in the slice that owns their subject, take explicit identities, and hosts adapt

Status: Accepted

## Context

[ADR 0027](0027-side-panels-and-origins-are-url-search-params.md) makes the host route own the panel params and the host slice map panel types to bodies. The first host was the Active Scene (PBI-NAV-002), so its `handout` and `entity` bodies live in `scene-play` and find their Scene through the Keeper's Active Scene query. They show "We couldn't find that." for any other Scene.

PBI-SPL-005 adds a second host: the Scene page in `scenario-preparation`, for a Prepared, Active, or Finished Scene. `scene-play` already imports `scenario-preparation`; the reverse import would create a slice cycle. PBI-SPL-003 will add an `item` panel, and later hosts will copy whatever this second host does.

The design is recorded in the [PBI-SPL-005 design record](../scene-play/issues/05-shared-material-entry.design.md), D1.

## Decision

- **A panel body lives in the slice that owns its subject.** The `handout` and `entity` bodies (`handout-panel-body`, `entity-panel-body`) and `handout-preview` live in `scenario-preparation`.
- **A body takes explicit identities and an optional origin.** It receives the Scene (or owner) ids and the subject id, plus `from` for its "Open full page" link, and loads and authorizes through the same queries as its full page. It never looks up its own context.
- **Hosts adapt their context.** The Active Scene's `handout-panel` and `entity-panel` stay in `scene-play` as adapters: they resolve the Keeper's Active Scene as before and pass its ids and `from="active-scene"`. The Scene page's `scene-panel` passes the route's ids and no `from`.
- **`scenario-preparation` imports no `scene-play` code,** enforced by an ESLint `no-restricted-imports` block beside the ADR 0027 one.

## Considered Options

- **Bodies in the slice that owns the subject, with adapters in the host slice (chosen).**
- **Bodies stay in `scene-play` and the Scene page route composes the host.** Rejected: puts panel logic in a thin route file and leaves preparation's bodies in the play slice, with an "Active Scene or explicit Scene" switch in each body.
- **The Scene page imports the `scene-play` panels.** Rejected: a slice cycle.

## Consequences

- **Reusable bodies:** a new host (the Item page, an Investigator page) or a new panel type (PBI-SPL-003's `item`) passes ids and an origin; no body changes.
- **One more indirection on the Active Scene:** its panels are thin adapters over the bodies.
- **Every new body follows its subject's slice,** and a host in another slice adapts to it.
- **Given up:** a body that finds its own context. Each host must know the ids its panels need.

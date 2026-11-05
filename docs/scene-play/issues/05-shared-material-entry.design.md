# Design: PBI-SPL-005: one shared material entry for Handouts, Non-Player Entity links, and Items on the Scene page and the Active Scene

## Triggers
- 2. Shared interface change: `HandoutPanel` and `EntityPanel` stop reading the Active Scene themselves; their bodies take an explicit Scene identity, and `HandoutPreview` moves slice.
- 3. New cross-layer pattern: a second panel host (the Scene page), the first one in `scenario-preparation`.
- 6. Open question with competing answers: where the Scene page's panel host lives and where its data comes from; what the Active Scene does with "Show content" before PBI-SPL-006.
- 7. UX: a new component and a changed journey, already covered by [scenario-preparation ux](../../../specs/scenario-preparation/ux.md) section 72, [scene-play ux](../../../specs/scene-play/ux.md) 21.4 and 21.5, [navigation ux](../../../specs/navigation/ux.md) section 3, and the prototype. Followed, not redesigned.

## Constraints
- ADR-0027: the host route declares `validateSearch: sidePanelSearchSchema`; the host slice maps panel types to bodies; params carry ids only; bodies load and authorize through their full page's queries; `shared` imports no slice (`frontend/eslint.config.js:41-61`).
- ADR-0028 (written with this record): panel bodies live in the subject's slice, take explicit ids, and hosts adapt.
- PBI-NAV-002 design record D3, D4, D5: one `SidePanelScopeProvider` per host page; body dispatch through the Strategy map `PANEL_BODIES` (`scene-play/components/active-scene-panel/active-scene-panel.tsx:251-257`); heading levels through `HeadingOffsetProvider` and `useHeadingTag` (`shared/providers/heading-offset/heading-offset-context.ts:28`).
- Slice direction (observed, not lint-enforced before this PBI): `scene-play` imports `scenario-preparation` (for example `scene-play/components/handout-panel/handout-panel.tsx:4-6`); `src/scenario-preparation` has no `@/scene-play` import; it does import `campaign-play` (for example `scenario-preparation/components/handout-page/handout-page.tsx:5`).
- Specs: scenario-preparation ux 72 (normative for the entry), 32, 41, 64.1 (each with a "Since PBI-SPL-005" note), 65 (Item Handouts); navigation ux 3; scene-play ux 12 (superseded by 21) and 21.4, 21.5, 21.7 (owned by PBI-SPL-006).
- CONTEXT.md terms: Handout, Non-Player Entity, Item, Reveal, Keeper.
- Cyclomatic complexity 10 (ESLint `complexity`).
- `frontend/CLAUDE.md`: one kebab-case folder per component with its test and story; slices plus `shared`; TanStack Query for server state.
- No game rules are involved.

## UX
- Selected option: the direction chosen 2026-11-04 (scenario-preparation ux 72 and the prototype's "Scene page" view) - `specs/scenario-preparation/ux.md` (existing, amended as listed under ADR).
- Prototype vs spec: the prototype shows a type chip plus a "Profile:" button on the Non-Player Entity row (`specs/navigation/prototype/active-scene.html:316`); section 72 says "{type label}: {profile name}" in muted plain text. Section 72 wins (the prototype is illustrative). "Match the prototype's entry structure" means the layout: title, second line, actions on the right, a top border between rows.

## Decisions

### D1: Where the Scene page's panel bodies live and where they get the Scene from
Today `HandoutPanel` and `EntityPanel` read `useActiveScene` and show not-found unless the viewer is the Keeper with an Active Scene (`handout-panel.tsx:24-31`, `entity-panel.tsx:105-112`), so they cannot serve a Prepared or Finished Scene page, and `scenario-preparation` cannot import them without reversing the slice direction.

| Metric | Option A: bodies move to scenario-preparation, scene-play adapts | Option B: bodies stay in scene-play, the route file composes the host |
| --- | --- | --- |
| Consistency | + The subject's slice owns the body; the host slice maps types to bodies as ADR-0027 says; import direction unchanged | - Panel-host logic in a route file, against "keep route files thin"; play slice serves preparation |
| Modifiability | + PBI-SPL-003's `item` panel and later hosts reuse bodies with ids and an origin | - Every new host repeats route-level wiring; bodies carry an "Active Scene or explicit Scene" switch |
| Testability | + Bodies tested with plain ids; adapters keep their loading and not-found tests | 0 Testable, but the host sits in an untested route file |
| Simplicity | 0 One move (`handout-preview`) and two thin adapters | - A source switch inside each body plus a ScenePage panel slot |
| Reversibility | + Moving files back is mechanical | 0 Equally reversible |
| Security and correctness | + Same queries as the full pages; the Scene page renders the host only for the Keeper with the Scene loaded, so a Player sends no panel request (NAV-UX-9) | + Same queries |

- **Chosen:** A, because of consistency with ADR-0027 ("host maps, body loads by id") and the slice direction - giving up some file churn (`handout-preview` moves with its test and story).
- **Rejected:** B - logic in route files and preparation bodies in the play slice. The Developer must not reintroduce it, and must not import `@/scene-play/**` from `scenario-preparation`.
- **Rejected:** the Scene page importing the `scene-play` panels directly - a slice cycle.
- **Shape of A:**
  - `scenario-preparation/components/handout-panel-body`: `HandoutPanelBody({ owner: SceneHandoutOwner, handoutId, from?: Origin })`, today's `HandoutBody` (`handout-panel.tsx:37-75`); the footer link passes `search` only when `from` is set.
  - `scenario-preparation/components/entity-panel-body`: `EntityPanelBody({ campaignId, scenarioId, sceneId, linkId, from?: Origin })`, today's `EntityLinkBody` and profile bodies (`entity-panel.tsx:117-212`).
  - `scenario-preparation/components/handout-preview`: moved unchanged from `scene-play` with its test and story; only its doc comment changes.
  - `scene-play` `HandoutPanel` and `EntityPanel` become adapters: they resolve the Keeper's Active Scene exactly as today and render the body with `from="active-scene"`.
  - `scenario-preparation/components/scene-panel`: the Scene page host, a `PANEL_BODIES`-style map; `handout` and `entity` to their bodies with no `from` and no action; `clues` and `reveal` to `null` (no panel).

### D2: The material entry's interface
| Metric | Option A: the entry takes the subject's own record | Option B: layout-only entry; callers pass title and second line as nodes |
| --- | --- | --- |
| Consistency | + One place maps a subject to title, second line, and panel; Strategy map like `PANEL_BODIES` | - Five call sites rebuild the second line, already duplicated today (`scene-link-section.tsx:110-119` vs `scene-material-section.tsx:194-203`) |
| Modifiability | + A new subject (PBI-SPL-003 `item` panel) changes one map entry | - A second-line change touches every caller |
| Testability | + "Second line per subject" and "title opens the right panel" are unit tests on one component | 0 Each caller needs its own tests |
| Simplicity | + Small union, no callbacks | 0 Thinner component, more caller code |
| Reversibility | + Internal API | + Same |
| Security and correctness | + SP-UX-107 ("same title, second line, order") holds by construction | - Holds only by convention |

- **Chosen:** A, because SP-UX-107 holds by construction and it is directly testable - giving up per-caller customization of the second line (intended).
- **Rejected:** B - invites drift between the Scene page and the Active Scene. The Developer must not reintroduce it.
- **Shape of A:** `scenario-preparation/components/material-entry/material-entry.tsx` exports `MaterialEntry` and `MaterialEntryList`.
  - `MaterialEntrySubject`:
    - `{ type: 'handout'; handout: HandoutSummary; page?: LinkTarget }`
    - `{ type: 'entity'; link: NonPlayerEntityLink }`
    - `{ type: 'item'; link: ItemLink; page: LinkTarget }`
  - `MaterialEntryProps`: `subject`; `titleId: string` (the focus target); `headingLevel?: HeadingLevel` (default 3, rendered through `useHeadingTag`); `status?: ReactNode`; `action?: ReactNode`.
  - Title rule: a subject with `page` renders a router `Link` inside the heading; otherwise a button with `aria-haspopup="dialog"` that calls `useSidePanel().open(panelOf(subject), event.currentTarget)`. The button is its own sub-component so `useSidePanelScope` is called only where a host exists.
  - `MaterialEntryList({ as: 'ol' | 'ul', children })`: one bordered list (Card), rows separated by a top border (`divide-y`).

### D3: Item page Handouts (`handout-section` is shared with the Item page, ux 65)
Section 72 scopes the entry to the Scene page and the Active Scene, but ux 65 says section 41 applies to Item Handouts and 41 now says each entry is the material entry. The Item page hosts no panel, and the handout panel needs a Scene owner.

| Metric | Option A: Item page uses the entry with a link title | Option B: `handout-section` keeps the old row for Item owners |
| --- | --- | --- |
| Consistency | + One rendering; same as Items, whose titles also stay links (ux 64.1 note); matches 65's "section 41 applies" | - Two row renderings in one component, chosen by owner type |
| Modifiability | + When the Item page gets a panel host, only `page` is dropped | - That change must also delete the old branch |
| Testability | + Same unit tests | 0 Both branches need tests |
| Simplicity | + One branch fewer | - An extra conditional |
| Reversibility | + Easy | + Easy |
| Security and correctness | 0 No authorization change; the Item page gains an `h3` per Handout | + The Item page does not change |

- **Chosen:** A, for consistency and simplicity - giving up a small visible change on the Item page (an `h3` per Handout, row layout, no visible numbers). Accessible names, the focus target `#handout-link-{id}`, move controls, and outcomes stay; `e2e/tests/item-handouts.spec.ts:68,97,112,207` still find a link. Approved at the gate (G1).
- **Rejected:** B - two renderings of one list. The Developer must not reintroduce it.

### D4: The Active Scene's existing lists before PBI-SPL-006
Section 72's Active Scene action slot is "Reveal..." or nothing, but the current page has "Show content" (`scene-play/components/scene-material-section/scene-material-section.tsx:130-134`), and SPL-UX-25 (`specs/scene-play/ux.md`, PBI-SPL-002 criteria) asserted it. PBI-SPL-006 was listed as the PBI that updates SPL-UX-25.

| Metric | Option A: follow 72 now (drop Show content and the inline description) | Option B: keep "Show content" in the action slot until PBI-SPL-006 |
| --- | --- | --- |
| Consistency | + Matches 72 and 21.4, 21.5; the handout panel already renders the same `handout-preview` (`handout-panel.tsx:70-72`), the entity panel the description (`entity-panel.tsx:193-203`) | - Contradicts 72's action-slot list; needs a body slot under the entry only for the interim |
| Modifiability | + PBI-SPL-006 only regroups | - PBI-SPL-006 must also remove the interim controls |
| Testability | + E2E opens the panel instead | 0 Existing E2E unchanged, but rewritten in PBI-SPL-006 anyway |
| Simplicity | + Removes the Collapsible, the inline preview, and description code | - Keeps them and adds a slot |
| Reversibility | + Easy | + Easy |
| Security and correctness | + Reveal behavior and ids (`reveal-trigger-{id}`) unchanged | + Same |

- **Chosen:** A - giving up SPL-UX-25's "Show content" one PBI early (amended: a Handout's title opens its current content in the side panel). The Active Scene's profile link becomes plain text; the profile is reached through the panel's "Open full page" (`?from=active-scene`). Approved at the gate (G2).
- **Rejected:** B - a temporary slot the final design does not have. The Developer must not reintroduce it.

### Single-option decisions
- Scene page host wiring: the route gets `validateSearch: sidePanelSearchSchema` (as `routes/campaigns.$campaignId.active-scene.tsx:6`); `SceneDetail` wraps its content in `SidePanelScopeProvider` and renders `ScenePanel` with `fallbackRef` set to its `h1` (`scenario-preparation/components/scene-page/scene-page.tsx:94,135`), because this mirrors `scene-play/components/active-scene-page/active-scene-page.tsx:55,90`.
- Origin from the Scene page: no `from` (ux 72). The Handout page shows its structural "Back to the Scene"; profile pages show "Back to Non-Player Entities" (`scenario-preparation/components/human-npc-page/human-npc-page.tsx:150`), as from today's profile link. No new origin (G3).
- No footer action on panel bodies now, because "Reveal..." in the panel footer is PBI-SPL-006's (scene-play ux 21.7).
- Focus targets: `#handout-link-{id}` moves onto the title (button, or link on the Item page); `#item-link-{linkId}` stays on the Item title link; the Non-Player Entity target moves from `h3[data-link-heading]` (`scene-link-section.tsx:43,107`) to the title button with `id="entity-link-{linkId}"`, because ux 72 says the button keeps the focus-target id. The heading drops `tabIndex=-1`.
- Focus after unlink or delete: unchanged, the section `h2` (`scene-link-section.tsx:80`, `scene-item-section.tsx:301`).
- Non-Player Entity second line: "{type label}: {profile name}" in muted plain text with `NON_PLAYER_ENTITY_TYPE_LABELS`; the description leaves the list.
- Item second line: `<Badge variant="secondary">Item</Badge>`, as in `scenario-preparation/components/handout-badges/handout-badges.tsx:27`.
- Handout second line: `HandoutBadges`, unchanged.
- Status slot: pure; on the Active Scene the existing `RevealedTo` (`scene-material-section.tsx:86-89`) is passed as-is. The 21.4 "not yet:" format is PBI-SPL-006's.
- Visible numbering: the Handout `ol` keeps list semantics and drops `list-decimal` (`handout-section.tsx`, the `ol` className), because the Active Scene's `ol` has none (`scene-material-section.tsx:109`), SP-UX-107 requires both to look the same, and the prototype has none. Move announcements still say "position {n} of {total}" (G4).
- Heading levels: `h3` on the Scene page, the Item page, and the current Active Scene (SPL-A11Y-8; `e2e/tests/active-scene.spec.ts:83,88`); `headingLevel` exists for PBI-SPL-006's groups.
- Lint guard: a `no-restricted-imports` block for `src/scenario-preparation/**` banning `@/scene-play/**`, with a case in `frontend/eslint.config.test.ts`, because it enforces ADR-0028 as ADR-0027 is enforced (`frontend/eslint.config.js:41-61`) (G5).

## Patterns
- **Used:** Strategy at `material-entry` (subject type to second-line renderer and panel) and `scene-panel` (panel type to body) - force: a conditional on subject or panel type; reuses `PANEL_BODIES` (`active-scene-panel.tsx:251-257`).
- **Used:** Adapter at `scene-play/components/handout-panel` and `entity-panel` - force: interface mismatch at the slice boundary (bodies need explicit Scene ids; the play host has the Active Scene query).
- **Rejected:** Template Method for the three section components - composition with slots covers the shared parts; a base "section" is a speculative layer.
- **Rejected:** Factory or Builder for entry props - the subject union takes the domain records directly; no construction logic.
- **Rejected:** Composite - no recursive part-whole structure.
- **Rejected:** Decorator for the panel-or-link title - one small conditional (button vs `Link`).
- **Rejected:** Observer - live updates already flow through query invalidation (ADR-0009).
- **Rejected:** State - no lifecycle switch; Finished only hides actions, as the sections already do.

## Invariants
- `scenario-preparation` never imports `scene-play`; `shared` never imports a slice.
- Every existing Scene page accessible name, outcome, and status message is unchanged: "Move {title} up/down", "Edit {name}", "Unlink {name}", "{x} added/linked/saved/unlinked/deleted.", the move polite announcements, and the 409 alerts.
- Focus after create, link, or save lands on the entry title: `#handout-link-{id}`, `#entity-link-{linkId}`, `#item-link-{linkId}`. After unlink or delete it lands on the section `h2`.
- The title is inside the entry's heading; a panel title is a `button` with `aria-haspopup="dialog"`, and focus returns to it when the panel closes (SP-A11Y-60).
- Scene page panels load through the same queries as their full pages, render only for the Keeper with the Scene loaded, have no "Reveal...", and link to full pages without `from`.
- Active Scene panels keep `from=active-scene` and their current not-found behavior.
- `material-entry` holds no Reveal logic and no section-specific actions; every function stays at complexity 10 or below.
- Active Scene Reveal triggers keep `id="reveal-trigger-{id}"` and the accessible name "Reveal {title}".

## Implementation plan
1. Move `scene-play/components/handout-preview` to `scenario-preparation/components/handout-preview` (with test and story); add `handout-panel-body` and `entity-panel-body` with optional `from`; turn `scene-play` `handout-panel` and `entity-panel` into adapters - D1.
2. `frontend/eslint.config.js` and `frontend/eslint.config.test.ts`: the lint guard - invariant.
3. `scenario-preparation/components/scene-panel`: host map, tests, story - D1.
4. `routes/campaigns.$campaignId.scenarios.$scenarioId.scenes.$sceneId.index.tsx` (`validateSearch`) and `scene-page.tsx` (provider and `ScenePanel`) - host wiring.
5. `scenario-preparation/components/material-entry`: `MaterialEntry`, `MaterialEntryList`, tests, stories (Handout, Non-Player Entity, Item; Scene page and Active Scene contexts; Item page link title) - D2.
6. `handout-section.tsx`: the entry with `MoveControls` in the action slot; Item owners pass `page` - D2, D3.
7. `scene-link-section.tsx`: the entry with Edit and `UnlinkControl` unchanged in the action slot; drop description and profile link; focus query by `#entity-link-{id}` - D2.
8. `scene-item-section.tsx`: the entry with `page` to the Item page and `UnlinkControl` in the action slot - D2.
9. `scene-play/components/scene-material-section.tsx`: the entry with `RevealedTo` as status and "Reveal..." or nothing as action; drop the Collapsible, inline preview, and description - D4.
10. Update unit tests and stories: scene-page, handout-section, scene-link-section, scene-item-section, scene-material-section, item-page if affected, active-scene-panel, handout-panel, entity-panel.
11. Update E2E and take the screenshots (below).
12. Tick the PBI per `docs/backlog.md`. The ux amendments are already committed with this record.

## Reuse
- Using: `HandoutBadges` for the Handout second line; `MoveControls` and `usePreparedOrderReordering` unchanged; `useSidePanel`, `SidePanel`, `SidePanelContent`, `SidePanelScopeProvider`, `sidePanelSearchSchema` for the host; `HeadingOffsetProvider` and `useHeadingTag` for levels; `Badge` and `Card`; `NON_PLAYER_ENTITY_TYPE_LABELS` and `NON_PLAYER_ENTITY_PROFILE_PATHS`; `describeHandoutOwner` for the Handout page target; `RevealedTo` as status content; the existing `UnlinkControl`s unchanged.
- Not using: `RichTextView` in the entry - the description moves into the panel. `Collapsible` on the Active Scene - D4. `useOriginBackLink` on the Scene page - no origin from the Scene page.

## TDD units
- material-entry: the title is in an `h3` by default and at `headingLevel` when given; inside `HeadingOffsetProvider` the level shifts.
- material-entry: a Handout subject shows `HandoutBadges` with kind and visibility; an entity subject shows "{type label}: {profile name}" as plain text with no link; an Item subject shows the "Item" badge.
- material-entry: a panel title is a button with `aria-haspopup="dialog"` and the given `id`; clicking it opens `handout` with the Handout id or `entity` with the link id and records the trigger for focus return (SP-A11Y-60).
- material-entry: a subject with `page` renders a link with the given `id` and no button.
- material-entry: status and action slots render when given and are absent otherwise; `MaterialEntryList` renders `ol` or `ul` in one bordered container.
- handout-panel-body and entity-panel-body: loading, error, not-found, ready with explicit ids; "Open full page" carries `from` only when given.
- scene-panel: `handout` and `entity` params open their bodies; `clues` and `reveal` params open no panel; no "Reveal..." in the footer.
- scene-play adapters: not-found for a Player or no Active Scene, with no Scene or profile request (unchanged); the ready link carries `from=active-scene`.
- handout-section: Scene owners get button titles, Item owners link titles; `#handout-link-{id}` takes focus after add; move controls keep their names and hide when Finished or with one Handout.
- scene-link-section: the title button takes focus after link or save; Edit and Unlink names unchanged; no description in the list; after unlink focus goes to the section `h2`.
- scene-item-section: the title is a link with `#item-link-{linkId}`; the "Item" badge shows; Unlink unchanged.
- scene-page: with panel search params the panel opens over the page; a Player gets the not-found page and no panel request.
- scene-material-section: titles are `h3` buttons that open the right panel; "Reveal..." only on Player-facing Handouts and Non-Player Entities; "Revealed to {names}" in the status slot; no "Show content".
- Lint: a file under `src/scenario-preparation/` importing `@/scene-play/...` is flagged.

## E2E coverage
- New describe "Side panels from the Scene page" in `e2e/tests/navigation.spec.ts`:
  - SP-UX-108: a Handout title opens a `dialog` named by the title; the URL gains `panel=handout&handout=`; "Open full page" leads to the Handout page with no `from` and "Back to the Scene".
  - SP-UX-108: an entity title opens "What Players see" (with the description formatting) and "Profile"; "Open full page" leads to the profile page with "Back to Non-Player Entities".
  - SP-A11Y-60: the title has `aria-haspopup="dialog"`; Escape returns focus to it.
  - NAV-UX-5 on the Scene page: a reload reopens the panel.
  - Screenshots: `docs/scene-play/screenshots/spl-005-scene-page.png` and `docs/scene-play/screenshots/spl-005-active-scene.png`.
- `e2e/fixtures/scene-handouts.ts:12`: `handoutLinks` becomes `handoutTitles` (works on both pages); add `openHandoutPageFromScene` (title, then "Open full page").
- `e2e/tests/scene-handouts.spec.ts:125-126`: the title has the text and focus; `:144`, `:193`: reach the Handout page through the panel.
- `e2e/tests/scene-file-handouts.spec.ts:129,174`: use `openHandoutPageFromScene`.
- `e2e/tests/scene-links.spec.ts:145`: the title button is focused (SP-A11Y-33 as amended); `:146-153`: description and formatting checked in the entity panel (SP-UX-50, SP-UX-52 as amended); `:158`: the profile through the panel's "Open full page"; `:387`: the profile name is text ("Mythos Creature: Ghoul").
- `e2e/tests/manual-preparation.spec.ts:53-54`: profile names are text; `:72`: through the panel when on the Scene page.
- `e2e/tests/scene-item-links.spec.ts:95` unchanged (still a link); add the "Item" badge check (SP-UX-107).
- `e2e/tests/active-scene.spec.ts:83,88` unchanged (`h3`); `:91-92`: open the Handout panel by title and assert the content (SPL-UX-25 as amended); add one entity panel check.
- `e2e/tests/item-handouts.spec.ts` and `e2e/tests/reveals.spec.ts`: expected to pass unchanged; fix only selectors.
- Checked against: SP-UX-50, 52, 64, 107 to 109; SP-A11Y-30, 33, 37, 40, 60; SPL-UX-9, 20, 25; SPL-A11Y-8; NAV-UX-4, 5, 7, 9. Only the amended criteria change assertions.

## ADR
- ADR-0028: [Panel bodies live in the slice that owns their subject, take explicit identities, and hosts adapt](../../adr/0028-panel-bodies-live-in-the-subject-slice-and-hosts-adapt.md).
- UX amendments committed with this record:
  - scenario-preparation ux 72: the back-link sentence corrected (G3); Item page Handouts use the entry with link titles (G1); no visible numbers (G4). SP-UX-50, SP-UX-64, SP-A11Y-33, SP-A11Y-40 carry "Amended by PBI-SPL-005" notes.
  - scene-play ux: SPL-UX-25 amended (G2); section 12 notes the PBI-SPL-005 change. 21.4 and 21.5 are unchanged (status slot pure; format is PBI-SPL-006's).
  - navigation ux: section 3 "Scene page host" refinement; section 7 adds `scene-panel` and the scene-scoped bodies; section 10 rollout note.

## Phases
- Phase 1: panel bodies, adapters, lint guard, `scene-panel`, Scene page wiring; checkpoint: `refactor(scene-play): extract scene-scoped panel bodies into scenario-preparation (PBI-SPL-005)`
- Phase 2: `material-entry` and the three Scene page sections with tests and stories; checkpoint: `feat(scenario-preparation): shared material entry on the Scene page (PBI-SPL-005)`
- Phase 3: Active Scene lists, E2E, screenshots, PBI tick-off; checkpoint: `feat(scene-play): material entry on the Active Scene (PBI-SPL-005)`

## Human decisions
- 2026-11-05, relayed by the Orchestrator: "approve all G1-G5". No changes requested.
  - G1: Item page Handouts use the entry with link titles (D3 A).
  - G2: the Active Scene drops "Show content", the inline description, and the profile link now; SPL-UX-25 amended (D4 A).
  - G3: correct ux 72's back-link sentence; no new origin.
  - G4: no visible numbering on the Handout list; the `ol` stays.
  - G5: commit ADR-0028 and add the lint guard.

## Revisions

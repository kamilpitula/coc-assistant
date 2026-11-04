# Design: PBI-NAV-002: Side panel kept in the URL and back links that remember their origin, applied to Clues from the Active Scene

## Triggers
- 7 UX: a new `side-panel` and `back-link` component and a changed journey (Clues open over the Active Scene). Covered by the existing `specs/navigation/ux.md`.
- 3 New cross-layer pattern: the app's first search params (`validateSearch`; today every route uses `Route.useParams` only, e.g. `routes/campaigns.$campaignId.active-scene.tsx:10`), plus a history-state marker and a heading-offset context.
- 2 Shared interface change: `RichTextView.headingOffset` (`shared/components/rich-text-view/rich-text-view.tsx:54`, today `0 | 1`) and the profile-view heading components.
- 5 Several bounded contexts: scene-play (Clues, Active Scene), scenario-preparation (profile pages, Scene Handout page), campaign-play (origin hook).
- 6 Explorer open questions (a)-(g) have competing answers.

## Constraints
- `specs/navigation/ux.md` sections 1, 3-9 are normative. Also normative: `specs/navigation/spec.md` Constraints, Guardrails and Scenarios, and `specs/scene-play/ux.md` sections 11, 14, 15, 21.9 and SPL-UX-31..37 / SPL-A11Y-8. The prototype is illustrative only (ux.md:3).
- Refinement protocol: any change to panel types, params or origins updates ux.md sections 1, 3 and 4, the zod schema and its tests together.
- ADR-0009: live updates already invalidate the query keys the panels reuse. No new topic.
- No game rules apply.
- CONTEXT.md terms: Active Scene, Clue, Reveal, Non-Player Entity link, Handout, Keeper, Player, Investigator. "Side panel" and "origin" are UI terms, not domain terms, so there is no CONTEXT.md gap.
- Layering: `frontend/src/shared` imports no slice today. It must stay that way.
- Existing slice-edge precedent: campaign-play imports scene-play's `useActiveScene` (`campaign-play/components/campaign-layout/campaign-layout.tsx:7,39`), and that query runs on every Campaign page.
- Patterns already in the code: Link options passed as objects spread into `Link` (`scenario-preparation/services/handoutOwner.ts:40-62`, `handout-page.tsx:113`); render maps in a `Record` (`mythos-creature-view.tsx`, `SECTION_BODIES`); strict zod objects (`scene-play/services/revealSchemas.ts`); focus returns through `onCloseAutoFocus` with `preventDefault` (`human-npc-page.tsx:221-224`); navigation-state augmentation (`campaign-play/types/navigationState.ts:2-15`).
- Cyclomatic complexity of 10 or below; no new suppressions.
- No new dependency: `@radix-ui/react-dialog`, `class-variance-authority` and `lucide-react` are already in `frontend/package.json`.

## UX
- Selected option: variant A - `specs/navigation/ux.md` (existing; gap fills added to section 3 and the component mapping in section 7). Already linked from `specs/navigation/spec.md:16`.
- UX gap fills (human-confirmed; go into ux.md section 3):
  - G1: Both entry points become buttons with `aria-haspopup="dialog"`, not links. Accessible names stay "{name}'s Clues". Follows scene-play ux 21.3 and the prototype (lines 385, 485).
  - G2: The panel `h2` shows the kind label ("Clues", "Handout", ...) until the subject title is known, and in error/not-found states. Same element, so focus is kept.
  - G3: Incomplete/invalid panel params (unknown `panel`, missing id) open no panel, silently. Matches the unknown-`from` rule.
  - G4: On the clues panel, a Player without an Approved Investigator sees "We couldn't find that." The Clues page keeps "No Clues to show".
  - G5: Heading levels. Clues panel: Scene groups h3, Clues h4, revealed rich text from h5. Entity panel: "What Players see" and "Profile" h3, Player-facing description from h4, profile name h4, profile sections h5, inner headings and Keeper-notes rich text clamped at h6. Handout and reveal panels: content headings start at h3 under the panel h2.
  - G6: "Open full page" appears only in the ready state, in addition to ux.md's "no link when not found".
  - G7: The panel says nothing to screen readers. While open, the Active Scene page's own live regions are hidden from them (outside the modal); nothing re-announced afterwards.
  - G8: The panel renders once the Active Scene query has loaded. `handout`/`entity`/`reveal` panels need the Keeper's Active Scene; without it (a Player, or no Active Scene) they show not-found with no request. The `clues` panel works whether or not a Scene is Active.

## Decisions
### D1: Where panel params live and how they are parsed
Chosen: A - the host route declares `validateSearch` with a shared, never-throwing schema; `useSidePanel` parses it into a discriminated union. (Consistency, Modifiability, Correctness; give up a few lines of route boilerplate.) Rejected B (root-route validateSearch: panels become a global URL concern no page can serve) and C (raw location.search: untyped, duplicated parsing). Safe with NAV-001: `campaignSectionOf` uses the leaf route id (`routes/campaigns.$campaignId.tsx:17-18`), so search params cannot change the current tab.
### D2: History on open, replace and close
Chosen: A - push with history-state marker `sidePanelOpenedHere`; a second panel replaces and keeps the marker; close calls `history.back()` when the marker is present, otherwise navigates with `replace` minus panel params. (Correctness vs ux.md section 3; history.state survives reload; fresh tab replaces.) Rejected B (always replace on close: browser back after close reopens the panel, violating ux.md 3) and C (in-memory stack: lost on reload).
### D3: Focus return
Chosen: A - `SidePanelScope` context holds `triggerRef` and `titleRef`; openers call `open(panel, event.currentTarget)`; `onCloseAutoFocus` prevents default and focuses trigger if `isConnected`, else host `h1` ref. (Correctness NAV-A11Y-2 incl. Safari + reload; Modifiability for SPL-006 child routes behind Outlet.) Rejected B (Radix built-in restore: body focus in Safari/after reload).
### D4: Panel shell and body dispatch
Chosen: A - generic shell in `shared/components/side-panel`; host maps `Record<PanelType, Body>` in scene-play (`active-scene-panel`); each body loads with its page's hooks and renders `SidePanelContent`. (Consistency/layering: shared stays slice-free; Modifiability: new type = one entry + one body.) Rejected B (shared switches over all types: shared imports slices) and C (each opener renders own SidePanel: breaks one-at-a-time).
### D5: Heading levels inside extracted bodies
Chosen: A - `HeadingOffsetProvider` context with pure `headingTag(level)` clamped h1..h6; heading components read it; `RichTextView` effective offset = prop + context, clamped 0..3. (Consistency with frontend/CLAUDE.md provider-beyond-2-levels rule; no signature changes; page levels unchanged.) Rejected B (drilled offset props: ~10 signature changes). Panel offsets: clues +1, entity profile +3 (What-Players-see description uses own prop 1), handout -1, reveal -1; rich-text clamped 0..3.
### D6: Where the "Back to {Active Scene title}" data comes from
Chosen: A - `campaign-play/hooks/useOriginBackLink(campaignId, from, fallback)` calls `useActiveScene` (deduplicated with layout query) then pure shared `resolveBackLink`. Signature becomes `resolveBackLink(from: unknown, fallback, originTargets: Record<Origin, BackLinkTarget>)` (label needs the title; function stays pure). Before title known / no Active Scene: label "Back to the Active Scene". Rejected B (shared reads query cache with scene-play keys: first slice import in shared) and C (layout-provided context: new provider for one value).
### D7: Entry point element (G1)
Chosen: A - button calling `open()`. (Consistency with scene-play ux 21.3 + prototype; one open path; correct dialog role.) Rejected B (`Link` with search: duplicates hook history rules in Link props). Give up middle-click open-in-new-tab; URL still shareable.
### Single-option decisions
- `Sheet`: add shadcn `sheet.tsx` source to `shared/components/ui` (uses installed `@radix-ui/react-dialog`; no package.json change; close button target >= 24x24px).
- `from` on full pages: each route declares `validateSearch: originSearchSchema`, reads `Route.useSearch()`, passes `from` as prop; components stay router-agnostic.
- Handout body reuses `HandoutPreview` + `HandoutBadges`; title/state from `useHandout` (deduplicated); owner = Keeper's Active Scene; footer uses `describeHandoutOwner(owner).handoutPage(id)` + `from`.
- Reveal body: reveal found in `KeeperActiveScene.reveals`; meta line extracted from `revealed-in-scene-section.tsx:44-47` into a shared scene-play component; renders `RevealedContent`; no footer.
- Entity body: link from `useScene(...).nonPlayerEntityLinks` (same query as `scene-material-section.tsx:39`); profile from `useHumanNpc`/`useMythosCreature` by `link.nonPlayerEntity.type`; views render without actions; footer uses `NON_PLAYER_ENTITY_PROFILE_PATHS` + `from`.
- Clues body: `CluesList` extracted from `clues-page.tsx:105-157`; `useCluesRead` reused for role gating; announcement ignored (G7).

## Patterns
- Used: Strategy (Record map) at `scene-play/components/active-scene-panel` (dispatch on panel type, 4 kinds); provider for heading offset + panel scope (values needed 2+ levels deep / across Outlet).
- Rejected: State (lifecycle is just "URL param set"); Command (two pure functions suffice); Facade (no incompatible interface); Observer (ADR-0009 invalidation already flows).

## Invariants
- `frontend/src/shared` imports no slice.
- Panel and `from` params carry identifiers only; schemas never throw (`.catch(undefined)`); every key optional so existing Links need no `search` prop.
- Open/close pass `resetScroll: false`, carry forward current `location.state` (e.g. statusMessage) + marker; page under panel not remounted; no page query refetch on open/close.
- Each body uses same query hooks + `enabled` gates as its full page. Player sends no request for handout/entity/reveal or another Investigator's Clues.
- `from` resolves only through the allow-list table; unknown values fall back silently.
- Page heading levels unchanged with no provider present.
- Complexity <= 10, no new suppressions, no package.json dependency changes.
- If a required behavior (e.g. back-navigation scroll) does not hold in TanStack Router, Developer escalates instead of working around.

## Implementation plan
1. `shared/components/ui/sheet.tsx`, then `shared/providers/heading-offset` (HeadingOffsetProvider, useHeadingOffset, pure headingTag), then RichTextView numeric offset (per-offset node classes 1..3).
2. `shared/components/side-panel/`: sidePanelParams.ts (PANEL_TYPES, flat sidePanelSearchSchema, OpenPanel union, toOpenPanel, toPanelSearch); sidePanelHistory.ts (pure openNavigation/closeNavigation + HistoryState augmentation); side-panel-scope.tsx, side-panel.tsx (Sheet, header, focus), side-panel-content.tsx (kind line, h2, states, footer/action slot); `shared/hooks/useSidePanel.ts`.
3. `shared/components/back-link/`: backLinkOrigin.ts (ORIGINS, originSchema, originSearchSchema, resolveBackLink) + back-link.tsx; then `campaign-play/hooks/useOriginBackLink.ts`.
4. Extend `shared/test-support/routerMock.ts` (location.search, useRouter().history.back spy, MockLink serializing search into href).
5. Origin back links: routes investigator.clues, investigators.$investigatorId_.clues, human-npcs.$humanNpcId, mythos-creatures.$mythosCreatureId, scenes.$sceneId.handouts.$handoutId (validateSearch + from prop); CluesPage (list + NoClues), HumanNpcPage (:112-119), MythosCreaturePage (:113-120), HandoutPage (:113-116, optional from, passed only by SceneHandoutRoute).
6. Extract `scene-play/components/clues-list` from clues-page.tsx with headings via useHeadingTag; route profile-view headings through it: HumanNpcView:37, MythosCreatureHeading:20, ProfileSection:26, h3s in npc/monster characteristics + defenses views.
7. Panel bodies in scene-play: clues-panel, handout-panel, entity-panel, reveal-panel; then active-scene-panel (host map).
8. Active Scene: validateSearch on routes/campaigns.$campaignId.active-scene.tsx; ActiveScenePage wraps loaded body in SidePanelScope + renders ActiveScenePanel with headingRef; Player view h1s (active-scene-player-view.tsx:17,27) get headingRef + tabIndex=-1.
9. Entry points: investigators-present-section.tsx:123-130 and revealed-to-section.tsx:28-30 become buttons calling open.
10. Stories + unit tests per new component; E2E (below); docs (ux.md 3 + 7, ADR).

## Reuse
Using: useCluesRead, useHandout, useScene, useHumanNpc, useMythosCreature, useActiveScene, HandoutPreview, HandoutBadges, RevealedContent, HumanNpcView, MythosCreatureView, describeHandoutOwner, NON_PLAYER_ENTITY_PROFILE_PATHS, buttonVariants link style, Skeleton, StoryProviders, routerMock, reveals.spec fixtures, navigation.spec structure. Not using: Radix built-in focus restore; HandoutPreview's own gone message (panel not-found replaces it); CluesPage announcement in panel (G7).

## TDD units
sidePanelParams round-trips per type; Player clues w/o investigator; unknown/missing/garbage -> null; never throws. sidePanelHistory: open pushes w/ marker + keeps statusMessage; open-while-open replaces + keeps marker; close back w/ marker, replace w/o. useSidePanel (real memory router): open/replace/close/browser-back/resetScroll:false. SidePanel: focus to h2 on open; close returns to trigger (or h1 when gone/absent); Escape/outside-click/close-button close; labelledby h2; Close named. SidePanelContent: loading Skeleton aria-busy; error "We couldn't load this." + Try again; not-found "We couldn't find that." no footer; ready footer link; action slot. headingTag clamps; RichTextView 0..3 + context. resolveBackLink: active-scene/missing/unknown/URL-string/non-string; useOriginBackLink: title known/unknown/no Active Scene. CluesPanel: Keeper ready (title, h3/h4, footer investigators/{id}/clues?from=active-scene); Player (footer investigator/clues?from=active-scene); wrong-role not-found no request; null not-found; error+retry. Handout/Entity/Reveal panels: ready/not-found/no-request for Player or non-Keeper scene; entity missing-description copy, heading levels, no Edit/Delete/Duplicate; reveal no footer. ActiveScenePanel dispatch per type. Entry points call open with right panel + trigger. Pages: back link from=active-scene vs fallback (Clues Keeper+Player, Human NPC, Mythos Creature, Scene Handout). CluesList: page h2/h3 unchanged.

## E2E coverage
New navigation.spec.ts describe "Side panel and origin back links": Keeper reads Clues without leaving Active Scene (button opens dialog named "Lucy Ward's Clues", URL panel=clues&investigator=; h4 Clues; focus h2 then Escape returns to button (NAV-A11Y-2); browser back closes w/ h1+scroll unchanged; close button + outside click close; reload reopens (NAV-UX-5)); full page from Active Scene links back ("Open full page" -> ?from=active-scene -> "Back to The Corbitt House" -> Active Scene (NAV-UX-7)); direct open -> structural parent ("Back to Lucy Ward" (NAV-UX-8)); unknown origin ignored (?from=wall + ?from=https://example.com -> "Back to Lucy Ward"); NAV-UX-9 Harvey opens ?panel=clues&investigator=<lucyId> -> "We couldn't find that.", no Open-full-page, no Clues request; Player Harvey button -> panel -> Open full page -> "Back to The Corbitt House"; NAV-UX-7 on Human NPC / Mythos Creature / Scene Handout pages (?from=active-scene -> "Back to {title}"); NAV-A11Y-4 320px panel full width, no sideways scroll. NAV-UX-6 by unit tests; second-panel E2E deferred to SPL-006. reveals.spec.ts changes: line 214 (SPL-UX-30) + line 310 (SPL-UX-29) use button+panel; lines 380-387 (SPL-UX-33) panel dialog h4 [FRONT_DOOR]; "Back to Lucy" assertion moves to direct-open scenario. Exception: handout/entity/reveal panels have no entry point until SPL-005/SPL-006 (unit tests here).

## ADR
ADR-0027: Side panels and origins are URL search params validated per route with non-throwing zod schemas. Context: first validateSearch in the app + ux.md app-wide default. Decision: D1, D2, D6 (host route schema, history marker, allow-list, slice-free shared). Consequences: typed shareable URLs; every new host/origin edits schema + ux.md; give up untyped generic previous-page link. D3, D4, D5, D7 reversible, stay in record.

## Phases
1. Shared foundations (steps 1-4). Checkpoint: `feat(nav): side panel, back link and heading offset foundations (PBI-NAV-002)`.
2. Origin back links on full pages (step 5). Checkpoint: `feat(nav): back links remember the Active Scene origin (PBI-NAV-002)`.
3. Clues panel, host and entry points, with E2E (steps 6 Clues, 7 clues-panel, 8, 9 + E2E). Checkpoint: `feat(nav): Clues open in a side panel from the Active Scene (PBI-NAV-002)`.
4. Handout, entity, reveal bodies + profile heading offsets (rest of 6, 7, docs step 10). Checkpoint: `feat(nav): handout, entity and reveal panel bodies (PBI-NAV-002)`.

## Human decisions
- Approved verbatim 2026-11-04, including UX gap fills G1-G8, three-argument resolveBackLink (D6), and ADR-0027.

## Revisions
(empty)

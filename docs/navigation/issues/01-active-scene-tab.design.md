# Design: PBI-NAV-001: Permanent "Active Scene" Campaign tab with a live "Live" badge

## Triggers
- 7 UX: a new tab, a new `live-badge` component, and a changed journey (Wall -> Active Scene in one click).
- 6 Explorer open questions with competing answers: the current-tab mapping for sub-routes, where the badge gets its data and what "no second request" means, and how to build the accessible name.
- 3/5 (minor): Campaign Play's header now shows Scene Play's Active Scene query. Precedent: `frontend/src/campaign-play/components/campaign-page/campaign-page.tsx` already imports scene-play.

## Constraints
- ADR-0009: the `activeScene` topic already invalidates `activeSceneQueryKeys.detail` (`frontend/src/campaign-play/services/liveTopics.ts:20`). No new topic or subscription.
- `specs/navigation/ux.md` sections 2, 6, 7, 8, 9 are normative. `specs/navigation/spec.md`: frontend only, Gherkin scenarios. The prototype is illustrative only.
- `specs/campaign-overview/ux.md` section 2 (already amended for PBI-NAV-001, line 47) and CO-A11Y-9 (line 304): the page never scrolls sideways at 320px.
- CONTEXT.md terms: Campaign Member, Keeper, Player, Scene, Active Scene, Investigator.
- No game rules involved.
- Existing patterns:
  - The header is presentational; data is read in `CampaignFrame` (`campaign-layout.tsx:38`, `useCampaign`).
  - `aria-current="page"` plus border and weight (`campaign-header.tsx:65-70`).
  - `sr-only` and `aria-label` name extensions (`attention-list.tsx:86`, `scene-link-section.tsx:130`).
  - routerMock forwards `aria-label` (`shared/test-support/routerMock.ts:33-40`).
- Cyclomatic complexity of 10 or below (`frontend/eslint.config.js:25`).

## UX
- Selected option: variant A, "a Campaign tab for the Active Scene" - `specs/navigation/ux.md` (existing, unchanged; selected 2026-11-04). Already linked from `specs/navigation/spec.md` (Architecture, UX specification). No new options were needed.

## Decisions

### D1: Where the Live badge reads the Active Scene
| Metric | A: CampaignFrame reads `useActiveScene`, passes `hasActiveScene` | B: header calls `useActiveScene` itself |
| --- | --- | --- |
| Consistency | + matches CampaignFrame reading useCampaign while the header stays pure | - first data hook in a presentational component |
| Modifiability | + the header API grows by one boolean; the data source can change without touching it | 0 the header is coupled to Scene Play's hook |
| Testability | + header tests stay prop-only; layout tests already mock hooks (`campaign-layout.test.tsx:9-12`) | - every header test and story needs a QueryClient or a hook mock |
| Simplicity | + one hook call, one prop | + no prop |
| Reversibility | + trivial | + trivial |
| Security and correctness | + gated on the loaded Campaign; the server authorizes GET active-scene as today | 0 same |

- **Chosen:** A, because of Consistency and Testability - giving up one more prop through CampaignFrame.
- **Rejected:** B - it turns the presentational header into a data reader and forces query plumbing into every header test and story. The Developer must not reintroduce it.

### D2: Current-tab mapping (Active Scene current on /active-scene and every sub-route)
| Metric | A: fuzzy `matchRoute` flag for `/active-scene`, extend `sectionOf` | B: pure `campaignSectionOf(leafRouteId)` with a type-exhaustive test table |
| --- | --- | --- |
| Consistency | + same mechanism as today (`campaigns.$campaignId.tsx:18-22`) | 0 a new mechanism, but this file is switched to it entirely (isOverview too); `useRouterState` is already used (`campaign-page.tsx:25`) |
| Modifiability | 0 each tab is a flag; sub-routes covered by fuzzy matching | + sub-routes covered by a prefix rule; a new Campaign route fails `tsc` until the test table maps it |
| Testability | - only the flag-to-section function is unit-testable | + one table row per route id from `FileRoutesById` (`routeTree.gen.ts:329-360`), meeting the PBI Verification "every Campaign route" |
| Simplicity | + about 3 lines | 0 a small module plus a typed test table |
| Reversibility | + trivial | + trivial |
| Security and correctness | 0 `matchRoute` defaults fuzzy to false (router-core `router.js:614`); includeSearch semantics apply once PBI-NAV-002 adds panel params | + independent of search params |

- **Chosen:** B, because of Testability (the PBI's "every Campaign route" criterion) and Modifiability (PBI-SPL-006 sub-routes, PBI-NAV-002 search params) - giving up a second route-detection idiom in the codebase and a test table each new Campaign route PBI must extend.
- **Rejected:** A - its mapping cannot be unit-tested per route, and it depends on includeSearch once panel params arrive. The Developer must not reintroduce it.
- How a leaf route id `R` maps ("prefix `P`" means `R === P || R.startsWith(P + '/')`):
  - prefix `/campaigns/$campaignId/active-scene` -> `'active-scene'`
  - prefix `/campaigns/$campaignId/wall` -> `'wall'`
  - prefix `/campaigns/$campaignId/settings` -> `'settings'`
  - anything else -> `'overview'`
  - `isOverview` is `R === '/campaigns/$campaignId/'`

### D3: Accessible name "Active Scene, live" (ux.md sections 2 and 6)
| Metric | A: `aria-label="Active Scene, live"` on the link while live; visible "Active Scene" + LiveBadge "Live" | B: `sr-only` ", " before the visible badge, name computed from content |
| --- | --- | --- |
| Consistency | + aria-label for dynamic names exists (`scene-link-section.tsx:130`); routerMock supports it | + sr-only name extension exists (`attention-list.tsx:86`) |
| Modifiability | 0 the label string must track the visible text | + no duplicated string |
| Testability | + `getByRole('link', { name: 'Active Scene, live' })` matches ux.md exactly; textContent stays clean | - computed name is "Active Scene, Live", not the ux.md copy |
| Simplicity | + one conditional attribute | + one span |
| Reversibility | + trivial | + trivial |
| Security and correctness | + exact normative copy; WCAG 2.5.3 holds (visible text contained case-insensitively) | - deviates from normative copy |

- **Chosen:** A, because it is the only option that renders the normative copy exactly - giving up a label string that repeats the visible text.
- **Rejected:** B - it deviates from the ux.md copy. The Developer must not reintroduce it.

### Single-option decisions
- Query freshness: keep the TanStack defaults (no `staleTime` or `gcTime`). With one query key, a mount at the same time as a page observer is deduplicated, and later page mounts refetch exactly as today. A per-observer staleTime would not stop the page's own refetchOnMount. "No second request when cached" means: no request of the header's own and no new query key.
- Gating: `useActiveScene(campaignId, Boolean(campaign.data))` (the enabled parameter exists, `useActiveScene.ts:16`), so a non-member or a failed Campaign load never fires GET active-scene.
- Badge state: shown exactly when `data` is non-null (keeper, present-player, or absent-player kind; ux.md: an absent Player still sees "Live"). Pending or error: no badge and no error UI in the header.
- Live behavior: nothing new. The existing topic (`liveTopics.ts:20`) and the reconnect invalidation of `['campaigns', id]` (`campaign-live-connection.tsx:63`, a prefix of the active-scene key) drive it.
- LiveBadge: a new `frontend/src/shared/components/live-badge/live-badge.tsx` (ux.md section 7): `Badge` (`badge.tsx:24`) with a `<span aria-hidden="true">` dot and the text "Live". It uses existing tokens and adds no Badge variant.
- Header props:
  - `hasActiveScene: boolean`
  - `CampaignSection` gains `'active-scene'`
  - `CampaignNavLinkProps['to']` gains `'/campaigns/$campaignId/active-scene'`
  - `CampaignNavLink` gets optional `badge?: ReactNode` and `ariaLabel?: string`
  - Order: Overview, Active Scene, Wall, Settings (Keeper only). The Active Scene tab is shown to every role.
- Narrow screens: the nav gets `overflow-x-auto overflow-y-hidden sm:overflow-visible`, and the links use `sm:-mb-px` instead of `-mb-px`, because the -1px overlap would otherwise make the scroll container scroll vertically. No scrollbar-hiding utility. Links keep `min-h-11`.
- Current link into view: a `useEffect` keyed on `section` runs `navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })`. The ref sits on the nav (a plain element) rather than on the Link, so routerMock-based tests work. No focus change.

## Patterns
- **Used:** none. The mapping is a four-branch function (complexity about 5).
- **Rejected:** Strategy or a lookup map for sections - four fixed branches, no growing conditional. Observer - SignalR plus query invalidation (ADR-0009) already provide it, so no event emitter or context. Decorator or Adapter around `useActiveScene` - nothing incompatible to adapt.

## Invariants
- `campaign-header` fetches nothing and imports no data hook.
- Exactly one Active Scene query key (`activeSceneQueryKeys.detail`); `liveTopics.ts` and `campaign-live-connection.tsx` are unchanged.
- The badge shows if and only if the `useActiveScene` data is non-null.
- Badge changes are never announced (no aria-live, no role=status) and nothing moves focus (NAV-A11Y-5).
- The nav stays `<nav aria-label="Campaign">` with links, not ARIA tabs, and `aria-current="page"` is on exactly one link. Links are at least 44px high.
- Active Scene is current on `/active-scene` and every descendant; Overview is the fallback for every other Campaign route.
- At 320px and at 200% zoom the document never scrolls horizontally (CO-A11Y-9, NAV-A11Y-4).
- Settings stays Keeper-only in the UI; server authorization is unchanged.
- Cyclomatic complexity stays at 10 or below with no new suppressions.

## Implementation plan
1. `frontend/src/shared/components/live-badge/live-badge.tsx` (+ `.test.tsx`, `.stories.tsx`, following the campaign-header folder convention) - the presentational badge.
2. `frontend/src/campaign-play/services/campaignSection.ts` (+ `.test.ts`) - `campaignSectionOf(routeId)` and `isOverviewRoute(routeId)`. `CampaignSection` moves here and is re-exported from campaign-header so existing imports keep working.
3. `campaign-header.tsx`:
   - Add the Active Scene link, the `hasActiveScene` prop, LiveBadge, the aria-label, the overflow classes, and the scroll-into-view effect.
   - Update `.test.tsx` and `.stories.tsx` (add Live and narrow stories).
4. `campaign-layout.tsx`:
   - Call `useActiveScene(campaignId, Boolean(campaign.data))` before the early returns and pass `hasActiveScene`.
   - Update `.test.tsx` and `.stories.tsx` (seed or mock the query).
5. `frontend/src/routes/campaigns.$campaignId.tsx`:
   - Read the leaf routeId via `useRouterState({ select: (state) => state.matches.at(-1)?.routeId })` and derive `section` and `isOverview` from step 2.
   - Remove `useMatchRoute` and `sectionOf`.
6. E2E (see E2E coverage), including the existing nav-list assertions.
7. Set the PBI status per `docs/backlog.md` when done.

## Reuse
- Using:
  - `useActiveScene` (`useActiveScene.ts:16`)
  - `Badge` (`badge.tsx:24`)
  - `queryKeysForTopics` and `CampaignLiveConnection` (unchanged)
  - routerMock (aria-label support)
  - E2E `campaignNav` (`e2e/fixtures/overview.ts:7`)
  - `setUpTable`, `startSceneViaApi`, `finishActiveSceneViaApi` (`e2e/fixtures/scene-play.ts:193,105,121`)
  - the multi-context live pattern (`e2e/tests/active-scene.spec.ts:395-437`)
- Not using:
  - `PresenceIndicator` - a different meaning; an a11y reference only.
  - `useMatchRoute` - replaced per D2.
  - A new query or hook - it would break "no second request".

## TDD units
- `campaignSectionOf`:
  - A table typed `Record<Extract<keyof FileRoutesById, '/campaigns/$campaignId' | `/campaigns/$campaignId/${string}`>, CampaignSection>` (type-only import from routeTree.gen) maps every current route id; a new route fails tsc.
  - Literal Active Scene sub-route ids such as `'/campaigns/$campaignId/active-scene/to-reveal'` -> `'active-scene'`.
  - `'/campaigns/$campaignId/active-scene-x'` -> `'overview'` (segment boundary).
  - `isOverviewRoute` is true only for `'/campaigns/$campaignId/'` (NAV-UX-2, CO-UX-11).
- LiveBadge renders the text "Live" and an aria-hidden dot, with no live region (NAV-A11Y-1, NAV-A11Y-5).
- Header, links (NAV-UX-1):
  - Keeper: Overview, Active Scene, Wall, Settings with hrefs `/campaigns/c1`, `/campaigns/c1/active-scene`, `/campaigns/c1/wall`, `/campaigns/c1/settings`.
  - Player: Overview, Active Scene, Wall.
- Header, current tab: section `'active-scene'` -> only Active Scene has `aria-current="page"` (NAV-UX-2). The existing overview, wall, and settings assertions are updated to the four-link order.
- Header, badge (NAV-UX-3, NAV-A11Y-1):
  - `hasActiveScene` true -> a link named "Active Scene, live" with visible text "Live".
  - `hasActiveScene` false -> named "Active Scene" with no "Live".
- Header: no element with aria-live or role=status inside the nav (NAV-A11Y-5).
- Header: `scrollIntoView` is called on the current link with `{ block: 'nearest', inline: 'nearest' }` on mount and when section changes (stub `Element.prototype.scrollIntoView`).
- Layout, gating: `useActiveScene` is called with `(campaignId, false)` while the Campaign is pending, errored, or not found, and with `(campaignId, true)` once it has loaded.
- Layout, badge state: non-null data shows the badge; null data and an error hide it.
- Layout, no second request: with a real QueryClient and a mocked `getActiveScene`, rendering CampaignLayout with a child that also calls `useActiveScene` calls `getActiveScene` once.

## E2E coverage
- A new `e2e/tests/navigation.spec.ts`, whose header comment traces to the `specs/navigation/spec.md` scenarios and NAV ids.
- "The Keeper returns to the Active Scene from the Wall":
  - NAV-UX-1: the tab order for the Keeper, and for a Player without Settings.
  - Start the Scene via the API and open the Wall.
  - NAV-UX-2: selecting "Active Scene, live" shows the h1 "The Corbitt House", with the tab current.
  - NAV-UX-2: Overview is current on a Scene page.
- "The Active Scene tab shows Live only while a Scene is Active":
  - NAV-UX-3: no Live for the Keeper on the Wall, a present Player on the overview, or an absent Player on the Wall.
  - Start via the API: all three see "Active Scene, live" without reloading.
  - Finish via the API: Live disappears for all three.
  - NAV-A11Y-5: focus is unchanged.
- NAV-A11Y-4 and NAV-A11Y-3 at a 320px viewport:
  - `document.documentElement.scrollWidth <= clientWidth`.
  - The nav's scrollWidth > clientWidth.
  - The current tab is within the nav's visible box.
  - Every tab is at least 44px high.
- Screenshots via `test.info().outputPath` (precedent `e2e/tests/investigator-lifecycle.spec.ts:422`) at 1366px and 320px, Keeper and Player, with Live on.
- Update the existing nav-list assertions:
  - `e2e/tests/campaign-overview.spec.ts:58` -> `['Overview', 'Active Scene', 'Wall', 'Settings']`
  - `e2e/tests/campaign-overview.spec.ts:84` -> `['Overview', 'Active Scene', 'Wall']`
  - `e2e/tests/campaign-wall.spec.ts:29` -> the four-link list
  - The `exact: true` name lookups elsewhere are unaffected.

## ADR
- none: frontend-only, cheap to reverse, and it applies ADR-0009 without extending it. The route-id mapping is local to one layout route.

## Human decisions
- 2026-11-04, plan-approval gate (verbatim): "approve D1-A, D2-B, D3-A".
- 2026-11-04, follow-up on the ux.md section 2 wording "no visible scrollbar gutter change" (verbatim): "Confirm reading". It means: do not reserve a scrollbar gutter and do not hide the scrollbar.

## Revisions
- 2026-11-04: clarification, no decision changed. The human confirmed the reading of "no visible scrollbar gutter change"; the open confirmation under Human decisions was replaced by the confirmed decision.

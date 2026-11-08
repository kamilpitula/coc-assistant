# Design: PBI-SPL-007: Wall on the Active Scene - latest 5 readable Wall Entries and the shared compose form on Run (Keeper) and the Player view

## Triggers
- 2 (shared interface): `WallPreview` gains a compose slot; `WallEntryComposer` gains `rows`; the add-entry flow moves out of `CampaignWall` into a hook that both slices use.
- 5 (more than one bounded context, frontend slices): scene-play hosts campaign-play's Wall components.
- 7 (UX): a new region on Run and the Player view. Already covered by specs/scene-play/ux.md 21.3, 21.8, 21.12 (SPL-UX-49/50) and specs/campaign-wall/ux.md 4.2, 4.5, 7. No new UX pass. The prototype's "Keeper only" checkbox is shorthand; the "Who can read this?" radio group stays (PBI Context; campaign-wall ux 2, 4.2).

## Constraints
- ADR-0027: `src/shared` imports no slice (enforced at frontend/eslint.config.js:41-53).
- ADR-0028: a subject's UI lives in the slice that owns the subject; hosts in other slices adapt.
- ADR-0009: live updates come through the Campaign hub as invalidation topics. `wallEntries` already invalidates `wall` and `wallPreview` (frontend/src/campaign-play/services/liveTopics.ts:19).
- CONTEXT.md terms: Wall Entry, Public Wall Entry, Keeper-Only Wall Entry, Campaign Wall, Active Scene, Investigators present. UI copy says "Keeper only" (campaign-wall ux 8).
- No game rules are involved.
- Cyclomatic complexity stays at 10 or below.
- Existing patterns:
  - The page's single `role=status` paragraph and its callbacks: `onPresentSaved` in active-scene-page.tsx:87-89, 111 and active-scene-tab-context.ts.
  - Bordered Run cards: run-view.tsx:35-37.
  - The own post is not announced: useWallEntryAnnouncement.ts:32 uses isOwnWallEntry.
- Server visibility: per the Explorer report, WallEntryService.ListAsync and CampaignLivePublicationPolicy.ForWallEntryChanged already keep Keeper-Only entries from Players. Not re-read at design time. No backend change.

## UX
- Selected option: none needed. This follows specs/scene-play/ux.md 21.3 and 21.8, and specs/campaign-wall/ux.md 4.2, 4.5, and 7 (existing; updated only per the Refinement Protocol, see plan step 9).
- Flagged:
  - F1: The 21.8 sketch puts "Open the Wall" in the heading row. WallPreview renders it after the entries (wall-preview.tsx:29-33). Decision: keep WallPreview's placement. Reuse stays unchanged, and 21.8's text only says "with 'Open the Wall'".
  - F2: campaign-wall ux 4.2 says "the status text clears after the next edit". The Wall page does not do this (campaign-wall.tsx:26, 39). This gap already exists and is out of scope. On the Active Scene the page status follows pageStatusMessage (active-scene-page.tsx:179-185).
  - F3: From 1024px the Keeper sees Wall above Investigators present, but Tab order is Investigators present, then Wall. 21.3 accepts this under 1.3.2. WL-A11Y-7 ("visual order") is a Wall-page criterion. Noted, not a contradiction.
  - F4: Posting twice in a row sets the same "Wall Entry added." text, so screen readers may not repeat it. The Wall page and "Investigators present saved." behave the same way. Accepted for consistency.
  - F8: The composer's own Card nests inside the region card. Accepted; the screenshot check decides (see Single-option decisions).

## Decisions

### D1: Where the shared compose form lives
| Metric | A: stay in campaign-play, scene-play imports it | B: move to src/shared |
| --- | --- | --- |
| Consistency | + scene-play already imports campaign-play UI and hooks (clues-page.tsx:5 InvestigatorNotFound; to-reveal-section.tsx:3). Matches ADR-0028: the subject's slice owns the UI | - shared may not import slices (eslint.config.js:41-53), so CampaignRole, WallEntry types, and the wall hooks would all have to move into shared |
| Modifiability | + Wall changes stay in one slice | - Wall domain code split across shared and campaign-play |
| Testability | 0 tests unchanged | 0 same tests, moved |
| Simplicity | + no moves | - many file moves for no behavior change |
| Reversibility | + trivial | 0 moving back is equally large |
| Security and correctness | N/A frontend placement only; the server enforces visibility | N/A same |

- **Chosen:** A. Deciding metrics: consistency and simplicity. Given up: the literal frontend/CLAUDE.md rule "shared by 2+ slices goes in src/shared". This is a deliberate, documented exception: that rule conflicts with ADR-0027 for domain UI, and the existing precedent keeps domain UI in its slice.
- campaign-play and scene-play already import each other (campaign-page.tsx:8, campaign-layout.tsx:7, useOriginBackLink.ts:1). A does not make this worse.
- **Rejected:** B. The Developer must not move the composer, WallPreview, the WallEntry types, or the wall hooks into src/shared.

### D2: How the region is composed (heading, compose form, entries in one section)
| Metric | A: WallPreview gets an optional `composer` slot rendered between its h2 and the entries; new scene-play `ActiveSceneWall` fills it | B: ActiveSceneWall renders its own section and h2, and WallPreview gets a "no heading" prop | C: compose form as a sibling below or above WallPreview |
| --- | --- | --- | --- |
| Consistency | + one section, one h2, one live region (campaign-wall ux 7) | - two ways to render the preview heading | - the form sits outside the "Wall" region, or the order is wrong (21.8: form above entries) |
| Modifiability | + the overview is unaffected (slot unused) | 0 | - |
| Testability | + the region role "Wall" holds both the form and the entries; the E2E locator `wallPreview` works as is | 0 | - |
| Simplicity | + one optional prop | 0 one prop plus a duplicated heading | + no prop |
| Reversibility | + | + | + |
| Security and correctness | N/A | N/A | N/A |

- **Chosen:** A. Deciding metrics: consistency and testability. Given up: WallPreview is no longer purely read-only (its doc comment is updated).
- **Rejected:** B, a heading toggle or a heading duplicated in the host. Rejected: C, a form outside the region or below the entries, which contradicts the 21.8 order. The Developer must not reintroduce B or C.

### D3: How the add flow is shared (pending, failed, try/catch, the success callback)
| Metric | A: extract hook `useAddWallEntryForm(campaignId, onAdded)` returning `{ pending, failed, submit }`; WallEntryComposer stays presentational | B: WallEntryComposer takes `campaignId` and calls the mutation itself | C: copy the try/catch from campaign-wall.tsx:35-45 into the region |
| --- | --- | --- | --- |
| Consistency | + frontend/CLAUDE.md "extract a custom hook once logic is used 2+ times" and "data separate from presentational components" | - mixes data into the presentational form | - copying, which the PBI forbids |
| Modifiability | + one place for the add flow | 0 | - two places to change |
| Testability | + hook unit-tested; composer tests unchanged | - composer tests need query mocks | - |
| Simplicity | + one small hook | 0 | 0 |
| Reversibility | + | 0 | - |
| Security and correctness | N/A | N/A | N/A |

- **Chosen:** A. Deciding metrics: consistency and testability. Given up: each host writes two lines to wire the hook to the composer.
- **Rejected:** B and C. The Developer must not reintroduce either.

### D4: How "Wall Entry added." reaches the page status
| Metric | A: the region calls `onWallEntryAdded`; the page calls `setMessage(WALL_ENTRY_ADDED_MESSAGE)` (Keeper through ActiveSceneTabContext, Player through a prop) | B: the region has its own `role=status` paragraph |
| --- | --- | --- |
| Consistency | + same path as onPresentSaved (active-scene-tab-context.ts, active-scene-tabs.tsx:11-13) | - a second visible status region; 21.8 names "the page's role=status paragraph" |
| Testability | + | + |
| Simplicity | 0 one more callback field and prop | + local |
| Reversibility | + | + |
| Security and correctness | N/A | N/A |

- **Chosen:** A. Deciding metric: consistency with the spec and the page. Given up: one more field on the context.
- **Rejected:** B, a region-level status paragraph. The Developer must not add it.

### Single-option decisions
- New component: `frontend/src/scene-play/components/active-scene-wall/active-scene-wall.tsx`, `ActiveSceneWall({ campaignId, viewerRole, onWallEntryAdded })`.
  - It renders `<Card className="min-w-0 p-4">` containing WallPreview with the composer slot set to `<WallEntryComposer rows={2} .../>`, wired through useAddWallEntryForm.
  - The region is `active-scene-wall`, and it draws its own bordered card in both roles, so RunView does not wrap it in RunCard.
- `WALL_COMPOSER_TEXT_ID` (wall-entry-composer.tsx:17) stays a fixed id.
  - A page renders at most one composer (Wall page or Active Scene page; the overview has none), so there is no collision.
  - The fixed id is also what CampaignWall's `fallbackFocusId` needs (campaign-wall.tsx:107).
  - Rejected: useId plus a `textId` prop. No force calls for it today.
- `rows` on WallEntryComposer: optional, default 3 (the Wall page is unchanged); the Active Scene passes 2 (21.8).
- The composer's own Card stays (no "framed" variant). This nests a bordered card inside the region card (F8). If the screenshot check rejects it, escalate rather than add a variant on your own.
- Entry at the top after a post: useAddWallEntry's onSuccess returns the invalidate promise (useWallEntries.ts:42-48), so the mounted preview has refetched before `mutateAsync` resolves. No cache change is needed. Update the hook's doc comment ("reloads next time it is shown" is now inaccurate).
- Focus after success: the composer already refocuses its Textarea (wall-entry-composer.tsx:45-49). Nothing new.
- Live arrival announcements: WallPreview's own polite region (wall-preview.tsx:34-36). The own post is not announced (useWallEntryAnnouncement.ts:32). Nothing new.
- Keeper layout (run-view.tsx:24):
  - DOM order: Keeper notes, Investigators present, Wall.
  - From lg: `lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'notes_wall'_'notes_present']`, with `lg:[grid-area:...]` on each child.
  - `grid-rows-[auto_1fr]` keeps a tall Keeper notes card from opening a gap between Wall and Investigators present.
  - Below lg it stays one column in DOM order (SPL-UX-50).
- Player layout (active-scene-player-view.tsx):
  - Both branches (present, and absent at lines 19-27) become `grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]`.
  - The left column holds the existing content, with the h1 first in the DOM; ActiveSceneWall comes last in the DOM, so it is last below lg and on the right from lg (21.8).
  - viewerRole is `'Player'` there.
  - The absent Player sees Campaign Wall Entries only, never Scene details.

## Patterns
- **Used:** none new. The composer slot is plain composition, not a GoF pattern.
- **Rejected:**
  - Strategy for per-role composer behavior: the only role switch is `isKeeper` (wall-entry-composer.tsx:34, 78), a single branch well under complexity 10.
  - Decorator or wrapper around WallPreview: replaced by the slot (D2).
  - Observer: the existing liveTopics/SignalR invalidation already covers live delivery (liveTopics.ts:19).
  - Mediator or context provider for the Wall status: one level of prop/context is enough (frontend/CLAUDE.md, provider only beyond 2 levels).

## Invariants
- No backend change, and no change to the GET/POST wall-entries contracts or the `wallEntries` topic.
- A Player never receives a Keeper-Only Wall Entry and never sees the visibility choice (SPL-UX-49, WL-UX-4, WL-UX-12). Visibility stays server-enforced; the client never filters.
- One compose component (WallEntryComposer) and one add flow (useAddWallEntryForm), used by both CampaignWall and ActiveSceneWall. No copy.
- On the Active Scene: no "Remove" and no "Show older entries" (21.8). WallEntryList is not used there.
- The overview's WallPreview output is unchanged (no slot passed).
- The Wall page's behavior and copy are unchanged, apart from the internal hook refactor.
- At most one composer per page (fixed text id).
- The Keeper's DOM order is notes, present, wall; only CSS reorders it.
- Complexity 10 or below; no new eslint or GlobalSuppressions entries.

## Implementation plan
1. `campaign-play/hooks/useAddWallEntryForm.ts`, test first:
   - It wraps useAddWallEntry and owns `failed`.
   - `submit(entry)` clears failed, awaits mutateAsync, calls `onAdded()`, and resolves true; on error it sets failed and resolves false.
   - Export `WALL_ENTRY_ADDED_MESSAGE = 'Wall Entry added.'`.
2. `campaign-wall.tsx`: replace the inline add (lines 24, 27, 35-45, 60) with the hook and the constant. Its tests stay green.
3. `useWallEntries.ts`: doc-comment fix only (useAddWallEntry).
4. `wall-entry-composer.tsx`: optional `rows` prop (default 3). Add a test and a story ("Compact").
5. `wall-preview.tsx`: optional `composer?: ReactNode`, rendered after the h2 and before the body in every state (loading, error, empty, entries). Update the doc comment. Add tests.
6. `scene-play/components/active-scene-wall/` (new): component, test, and stories ("Keeper", "Player"; wall preview seeded in the query cache as in wall-preview.stories.tsx).
7. Keeper wiring:
   - `active-scene-tab-context.ts`: add `onWallEntryAdded`.
   - `active-scene-page.tsx`: provide `() => setMessage(WALL_ENTRY_ADDED_MESSAGE)` in the context, and pass it to ActiveScenePlayerView.
   - `active-scene-tabs.tsx`: RunTab passes it to RunView.
   - `run-view.tsx`: add the region and the grid areas from Single-option decisions.
   - Update the RunView header comment (it still names PBI-SPL-007 as future).
   - Update the tests and stories of run-view, active-scene-tabs, and active-scene-page.
8. `active-scene-player-view.tsx`: add the `onWallEntryAdded` prop and the two-column grid in both branches. Update its tests and stories.
9. Refinement Protocol, same commit series:
   - specs/scene-play/ux.md 21.8: the "Open the Wall" placement per F1 (after the entries, as in WallPreview), and the composer slot.
   - specs/campaign-wall/ux.md section 7: the note, plus the "Freshness" line. On the Active Scene a post refreshes the preview in place.
   - Do both together with the shared component and tests.
10. E2E (see below), plus screenshots `docs/scene-play/screenshots/spl-007-run-1366.png`, `spl-007-run-375.png`, `spl-007-player-1366.png`, `spl-007-player-375.png`.

## Reuse
- Using:
  - WallPreview, for entries, states, "Open the Wall", and live announcements.
  - WallEntryComposer, for the form.
  - useAddWallEntry, for the mutation and cache.
  - useWallEntryAnnouncement and isOwnWallEntry, unchanged.
  - liveTopics `wallEntries`, unchanged.
  - The page status paragraph and setMessage.
  - The e2e fixtures `wallPreview`, `wallComposer`, `wallPost`, `addWallEntryViaUi` (e2e/fixtures/wall.ts), and `setUpTable`, `startSceneViaApi`, `pageStatus`, `activeScenePath` (e2e/fixtures/scene-play.ts).
- Not using:
  - WallEntryList: it carries Remove, which is out of scope here.
  - useWallEntries (infinite): it is the Wall page's query; the preview has its own `wallPreview` query (useWallEntries.ts:26-33).

## TDD units
- useAddWallEntryForm:
  - On success: resolves true, calls onAdded once, failed is false.
  - On failure: resolves false, failed is true, onAdded is not called.
  - A new submit clears failed.
  - `pending` mirrors the mutation.
- WallEntryComposer: `rows` defaults to 3; `rows={2}` renders 2.
- WallPreview:
  - Renders the `composer` slot after the h2 and before the entries, and in the loading, error, and empty states.
  - Without the slot, the output is unchanged (no form).
- ActiveSceneWall (hooks mocked):
  - Keeper: region "Wall" (h2) with the "New Wall Entry" textbox, the "Who can read this?" radio group (Public checked), and the 2-row textarea; the "Keeper only" badge shows on Keeper-Only entries; there is no "Remove" and no "Show older entries".
  - Present Player: no radio group; the text "Everyone in this Campaign can read this."; no badge.
  - Absent Player (ActiveScenePlayerView absent branch): the region renders beside the "in progress" text; no location or Investigator names.
  - A successful post calls onWallEntryAdded.
  - A failed post shows the role=alert copy and keeps the text (WL-UX-6).
- RunView: the DOM order of regions is Keeper notes, Investigators present, Wall (SPL-UX-50); the Wall region is present (SPL-UX-40).
- ActiveScenePage:
  - Keeper: a Wall post sets the status paragraph to "Wall Entry added.".
  - Player: the same.
- CampaignWall: the existing tests pass unchanged (refactor guard).
- A11y: the region is a `section` labelled by its h2 "Wall"; the textarea has a visible label; the radio group is labelled "Who can read this?"; errors use role=alert (WL-A11Y-2, 3, 5).

## E2E coverage
New `describe('The Wall on the Active Scene')` in e2e/tests/active-scene.spec.ts, using setUpTable and startSceneViaApi with [harveyId] present.

1. scene-play spec "The Keeper posts to the Wall from the Active Scene" -> test "The Keeper posts to the Wall from the Active Scene and a connected Player sees it live (SPL-UX-49)":
   - Harvey has the Active Scene open first (ready: h1 visible).
   - The Keeper on Run uses `addWallEntryViaUi(page, 'The front door slams shut.')`.
   - Assert the first `listitem` of `wallPreview(page)` contains the text. This positional contract is documented: newest first, campaign-wall ux 2 and 7.
   - Assert `pageStatus(page)` has the text "Wall Entry added.".
   - Assert Harvey's `wallPreview` shows it without a reload.
   - `openWall(page, ...)` and `wallEntry` show it on the Wall page.
2. scene-play spec "A Player never sees a Keeper-only Wall Entry on the Active Scene" -> test "A Player never sees a Keeper-only Wall Entry on the Active Scene (SPL-UX-49, WL-UX-12)":
   - The Keeper posts 'Corbitt has noticed Cy.' as 'Keeper only' from the Active Scene, and the Keeper's region shows it with the "Keeper only" badge.
   - Harvey (present) opens the Active Scene: `wallPreview` is visible, does not contain the text, and has no radio "Keeper only".
   - Lucy (absent) opens it: the region is visible and does not contain the text.
3. Screenshots and layout (PBI verification and SPL-UX-50) -> test "Wall placement on Run and the Player view at desktop and phone widths":
   - 1366px: the Keeper's Wall region bounding box is above Investigators present in the right column.
   - 375px: the Keeper's order is notes, present, Wall (compare y of the region boxes); no sideways scroll.
   - Same checks for Harvey's Player view.
   - Write the four spl-007 screenshots.
- Regression: run all of active-scene.spec.ts, reveals.spec.ts, items-in-play.spec.ts, and scene-history.spec.ts. Wall Entries (for example the Scene-start entry naming the Scene title, scene-play spec line 32) now appear on these pages, so any `getByText` or body `innerText` assertion may need scoping. Fix by narrowing the locator; never use `.first()`.

## ADR
- None. D1 applies ADR-0027 and ADR-0028 as they stand, and D2-D4 are small and easily reversible. The D1 exception to the frontend/CLAUDE.md "shared" rule is recorded here.

## Human decisions
- 2026-11-08: approved as is ("approve as is").
- F1: keep WallPreview's "Open the Wall" placement (after the entries), not the heading row of the 21.8 sketch.
- F8: accept the composer's Card nested inside the region card; the screenshot check is the arbiter. If it fails, escalate rather than add a variant.

## Revisions

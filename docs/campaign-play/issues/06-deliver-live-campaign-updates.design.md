# Design: PBI-CP-006: Deliver live Wall Entry and Investigator changes to connected Campaign Members

## Triggers
- 2 (shared aggregate change): `WallEntry` and `Investigator` start raising domain events and gain `WallEntry.Remove` / `Investigator.StartOver` so that deletions are raised by the aggregate.
- 3 (new cross-layer pattern): the topics `wallEntries`, `investigators`, `myInvestigator`; a policy that returns several publications for one event; client announcements derived by comparing data before and after a refetch.
- 6 (open questions): Draft create and start over, echo to the actor, the Keeper's own Approve, live removal.
- 7 (UX): live behavior on `/wall` and the announcements were not specified. UX Option A was selected.

## Constraints
- ADR-0009: one hub, invalidation topics only, the signal carries only the topic, REST is the only authorized read; one publication policy in Application; a Keeper only change never signals `campaign:{id}`; best-effort delivery, full refetch after reconnect.
- ADR-0011: aggregates raise events, dispatched after commit by `DomainEventDispatchInterceptor`; a handler failure is logged and swallowed; handlers do not write.
- ADR-0012: handlers publish through the `ICampaignLiveUpdates` port; `HubCampaignLiveUpdates` maps audience to group.
- specs/campaign-play/spec.md: Live connection contract (Audience, Publication, Catch-up), Live collaboration, Regression Guardrails ("Keeper-only Wall Entries never appear in ... live updates", "A Player cannot read another Player's Investigator").
- specs/campaign-overview/spec.md Live updates (`investigators` and `myInvestigator` also invalidate members; Approved also sends `members` to `campaign:{id}`) and Regression Guardrails (a Player never learns another Player's status other than Approved).
- specs/campaign-overview/ux.md sections 5.2 and 7, CO-A11Y-7, CO-A11Y-10; specs/campaign-wall/ux.md sections 4.3, 4.4, 4.5, 7.
- CONTEXT.md terms: Wall Entry, Public Wall Entry, Keeper-Only Wall Entry (UI label "Keeper only"; alias recorded as a follow-up), Draft, Submitted, Changes Requested, Approved, Character Approval, Change Request, Campaign Member.
- Existing patterns: `PublishMembersChangedOnPlayerJoined` and its explicit registration in `CampaignPlayInfrastructureServiceCollectionExtensions.cs`; `LiveAudience` factories; `queryKeysForTopics`; the render-time diff in `usePresenceAnnouncement` / `describePresenceChanges`; `focusTargetAfterRemoval`; `RecordingCampaignLiveUpdates`, `CampaignHubTestClient`, `controlHubSockets`.
- Cyclomatic complexity 10. `campaign-table.tsx`, `campaign-wall.tsx`, `wall-preview.tsx`, `wall-entry-list.tsx`, `liveTopics.ts`, `campaign-live-connection.tsx` are not on the baseline and must stay at or below 10. No baseline or suppression is extended.
- No game rules are involved.
- Verified: `liveConnection.retry()` reports `'reconnected'` (`frontend/src/shared/services/liveConnection.ts`), so "Try again" also runs the catch-up refetch.

## UX
- Selected option: A (insert directly at the top) - `specs/campaign-wall/ux.md` (updated: sections 1, 4.4, new 4.5, 7, 8, 10, 11, 12) and `specs/campaign-overview/ux.md` (updated: 5.2, 7, 11). `specs/campaign-wall` has no `spec.md`; `specs/campaign-play/spec.md` already links `campaign-wall/ux.md`.
- Rejected: B (hold behind "Show new entries") and C (insert or hold by scroll position), for the reasons recorded in `specs/campaign-wall/ux.md` section 1. The Developer must not reintroduce them.

## Decisions

### D1: How Wall Entry and Investigator changes are modelled as domain events
| Metric | Option A: one event per fact | Option B: one changed event per aggregate |
| --- | --- | --- |
| Consistency | + matches `PlayerJoinedCampaign`, a past-tense fact in domain vocabulary | - a status-carrying "changed" event; nothing like it exists |
| Modifiability | + a future consumer (for example a notification) subscribes to exactly the fact it needs | 0 every consumer switches on the status |
| Testability | + each aggregate method asserts one named event | + one event type to assert |
| Simplicity | - 7 event records, more registrations | + 2 records |
| Reversibility | + collapsing later is cheap | 0 splitting later touches every consumer |
| Security and correctness | + Approved is its own type, so "only Approved reaches the campaign group" is a type-level rule | - one status switch decides what reaches Players; a mistaken branch leaks |

- **Chosen:** A, because of consistency and correctness - giving up some boilerplate. Events (Domain, `sealed record ... : IDomainEvent`): `WallEntryAdded(CampaignId, WallEntryId, Visibility)`, `WallEntryRemoved(CampaignId, WallEntryId, Visibility)`, `InvestigatorCreated(CampaignId, InvestigatorId, PlayerAccountId)`, `InvestigatorSubmitted(...)`, `InvestigatorApproved(...)`, `InvestigatorChangesRequested(...)` (no comment in the event), `InvestigatorStartedOver(...)` (a Draft deleted; the name matches the existing `CanStartOver` and "Start over").
- **Rejected:** B (`InvestigatorStatusChanged` / `WallEntryChanged` with a kind or status). The Developer must not reintroduce it.

### D2: How deletions raise events
| Metric | Option A: domain methods raise, then the service calls `repository.Remove` | Option B: the interceptor creates "removed" events from `EntityState.Deleted` entries |
| --- | --- | --- |
| Consistency | + "aggregates raise events" (ADR-0011); the rules stay in the aggregate (`CanBeRemovedBy`, `CanStartOver`) | - Infrastructure decides domain meaning |
| Modifiability | + per aggregate | - every deleted aggregate silently gets an event shape |
| Testability | + plain aggregate tests | - needs a database fixture to see an event |
| Simplicity | + two small methods | 0 one generic hook, but a mapping per type |
| Reversibility | + local | 0 |
| Security and correctness | + Visibility is captured by the aggregate at decision time | - the generic event still needs Visibility, so type-specific code anyway |

- **Chosen:** A (`WallEntry.Remove(campaign, accountId)`, `Investigator.StartOver()`), because of consistency and testability - giving up nothing material. `Remove` returns false and raises nothing when `CanBeRemovedBy` is false; `StartOver` returns false when not `CanStartOver`. `WallEntryService.RemoveAsync` keeps its single NotFound outcome; `PlayerInvestigatorService.DeleteMineAsync` returns `StatusConflict` when `StartOver()` is false.
- **Rejected:** B; also application services publishing directly after save (already rejected by ADR-0011). The Developer must not reintroduce them.
- Note: `DomainEventDispatchInterceptor.SavingChangesAsync` snapshots before saving and its comment says detached (deleted) aggregates are included. No test covers it yet; one is required (TDD units).

### D3: Shape of the publication policy
| Metric | Option A: the policy returns all publications for an event (`IReadOnlyList<LivePublication>`) | Option B: the policy returns one audience per topic; handlers choose which topics fire |
| --- | --- | --- |
| Consistency | 0 a new return shape next to the existing `LiveAudience` methods, which stay | + same shape as today |
| Modifiability | + "who hears what" for a transition lives in one place (ADR-0009: one policy) | - "Approved also sends members to the campaign group" moves into a handler; the leak rule is split |
| Testability | + one table-driven test per event covers every audience and topic | 0 policy tests plus a handler test per event |
| Simplicity | + handlers are one line | 0 handlers compose 2-3 policy calls |
| Reversibility | + easy | + easy |
| Security and correctness | + the Keeper only and non-Approved isolation rules are asserted in one pure function | - an isolation rule depends on every handler choosing correctly |

- **Chosen:** A, because of correctness and modifiability - giving up a second return shape. `ForPresenceChanged` and `ForMembersChanged` stay unchanged.
  - New Application type `LivePublication(LiveAudience Audience, IReadOnlyList<CampaignDataTopic> Topics)`.
  - `ForWallEntryChanged(Guid campaignId, WallEntryVisibility visibility)`: `[Campaign: wallEntries]` when Public, otherwise `[CampaignKeeper: wallEntries]` (fails closed: any value other than Public goes to the keeper group).
  - `ForInvestigatorChanged(Guid campaignId, Guid playerAccountId)`: `[CampaignKeeper: investigators], [Account(owner): myInvestigator]`.
  - `ForInvestigatorApproved(Guid campaignId, Guid playerAccountId)`: the above plus `[Campaign: members]`.
  - `CampaignDataTopic` gains `WallEntries`, `Investigators`, `MyInvestigator` (wire names follow from camelCasing).
- **Rejected:** B. The Developer must not move audience or topic choices into handlers.

Audience routing per transition (authoritative):

| Domain change | Event | `campaign:{id}` | `campaign:{id}:keeper` | `account:{owner}` |
| --- | --- | --- | --- | --- |
| Public entry added / removed | WallEntryAdded / WallEntryRemoved | wallEntries | (receives it through the campaign group) | - |
| Keeper only entry added / removed | same | never | wallEntries | - |
| Draft created | InvestigatorCreated | - | investigators | myInvestigator |
| Character Sheet replaced (Draft or Changes Requested) | none (see Single-option decisions) | - | - | - |
| Submitted or resubmitted | InvestigatorSubmitted | - | investigators | myInvestigator |
| Approved | InvestigatorApproved | members | investigators | myInvestigator |
| Changes Requested | InvestigatorChangesRequested | - | investigators | myInvestigator |
| Start over (Draft deleted) | InvestigatorStartedOver | - | investigators | myInvestigator |

The Keeper's own Approve or Request changes still reaches the Keeper's tabs through the keeper group; the refetch is harmless and the roster does not announce it.

### D4: Where the client derives what changed and announces it
| Metric | Option A: components compare query data before and after a refetch (pure describers plus hooks) | Option B: the live-connection provider announces from incoming topics |
| --- | --- | --- |
| Consistency | + same as `usePresenceAnnouncement` / `describePresenceChanges` | - topics carry no author, name, or kind (ADR-0009) |
| Modifiability | + each surface owns its copy | - the provider learns UI copy for every surface |
| Testability | + pure functions plus render tests | 0 |
| Simplicity | + no new transport data | - would need payloads, contradicting ADR-0009 |
| Reversibility | + | - |
| Security and correctness | + only authorized REST data is used; catch-up after reconnect falls out of the same comparison | - cannot tell an addition from a removal; wrong announcements |

- **Chosen:** A - giving up nothing. "First load" means before the query's `isFetchedAfterMount` is true; the baseline is the data at that moment.
- **Rejected:** B, and any change that adds data payloads to `CampaignDataChanged`.

### D5: How the Wall page's paged list absorbs a change
| Metric | Option A: invalidate the `wall` infinite query (TanStack refetches the loaded pages from the first with fresh cursors) | Option B: refetch the first page and merge it into the cache with `wallEntryCache` helpers |
| --- | --- | --- |
| Consistency | + ADR-0009 invalidate and refetch | - a second, hand-written cache path |
| Modifiability | + no merge rules to maintain | - merge rules for additions, removals, boundaries |
| Testability | + the hook test asserts the invalidation | 0 needs merge edge-case tests |
| Simplicity | + only a mapping entry | - new code |
| Reversibility | + | + |
| Security and correctness | + the server re-applies visibility and paging; no duplicates at page boundaries | 0 boundary duplicates are possible |
| Performance | 0 one request per loaded page per change; a handful at Campaign scale | + one request |

- **Chosen:** A, because of consistency and correctness - giving up a few extra requests when many pages are loaded.
- **Rejected:** B. The existing prepend and remove cache updates in `useAddWallEntry` / `useRemoveWallEntry` stay; they are the actor's own confirmed updates.

### Single-option decisions
- Client topic mapping (`liveTopics.ts`): `wallEntries` -> `wall`, `wallPreview`; `investigators` -> `investigators` (prefix match, so it also refetches an open `investigator(id)` review), `members`; `myInvestigator` -> `myInvestigator` (prefix match, so it includes `myCharacterSheet`), `members`; `members` unchanged. This is the only mapping the spec allows.
- `ReplaceCharacterSheet` raises no event: the Keeper sees nothing of a Draft, a Changes Requested edit is not a status change, and in v1 the own-Investigator change is a status change (spec, Live collaboration). Draft saves happen on every wizard step and would make the editing tab refetch its own sheet.
- Handlers: `PublishWallEntryChanges` (the 2 Wall events) and `PublishInvestigatorChanges` (the 5 Investigator events) in Application. Each method calls the D3 policy and publishes each `LivePublication` in turn through `ICampaignLiveUpdates.PublishCampaignDataChangedAsync`. Each interface is registered explicitly next to the existing handler. One class per aggregate rather than 7 classes: same behavior, less wiring.
- Throttle: a pure reducer `wallEntryAnnouncementThrottle` in `services/` (batch received, window elapsed, message out) plus `useWallEntryAnnouncement(entries, isFetchedAfterMount)` in `hooks/`, used by the Wall page and the preview (used twice, so extracted per frontend/CLAUDE.md).
- New-entry detection: an entry is new when its id is not in the previous list and its (createdAt, id) is newer than the previous newest (the server order). A fetched empty previous list makes every entry new. Removed entries and older pages are never new.
- Investigator announcements: pure `describeInvestigatorChanges(previous, next)` in `services/investigatorAnnouncements.ts`, keyed by `memberId`, messages in roster order; `useInvestigatorAnnouncement` in `hooks/`; `campaign-table` renders it as a second element inside the existing `aria-live` region.
- Live removal focus in `wall-entry-list`: when entries change and the previously focused "Remove" button's entry is gone, apply `focusTargetAfterRemoval(previousEntries, id, fallbackFocusId)`.
- No server-side echo suppression: domain-event handlers have no connection id; the actor's tab avoids a duplicate announcement through the D4 comparison.

## Patterns
- **Used:** Observer (domain events and `IDomainEventHandler<T>`) at the new handlers - force: several reactions to one aggregate change, through the existing ADR-0011 mechanism.
- **Used:** Adapter - existing `HubCampaignLiveUpdates`, unchanged.
- **Used:** table lookup (Strategy-like) - the existing `queryKeysByTopic` map in `liveTopics.ts`; force: switching on the topic name; extending the map keeps `queryKeysForTopics` at complexity 1.
- **Rejected:** State for `Investigator` - four guarded methods each raising one event; the force is handled within the limit by guard clauses.
- **Rejected:** Chain of Responsibility or Decorator for publication - the policy is one pure function; no handler sequence or cross-cutting wrapper.
- **Rejected:** Command for announcements - nothing is queued, logged, or undone; the throttle reducer is enough.
- **Rejected:** Strategy for `ForWallEntryChanged` - one two-way, fail-closed choice.
- The Developer must not add any rejected pattern.

## Invariants
1. No Keeper only Wall Entry change ever produces a publication to `LiveAudienceKind.Campaign`; any visibility other than Public routes to `CampaignKeeper`.
2. Only `InvestigatorApproved` produces a publication to the campaign group, and only `members`. Created, Submitted, Changes Requested, and Started over never reach `campaign:{id}`.
3. `myInvestigator` is published only to the owning Player's `Account` audience.
4. Events are raised only by succeeding factories and transition methods (`Author`, `Create`, `Submit`, `Approve`, `RequestChanges`, `Remove`, `StartOver`), never in constructors (EF materialization raises nothing). A refused transition raises nothing.
5. Events dispatch only after commit; a removed aggregate's event is still dispatched (snapshot before save); a failed or conflicting save dispatches nothing.
6. `CampaignDataChanged` carries only `{campaignId, topics}`. No payload is added.
7. The client ignores signals for another Campaign (existing `isSameCampaign`) and unknown topics.
8. Live updates never move focus, except under WL-A11Y-11. Nothing is announced before `isFetchedAfterMount`.
9. A `myInvestigator` refetch must not discard unsaved wizard input. If the wizard resets its form on refetch, escalate instead of changing the mapping.
10. No component exceeds complexity 10 and no baseline or suppression grows.

Breaking an invariant means escalation.

## Implementation plan
1. `specs/campaign-play/spec.md` Scenarios: add the Gherkin listed under E2E coverage and tag the existing "Live Wall Entry is delivered to connected members" with WL-UX-11 - the PBI Refinement Protocol changes policy, mapping, and scenarios together.
2. Domain: the 7 event records (`Domain/Wall/`, `Domain/Investigators/`); raise them in `WallEntry.Author`, `Investigator.Create/Submit/Approve/RequestChanges`; add `WallEntry.Remove` and `Investigator.StartOver`.
3. Application: `CampaignDataTopic` members, `LivePublication`, the 3 policy methods, `PublishWallEntryChanges`, `PublishInvestigatorChanges`; `WallEntryService.RemoveAsync` and `PlayerInvestigatorService.DeleteMineAsync` use the domain methods (outcomes unchanged).
4. Infrastructure: register the 7 handler interfaces in `CampaignPlayInfrastructureServiceCollectionExtensions.cs`; add the deleted-aggregate dispatch test.
5. Integration tests (see TDD units).
6. Frontend data: `liveTopics.ts` mapping; `services/wallEntryAnnouncements.ts` (new-entry detection and copy); `services/wallEntryAnnouncementThrottle.ts`; `hooks/useWallEntryAnnouncement.ts`; `services/investigatorAnnouncements.ts`; `hooks/useInvestigatorAnnouncement.ts`.
7. Frontend UI: `wall-preview` (hidden polite region plus hook), `campaign-wall` (hidden `role="status"` region plus hook), `wall-entry-list` (live removal focus), `campaign-table` (second element in its region); stories for each, including live arrival states.
8. E2E: `e2e/campaign-live-updates.spec.ts` plus fixtures as needed, per `e2e/CLAUDE.md`.
9. Closeout: tick Verification items; add `## Follow-ups` with the CONTEXT.md alias entry (Human decisions). Leave the pre-ticked Presence item as is and mention it in the PR.

## Reuse
- Using: `LiveAudience` factories, `CampaignHubGroups.For`, `ICampaignLiveUpdates.PublishCampaignDataChangedAsync` for transport; the `PublishMembersChangedOnPlayerJoined` shape and registration; `RecordingCampaignLiveUpdates`, the `CampaignDomainEventTests` pattern, `SqliteCampaignPlayDbContextFixture`, `CampaignHubTestClient`, `SubscribeObserverAsync`, `JoinAsPlayerAsync`, `CampaignDataChangedComparer`; `queryKeysForTopics`, `campaignQueryKeys`; the `usePresenceAnnouncement` render-time diff pattern; `focusTargetAfterRemoval`, `UNNAMED_INVESTIGATOR`; E2E `signInNewContext`, `joinAsNewPlayer`, `controlHubSockets`, `submitValidInvestigatorViaUi`, `approveFromOverview`, `addWallEntryViaUi`, `wallPreview`, `memberRow`, `attentionList`.
- Not using: `wallEntryCache` helpers for live changes - D5 chose invalidation. `describePresenceChanges` itself - different inputs; only its shape is copied. A "receives nothing within a timeout" helper - slow and flaky; the ordering-sentinel technique below is used instead.

## TDD units
Backend (`CocAssistant.CampaignPlay.Tests`):
- `WallEntry.Author` raises `WallEntryAdded` with the visibility; a refused authoring raises nothing. `Remove` by the Keeper raises `WallEntryRemoved` with the visibility; by a Player it returns false and raises nothing.
- `Investigator.Create` raises `InvestigatorCreated`; `Submit` (from Draft and from Changes Requested) raises `InvestigatorSubmitted`; `Approve` and `RequestChanges` raise theirs; each refused transition raises nothing; `ReplaceCharacterSheet` raises nothing; `StartOver` on a Draft raises `InvestigatorStartedOver`, otherwise returns false.
- Policy (table tests): Public goes to Campaign; KeeperOnly and an undefined enum value go to CampaignKeeper (invariant 1); `ForInvestigatorChanged` is exactly keeper/investigators plus account(owner)/myInvestigator; `ForInvestigatorApproved` adds campaign/members; no Investigator method other than Approved returns a Campaign audience.
- Handlers with `RecordingCampaignLiveUpdates`: each of the 7 events publishes exactly the policy's publications.
- `WallEntryService.RemoveAsync` still returns NotFound for a Player or a foreign entry, and raises the event only on a Keeper removal; `DeleteMineAsync` returns StatusConflict for a non-Draft.
- `DomainEventDispatchInterceptorTests`: a removed aggregate's events are dispatched after commit; a failed save dispatches nothing.

Integration (`CocAssistant.Api.IntegrationTests`, hub tests):
- A Keeper's Public entry reaches a subscribed Player and the Keeper as `wallEntries`.
- Keeper only isolation (ordering sentinel): the Keeper posts a Keeper only entry, then a Public one; the Player's next message is the Public one's signal, and the Keeper received two.
- A Public removal reaches the Player; a Keeper only removal reaches only the Keeper.
- Submit reaches the Keeper as `investigators` and the submitter's account as `myInvestigator`; another Player gets nothing (sentinel: a following Public entry is their next message).
- Approve: the owner gets `myInvestigator`, the Keeper `investigators`, every member `members`.
- Request changes: owner and Keeper only (sentinel for the other Player).
- Create and start over: Keeper `investigators`, owner `myInvestigator`.
- A member of Campaign A receives nothing for Campaign B (sentinel).

Frontend (Vitest):
- `liveTopics`: each new topic maps to its keys; `investigators` and `myInvestigator` include members; duplicates are collapsed.
- New-entry detection: empty or undefined previous; older pages appended give none; a removal gives none; a removal plus an addition gives only the addition; an own prepended entry already in the previous list gives none.
- Copy for 1 entry, n entries from one author, several authors.
- Throttle (fake timers): the first batch is immediate; batches within 5 s merge into one message at the window end; a later batch is immediate again.
- `describeInvestigatorChanges`: Keeper Submitted (from In progress and from Changes Requested; unnamed fallback); Player another row NotReady -> Approved; own Approved and Changes Requested; silent for the Keeper's own Approve, Draft started or abandoned, and first load; several changes in roster order.
- Components: `wall-preview` announces and inserts (sixth dropped); `campaign-wall` inserts at the top and keeps older pages, the composer is untouched (WL-UX-15), live announcements are separate from "Wall Entry added." (WL-A11Y-12), nothing is announced on first load or for "Show older entries"; `wall-entry-list` moves focus for a removed focused entry (WL-A11Y-11) and not otherwise; `campaign-table` puts Investigator messages in the region next to Presence ones; `campaign-live-connection` invalidates the mapped keys for a `CampaignDataChanged` and ignores another Campaign (existing tests extended).

## E2E coverage
New `e2e/campaign-live-updates.spec.ts`; Gherkin to add to `specs/campaign-play/spec.md`, each tagged with its criteria:
- "Live Wall Entry is delivered to connected members" (existing; WL-UX-11) -> the Keeper adds a Public entry on `/wall`; the Player on the overview sees it in the preview with the polite announcement, and a Player on `/wall` sees it at the top.
- "Keeper only Wall Entry never reaches a Player live" (WL-UX-12) -> the Keeper adds a Keeper only entry, then a Public one; the Player sees only the Public one and no "Keeper only" text.
- "A removed Wall Entry disappears for connected members" (WL-UX-13) -> the Keeper removes a Public entry; the Player's Wall and preview lose it without a reload.
- "The Keeper sees a submission without reloading" (CO-UX-15) -> the Keeper on the overview; the Player submits via `submitValidInvestigatorViaUi`; the Keeper's row shows "Submitted" and the review attention item.
- "A Player sees their Investigator approved without reloading" (CO-UX-13, CO-UX-16, CO-UX-17) -> the Keeper uses `approveFromOverview`; the owner's row shows Approved and the attention item goes; a second Player's row shows the Investigator name.
- "A Player sees changes requested without reloading" (CO-UX-16) -> the Keeper requests changes; the owner sees the Changes Requested attention item.
- "Changes made while disconnected are caught up" (WL-UX-11, PR-UX-8) -> `controlHubSockets` cuts the Player's socket, the Keeper adds an entry, the socket is restored, and the entry appears after "Reconnected.".
- Exception: the Draft start or abandon row change (CO-UX-18) and the announcement merge timing are covered by unit and integration tests only, because a 5 s timing assertion in E2E would be flaky.

## ADR
- none: the topics, groups, policy role, and dispatch are already decided in ADR-0009, ADR-0011, and ADR-0012; the list-returning policy methods and the removal domain methods are local and easily reversed.

## Phases
- Phase 1: spec Gherkin, backend domain, Application, registration, unit and integration tests; checkpoint: `feat(campaign-play): publish Wall Entry and Investigator live updates (PBI-CP-006)`
- Phase 2: frontend mapping, announcements, UI, unit tests; checkpoint: `feat(campaign-play): show live Wall Entry and Investigator changes (PBI-CP-006)`
- Phase 3: E2E; checkpoint: `test(e2e): cover live Campaign updates (PBI-CP-006)`

## Human decisions
- 2026-10-16, UX selection, verbatim: "A, accept all defaults, CONTEXT.md alias as follow-up". Option A (insert directly at the top) selected; B and C rejected (see UX). Accepted defaults: silent live removal; the merged announcement copy; other pages update in place with announcements only on the overview; silent Draft row change for the Keeper; no extra echo to the actor's own tab, the actor's other tabs treated like any member; catch-up changes after reconnect are announced. The CONTEXT.md "Keeper-Only Wall Entry" / "Keeper only" alias is not edited in this PBI; it is recorded in the PBI's Follow-ups at closeout: "Add a CONTEXT.md note that the UI label 'Keeper only' is the Keeper-Only Wall Entry visibility."
- 2026-10-16, plan approval, verbatim: "approve". The decision record was approved as presented, with no changes.

## Revisions

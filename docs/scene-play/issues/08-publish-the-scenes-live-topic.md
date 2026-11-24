---
id: PBI-SPL-008
status: done
blocked_by: []
---

# PBI-SPL-008: Publish the scenes live topic to the Keeper

## Directive
Add the Keeper-only `scenes` invalidation topic that the scene-play spec already describes, and publish it whenever Scene content changes, so the Keeper's other open tabs refresh without reloading. This is a prefactor for Keeper notes and Beats.

**Scope:**
- **Backend:** add `scenes` to the Campaign hub's closed topic set and publish it to `campaign:{campaignId}:keeper` for today's Scene content changes: title and location, Handouts, Non-Player Entity links, Item links, and the prepared order.
- **Frontend:** map `scenes` to the Keeper's Scene, Scene list, Active Scene, and Scene History queries.
- **Tests:** unit, integration, and E2E.
- **Out of scope:** Keeper notes and Beat changes (PBI-SPL-009, PBI-BEAT-001 publish it for theirs); any change to Player-visible topics.

## Dependencies
- Blocked by: None.
- Must merge before: PBI-SPL-009 and PBI-BEAT-001 (both publish this topic).

## Context
Read: [scene-play spec](../../../specs/scene-play/spec.md), Live updates (the `scenes` entry and its note that it is not yet sent); [ADR 0009](../../adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md) (closed topic set and publication policy).
- The topic goes to the Keeper group only; a Player must never receive it.
- No user-visible UI changes beyond data refreshing, so no UX pass is needed.

## Verification
- [x] Each listed Scene content change publishes `scenes` to the Keeper group and to no Player. (`SceneContentLiveUpdateApiTests`: 21-path Theory asserts the Keeper hears `["scenes"]` and both Players hear only the wall-entry sentinel, plus a Finished-edit 409 refusal Fact; Backend integration green on PR #80 CI.)
- [x] With the Keeper in two tabs, renaming a Scene in one updates the other without reloading. (`e2e/tests/scene-live-updates.spec.ts`: tab B shows the new title with its no-reload marker intact; E2E shard 4/4 passed first try, run 45377129332 job 138386348297.)
- [x] Unit tests cover the publication policy for each change. (`SceneContentSupportTests` for `ForScenesChanged`, `SceneContentSignalsTests` for the adapter, 47 `SceneContentServiceSignalTests` incl. the invalid-title refusal; SP/CampaignPlay/ScenePlay suites green.)
- [x] Integration tests assert the topic and audience through the assembled app. (Same `SceneContentLiveUpdateApiTests` run as above; full integration suite green on PR #80 CI.)
- [x] Playwright E2E covers the two-tab refresh, traced to the scene-play spec Live updates. (Same shard 4/4 run as above; Gherkin scenario "Scene changes reach the Keeper's other tabs live" added to the spec.)
- [x] The scene-play spec's "not yet sent" note is removed. (`specs/scene-play/spec.md` Live updates rewritten with today's triggers in commit `e3faaa6`.)

## Refinement Protocol
A change to the topic's audience or triggers updates the scene-play spec Live updates, ADR 0009 if the policy changes, the frontend topic mapping, and tests together.

## Follow-ups
- E2E harness: compose reads the mock keystore password only from `COC_E2E_CERT_PASSWORD`, not `dev-cert.password`, and the mock-OIDC stack is unreliable on low-memory machines.
- 6 `AzureBlobHandoutFileStoreTests` use the `azurite:10000` hostname, which is unresolvable from a Windows host.
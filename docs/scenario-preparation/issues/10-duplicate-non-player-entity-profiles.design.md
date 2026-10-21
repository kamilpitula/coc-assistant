# Design: PBI-SP-010: Duplicate a Human NPC or Mythos Creature within its Campaign

## Triggers
- 2 (shared aggregate change): `HumanNpc` and `MythosCreature` have no way to build an instance from an existing one; `Create` starts from a narrative-only or empty profile (`HumanNpc.cs:35-41`, `MythosCreature.cs:25-41`) and the private constructors are the only other way in.
- 6 (open questions with competing answers): copy-name truncation and how the aggregate builds the copy.
- 7 (UX): the Duplicate action on both profile pages. `specs/scenario-preparation/ux.md` 25.3 and SP-UX-38 to SP-UX-41 already cover it, so it was followed; the gaps were decided at the gate (H1 to H3).

## Constraints
- `docs/game-rules/project_ruleset.md` section 5.1 (#51-supported-profiles-and-creation-methods): the template method is supported only by duplicating a profile of the same Campaign. Not restated here.
- `specs/scenario-preparation/spec.md` line 24 (Keeper only; 404 for another Campaign and the wrong type route), line 28 (duplicate endpoints), line 30 (separate aggregates, JSON profile, no SignalR for profile edits), line 59 (duplicate Constraint), Gherkin "Keeper duplicates a profile" and "Non-Player Entity profiles are the Keeper's alone".
- ADR 0013 (Keeper check first, everything else 404); ADR 0018 (400s keyed by path; a duplicate has none); ADR 0005 and ADR 0007 (versioned JSON profile; the column is a serializing value converter, `ScenarioPreparationDbContext.cs:75-83`, `:100-108`).
- `09-create-mythos-creature-profiles.design.md` D1: no shared base class, generic service, or generic controller for Non-Player Entities (documented DRY exception). D2: kind-free helpers live in neutral files (`ProfileLimits`, `ProfileText`).
- CONTEXT.md terms: Human NPC, Mythos Creature, NPC Profile, Monster Profile, Derived Value Override, Non-Player Entity (avoid "NPC" alone). "Duplicate" and "copy" are UI words, not new domain terms.
- Existing patterns:
  - Create answers `StatusCode(201, ToResponse(...))` without a Location header (`HumanNpcsController.cs:29-31`).
  - Reads return `View?`, where null means 404 (`HumanNpcService.cs:24-28`, controller `:44-45`).
  - The lookup is Keeper-first and scoped to the Campaign (`HumanNpcService.cs:93-96`).
  - Create hooks set the detail cache and invalidate the list (`useNonPlayerEntities.ts:39-42`, `:92-95`).
  - Navigation carries the status in `state: { statusMessage }` (`create-non-player-entity-page.tsx:80-84`, read at `human-npc-page.tsx:66,110-112`).
- Cyclomatic complexity 10 or below.

## UX
- Source: the existing `specs/scenario-preparation/ux.md` sections 25.1 and 25.3, SP-UX-38 to SP-UX-41; 25.3 and SP-A11Y-22 clarified in this commit (H1, H3). No new options.

## Decisions

### D1: How the copy name is truncated
| Metric | A: cut the whole "<name> (copy)" at 200 | B: shorten the name so " (copy)" always stays |
| --- | --- | --- |
| Consistency | + literal reading of spec.md:59 | 0 matches SP-UX-38 "{name} (copy)" always; spec.md:59 needs a one-clause clarification |
| Modifiability | 0 one helper | 0 one helper |
| Testability | + simple boundaries | + simple boundaries |
| Simplicity | + one Substring | 0 adds a trim and a surrogate guard (about 5 lines) |
| Reversibility | + data-only | + data-only |
| Security and correctness | - a 200-character name gives a copy named like its source; 194-199 characters give a damaged suffix like "(cop" | + the copy always reads as a copy and always passes the name rule |

- **Chosen:** B, because the copy must be recognizable in a list of 30-80 profiles - giving up the literal spec wording (clarified, H2). Rule: `name[..min(length, 193)].TrimEnd() + " (copy)"`; when the cut ends on a high surrogate, drop it too. 193 = `ProfileLimits.NameMaxLength` (200) minus " (copy)" (7).
- **Rejected:** A - a 200-character name yields a copy named exactly like its source. The Developer must not reintroduce it.

### D2: How the aggregate builds the copy
| Metric | A: `Duplicate(now)` on each aggregate, copying the stored profile as-is | B: the service calls Create then Edit with the source profile (validates again) |
| --- | --- | --- |
| Consistency | + the aggregate stays the only place that constructs itself (private ctors `HumanNpc.cs:25`, `MythosCreature.cs:25`) | 0 reuses public methods, but Human NPC Create needs an age it then overwrites |
| Modifiability | + later validation changes never affect duplicating | - a tightened rule or a changed `CombatSkillSpecializations` catalog (`HumanNpc.cs:46`) makes old profiles impossible to duplicate |
| Testability | + pure domain unit tests | 0 needs rule data in service tests |
| Simplicity | + about 5 lines per aggregate, no new outcomes | - adds an Invalid outcome that the UX has no screen for |
| Reversibility | + local | + local |
| Security and correctness | + copies exactly what is stored, overrides and reasons included; profile records are immutable (`NpcProfile.cs:47`, `MonsterProfile.cs:73`, IReadOnly collections) so sharing the instance is safe, and the value converter serializes per row | 0 runs the data through normalization again, which could alter it |

- **Chosen:** A, for modifiability and correctness - giving up re-checking an old stored profile against current rules; the copy's next Edit checks it.
- **Rejected:** B - Create+Edit or any re-validation in Duplicate. The Developer must not reintroduce it.

### Single-option decisions
- Response contract: `201 Created` with the full `HumanNpcResponse` / `MythosCreatureResponse` of the copy, no Location header, no request body, because Create does the same (`HumanNpcsController.cs:29-31`).
- Routes: `[HttpPost("{humanNpcId:guid}/duplicate")]` and `[HttpPost("{mythosCreatureId:guid}/duplicate")]` on the existing controllers (spec.md:28).
- Service result: `Task<HumanNpcView?> DuplicateAsync(campaignId, callerAccountId, id, cancellationToken)` and the Mythos Creature equivalent, null meaning 404, because a duplicate cannot be Invalid (read-style, `HumanNpcService.cs:24-28`). The WriteResult is not used.
- Name helper: one kind-free static `ProfileCopyName.For(string name)` in the Domain project next to `ProfileLimits.cs`, called by both aggregates (shared knowledge; SP-009 D2).
- No migration and no new table: the copy is a new row and appears in `EfNonPlayerEntityDirectory` automatically.
- No SignalR (spec.md:30).
- Scene links: they do not exist until PBI-SP-004 and the aggregates hold no link state. SP-010 asserts that the copy is a new aggregate with only Campaign, name, and profile. The precondition "is linked to a Scene" moves to PBI-SP-004 as a Verification item plus a Follow-up here (plan step 9). Blocking SP-010 on SP-004 is rejected: SP-010 is Ready, and links will live outside the copied fields.
- Duplicate in edit mode: not shown; edit mode replaces the view and its actions (`human-npc-page.tsx:113-131`).
- A 404 while duplicating shows the same failure alert, as Edit and Delete treat a 404 as a plain failure (`human-npc-page.tsx:98`, `:171`).
- Same-route state leak: render `<HumanNpcDetail key={humanNpc.id} ... />` (`human-npc-page.tsx:57`) and the matching `MythosCreatureDetail`, otherwise `justSaved` shows "Human NPC saved." on the copy (`:69`, `:111`). Resetting state in an effect is rejected: more code, easy to miss a field.
- The client never computes the copy name; it shows the server's response.

## Patterns
- **Used:** Prototype, as a plain method without an interface, at `HumanNpc.Duplicate(DateTimeOffset now)` and `MythosCreature.Duplicate(DateTimeOffset now)` - force: build a new aggregate from an existing instance whose construction (private ctor, profile) only the aggregate knows.
- **Rejected:** a shared `IDuplicable` / `ICloneable` interface - no polymorphic caller, and SP-009 D1 forbids a shared base.
- **Rejected:** Template Method or a generic service for `DuplicateAsync` - SP-009 D1.
- **Rejected:** Factory Method, Builder - one construction path, no variants.
- **Rejected:** Command - no undo, queue, or log.
- **Rejected:** Observer or domain events - no listeners; no SignalR, and the list refreshes by query invalidation.

## Invariants
- The Keeper check runs before any read. A Player, another Keeper, a missing Campaign, another Campaign's id, a missing id, and the other type's id all get the same 404, with nothing added or saved.
- The copy has a new Id, the source's CampaignId, `CreatedAt` = now, the D1 name (always 1-200 characters), and a profile whose stored JSON equals the source's, every override and reason included.
- The source is never modified.
- Duplicate never re-validates and never answers 400.
- Duplicate copies only the name and the profile (never Scene links).
- The type never changes.
- Complexity 10 or below; no new suppressions.

## Implementation plan
1. `specs/scenario-preparation/spec.md:59`: replace '"<name> (copy)", truncated to 200 characters' with '"<name> (copy)", with the name shortened so the whole name fits 200 characters' (H2). Docs commit first, per the PBI's Refinement Protocol.
2. Domain:
   - Add `ProfileCopyName.cs`.
   - Add `HumanNpc.Duplicate(now)`, using the existing private ctor.
   - Add `MythosCreature.Duplicate(now)`: give its private ctor a `MonsterProfile profile` parameter, and have `Create` pass `MonsterProfile.Empty`.
3. Application: `HumanNpcService.DuplicateAsync` and `MythosCreatureService.DuplicateAsync`, as `FindAsync`, then `Duplicate(_timeProvider.GetUtcNow())`, `Add`, `SaveChangesAsync`, and `ToView(copy)`.
4. Controllers: a `Duplicate` action in both controllers. 401 when the account is not resolved (as the siblings do); null gives `NotFound()`; otherwise 201 with `ToResponse`.
5. Backend tests (see TDD units).
6. Frontend services: `duplicateHumanNpc(token, campaignId, id)` in `humanNpcApi.ts` and `duplicateMythosCreature` in `mythosCreatureApi.ts`. POST with no body, parse with the existing schema, and pass failures to `failNonPlayerEntityWrite`.
7. Frontend hooks: `useDuplicateHumanNpc(campaignId, id)` and `useDuplicateMythosCreature` in `useNonPlayerEntities.ts`, mirroring the Create hooks (`setQueryData` under the copy's key, then invalidate the list).
8. Pages (`human-npc-page.tsx`, `mythos-creature-page.tsx`):
   - Key the Detail component by id.
   - In `ProfileActions`, add an outline "Duplicate" between Edit and Delete; it reads "Duplicating..." and is `disabled` while pending.
   - On success, navigate to the copy's route with `state: { statusMessage: "Copy created. It isn't part of any Scene." }`, and focus moves to the copy's `h1` (H1).
   - On failure, show `role=alert` "We couldn't duplicate {name}. Try again." below the actions; focus stays on Duplicate.
   - Add a `DuplicateFailed` story to each page's stories, using the same mocking as `DeleteDialog`.
9. Docs at close:
   - In PBI-SP-010 Follow-ups, add "Duplicating a profile linked to a Scene copies no links (spec scenario 'Keeper duplicates a profile'); verify once links exist -> PBI-SP-004".
   - Add a matching Verification bullet to `04-link-entities-to-scenes.md`.
10. E2E (see below). Update the exception comments in `mythos-creatures.spec.ts:30` and `non-player-entities.spec.ts:28`, since SP-UX-38 is no longer an exception.

## Reuse
- **Using:**
  - `FindAsync` and `ToView` in both services.
  - `HumanNpcMapping.ToResponse` / `MythosCreatureMapping.ToResponse`.
  - `failNonPlayerEntityWrite` and `NonPlayerEntityNotFoundError`.
  - `nonPlayerEntityQueryKeys`.
  - The `statusMessage` navigation state.
  - `ProfileLimits.NameMaxLength`.
  - Test helpers: `NpcProfileSamples.Thug()`, `MonsterProfileSamples.Ghoul()` / `WithOverrides`, `ScenarioPreparationTestBuilder`, `FakeCampaignKeepers`, `RecordingHumanNpcRepository`, `GhoulRequest` (`MythosCreatureApiTests.cs:38`), `expectAllNotFound`, `humanNpcsApiUrl` / `mythosCreaturesApiUrl`, `createMythosCreatureViaUi`.
- **Not using:**
  - WriteResult for Duplicate (it has no Invalid outcome).
  - The profile normalizers (the stored profile is already normalized; D2).
  - `DeleteNonPlayerEntityDialog` (ux.md 25.3: no dialog).

## TDD units
- **Backend:**
  - `ProfileCopyName`:
    - "Ghoul" gives "Ghoul (copy)".
    - A 193-character name stays whole, and the result is 200.
    - 194- and 200-character names are cut to 193 + " (copy)".
    - A cut that ends on a space gives no double space.
    - A surrogate pair at the cut is not split.
  - `HumanNpc.Duplicate`: new Id, same CampaignId, the D1 name, `CreatedAt` = now, profile JSON equal to the source's (via `HumanNpcProfileJsonStorage.ToStorage`), source unchanged.
  - `MythosCreature.Duplicate`: the same, with a Ghoul with overrides; override values and reasons survive.
  - `DuplicateAsync`:
    - For the Keeper: it returns the copy's view, adds it, and saves.
    - Refused-caller matrix (Player, other Keeper, missing Campaign, another Campaign's id, missing id): null, nothing added or saved. Mirror `MythosCreatureServiceTests.cs:102-152`.
  - Persistence: a Mythos Creature copy with overrides round-trips (`MythosCreaturePersistenceTests`).
- **Integration (`HumanNpcApiTests`, `MythosCreatureApiTests`):**
  - Success: 201 with a new id, name "Ghoul (copy)", and the same profile and computed values; the override and reason are present; the source GET is unchanged; the list holds both.
  - A 200-character name gives a 200-character name ending in " (copy)".
  - Not found (404, list count unchanged): add the duplicate POST to the Player and other-Keeper loop (`MythosCreatureApiTests.cs:410` and the Human NPC equivalent) with identical bodies; another Campaign's id (`:451`); the wrong type route in both directions (`:468`); a missing id.
- **Frontend:**
  - Api: POST to `.../{id}/duplicate` with auth and no body; 201 is parsed; 404 throws `NonPlayerEntityNotFoundError`; 500 throws Error. Same for both types.
  - Hooks: the copy is cached under its id, the list is invalidated, and the source cache is untouched.
  - Pages, for both:
    - "Duplicate" sits between Edit and Delete in the view and is absent in edit mode.
    - SP-UX-40: "Duplicating..." and disabled while pending; a second click sends nothing.
    - SP-UX-38: success shows the copy's name and the status "Copy created. It isn't part of any Scene.", including after the source was just saved (never "Human NPC saved.").
    - After success, focus is on the copy's `h1` (H1, SP-A11Y-22).
    - Failure (500 and 404) shows the alert under the actions, the button is enabled again, and focus stays on Duplicate (SP-A11Y-22, SP-A11Y-23).

## E2E coverage
- "Keeper duplicates a profile" (SP-UX-38, SP-UX-41) -> new test `Keeper duplicates a Mythos Creature with its override` in `e2e/tests/mythos-creatures.spec.ts`:
  - Create "Ghoul" with the Hit Points override as at `:213`, then click Duplicate.
  - Assert:
    - The URL is a different mythos-creatures id.
    - The h1 is "Ghoul (copy)".
    - The status is "Copy created. It isn't part of any Scene.".
    - "25 (computed 12)" and "Reason: Swollen with stolen life" are visible.
    - Overview is the current tab.
    - The list shows "Ghoul" and "Ghoul (copy)".
  - "Linked to no Scene" waits for PBI-SP-004 (Follow-up).
- The same scenario for a Human NPC -> new test `Keeper duplicates a Human NPC` in `e2e/tests/non-player-entities.spec.ts`: name, age, and an added section survive; status and URL as above.
- "Non-Player Entity profiles are the Keeper's alone" (SP-UX-39) -> add `POST .../{id}/duplicate` (own route) and the wrong-type duplicate to `expectAllNotFound` in both specs (`mythos-creatures.spec.ts:334` and the Human NPC equivalent); the Keeper's list count is unchanged afterwards.
- SP-UX-40 (double activation) stays a documented E2E exception covered by unit tests (`mythos-creatures.spec.ts:30`).

## ADR
- None: a method on each existing aggregate plus two endpoints that follow existing patterns is local, easy to reverse, and not a new pattern to copy.

## Phases
- Phase 1: spec clarification, domain, application, API, and backend unit, persistence, and integration tests; checkpoint: `feat(backend): duplicate Human NPCs and Mythos Creatures (PBI-SP-010)`.
- Phase 2: frontend services, hooks, pages, stories, and tests; checkpoint: `feat(frontend): add the Duplicate action to profile pages (PBI-SP-010)`.
- Phase 3: E2E; checkpoint: `test(e2e): cover duplicating Non-Player Entities (PBI-SP-010)`.
- Phase 4: backlog close and Follow-ups; checkpoint: `docs(backlog): close PBI-SP-010 with its follow-ups`.

## Human decisions
- Gate answer (2026-10-21): "H1 a H2 approve recommended H3 ok". Record approved as presented.
- H1: after a successful Duplicate, focus moves to the copy's `h1`. Rejected: the copy's "Edit" and the copy's "Duplicate".
- H2: D1 option B approved, with the spec.md:59 wording in plan step 1.
- H3: ux.md 25.3 (view only; a not-found answer shows the same failure; focus stays on Duplicate on failure; focus to the copy's `h1` on success; the server names the copy) and SP-A11Y-22 ("after Duplicate to the copy's `h1`") updated in the design commit. SP-UX-38 unchanged; no new SP-UX id.

## Revisions

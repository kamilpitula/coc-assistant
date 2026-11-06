---
id: PBI-SPL-006
status: done
blocked_by: [PBI-NAV-001, PBI-NAV-002, PBI-SPL-005]
---

# PBI-SPL-006: Active Scene Sub-Tabs

## Directive
Split the Keeper's Active Scene into Run, To reveal, Keeper reference, and Revealed, so the main view carries only what the Keeper needs to run the scene and material sits where the Keeper acts on it.

**Scope:**
- **Routes:** `/active-scene` (Run), `/active-scene/to-reveal`, `/active-scene/reference`, `/active-scene/revealed`, with Player and no-Active-Scene redirects.
- **Header and sub-navigation:** the full and compact scene header, "Finish Scene" on every sub-tab, and `active-scene-nav` with live counts.
- **Run:** the two-column layout, Keeper notes open by default, Investigators present with "Clues" panels.
- **Sub-tabs:** the grouping rule as one pure function (`isRevealedToEveryonePresent`), the status line, the Revealed list with the `reveal` panel, "Reveal..." in the `handout` and `entity` panel footers, and focus after a Reveal.
- **Tests:** unit, Storybook, and E2E.
- **Out of scope:** the Wall region (PBI-SPL-007); Items (PBI-SPL-003, which lands in these groups).

## Dependencies
- Blocked by: PBI-NAV-001 (the Active Scene tab is current on the sub-routes); PBI-NAV-002 (side panels); PBI-SPL-005 (the material entry).
- Must merge before: PBI-SPL-007 (the Wall goes into Run); PBI-SPL-003 (Items are built straight into To reveal and Keeper reference).

## Context
Read: [scene-play ux](../../../specs/scene-play/ux.md) section 21 (normative), and sections 3, 12, 13 for the behavior it keeps; [scene-play spec](../../../specs/scene-play/spec.md) Scenarios on "To reveal"; [navigation ux](../../../specs/navigation/ux.md); variant A of the reference prototype [specs/navigation/prototype/active-scene.html](../../../specs/navigation/prototype/active-scene.html).
- The prototype is illustrative: section 21 decides copy, order, URLs, states, and focus; the prototype's Play tools placeholder is not rendered.
- No API change: the grouping is derived from the Keeper Scene read, the Reveals, and the Investigators present already loaded.

## Verification
- [x] SPL-UX-40 to SPL-UX-48, SPL-UX-50 and SPL-A11Y-15 to SPL-A11Y-18 hold; SPL-UX-20 to SPL-UX-25 and SPL-UX-33 are updated to the new layout. (`e2e/tests/active-scene.spec.ts`: 17 passed; `e2e/tests/reveals.spec.ts`: 10 passed, each with `--workers=1`.)
- [x] Unit tests cover `isRevealedToEveryonePresent` (none, partial, all, Investigator added, Investigator removed), the counts, the redirects, and focus after a Reveal. (Plus `revealsToEveryonePresent`: partial excluded, full included across one or two Reveals, added Investigator excludes again; `keeperSubTabCounts` counts the listed entries. Full frontend suite: 310 files, 2425 tests passed.)
- [x] Storybook stories for Run and each sub-tab, including partial reveal and empty states. (`KeeperRevealed` seeds a fully revealed subject; `KeeperToReveal` seeds the partial one; `build-storybook` succeeds.)
- [x] Playwright E2E covers the scene-play spec scenarios for "To reveal", and `e2e/tests/reveals.spec.ts` and `e2e/tests/active-scene.spec.ts` are updated to the sub-tabs. (Same runs as above.)
- [x] Screenshots of Run and each sub-tab at 1366px and 375px, with the prototype's sample data, are compared side by side with variant A; differences are either fixed or justified in the PR. (8 files under `docs/scene-play/screenshots/spl-006-*-{1366,375}.png`; comparison notes in the PR text.)

## Refinement Protocol
A change to the grouping or layout updates scene-play ux section 21, the scene-play spec Scenarios, the pure function, the components, and their tests together.

## Follow-ups
- Resolved (human decision, option a): PBI-NAV-001 `e2e/tests/navigation.spec.ts:132` line 173 now expects the site banner to fit at 320px after the SPL-A11Y-18 header wrap fix in this PBI; the rest of that test is unchanged, and the PBI-NAV-001 file stays untouched. The wrap itself was a minimal wrap-only change with no UX options pass, so a later UX pass can still revisit the banner's wrapped appearance at narrow widths.
- The Revealed sub-tab lists each Reveal event of a fully revealed subject, so a subject revealed in two operations appears twice; consider one entry per subject (newest Reveal) if that reads better.

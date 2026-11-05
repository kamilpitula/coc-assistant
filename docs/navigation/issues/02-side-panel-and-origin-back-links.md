---
id: PBI-NAV-002
status: todo
blocked_by: []
---

# PBI-NAV-002: Side Panel and Origin Back Links

## Directive
Build the reusable side panel kept in the URL and the back link that remembers its origin, and use them for Clues from the Active Scene, so that reading during play never leaves the scene and every full page opened from it leads back.

**Scope:**
- **Side panel:** `shared/components/side-panel` on shadcn `Sheet`, a `useSidePanel` hook parsing the panel search params with zod, the history and focus rules, loading, error, and not-found states.
- **Panel bodies:** `clues` (Keeper and Player) wired now. `handout`, `entity`, and `reveal` are built here as panel types with their bodies extracted from the existing pages, and are first opened by PBI-SPL-005 and PBI-SPL-006.
- **Back link:** `shared/components/back-link` with a pure `resolveBackLink(from, fallback)`; the `from` allow-list (`active-scene`); applied to the Clues pages, the Human NPC and Mythos Creature profile pages, and the Scene Handout page.
- **Entry points:** "Clues" in Investigators present and "{name}'s Clues" in the Player view open the `clues` panel.
- **Tests:** unit and E2E coverage.
- **Out of scope:** the Active Scene layout (PBI-SPL-006); adopting the pattern on other pages (Follow-ups).

## Dependencies
- Blocked by: None.
- Must merge before: PBI-SPL-005 and PBI-SPL-006 (both open these panels).

## Context
Read: [specs/navigation/ux.md](../../../specs/navigation/ux.md) sections 1, 3 to 9; [specs/navigation/spec.md](../../../specs/navigation/spec.md) Constraints and Scenarios; [scene-play ux](../../../specs/scene-play/ux.md) sections 11, 14, 15, and 21.9; the reference prototype [specs/navigation/prototype/active-scene.html](../../../specs/navigation/prototype/active-scene.html).
- Panel and `from` params carry identifiers only; each panel loads and authorizes through the same queries as its full page.
- Extract bodies (Clues list, profile view, `handout-preview`, `revealed-content`) so page and panel render one component; do not copy them.
- `from` is never a URL. Unknown values fall back silently.

## Verification
- [ ] NAV-UX-4 to NAV-UX-9 and NAV-A11Y-2 to NAV-A11Y-4 hold.
- [ ] Unit tests cover the panel param schema, open/replace/close history behavior, focus return, and `resolveBackLink` for every allow-listed value, a missing value, and an unknown value.
- [ ] Playwright E2E covers the navigation spec scenarios on Clues (panel open, browser back, "Open full page", "Back to {Active Scene title}", direct open, unknown origin), and updates the existing Clues steps in `e2e/tests/reveals.spec.ts` (SPL-UX-33) to the panel.
- [ ] Screenshots of the Clues panel and the Clues page with `from` match the prototype's structure and copy. (Evidence: `docs/navigation/screenshots/nav-002-clues-panel.png` - Active Scene with `?panel=clues&investigator=<id>`, sheet "Lucy Ward's Clues" with "Open full page"; `docs/navigation/screenshots/nav-002-clues-page-from.png` - Clues page with `?from=active-scene`, "Back to The Corbitt House". Both captured from the live app by the E2E run itself.)

## Refinement Protocol
A change to panel types, params, or origins updates specs/navigation/ux.md sections 1, 3, and 4, the hook's zod schema, and its tests together.

## Follow-ups
- Audit the app for other dead-end journeys (Scene page profile and Handout links, Investigator review page, Item pages) and adopt sections 3 to 5 of navigation ux.

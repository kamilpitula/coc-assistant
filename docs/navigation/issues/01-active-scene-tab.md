---
id: PBI-NAV-001
status: todo
blocked_by: []
---

# PBI-NAV-001: Active Scene Tab

## Directive
Give every Campaign Member a permanent "Active Scene" Campaign tab, marked "Live" while a Scene is Active, so the Active Scene is one click away from any Campaign page.

**Scope:**
- **Campaign header:** the tab order Overview, Active Scene, Wall, Settings; Active Scene current on `/active-scene` and every sub-route; the "Live" badge driven by the Active Scene query and the `activeScene` topic; the tab row scrolling inside itself below 640px.
- **Tests:** unit tests for the current-tab mapping and the badge; E2E for reaching the Active Scene from the Wall and the badge appearing and disappearing live.
- **Out of scope:** side panels and back links (PBI-NAV-002); the Active Scene page layout (PBI-SPL-006).

## Dependencies
- Blocked by: None.
- Must merge before: PBI-SPL-006 (its sub-routes rely on the tab being current under `/active-scene`).

## Context
Read: [specs/navigation/ux.md](../../../specs/navigation/ux.md) sections 1, 2, 6 to 9; [specs/navigation/spec.md](../../../specs/navigation/spec.md); [campaign-overview ux](../../../specs/campaign-overview/ux.md) section 2 and CO-A11Y-9; the reference prototype [specs/navigation/prototype/active-scene.html](../../../specs/navigation/prototype/active-scene.html).
- `frontend/src/routes/campaigns.$campaignId.tsx` decides the current section; `campaign-header` renders the links.
- The prototype is illustrative: copy, order, and behavior come from ux.md; styling from the existing tokens.
- Reuse `useActiveScene`; do not add a second request when it is cached.

## Verification
- [ ] NAV-UX-1, NAV-UX-2, NAV-UX-3 and NAV-A11Y-1, NAV-A11Y-3, NAV-A11Y-4, NAV-A11Y-5 hold.
- [ ] Unit tests cover the current-tab mapping for every Campaign route and the Live badge states.
- [ ] Playwright E2E covers the navigation spec scenarios "The Keeper returns to the Active Scene from the Wall" and "The Active Scene tab shows Live only while a Scene is Active", with steps named after the criteria.
- [ ] Screenshots of the header at 1366px and 320px, Keeper and Player, match the prototype's tab row in order, labels, and badge.

## Refinement Protocol
A change to the tabs updates specs/navigation/ux.md section 2, the note in campaign-overview ux section 2, `campaign-header`, and its tests together.

## Follow-ups

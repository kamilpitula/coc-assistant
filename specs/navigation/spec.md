# Feature: Navigation

## Blueprint

### Context
Campaign Members move between a Campaign's areas (Overview, Active Scene, Wall, Settings) and between a page and the things it refers to (Clues, Non-Player Entity profiles, Handout content). Today some journeys dead-end: leaving the Active Scene for the Wall or for an Investigator's Clues gives no direct way back, so the Keeper detours through the Overview mid-session. This feature sets one navigation pattern for the whole app, applied first to the Active Scene, so that every journey has a predictable way forward and back.

### Architecture
- **Frontend only.** No domain, API, or persistence change. Routing stays in TanStack Router file routes under `frontend/src/routes/`; reusable navigation pieces live in `frontend/src/shared/`.
- **Three building blocks** (presentation in [ux.md](ux.md)):
  - **Campaign tabs:** one route per tab in the `campaign-header`. The Active Scene is a tab of its own.
  - **Side panel:** a lookup opened over the current page without leaving it. Its state is part of the URL (search params), so browser back closes it, refresh keeps it, and the link can be shared.
  - **Back link with an origin:** a full page opened from another page carries a `from` search param naming a known origin. The page's back link returns there, and falls back to the page's structural parent when `from` is absent or unknown.
- **The rule for choosing:** reading something during play opens a side panel; leaving to do other work (editing, managing, browsing a full list) goes to a page with a back link.
- **Dependencies:** Campaign Play for the Campaign header and roles; Scene Play for the Active Scene (whether one exists drives the Live badge, already delivered on the `activeScene` topic, [ADR 0009](../../docs/adr/0009-live-updates-through-campaign-hub-with-invalidation-topics.md)).
- **UX specification:** [ux.md](ux.md). Reference prototype: [prototype/active-scene.html](prototype/active-scene.html) (illustrative; ux.md is normative).

### Constraints
- `from` accepts only values from a closed allow-list; anything else is ignored, never followed. It never holds a URL.
- Panel and `from` params never carry content, only identifiers that the target page or panel loads and authorizes as it does today. A Player opening a panel URL for something they may not see gets the same not-found result as the full page.
- Opening or closing a panel never refetches or resets the page under it.
- Only one side panel is open at a time.

## Contract

### Definition of Done
- [ ] Every Campaign Member reaches the Active Scene from any Campaign page through the "Active Scene" tab, which shows "Live" while a Scene is Active.
- [ ] Clues, a Non-Player Entity profile, and Handout content open in a side panel from the Active Scene, and browser back closes the panel.
- [ ] "Open full page" from a panel leads to the full page with a back link to the Active Scene; the same page opened directly links back to its structural parent.
- [ ] The pattern is documented in ux.md for reuse by other features.

### Regression Guardrails
- A panel or `from` param never reveals data the viewer could not already load.
- `from` never redirects outside the app or to an arbitrary path.
- Existing deep links to full pages keep working without `from`.

### Scenarios
```gherkin
Scenario: The Keeper returns to the Active Scene from the Wall
  Given "The Corbitt House" is Active
  And the Keeper is on the Campaign Wall
  When the Keeper selects the "Active Scene" tab
  Then the Active Scene page shows "The Corbitt House"

Scenario: The Active Scene tab shows Live only while a Scene is Active
  Given no Scene is Active
  Then the "Active Scene" tab shows no "Live" badge
  When the Keeper starts "The Corbitt House"
  Then every connected Campaign Member sees "Live" on the "Active Scene" tab without reloading

Scenario: The Keeper reads Clues without leaving the Active Scene
  Given "The Corbitt House" is Active with "Lucy Ward" present
  When the Keeper opens "Lucy Ward's Clues" from "Investigators present"
  Then a side panel shows Lucy Ward's Clues over the Active Scene
  When the Keeper goes back in the browser
  Then the panel is closed and the Active Scene is unchanged

Scenario: A full page opened from the Active Scene links back to it
  Given the Keeper has Lucy Ward's Clues open in a side panel
  When the Keeper selects "Open full page"
  Then the Clues page shows "Back to The Corbitt House"
  When the Keeper selects it
  Then the Active Scene page is shown

Scenario: A full page opened directly links to its structural parent
  When the Keeper opens Lucy Ward's Clues page from a bookmark without an origin
  Then the page shows "Back to Lucy Ward"

Scenario: An unknown origin is ignored
  When the Keeper opens Lucy Ward's Clues page with an origin that is not on the allow-list
  Then the page shows "Back to Lucy Ward"
```

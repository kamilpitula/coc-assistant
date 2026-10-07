---
id: PBI-CP-012
status: done
blocked_by: [PBI-CP-005]
pr: 7
---

# PBI-CP-012: Campaign Overview and Navigation

## Directive
Turn the Campaign page into the Campaign overview and add Campaign-level navigation, so a Keeper or Player sees what needs them, who is at the table, and how ready each Investigator is, with Invite management and Rules options moved to a Keeper-only Settings page.

**Scope:**
- **Campaign header** in the `/campaigns/$campaignId` layout route: back link, Campaign name, Era, and Campaign navigation (Overview, and Settings for the Keeper). The Wall link is out of scope (PBI-CP-004).
- **Overview** as specified in [specs/campaign-overview/ux.md](../../../specs/campaign-overview/ux.md):
  - "Needs your attention" for both roles;
  - "At the table", combining Presence with the Investigator visible to the viewer;
  - the "Invite Players" dialog.
- **Settings route** `/campaigns/$campaignId/settings`, Keeper only, composing the existing `InviteManagement` and `RulesOptions` without changing their behavior.
- **Backend:** add the `investigator` projection to `GET /api/campaigns/{campaignId}/members`, projected per caller in `CocAssistant.CampaignPlay.Application` ([specs/campaign-overview/spec.md](../../../specs/campaign-overview/spec.md), Roster with Investigators).
- **Cleanup:** remove the now-unused page composition (`your-investigator-card`, `investigator-list`, and `campaign-presence` as page sections), keeping logic reused by the new components.
- **Tests:** focused unit, integration, and E2E coverage, traced to CO-UX-1 to CO-UX-12.
- **Out of scope:**
  - the Wall preview and Wall link (PBI-CP-004);
  - live delivery of Investigator changes (PBI-CP-006);
  - Players opening other Players' Character Sheets;
  - new Campaign settings.

## Dependencies
- Blocked by: PBI-CP-005: Show Campaign Presence
- Must merge before: None. PBI-CP-004 and PBI-CP-006 build on it if they merge later, and adapt to it if they merge earlier.

## Context
Read: `specs/campaign-overview/spec.md` and `specs/campaign-overview/ux.md`
- Blueprint: Navigation, Overview, Attention items, Settings, Roster with Investigators, Authorization.
- Also read: `specs/campaign-play/spec.md` (Investigator visibility, Campaign members API) and `specs/campaign-play/ux.md` (Presence states and announcements, which are unchanged).
- Regression Guardrails: the roster never exposes Investigator data beyond the caller's visibility, and the Keeper never sees a Draft name.

## Verification
- [x] The Campaign header and navigation appear on every Campaign page, with Settings for the Keeper only.
- [x] The overview shows the attention items and "At the table" rows for each role and Investigator status in the UX spec.
- [x] The members API returns the `investigator` projection for each caller and status, and a Player never receives another Player's Investigator id or a non-Approved status.
- [x] Invite management and Rules options work unchanged on Settings, and a Player cannot reach them.
- [x] "Invite Players" shows the join link, issuing an Invite first when none is active.
- [x] Unit, integration, and E2E tests cover the above, with Playwright tests traced to the scenarios in `specs/campaign-overview/spec.md`.

## Refinement Protocol
If the roster projection or Investigator visibility changes, update `specs/campaign-overview/spec.md`, the members API projection, and the overview rows together. Keep all projection server-side.

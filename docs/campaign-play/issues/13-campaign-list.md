# PBI-CP-013: Campaign List

## Directive
Give Keepers and Players a read-only list of every Campaign they are a Campaign Member of, so they can enter a Campaign without knowing its id, and move Campaign creation to its own route.

**Scope:**
- **Campaign List** at `/campaigns` as specified in [specs/campaign-list/ux.md](../../../specs/campaign-list/ux.md) (Option B, stacked list):
  - "You run" and "You play in" sections, hidden when empty, newest first;
  - Keeper and Player items with the per-role content from [specs/campaign-list/spec.md](../../../specs/campaign-list/spec.md) (Item content by role), each one link to the Campaign overview;
  - loading, error, empty, and refetch-on-focus states.
- **New campaign route** `/campaigns/new` hosting the existing `CreateCampaignForm`: heading "New campaign", Cancel back to the list, and a replace navigation to the new Campaign's overview on success instead of the in-page success message.
- **Home redirect:** a signed-in Account on `/` is replace-redirected to `/campaigns` without the home page flashing.
- **Signed-out prompt** on `/campaigns` and `/campaigns/new`, as a shared `sign-in-prompt` component.
- **Backend:** `GET /api/campaigns`, returning the caller's Campaigns projected per role and sorted server-side, with the query and projection in `CocAssistant.CampaignPlay.Application` and Keeper names read through `IAccountDisplayNames`.
- **Frontend slice:** new `frontend/src/campaign-list/` (components, services with zod parsing and `queryKeys`, hooks, types).
- **Spec alignment:** update `specs/campaign-overview/ux.md` section 1, which still describes `/campaigns` as unchanged, to point to the Campaign List spec.
- **Tests:** focused unit, integration, and E2E coverage, traced to CL-UX-1 to CL-UX-11. Move existing E2E tests that drive the create form at `/campaigns` to `/campaigns/new`.
- **Out of scope:**
  - live list updates through SignalR (recorded follow-up);
  - sign-in guards on other `/campaigns/*` routes;
  - pagination, search, filtering, and archiving;
  - Presence on items, a home link while signed in, and joining by invite code.

## Dependencies
- Blocked by: PBI-CP-012: Campaign Overview and Navigation (merged; the list opens its overview)
- Must merge before: None.

## Context
Read: `specs/campaign-list/spec.md` and `specs/campaign-list/ux.md`
- Blueprint: Routes, Sections, Item content by role, API, Projection, Freshness.
- Also read: `specs/campaign-play/spec.md` (Campaign creation, Investigator visibility) and `specs/campaign-overview/spec.md` (Regression Guardrails on Investigator visibility).
- Regression Guardrails: a Player item never carries the Player limit, the awaiting-review count, Account or Investigator ids, or any count depending on other Players' non-Approved Investigators.

## Verification
- [ ] `/campaigns` lists the caller's Campaigns in the two sections with the per-role item content, and shows no create form.
- [ ] Every item opens its Campaign overview.
- [ ] `/campaigns/new` creates a Campaign and opens its overview; Cancel and Back return to `/campaigns`.
- [ ] A signed-in Account opening `/` lands on `/campaigns`, and Back does not return to `/`.
- [ ] Signed-out visitors on `/campaigns` and `/campaigns/new` see the sign-in prompt and no list request is made.
- [ ] `GET /api/campaigns` returns only the caller's Campaigns, projected per role, in the defined order, and `[]` for an Account with none.
- [ ] Unit, integration, and E2E tests cover the above, with Playwright tests traced to the scenarios in `specs/campaign-list/spec.md`.

## Refinement Protocol
If item content or the per-role projection changes, update `specs/campaign-list/spec.md`, `specs/campaign-list/ux.md`, the API projection, and the item component together. Keep all projection server-side.

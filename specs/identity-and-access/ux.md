# UX Specification: Header Sign-In State

Selected direction: **Option B (quiet slot, skeleton only if slow)**, chosen 2026-10-03. Alternatives considered: an immediate skeleton while resolving (Option A) and rendering the last-known signed-in state before MSAL confirms it (Option C). A was rejected because on a same-tab refresh the skeleton itself flashes for a few frames. C was rejected because it shows a signed-in state MSAL has not confirmed, needs guards on Sign Out and Campaigns during MSAL startup, and can flicker in reverse when a session has expired.

Behavior and rules: [spec.md](spec.md). This document covers presentation only.

## 1. Information architecture

- The Header (`frontend/src/shared/components/header/header.tsx`) is shared by the homepage and every `/campaigns/*` route.
- Left: the "CoC Assistant" brand. It never moves or changes.
- Right: the auth slot. Only its content changes, between the states in section 2.
- Signed-in order, left to right: Campaigns link, Account name, Sign Out.

## 2. Auth slot states

| State | When | Content |
|---|---|---|
| Resolving | MSAL `inProgress` is `Startup`, for at most 400 ms | Nothing visible. The slot keeps the Header height. |
| Resolving (slow) | Still `Startup` after 400 ms, for example when returning from the sign-in redirect | Two `Skeleton` blocks: name-sized (`h-5 w-24`) and button-sized (`h-9 w-24`). |
| Signed in, name known | MSAL has an account and the Account is available, from the cache or from `GET /api/account/me` | Campaigns link, Account `displayName`, Sign Out. |
| Signed in, name loading | MSAL has an account, there is no cached Account, and `/me` is still pending | Campaigns link, name-sized `Skeleton` (`h-5 w-24`), Sign Out. |
| Signed in, name empty | The Account's `displayName` is `""` | Campaigns link and Sign Out only. No placeholder text and no email. |
| Account unavailable | MSAL has an account and `/me` failed after its retries | Unchanged: "Account unavailable" status text and Sign Out. |
| Signed out | MSAL is past `Startup` and has no account | Unchanged: Sign In and Sign Up. |

Rules:

- The Sign In and Sign Up buttons are never shown while MSAL is in `Startup`. This prevents the signed-out to signed-in flicker.
- The Campaigns link and Sign Out appear as soon as MSAL reports an account. They do not wait for the Account name.
- The 400 ms timer starts when the Header mounts in the Resolving state. If MSAL finishes first, the skeleton never appears.

## 3. Last-known Account on refresh

- After each successful `/me` response, the Account is stored in the tab's `sessionStorage`, the same storage MSAL uses.
- On the next load in that tab, the stored Account is shown straight away as the name while `/me` refreshes it in the background. The name is updated in place if it has changed.
- Sign Out removes the stored Account before redirecting.
- If the stored value cannot be read or parsed, it is ignored and the "Signed in, name loading" state is used.
- On a same-tab refresh, the slot therefore goes from Resolving (invisible) straight to "Signed in, name known", with no intermediate frame.

## 4. Accessibility (WCAG 2.2 AA)

- In both Resolving states the slot has `aria-busy="true"`. The skeleton blocks are `aria-hidden="true"`. Nothing is announced on the fast path.
- The name-loading `Skeleton` is `aria-hidden="true"`. The name is announced as normal text once it appears.
- Changes of state never move focus or steal it (2.4.3 Focus Order).
- Skeleton pulsing respects reduced motion (`motion-reduce:animate-none`).
- "Account unavailable" keeps `role="status"` (4.1.3 Status Messages).
- The slot keeps the Header height in every state, so content below the Header does not shift.

## 5. Component mapping

- `Skeleton` (`frontend/src/shared/components/ui/skeleton.tsx`), `Button` and `buttonVariants` (existing).
- `InteractionStatus.Startup` from `@azure/msal-browser` and `useMsal().inProgress` decide whether MSAL is resolving.
- No new primitives.

## 6. UX acceptance criteria

- UX-AUTH-1: While MSAL is in `Startup`, neither Sign In nor Sign Up is rendered.
- UX-AUTH-2: If `Startup` lasts longer than 400 ms, the slot shows the skeleton blocks; if it lasts less, no skeleton is ever rendered.
- UX-AUTH-3: Reloading a signed-in page in the same tab never renders Sign In or Sign Up, and shows the Account name from the stored Account before `/me` returns.
- UX-AUTH-4: When signed in with no stored Account, the Campaigns link and Sign Out are shown while the name is loading.
- UX-AUTH-5: A signed-in Account with an empty `displayName` shows the Campaigns link and Sign Out with no name text.
- UX-AUTH-6: Sign Out removes the stored Account.
- UX-AUTH-A11Y-1: The resolving slot has `aria-busy="true"`, and skeleton blocks are hidden from assistive technology.

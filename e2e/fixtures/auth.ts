import { expect, type Page, type BrowserContext, type Browser } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/**
 * Identity for a signed-in Account in the authenticated E2E harness. Each test gets a fresh
 * value so parallel workers never collide on database rows.
 */
export interface MockAccount {
  readonly oid: string
  readonly name: string
  readonly email: string
}

const MOCK_LOGIN_PATH = /\/00000000-0000-0000-0000-00000000e2e2\/v2\.0\/authorize/

/** Builds a fresh unique Account identity. Pass `label` to make failing-test diagnostics friendlier. */
export function newAccount(label = 'Account'): MockAccount {
  const id = randomUUID()
  const short = id.replace(/-/g, '').slice(0, 8)
  return {
    oid: id,
    name: `${label} ${short}`,
    email: `${short}@e2e.cocassistant.test`,
  }
}

/**
 * Drives the real MSAL `loginRedirect` through the mock OIDC issuer's HTML login page.
 *
 * The function starts on `/` (so MSAL is initialised against the SPA origin), clicks the
 * Header's "Sign In" button, fills the mock login form with the Account's claims, and waits
 * for the Header to confirm the Account is signed in (which only happens after
 * `GET /api/account/me` succeeds end-to-end).
 *
 * `tokenName` overrides the `name` claim the mock issues (for example Entra's "unknown"
 * placeholder) while the Header is still expected to show `account.name`.
 */
export async function signIn(
  page: Page,
  account: MockAccount,
  { tokenName = account.name }: { tokenName?: string } = {},
): Promise<void> {
  await page.goto('/')

  await Promise.all([
    page.waitForURL(MOCK_LOGIN_PATH),
    page.getByRole('button', { name: /sign in/i }).click(),
  ])

  await page.locator('input[name="username"]').fill(account.oid)
  await page
    .locator('textarea[name="claims"]')
    .fill(
      JSON.stringify({
        oid: account.oid,
        name: tokenName,
        email: account.email,
      }),
    )

  await Promise.all([
    page.waitForURL((url) => !url.toString().includes('localhost:8443')),
    page.locator('input[type="submit"][value="Sign-in"]').click(),
  ])

  await expect(page.getByText(account.name)).toBeVisible({ timeout: 15_000 })
}

/**
 * Opens a fresh browser context and signs the given Account in there, returning the new page.
 * Separate browser contexts give each Account an isolated MSAL cache, which the multi-Player
 * scenarios require.
 */
export async function signInNewContext(
  browser: Browser,
  account: MockAccount,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()
  await signIn(page, account)
  return { context, page }
}

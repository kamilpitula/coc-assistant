import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'

/**
 * Header sign-in state. Traces to specs/identity-and-access/spec.md, Scenarios
 * "Reloading a signed-in page keeps the Header signed in" and
 * "Entra's placeholder display name does not replace a known name", and to
 * specs/identity-and-access/ux.md UX-AUTH-1 and UX-AUTH-3.
 */

/** Records, from the very first paint of every load, whether a Sign In button was ever rendered. */
async function watchForSignInButton(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record = window as unknown as { signInButtonSeen: boolean }
    record.signInButtonSeen = false
    const check = () => {
      const buttons = Array.from(document.querySelectorAll('button'))
      if (buttons.some((button) => /sign in/i.test(button.textContent ?? ''))) {
        record.signInButtonSeen = true
      }
    }
    new MutationObserver(check).observe(document, { childList: true, subtree: true, characterData: true })
  })
}

async function signInButtonWasSeen(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { signInButtonSeen: boolean }).signInButtonSeen)
}

test('Signed-in Account reloading the page never sees Sign In and sees its name before the API answers', async ({ page }) => {
  const keeper = newAccount('Keeper')
  let releaseAccountRequest: () => void = () => {}
  const accountRequestHeld = new Promise<void>((resolve) => {
    releaseAccountRequest = resolve
  })

  await test.step('the Account signs in', async () => {
    await signIn(page, keeper)
  })

  await test.step('the Account reloads the page while GET /api/account/me is held back', async () => {
    await watchForSignInButton(page)
    await page.route('**/api/account/me', async (route) => {
      await accountRequestHeld
      await route.continue()
    })
    await page.reload()
  })

  await test.step('the Header shows the name from the last load, before the API answers', async () => {
    await expect(page.getByText(keeper.name)).toBeVisible()
    await expect(page.getByRole('link', { name: /campaigns/i })).toBeVisible()
  })

  await test.step('after the API answers, the Header is still signed in and Sign In was never shown', async () => {
    releaseAccountRequest()
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
    expect(await signInButtonWasSeen(page)).toBe(false)
  })
})

test("Entra's placeholder display name does not replace the Account's known name", async ({ browser }) => {
  const player = newAccount('Player')

  await test.step('the Account signs in with its real name', async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    await signIn(await context.newPage(), player)
    await context.close()
  })

  await test.step('the Account signs in again with a token whose name is "unknown" and still sees its real name', async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()
    await signIn(page, player, { tokenName: 'unknown' })
    await expect(page.getByText('unknown', { exact: true })).toHaveCount(0)
    await context.close()
  })
})

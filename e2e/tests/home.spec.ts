import { test, expect } from '@playwright/test'

/**
 * Home page smoke + the sign-in redirect against the authenticated harness's mock OIDC issuer.
 * No `ciamlogin` route stubbing: the mock, API, and Vite dev server are started by the
 * Playwright webServer config, so clicking "Sign In" produces a real redirect to the mock
 * authorize endpoint.
 */

const EXPECTED_AUTHORIZE_PATH =
  /\/00000000-0000-0000-0000-00000000e2e2\/v2\.0\/authorize/

test('home page shows header actions and two-column content', async ({ page }) => {
  await test.step('navigate to the home page', async () => {
    await page.goto('/')
    await expect(page.getByText('CoC Assistant')).toBeVisible()
  })

  await test.step('header shows Sign In and Sign Up actions', async () => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
  })

  await test.step('content area shows description and illustration', async () => {
    await expect(
      page.getByRole('heading', { name: /call of cthulhu campaign assistant/i }),
    ).toBeVisible()
    await expect(page.getByRole('main').locator('svg[role="presentation"]')).toBeVisible()
  })
})

test('Sign In redirects to the mock OIDC authorize endpoint', async ({ page }) => {
  await page.goto('/')

  const authorizeRequest = page.waitForRequest(EXPECTED_AUTHORIZE_PATH)
  await page.getByRole('button', { name: /sign in/i }).click()
  const request = await authorizeRequest

  expect(request.url()).toContain('client_id=00000000-0000-0000-0000-00000000e2e5')
})

test('Sign Up redirects to the mock OIDC authorize endpoint', async ({ page }) => {
  await page.goto('/')

  const authorizeRequest = page.waitForRequest(EXPECTED_AUTHORIZE_PATH)
  await page.getByRole('button', { name: /sign up/i }).click()
  const request = await authorizeRequest

  expect(request.url()).toContain('client_id=00000000-0000-0000-0000-00000000e2e5')
})

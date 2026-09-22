import { test, expect } from '@playwright/test'

/**
 * Traces to specs/campaign-play/spec.md — Scenario: "Keeper creates a persistent Campaign".
 *
 * The full authenticated create-and-persist path needs a signed-in Entra session, and this
 * repo has no real-auth E2E harness yet (see e2e/tests/home.spec.ts, which only asserts the
 * sign-in redirect). This spec therefore covers the Keeper-facing create-Campaign surface and
 * its client-side guard, the parts of the journey observable without a live token.
 */
test.describe('Keeper creates a persistent Campaign', () => {
  test('the Keeper sees the create-Campaign form', async ({ page }) => {
    await test.step('open the Campaign creation page', async () => {
      await page.goto('/campaigns')
    })

    await test.step('the create-Campaign form is presented', async () => {
      await expect(page.getByRole('heading', { name: /create a campaign/i })).toBeVisible()
      await expect(page.getByLabel(/campaign name/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /create campaign/i })).toBeEnabled()
    })
  })

  test('the Keeper must name the Campaign before creating it', async ({ page }) => {
    await page.goto('/campaigns')

    await test.step('submitting without a name is rejected', async () => {
      await page.getByRole('button', { name: /create campaign/i }).click()
      await expect(page.getByRole('alert')).toHaveText(/campaign name is required/i)
    })
  })
})

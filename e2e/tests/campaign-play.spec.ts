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

/**
 * Traces to specs/campaign-play/spec.md — DoD: "The Keeper can issue, revoke, and replace a
 * Campaign Invite."
 *
 * Issuing, revoking, and replacing an Invite all require a signed-in Keeper's token, and this
 * repo still has no real-auth E2E harness (see the note above and e2e/tests/home.spec.ts). The
 * authenticated outcomes are covered by the backend integration tests
 * (CampaignMembershipApiTests). This spec covers the Keeper-facing invite-management surface
 * that is observable without a live token.
 */
test.describe('Keeper manages the Campaign Invite', () => {
  test('the Keeper sees the invite-management surface for a Campaign', async ({ page }) => {
    await page.goto('/campaigns/00000000-0000-0000-0000-000000000001')

    await expect(page.getByRole('heading', { name: /campaign invite/i })).toBeVisible()
  })
})

/**
 * Traces to specs/campaign-play/spec.md — Scenario: "Player joins through an active Campaign
 * Invite" (the Presence line is out of scope for this ticket).
 *
 * Joining admits the signed-in Account as a Player and needs a live token, so the join outcomes
 * are covered by the backend integration tests (CampaignMembershipApiTests). This spec covers
 * the Player-facing join surface reachable from an Invite link without a live token.
 */
test.describe('Player joins through a Campaign Invite', () => {
  test('the Player sees the join surface for an Invite link', async ({ page }) => {
    await page.goto('/campaigns/join/some-invite-token')

    await expect(page.getByRole('heading', { name: /join a campaign/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /join this campaign/i })).toBeVisible()
  })
})

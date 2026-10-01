import { test, expect } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import {
  createCampaignViaUi,
  issueInviteViaUi,
  readInviteTokenFromUi,
} from '../fixtures/campaigns'

/**
 * Traces to specs/campaign-play/spec.md — Scenario: "Keeper creates a persistent Campaign"
 * and the Definition of Done entry "The Keeper can issue, revoke, and replace a Campaign Invite".
 */
test.describe('Keeper manages a Campaign Invite', () => {
  test('Scenario 1: Keeper creates a persistent Campaign (signed in)', async ({ page }) => {
    const keeper = newAccount('Keeper')

    await test.step('Keeper signs in', async () => {
      await signIn(page, keeper)
    })

    await test.step('Keeper creates a Campaign', async () => {
      const campaignId = await createCampaignViaUi(page, `Haunting ${keeper.oid.slice(0, 6)}`)
      expect(campaignId).toMatch(/^[0-9a-f-]{36}$/i)
    })
  })

  test('Scenario 2: Keeper issues an Invite and sees a shareable link', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await createCampaignViaUi(page, `Mansion ${keeper.oid.slice(0, 6)}`)

    await test.step('Keeper opens the Campaign and issues an Invite', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await page.getByRole('button', { name: /issue invite link/i }).click()
    })

    await test.step('the shareable join link appears', async () => {
      const token = await readInviteTokenFromUi(page)
      expect(token.length).toBeGreaterThan(10)
      const linkField = page.getByLabel(/share this join link with your players/i)
      await expect(linkField).toHaveValue(new RegExp(`/campaigns/join/${token}$`))
    })
  })

  test('Scenario 3: revoked Invite does not admit a new Player', async ({ page, browser }) => {
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await createCampaignViaUi(page, `Revoke ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)

    await test.step('Keeper revokes the Invite', async () => {
      await page.getByRole('button', { name: /revoke link/i }).click()
      await expect(
        page.getByText(/this campaign has no active invite/i),
      ).toBeVisible()
    })

    await test.step('a new Player following the old link is not admitted', async () => {
      const player = newAccount('Player')
      const session = await signInNewContext(browser, player)
      try {
        await session.page.goto(`/campaigns/join/${token}`)
        await session.page.getByRole('button', { name: /join this campaign/i }).click()
        await expect(
          session.page.getByText(/this invite link is no longer valid/i),
        ).toBeVisible()
      } finally {
        await session.context.close()
      }
    })
  })

  test('Scenario 4: replacing an Invite rejects the old link and admits via the new one', async ({
    page,
    browser,
  }) => {
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await createCampaignViaUi(page, `Replace ${keeper.oid.slice(0, 6)}`)
    const oldToken = await issueInviteViaUi(page, campaignId)

    await test.step('Keeper replaces the Invite link', async () => {
      await page.getByRole('button', { name: /replace link/i }).click()
      await expect(
        page.getByLabel(/share this join link with your players/i),
      ).not.toHaveValue(new RegExp(`/campaigns/join/${oldToken}$`))
    })

    const newToken = await readInviteTokenFromUi(page)
    expect(newToken).not.toBe(oldToken)

    await test.step('a Player following the old link is rejected', async () => {
      const rejectedPlayer = newAccount('Player')
      const session = await signInNewContext(browser, rejectedPlayer)
      try {
        await session.page.goto(`/campaigns/join/${oldToken}`)
        await session.page.getByRole('button', { name: /join this campaign/i }).click()
        await expect(
          session.page.getByText(/this invite link is no longer valid/i),
        ).toBeVisible()
      } finally {
        await session.context.close()
      }
    })

    await test.step('a Player following the new link is admitted', async () => {
      const admittedPlayer = newAccount('Player')
      const session = await signInNewContext(browser, admittedPlayer)
      try {
        await session.page.goto(`/campaigns/join/${newToken}`)
        await session.page.getByRole('button', { name: /join this campaign/i }).click()
        await expect(
          session.page.getByText(/you have joined the campaign as a player/i),
        ).toBeVisible()
      } finally {
        await session.context.close()
      }
    })
  })
})

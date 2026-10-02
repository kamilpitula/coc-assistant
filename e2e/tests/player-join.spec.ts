import { test, expect } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'

/**
 * Traces to specs/campaign-play/spec.md — Scenarios "Player joins through an active Campaign
 * Invite" (Presence line explicitly excluded) and "Campaign Invite limit prevents another
 * Player from joining" (default limit) and "Keeper configures the Player limit when creating a
 * Campaign" (Scenario 9), plus the `KeeperCannotJoin` outcome.
 */
test.describe('Player joins through a Campaign Invite', () => {
  test('Scenario 5: Player joins through an active Invite', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await createCampaignViaUi(page, `Join ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)

    const player = newAccount('Player')
    const session = await signInNewContext(browser, player)
    try {
      await session.page.goto(`/campaigns/join/${token}`)
      await session.page.getByRole('button', { name: /join this campaign/i }).click()
      await expect(
        session.page.getByText(/you have joined the campaign as a player/i),
      ).toBeVisible()
    } finally {
      await session.context.close()
    }
  })

  test('Scenario 6: eight Players join, the ninth is rejected as Campaign is full', async ({
    page,
    browser,
  }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await createCampaignViaUi(page, `Limit ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)

    for (let i = 1; i <= 8; i += 1) {
      await test.step(`Player ${i} joins`, async () => {
        const player = newAccount(`Player${i}`)
        const session = await signInNewContext(browser, player)
        try {
          await session.page.goto(`/campaigns/join/${token}`)
          await session.page.getByRole('button', { name: /join this campaign/i }).click()
          await expect(
            session.page.getByText(/you have joined the campaign as a player/i),
          ).toBeVisible()
        } finally {
          await session.context.close()
        }
      })
    }

    await test.step('Player 9 sees "This Campaign is full"', async () => {
      const ninth = newAccount('Player9')
      const session = await signInNewContext(browser, ninth)
      try {
        await session.page.goto(`/campaigns/join/${token}`)
        await session.page.getByRole('button', { name: /join this campaign/i }).click()
        await expect(
          session.page.getByText(
            /this campaign is full\. ask the keeper for a spot\./i,
          ),
        ).toBeVisible()
      } finally {
        await session.context.close()
      }
    })
  })

  test('Scenario 9: Keeper configures a Player limit of two, the third Player is rejected', async ({
    page,
    browser,
  }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await test.step('Keeper creates a Campaign limited to two Players', async () => {
      const id = await createCampaignViaUi(page, `Small table ${keeper.oid.slice(0, 6)}`, {
        playerLimit: 2,
      })
      await expect(page.getByRole('status')).toContainText(/up to 2 players/i)
      return id
    })
    const token = await issueInviteViaUi(page, campaignId)

    for (let i = 1; i <= 2; i += 1) {
      await test.step(`Player ${i} joins`, async () => {
        const player = newAccount(`Player${i}`)
        const session = await signInNewContext(browser, player)
        try {
          await session.page.goto(`/campaigns/join/${token}`)
          await session.page.getByRole('button', { name: /join this campaign/i }).click()
          await expect(
            session.page.getByText(/you have joined the campaign as a player/i),
          ).toBeVisible()
        } finally {
          await session.context.close()
        }
      })
    }

    await test.step('Player 3 sees "This Campaign is full"', async () => {
      const third = newAccount('Player3')
      const session = await signInNewContext(browser, third)
      try {
        await session.page.goto(`/campaigns/join/${token}`)
        await session.page.getByRole('button', { name: /join this campaign/i }).click()
        await expect(
          session.page.getByText(/this campaign is full\. ask the keeper for a spot\./i),
        ).toBeVisible()
      } finally {
        await session.context.close()
      }
    })
  })

  test('Scenario 8: Keeper following their own Invite is refused', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await createCampaignViaUi(page, `Keeper-join ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)

    await page.goto(`/campaigns/join/${token}`)
    await page.getByRole('button', { name: /join this campaign/i }).click()

    await expect(
      page.getByText(
        /you are the keeper of this campaign, so you cannot join as a player\./i,
      ),
    ).toBeVisible()
  })
})

import { test, expect, type Request } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'

/**
 * Traces to specs/campaign-play/spec.md "Campaign rules options" and its Scenarios
 * "Keeper creates a Campaign with default rules options", "Keeper changes the allowed Creation
 * Methods", and "Player cannot change the allowed Creation Methods"; and to
 * specs/character-sheet/ux.md sections 2 and 3.1 (UX-1, UX-2).
 */
test.describe('Campaign rules options', () => {
  test('UX-1: Keeper creates a Campaign with default rules options without opening them', async ({
    page,
  }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const createRequest: Promise<Request> = page.waitForRequest(
      (request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/campaigns',
    )
    const campaignId = await createCampaignViaUi(page, `Defaults ${keeper.oid.slice(0, 6)}`)

    await test.step('the create request carries the 1920s Era and all three creation methods', async () => {
      expect((await createRequest).postDataJSON()).toMatchObject({
        era: '1920s',
        allowedCreationMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
      })
    })

    await test.step('the Campaign page shows the 1920s Era and all three creation methods', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      const rulesOptions = page.getByRole('region', { name: 'Rules options' })
      await expect(rulesOptions.getByText('Era: 1920s')).toBeVisible()
      await expect(
        rulesOptions.getByText('Creation methods: Standard rolling, Point buy, Quick fire'),
      ).toBeVisible()
    })
  })

  test('UX-2: unchecking every creation method blocks Campaign creation', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    await page.goto('/campaigns')
    await page.getByLabel(/campaign name/i).fill(`Blocked ${keeper.oid.slice(0, 6)}`)

    await test.step('Keeper opens Rules options and unchecks every creation method', async () => {
      const trigger = page.getByRole('button', { name: /^rules options/i })
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.click()
      for (const name of [/^standard rolling/i, /^point buy/i, /^quick fire/i]) {
        await page.getByRole('checkbox', { name }).uncheck()
      }
    })

    await test.step('creating the Campaign is blocked with an error and the first checkbox focused', async () => {
      await page.getByRole('button', { name: /create campaign/i }).click()
      await expect(page.getByRole('alert')).toHaveText('Choose at least one creation method.')
      await expect(page.getByRole('checkbox', { name: /^standard rolling/i })).toBeFocused()
      await expect(page.getByRole('link', { name: /manage its invite/i })).toHaveCount(0)
    })
  })

  test('Keeper changes the allowed creation methods from the Campaign page', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Edit ${keeper.oid.slice(0, 6)}`)
    await page.goto(`/campaigns/${campaignId}`)
    const editButton = page.getByRole('button', { name: 'Edit creation methods' })

    await test.step('Keeper turns off Quick fire and saves', async () => {
      await editButton.click()
      const dialog = page.getByRole('dialog', { name: 'Edit creation methods' })
      await dialog.getByRole('checkbox', { name: /^quick fire/i }).uncheck()
      await dialog.getByRole('button', { name: 'Save' }).click()
      await expect(dialog).toHaveCount(0)
    })

    await test.step('the update is announced, focus returns, and the read-out changes', async () => {
      await expect(page.getByRole('status').filter({ hasText: 'Creation methods updated.' })).toBeVisible()
      await expect(editButton).toBeFocused()
      await expect(page.getByText('Creation methods: Standard rolling, Point buy')).toBeVisible()
    })

    await test.step('the change persists after a reload, and the Era is unchanged', async () => {
      await page.reload()
      await expect(page.getByText('Creation methods: Standard rolling, Point buy')).toBeVisible()
      await expect(page.getByText('Era: 1920s')).toBeVisible()
    })
  })

  test('Player cannot change the allowed creation methods', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Guard ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)

    const player = newAccount('Player')
    const session = await signInNewContext(browser, player)
    try {
      await session.page.goto(`/campaigns/join/${token}`)
      await session.page.getByRole('button', { name: /join this campaign/i }).click()
      await expect(session.page.getByText(/you have joined the campaign as a player/i)).toBeVisible()

      let capturedAuth: string | null = null

      await test.step('the Player sees no Rules options or edit control on the Campaign page', async () => {
        const campaignRequest = session.page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === `/api/campaigns/${campaignId}` &&
            response.request().method() === 'GET',
        )
        await session.page.goto(`/campaigns/${campaignId}`)
        const response = await campaignRequest
        expect(response.status()).toBe(404)
        capturedAuth = response.request().headers().authorization ?? null

        await expect(session.page.getByRole('heading', { name: 'Campaign Invite' })).toBeVisible()
        await expect(session.page.getByRole('button', { name: 'Edit creation methods' })).toHaveCount(0)
        await expect(session.page.getByRole('heading', { name: 'Rules options' })).toHaveCount(0)
      })

      await test.step("PUT allowed-creation-methods with the Player's token returns 404", async () => {
        expect(capturedAuth, 'captured Authorization header').not.toBeNull()
        const response = await session.page.request.put(
          `https://localhost:5059/api/campaigns/${campaignId}/allowed-creation-methods`,
          {
            headers: { Authorization: capturedAuth as string },
            data: { allowedCreationMethods: ['PointBuy'] },
          },
        )
        expect(response.status()).toBe(404)
      })

      await test.step('the Keeper still sees all three creation methods', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await expect(
          page.getByText('Creation methods: Standard rolling, Point buy, Quick fire'),
        ).toBeVisible()
      })
    } finally {
      await session.context.close()
    }
  })
})

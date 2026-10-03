import { test, expect } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer, submitValidInvestigatorViaUi } from '../fixtures/investigators'
import { attentionList, ownRow } from '../fixtures/overview'

/**
 * Traces to specs/campaign-play/spec.md Regression Guardrails ("Campaign data and Investigators never cross Campaign
 * boundaries", "A Player controls at most one Investigator per Campaign", "A Player cannot approve or request changes
 * to any Investigator, including their own", "A Player cannot read another Player's Investigator") and Scenarios
 * "Player starts over from a Draft", "Player cannot approve their own Investigator", "Player cannot create a second
 * Investigator", "Player cannot read another Player's Investigator", "Investigator is not reachable from another
 * Campaign", "Player cannot create an Investigator without a supported Creation Method", and "Player reads the
 * Campaign without Keeper-only data"; and to specs/character-sheet/ux.md UX-16, UX-18, UX-19, and UX-21.
 */
test.describe('Investigator guardrails', () => {
  test('UX-16: a Player starts over from a Draft only after confirming', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Start over ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    try {
      await player.page.goto(`/campaigns/${campaignId}`)
      await attentionList(player.page).getByRole('button', { name: 'Create Investigator' }).click()
      await expect(player.page.getByRole('heading', { level: 1, name: 'Identity' })).toBeVisible()

      await test.step('"Keep draft" is focused and keeps the Draft', async () => {
        await player.page.getByRole('button', { name: 'Start over' }).click()
        const dialog = player.page.getByRole('alertdialog', { name: 'Start over?' })
        await expect(dialog.getByRole('button', { name: 'Keep draft' })).toBeFocused()
        await dialog.getByRole('button', { name: 'Keep draft' }).click()
        await expect(player.page.getByRole('button', { name: 'Start over' })).toBeFocused()
      })

      await test.step('"Delete draft" deletes it and the overview offers "Create Investigator" again', async () => {
        await player.page.getByRole('button', { name: 'Start over' }).click()
        await player.page.getByRole('alertdialog').getByRole('button', { name: 'Delete draft' }).click()
        await expect(player.page.getByRole('status').filter({ hasText: 'Draft deleted.' })).toBeVisible()
        await expect(attentionList(player.page).getByRole('button', { name: 'Create Investigator' })).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player cannot approve, request changes to, or duplicate their own Investigator', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Own ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    try {
      const investigatorId = await submitValidInvestigatorViaUi(player.page, campaignId, 'Harvey Walters')
      const bearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
      const investigatorUrl = `${API_ORIGIN}/api/campaigns/${campaignId}/investigators/${investigatorId}`

      await test.step('approve and request changes with the Player token are not found', async () => {
        const approve = await player.page.request.post(`${investigatorUrl}/approve`, { headers: { Authorization: bearer } })
        const requestChanges = await player.page.request.post(`${investigatorUrl}/request-changes`, {
          headers: { Authorization: bearer },
          data: { comment: 'Looks fine' },
        })
        expect(approve.status()).toBe(404)
        expect(requestChanges.status()).toBe(404)
      })

      await test.step('a second Investigator in the same Campaign is refused', async () => {
        const second = await player.page.request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/investigators`, {
          headers: { Authorization: bearer },
        })
        expect(second.status()).toBe(409)
      })

      await test.step('the Investigator is still Submitted', async () => {
        await player.page.reload()
        await expect(ownRow(player.page)).toContainText('Submitted - waiting for your Keeper')
      })
    } finally {
      await player.context.close()
    }
  })

  test("UX-18: another Player, and the Keeper of another Campaign, cannot open a Player's Investigator", async ({
    page,
    browser,
  }) => {
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Visibility ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const owner = await joinAsNewPlayer(browser, token, 'Owner')
    const other = await joinAsNewPlayer(browser, token, 'Other')
    const keeperB = await signInNewContext(browser, newAccount('KeeperB'))
    try {
      const investigatorId = await submitValidInvestigatorViaUi(owner.page, campaignId, 'Harvey Walters')

      await test.step("another Player opening the Investigator's URL sees the not-found page", async () => {
        await other.page.goto(`/campaigns/${campaignId}/investigators/${investigatorId}`)
        await expect(other.page.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeVisible()
        await expect(other.page.getByText('Harvey Walters')).toHaveCount(0)
      })

      await test.step('the Keeper of Campaign B cannot reach it through Campaign B', async () => {
        const campaignB = await createCampaignViaUi(keeperB.page, 'Campaign B')
        const bearer = await openAndCaptureBearer(keeperB.page, `/campaigns/${campaignB}`)
        const read = await keeperB.page.request.get(`${API_ORIGIN}/api/campaigns/${campaignB}/investigators/${investigatorId}`, {
          headers: { Authorization: bearer },
        })
        expect(read.status()).toBe(404)
        await keeperB.page.goto(`/campaigns/${campaignB}/investigators/${investigatorId}`)
        await expect(keeperB.page.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeVisible()
      })
    } finally {
      await owner.context.close()
      await other.context.close()
      await keeperB.context.close()
    }
  })

  test('UX-21: someone who is not a member sees that the Campaign cannot be found', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Private ${keeper.oid.slice(0, 6)}`)
    const stranger = await signInNewContext(browser, newAccount('Stranger'))
    try {
      await stranger.page.goto(`/campaigns/${campaignId}`)
      await expect(stranger.page.getByRole('heading', { level: 1, name: "We couldn't find that Campaign" })).toBeVisible()
      await expect(stranger.page.getByRole('link', { name: 'Back to Campaigns' })).toBeVisible()
    } finally {
      await stranger.context.close()
    }
  })

  test('UX-19: a Campaign without an available creation method blocks creation in the UI and the API', async ({
    page,
    browser,
  }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    await page.goto('/campaigns')
    await page.getByLabel(/campaign name/i).fill(`Quick fire only ${keeper.oid.slice(0, 6)}`)
    await page.getByRole('button', { name: /^rules options/i }).click()
    await page.getByRole('checkbox', { name: /^standard rolling/i }).uncheck()
    await page.getByRole('checkbox', { name: /^point buy/i }).uncheck()
    await page.getByRole('button', { name: /create campaign/i }).click()
    const href = await page.getByRole('link', { name: /manage its invite/i }).getAttribute('href')
    const campaignId = href?.match(/\/campaigns\/([0-9a-f-]+)/i)?.[1] as string
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      const bearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
      await expect(
        player.page.getByText(
          "You can't create your Investigator yet. This Campaign allows Quick fire, which isn't available yet. Ask your Keeper to also allow Point buy.",
        ),
      ).toBeVisible()
      await expect(player.page.getByRole('button', { name: 'Create Investigator' })).toHaveCount(0)

      const create = await player.page.request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/investigators`, {
        headers: { Authorization: bearer },
      })
      expect(create.status()).toBe(409)
    } finally {
      await player.context.close()
    }
  })
})

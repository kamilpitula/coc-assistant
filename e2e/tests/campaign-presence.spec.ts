import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { controlHubSockets, HUB_NEGOTIATE } from '../fixtures/hub'
import { joinAsNewPlayer } from '../fixtures/investigators'
import { attentionList, atTheTable, memberRow, memberRows } from '../fixtures/overview'

/**
 * Traces to specs/campaign-play/spec.md, Presence scenarios, and specs/campaign-play/ux.md section 9:
 * - Scenario 1 "Members see who is at the table" (PR-UX-1, PR-UX-11)
 * - Scenario 2 "A member connecting is shown without reloading" (PR-UX-2)
 * - Scenario 3 "A member leaving is shown without reloading" (PR-UX-3)
 * - Scenario 4 "A member with another open tab stays connected" (PR-UX-3)
 * - Scenario 5 "A member on a Campaign sub-page counts as connected" (PR-UX-4)
 * - Scenario 6 "A Player who joins appears to connected members" (PR-UX-5)
 * - Scenario 7 "Presence changes do not reorder the roster" (PR-UX-6)
 * - Scenario 8 "Losing your own connection marks Presence as unknown" (PR-UX-7, PR-UX-8)
 * - Scenario 9 "Reconnecting gives up and offers a retry" (PR-UX-9)
 * - Scenario 10 "Keeper without Players is prompted to share the Invite" (PR-UX-10, superseded by CO-UX-5 of
 *   specs/campaign-overview/ux.md: the prompt is now the "Needs your attention" item)
 * - Scenario 11 PR-UX-12: a non-member opening the Campaign URL sees no roster
 * "Non-member cannot subscribe", "Non-member cannot read a Campaign's roster", "Unauthenticated connection is rejected",
 * "Presence stays within its Campaign", and token expiry are API-level and covered by
 * backend/tests/CocAssistant.Api.IntegrationTests (CampaignHubTests, CampaignMembersApiTests).
 */

// Automatic reconnect waits 0, 2, 10, and 30 seconds between attempts (spec, Live connection contract), so assertions
// that wait for a reconnect outcome use this local timeout instead of a global one.
const RECONNECT_TIMEOUT = 60_000

async function expectPresence(page: Page, displayName: string, presence: 'Connected' | 'Not connected' | 'Unknown') {
  await expect(memberRow(page, displayName).getByText(presence, { exact: true })).toBeVisible()
}

test.describe('Campaign Presence: who is at the table', () => {
  test('Scenario 1: members see every member in order, with "(you)", the Keeper label, and Presence', async ({
    page,
    browser,
  }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Presence ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const zoe = await joinAsNewPlayer(browser, token, 'Zoe')
    const amos = await joinAsNewPlayer(browser, token, 'Amos')

    try {
      await test.step('the Keeper and one Player have the Campaign open', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await zoe.page.goto(`/campaigns/${campaignId}`)
        await expectPresence(page, zoe.account.name, 'Connected')
      })

      await test.step('the other Player opens the Campaign and sees who is at the table', async () => {
        await amos.page.goto(`/campaigns/${campaignId}`)
        await expect(memberRows(amos.page)).toHaveText([
          new RegExp(`^${keeper.name}\\s*Keeper\\s*Connected`),
          new RegExp(`^${amos.account.name} \\(you\\)\\s*Connected`),
          new RegExp(`^${zoe.account.name}\\s*Connected`),
        ])
        await expect(atTheTable(amos.page).getByText('3 of 3 connected')).toBeVisible()
        // CO-UX-8: another Player's Investigator reads "Not ready yet" until it is Approved.
        await expect(memberRow(amos.page, zoe.account.name)).toContainText('Not ready yet')
      })
    } finally {
      await zoe.context.close()
      await amos.context.close()
    }
  })

  test('Scenario 2: the Keeper sees a Player connect without reloading, and the count goes up', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Connect ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const player = await joinAsNewPlayer(browser, token)

    try {
      await page.goto(`/campaigns/${campaignId}`)
      await expectPresence(page, player.account.name, 'Not connected')
      await expect(atTheTable(page).getByText('1 of 2 connected')).toBeVisible()

      await player.page.goto(`/campaigns/${campaignId}`)

      await expectPresence(page, player.account.name, 'Connected')
      await expect(atTheTable(page).getByText('2 of 2 connected')).toBeVisible()
    } finally {
      await player.context.close()
    }
  })

  test('Scenario 3: the Keeper sees a Player leave without reloading', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Leave ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const player = await joinAsNewPlayer(browser, token)

    try {
      await page.goto(`/campaigns/${campaignId}`)
      await player.page.goto(`/campaigns/${campaignId}`)
      await expectPresence(page, player.account.name, 'Connected')

      await player.page.close()

      await expectPresence(page, player.account.name, 'Not connected')
    } finally {
      await player.context.close()
    }
  })

  test('Scenario 4: a Player who closes one of two Campaign tabs stays connected', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Tabs ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const player = await joinAsNewPlayer(browser, token, 'Tabs')
    const other = await joinAsNewPlayer(browser, token, 'Other')

    try {
      await page.goto(`/campaigns/${campaignId}`)
      await player.page.goto(`/campaigns/${campaignId}`)
      // MSAL keeps its cache per tab, so the second tab signs the same Account in again.
      const secondTab = await player.context.newPage()
      await signIn(secondTab, player.account)
      await secondTab.goto(`/campaigns/${campaignId}`)
      await expect(atTheTable(secondTab).getByText(/of 3 connected/)).toBeVisible()
      await expectPresence(page, player.account.name, 'Connected')

      await test.step('the Player closes one tab, then another Player connects as an ordering barrier', async () => {
        await player.page.close()
        await other.page.goto(`/campaigns/${campaignId}`)
        await expectPresence(page, other.account.name, 'Connected')
      })

      await expectPresence(page, player.account.name, 'Connected')
    } finally {
      await player.context.close()
      await other.context.close()
    }
  })

  test('Scenario 5: a Player in the Investigator wizard counts as connected', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Wizard ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const player = await joinAsNewPlayer(browser, token)

    try {
      await page.goto(`/campaigns/${campaignId}`)
      await expectPresence(page, player.account.name, 'Not connected')

      await player.page.goto(`/campaigns/${campaignId}/investigator`)

      await expectPresence(page, player.account.name, 'Connected')
    } finally {
      await player.context.close()
    }
  })

  test('Scenario 6: a Player who joins appears in the Keeper roster at their sorted position', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Join ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const mike = await joinAsNewPlayer(browser, token, 'Mike')
    const rows = memberRows(page)

    const alpha = newAccount('Alpha')
    const alphaSession = await signInNewContext(browser, alpha)
    try {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(rows).toHaveText([new RegExp(`^${keeper.name} \\(you\\)`), new RegExp(`^${mike.account.name}`)])

      await alphaSession.page.goto(`/campaigns/join/${token}`)
      await alphaSession.page.getByRole('button', { name: /join this campaign/i }).click()
      await expect(alphaSession.page.getByText(/you have joined the campaign as a player/i)).toBeVisible()

      await expect(rows).toHaveText([
        new RegExp(`^${keeper.name} \\(you\\)`),
        new RegExp(`^${alpha.name}`),
        new RegExp(`^${mike.account.name}`),
      ])
    } finally {
      await mike.context.close()
      await alphaSession.context.close()
    }
  })

  test('Scenario 7: Presence changes never move a row', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Order ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const bea = await joinAsNewPlayer(browser, token, 'Bea')
    const cal = await joinAsNewPlayer(browser, token, 'Cal')
    const expectedOrder = [
      new RegExp(`^${keeper.name}`),
      new RegExp(`^${bea.account.name} \\(you\\)`),
      new RegExp(`^${cal.account.name}`),
    ]
    const rows = memberRows(bea.page)

    try {
      await bea.page.goto(`/campaigns/${campaignId}`)
      await expect(rows).toHaveText(expectedOrder)

      await cal.page.goto(`/campaigns/${campaignId}`)
      await expectPresence(bea.page, cal.account.name, 'Connected')
      await expect(rows).toHaveText(expectedOrder)

      await cal.page.close()
      await expectPresence(bea.page, cal.account.name, 'Not connected')
      await expect(rows).toHaveText(expectedOrder)
    } finally {
      await bea.context.close()
      await cal.context.close()
    }
  })

  test('Scenario 8: losing your own connection shows Unknown until it is restored', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Lost ${keeper.oid.slice(0, 6)}`)
    const hubSockets = await controlHubSockets(page)

    await page.goto(`/campaigns/${campaignId}`)
    await expectPresence(page, keeper.name, 'Connected')

    await test.step('the live connection is lost and reconnect attempts fail for now', async () => {
      await page.route(HUB_NEGOTIATE, (route) => route.abort())
      await hubSockets.dropAll()
      await expect(atTheTable(page).getByRole('status')).toHaveText(
        "Connection lost. Reconnecting... Who's at the table may be out of date.",
      )
      await expectPresence(page, keeper.name, 'Unknown')
      await expect(atTheTable(page).getByText("Checking who's connected...")).toBeVisible()
    })

    await test.step('the connection is restored', async () => {
      await page.unroute(HUB_NEGOTIATE)
      await expect(atTheTable(page).getByRole('status')).toBeHidden({ timeout: RECONNECT_TIMEOUT })
      await expectPresence(page, keeper.name, 'Connected')
    })
  })

  test('Scenario 9: when reconnecting gives up, "Try again" brings Presence back', async ({ page }) => {
    // Waits through the whole automatic reconnect schedule (about 42 seconds).
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Retry ${keeper.oid.slice(0, 6)}`)
    const hubSockets = await controlHubSockets(page)

    await page.goto(`/campaigns/${campaignId}`)
    await expectPresence(page, keeper.name, 'Connected')

    await page.route(HUB_NEGOTIATE, (route) => route.abort())
    await hubSockets.dropAll()

    const tryAgain = atTheTable(page).getByRole('button', { name: 'Try again' })
    await expect(tryAgain).toBeVisible({ timeout: RECONNECT_TIMEOUT })
    await expect(atTheTable(page).getByRole('status')).toContainText("Couldn't reconnect.")

    await page.unroute(HUB_NEGOTIATE)
    await tryAgain.click()

    await expectPresence(page, keeper.name, 'Connected')
    await expect(atTheTable(page).getByRole('heading', { name: 'At the table' })).toBeFocused()
  })

  test('Scenario 10: a Keeper without Players is prompted to invite them', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Alone ${keeper.oid.slice(0, 6)}`)

    await page.goto(`/campaigns/${campaignId}`)

    await expect(memberRows(page)).toHaveCount(1)
    await expectPresence(page, keeper.name, 'Connected')
    await expect(atTheTable(page).getByText('1 of 1 connected')).toBeVisible()
    await expect(attentionList(page).getByText('No Players have joined yet.')).toBeVisible()
    await expect(atTheTable(page).getByText(/No Players yet/)).toHaveCount(0)
  })

  test('Scenario 11: a non-member opening the Campaign URL sees no roster', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Private ${keeper.oid.slice(0, 6)}`)

    const stranger = await signInNewContext(browser, newAccount('Stranger'))
    try {
      await stranger.page.goto(`/campaigns/${campaignId}`)

      await expect(stranger.page.getByRole('heading', { name: "We couldn't find that Campaign" })).toBeVisible()
      await expect(atTheTable(stranger.page)).toHaveCount(0)
    } finally {
      await stranger.context.close()
    }
  })
})

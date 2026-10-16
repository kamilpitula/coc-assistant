import { test, expect, type Locator, type Page } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { controlHubSockets, HUB_NEGOTIATE } from '../fixtures/hub'
import { approveFromOverview, joinAsNewPlayer, submitValidInvestigatorViaUi } from '../fixtures/investigators'
import { atTheTable, attentionList, memberRow, ownRow } from '../fixtures/overview'
import { addWallEntryViaUi, openWall, wallEntry, wallPreview } from '../fixtures/wall'

/**
 * Traces to specs/campaign-play/spec.md, the live update Scenarios, and to specs/campaign-wall/ux.md (WL-UX-11 to
 * WL-UX-15, WL-A11Y-11 to WL-A11Y-13) and specs/campaign-overview/ux.md (CO-UX-15 to CO-UX-18):
 * - "Live Wall Entry is delivered to connected members" (WL-UX-11)
 * - "Keeper-only Wall Entry never reaches a Player live" (WL-UX-12)
 * - "A removed Wall Entry disappears for connected members" (WL-UX-13)
 * - "The Keeper sees a submission without reloading" (CO-UX-15)
 * - "A Player sees their Investigator approved without reloading" (CO-UX-13, CO-UX-16, CO-UX-17)
 * - "A Player sees changes requested without reloading" (CO-UX-16)
 * - "Changes made while disconnected are caught up" (WL-UX-11, PR-UX-8)
 * Exception: a Draft started or abandoned (CO-UX-18) and the 5 second announcement merge (WL-UX-14) are covered by unit
 * and integration tests only, because a 5 second timing assertion in E2E would be flaky.
 */

// Automatic reconnect waits 0, 2, 10, and 30 seconds between attempts (spec, Live connection contract).
const RECONNECT_TIMEOUT = 60_000

/** The polite live region of the Wall preview, which is the section's only live region. */
function previewAnnouncements(page: Page): Locator {
  return wallPreview(page).locator('[aria-live="polite"]')
}

/** The polite live region of "At the table"; Presence and Investigator messages share it. */
function tableAnnouncements(page: Page): Locator {
  return atTheTable(page).locator('[aria-live="polite"]')
}

test.describe('Live Campaign updates', () => {
  test('A Public Wall Entry reaches a Player on the overview and a Player on the Wall without reloading', async ({
    page,
    browser,
  }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Live Wall ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const onOverview = await joinAsNewPlayer(browser, token, 'Overview')
    const onWall = await joinAsNewPlayer(browser, token, 'Wall')
    const text = 'The lamp flickers and goes out.'

    try {
      await test.step('the Keeper has the Wall open and the Players have the overview and the Wall open', async () => {
        await openWall(page, campaignId)
        await onOverview.page.goto(`/campaigns/${campaignId}`)
        await expect(wallPreview(onOverview.page).getByText('Nothing on the Wall yet.')).toBeVisible()
        await openWall(onWall.page, campaignId)
        await expect(onWall.page.getByText('Nothing on the Wall yet.')).toBeVisible()
      })

      await test.step('WL-UX-11: the Keeper adds a Public entry', async () => {
        await addWallEntryViaUi(page, text)
      })

      await test.step('WL-UX-11, WL-UX-14: the overview preview shows it and announces it politely', async () => {
        await expect(wallPreview(onOverview.page).getByRole('listitem').filter({ hasText: text })).toBeVisible()
        await expect(previewAnnouncements(onOverview.page)).toHaveText(`New Wall Entry from ${keeper.name}.`)
      })

      await test.step('WL-UX-11, WL-UX-15: the Wall shows it at the top and announces it in its own status region', async () => {
        await expect(wallEntry(onWall.page, text)).toBeVisible()
        await expect(onWall.page.getByRole('status').filter({ hasText: `New Wall Entry from ${keeper.name}.` })).toBeVisible()
        await expect(onWall.page.getByRole('textbox', { name: 'New Wall Entry' })).toHaveValue('')
      })

      await test.step('WL-UX-14: the Keeper own post in this tab is not announced to the Keeper', async () => {
        await expect(page.getByText(/^New Wall Entry from /)).toHaveCount(0)
      })
    } finally {
      await onOverview.context.close()
      await onWall.context.close()
    }
  })

  test('A Keeper only Wall Entry never reaches a Player live, while the Public one that follows does', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Live Secret ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const secret = 'The butler is the cultist.'
    const known = 'A cold draught crosses the hall.'

    try {
      await openWall(page, campaignId)
      await openWall(player.page, campaignId)

      await test.step('WL-UX-12: the Keeper adds a Keeper only entry, then a Public one', async () => {
        await addWallEntryViaUi(page, secret, 'Keeper only')
        await addWallEntryViaUi(page, known)
      })

      await test.step('WL-UX-12: the Player sees only the Public entry, with no Keeper only text', async () => {
        await expect(wallEntry(player.page, known)).toBeVisible()
        await expect(player.page.getByText(secret)).toHaveCount(0)
        await expect(player.page.getByText('Keeper only')).toHaveCount(0)
        await expect(player.page.getByRole('listitem')).toHaveCount(1)
        await expect(player.page.getByRole('status').filter({ hasText: /^New Wall Entry from / })).toHaveCount(1)
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Wall Entry the Keeper removes disappears from the Wall and the preview of a Player without reloading', async ({
    page,
    browser,
  }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Live Remove ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const onOverview = await joinAsNewPlayer(browser, token, 'Overview')
    const onWall = await joinAsNewPlayer(browser, token, 'Wall')
    const text = 'The cellar door stands open.'

    try {
      await openWall(page, campaignId)
      await addWallEntryViaUi(page, text)
      await onOverview.page.goto(`/campaigns/${campaignId}`)
      await expect(wallPreview(onOverview.page).getByRole('listitem').filter({ hasText: text })).toBeVisible()
      await openWall(onWall.page, campaignId)
      await expect(wallEntry(onWall.page, text)).toBeVisible()

      await test.step('WL-UX-13: the Keeper removes the entry', async () => {
        await wallEntry(page, text).getByRole('button', { name: /^Remove/ }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Remove entry' }).click()
        await expect(page.getByText('Wall Entry removed.')).toBeVisible()
      })

      await test.step('WL-UX-13: the entry is gone from the Wall and the preview, without an announcement', async () => {
        await expect(onWall.page.getByText(text)).toHaveCount(0)
        await expect(onWall.page.getByText('Nothing on the Wall yet.')).toBeVisible()
        await expect(wallPreview(onOverview.page).getByText(text)).toHaveCount(0)
        await expect(wallPreview(onOverview.page).getByText('Nothing on the Wall yet.')).toBeVisible()
        await expect(previewAnnouncements(onOverview.page)).toHaveText('')
      })
    } finally {
      await onOverview.context.close()
      await onWall.context.close()
    }
  })

  test('The Keeper sees a submission on the overview without reloading', async ({ page, browser }) => {
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Live Submit ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(memberRow(page, player.account.name)).toContainText('No Investigator yet')

      await test.step('CO-UX-15: the Player submits an Investigator', async () => {
        await submitValidInvestigatorViaUi(player.page, campaignId, 'Mae Doyle')
      })

      await test.step('CO-UX-15: the Keeper row shows Submitted, the review item appears, and it is announced', async () => {
        await expect(memberRow(page, player.account.name)).toContainText('Submitted')
        await expect(attentionList(page).getByRole('link', { name: 'Review Mae Doyle' })).toBeVisible()
        await expect(tableAnnouncements(page)).toContainText(`Mae Doyle by ${player.account.name} was submitted.`)
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player sees their Investigator approved, and another Player sees it is ready for play, without reloading', async ({
    page,
    browser,
  }) => {
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Live Approve ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const owner = await joinAsNewPlayer(browser, token, 'Owner')
    const other = await joinAsNewPlayer(browser, token, 'Other')

    try {
      await submitValidInvestigatorViaUi(owner.page, campaignId, 'Mae Doyle')
      await owner.page.goto(`/campaigns/${campaignId}`)
      await other.page.goto(`/campaigns/${campaignId}`)
      await expect(memberRow(other.page, owner.account.name)).toContainText('Not ready yet')

      await test.step('the Keeper approves the Investigator from the overview', async () => {
        await approveFromOverview(page, campaignId, 'Mae Doyle')
      })

      await test.step('CO-UX-16: the owner row shows Approved and it is announced', async () => {
        await expect(ownRow(owner.page)).toContainText('Approved - ready for play')
        await expect(tableAnnouncements(owner.page)).toContainText('Your Investigator was approved.')
      })

      await test.step('CO-UX-17: another Player sees the Investigator name and hears it is ready for play', async () => {
        await expect(memberRow(other.page, owner.account.name)).toContainText('Mae Doyle')
        await expect(memberRow(other.page, owner.account.name)).toContainText('Approved')
        await expect(tableAnnouncements(other.page)).toContainText('Mae Doyle is ready for play.')
      })
    } finally {
      await owner.context.close()
      await other.context.close()
    }
  })

  test('A Player sees the Keeper asking for changes on the overview without reloading', async ({ page, browser }) => {
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Live Changes ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await submitValidInvestigatorViaUi(player.page, campaignId, 'Mae Doyle')
      await player.page.goto(`/campaigns/${campaignId}`)
      await expect(ownRow(player.page)).toContainText('Submitted - waiting for your Keeper')

      await test.step('the Keeper requests changes with a comment', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Mae Doyle' }).click()
        await page.getByRole('button', { name: 'Request changes' }).click()
        const dialog = page.getByRole('dialog', { name: 'Request changes' })
        await dialog.getByLabel('What should the Player change?').fill('Lower the Credit Rating.')
        await dialog.getByRole('button', { name: 'Send to Player' }).click()
        await expect(page.getByRole('status').filter({ hasText: 'Sent to the Player.' })).toBeVisible()
      })

      await test.step('CO-UX-16: the Player sees the Changes Requested item and hears about it', async () => {
        await expect(attentionList(player.page).getByText('Your Keeper asked for changes to Mae Doyle.')).toBeVisible()
        await expect(attentionList(player.page).getByText('Lower the Credit Rating.')).toBeVisible()
        await expect(tableAnnouncements(player.page)).toContainText('Your Keeper asked for changes.')
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player catches up on a Wall Entry added while their connection was down', async ({ page, browser }) => {
    // Waits through part of the automatic reconnect schedule.
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Live Catch-up ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const text = 'Footsteps stop outside the door.'
    const hubSockets = await controlHubSockets(player.page)

    try {
      await openWall(page, campaignId)
      await player.page.goto(`/campaigns/${campaignId}`)
      await expect(memberRow(player.page, player.account.name).getByText('Connected', { exact: true })).toBeVisible()

      await test.step('PR-UX-8: the Player connection is lost and reconnect attempts fail for now', async () => {
        await player.page.route(HUB_NEGOTIATE, (route) => route.abort())
        await hubSockets.dropAll()
        await expect(atTheTable(player.page).getByRole('status')).toContainText('Connection lost.')
      })

      await test.step('the Keeper adds a Public entry the Player cannot receive', async () => {
        await addWallEntryViaUi(page, text)
        await expect(wallPreview(player.page).getByText(text)).toHaveCount(0)
      })

      await test.step('WL-UX-11: once the connection is restored the entry appears and the catch-up is announced', async () => {
        await player.page.unroute(HUB_NEGOTIATE)
        await expect(atTheTable(player.page).getByRole('status')).toBeHidden({ timeout: RECONNECT_TIMEOUT })
        await expect(wallPreview(player.page).getByRole('listitem').filter({ hasText: text })).toBeVisible()
        await expect(tableAnnouncements(player.page)).toContainText('Reconnected.')
        await expect(previewAnnouncements(player.page)).toHaveText(`New Wall Entry from ${keeper.name}.`)
      })
    } finally {
      await player.context.close()
    }
  })
})

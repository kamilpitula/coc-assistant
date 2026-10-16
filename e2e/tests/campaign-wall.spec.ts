import { randomUUID } from 'node:crypto'

import { test, expect } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { campaignNav } from '../fixtures/overview'
import { addWallEntryViaUi, openWall, wallComposer, wallEntry, wallPreview } from '../fixtures/wall'

/**
 * Traces to specs/campaign-play/spec.md Scenario "Keeper-only Wall Entry stays hidden" and the Regression Guardrail
 * "Keeper-only Wall Entries never appear in Player-visible data", and to specs/campaign-wall/ux.md WL-UX-1 to WL-UX-10
 * and specs/campaign-overview/ux.md CO-UX-2 and CO-UX-14. The Scenario "Live Wall Entry is delivered to connected
 * members" belongs to PBI-CP-006.
 */
const SECRET = 'The butler is the cultist.'

test.describe('Campaign Wall', () => {
  test('The Keeper adds Public and Keeper-only entries and a Player sees only the Public one', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Wall ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await test.step('WL-UX-1, CO-UX-2: the Keeper opens the Wall from the Campaign navigation', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await expect(campaignNav(page).getByRole('link')).toHaveText(['Overview', 'Wall', 'Settings'])
        await campaignNav(page).getByRole('link', { name: 'Wall', exact: true }).click()
        await expect(page.getByRole('heading', { level: 1, name: 'Wall' })).toBeVisible()
        await expect(campaignNav(page).getByRole('link', { name: 'Wall', exact: true })).toHaveAttribute('aria-current', 'page')
        await expect(page.getByText('Nothing on the Wall yet.')).toBeVisible()
      })

      await test.step('WL-UX-2: the Keeper adds a Public entry and a Keeper-only entry, newest first', async () => {
        await expect(page.getByRole('radio', { name: 'Public' })).toBeChecked()
        await addWallEntryViaUi(page, 'The lamp flickers and goes out.')
        await addWallEntryViaUi(page, SECRET, 'Keeper only')
        await expect(wallComposer(page)).toHaveValue('')
        await expect(page.getByRole('radio', { name: 'Public' })).toBeChecked()
        await expect(page.getByRole('listitem')).toContainText([SECRET, 'The lamp flickers and goes out.'])
        await expect(wallEntry(page, SECRET).getByText('Keeper only', { exact: true })).toBeVisible()
        await expect(wallEntry(page, 'The lamp flickers').getByText('Keeper only', { exact: true })).toHaveCount(0)
      })

      await test.step('WL-UX-4: the Player sees the Public entry and nothing of the Keeper-only one', async () => {
        await openWall(player.page, campaignId)
        await expect(wallEntry(player.page, 'The lamp flickers and goes out.')).toBeVisible()
        await expect(player.page.getByText(SECRET)).toHaveCount(0)
        await expect(player.page.getByText('Keeper only')).toHaveCount(0)
        await expect(player.page.getByRole('listitem')).toHaveCount(1)
      })

      await test.step('CO-UX-14: the Player overview preview shows the same single entry', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(wallPreview(player.page).getByRole('listitem')).toHaveCount(1)
        await expect(wallPreview(player.page)).not.toContainText(SECRET)
        await expect(wallPreview(player.page)).not.toContainText('Keeper only')
      })

      await test.step('CO-UX-14: the Keeper preview shows both, with the badge on the Keeper-only one', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await expect(wallPreview(page).getByRole('listitem')).toHaveCount(2)
        await expect(wallPreview(page).getByText('Keeper only', { exact: true })).toHaveCount(1)
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player adds a Public entry without any visibility choice and the Keeper sees it', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Player wall ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await test.step('WL-UX-3: the Player sees no visibility choice and adds an entry', async () => {
        await openWall(player.page, campaignId)
        await expect(player.page.getByRole('radio')).toHaveCount(0)
        await expect(player.page.getByText('Everyone in this Campaign can read this.')).toBeVisible()
        await addWallEntryViaUi(player.page, 'I search the desk.')
        await expect(wallEntry(player.page, 'I search the desk.').getByText(player.account.name, { exact: true })).toBeVisible()
        await expect(player.page.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
      })

      await test.step('the Keeper reads it on the Wall with the Player as author', async () => {
        await openWall(page, campaignId)
        await expect(wallEntry(page, 'I search the desk.').getByText(player.account.name, { exact: true })).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('WL-UX-7: the Keeper removes an entry after confirming and the Player no longer sees it', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Remove ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await openWall(page, campaignId)
      await addWallEntryViaUi(page, 'Keep this one.')
      await addWallEntryViaUi(page, 'Remove this one.')

      await test.step('Cancel keeps the entry and returns focus to its Remove button', async () => {
        const remove = wallEntry(page, 'Remove this one.').getByRole('button', { name: /^Remove/ })
        await remove.click()
        const dialog = page.getByRole('alertdialog', { name: 'Remove this Wall Entry?' })
        await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(remove).toBeFocused()
        await expect(wallEntry(page, 'Remove this one.')).toBeVisible()
      })

      await test.step('"Remove entry" removes it, announces it, and moves focus to the next entry', async () => {
        await wallEntry(page, 'Remove this one.').getByRole('button', { name: /^Remove/ }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Remove entry' }).click()
        await expect(wallEntry(page, 'Remove this one.')).toHaveCount(0)
        await expect(page.getByRole('status').filter({ hasText: 'Wall Entry removed.' })).toBeVisible()
        await expect(wallEntry(page, 'Keep this one.').getByRole('button', { name: /^Remove/ })).toBeFocused()
      })

      await test.step('the Player sees only the remaining entry', async () => {
        await openWall(player.page, campaignId)
        await expect(wallEntry(player.page, 'Keep this one.')).toBeVisible()
        await expect(player.page.getByText('Remove this one.')).toHaveCount(0)
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player cannot read, infer, add, or remove Keeper-only entries through the API', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Guardrail ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await openWall(page, campaignId)
      await addWallEntryViaUi(page, 'Public one.')
      await addWallEntryViaUi(page, SECRET, 'Keeper only')
      const keeperBearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}/wall`)
      const playerBearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}/wall`)
      const url = `${API_ORIGIN}/api/campaigns/${campaignId}/wall-entries`
      const keeperEntries = (await (await page.request.get(url, { headers: { Authorization: keeperBearer } })).json()) as {
        entries: { id: string; text: string; visibility: string }[]
      }
      const secretId = keeperEntries.entries.find((entry) => entry.visibility === 'KeeperOnly')!.id

      await test.step('the Player list response holds no part of the Keeper-only entry', async () => {
        const response = await player.page.request.get(url, { headers: { Authorization: playerBearer } })
        const body = await response.text()
        expect(response.status()).toBe(200)
        expect(body).not.toContain(SECRET)
        expect(body).not.toContain(secretId)
        expect(body).not.toContain('KeeperOnly')
      })

      await test.step('the Player cannot add a Keeper-only entry or remove any entry', async () => {
        const add = await player.page.request.post(url, {
          headers: { Authorization: playerBearer },
          data: { text: 'Sneaky.', visibility: 'KeeperOnly' },
        })
        const removeSecret = await player.page.request.delete(`${url}/${secretId}`, { headers: { Authorization: playerBearer } })
        const removeMissing = await player.page.request.delete(`${url}/${randomUUID()}`, {
          headers: { Authorization: playerBearer },
        })
        expect(add.status()).toBe(400)
        expect(removeSecret.status()).toBe(404)
        expect(removeMissing.status()).toBe(404)
      })

      await test.step('the Keeper-only entry is still there for the Keeper', async () => {
        await openWall(page, campaignId)
        await expect(wallEntry(page, SECRET)).toBeVisible()
        await expect(page.getByRole('listitem')).toHaveCount(2)
      })
    } finally {
      await player.context.close()
    }
  })

  test('WL-UX-10: a stranger and another Campaign Keeper cannot reach this Wall', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Private ${keeper.oid.slice(0, 6)}`)
    await openWall(page, campaignId)
    await addWallEntryViaUi(page, SECRET, 'Keeper only')
    const stranger = await signInNewContext(browser, newAccount('Stranger'))

    try {
      await stranger.page.goto(`/campaigns/${campaignId}/wall`)
      await expect(stranger.page.getByRole('heading', { name: "We couldn't find that Campaign" })).toBeVisible()
      await expect(stranger.page.getByText(SECRET)).toHaveCount(0)

      const bearer = await openAndCaptureBearer(stranger.page, '/campaigns')
      const read = await stranger.page.request.get(`${API_ORIGIN}/api/campaigns/${campaignId}/wall-entries`, {
        headers: { Authorization: bearer },
      })
      expect(read.status()).toBe(404)
    } finally {
      await stranger.context.close()
    }
  })

  test('CO-UX-14, WL-UX-9: the overview preview shows at most the 5 latest entries and opens the Wall', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Preview ${keeper.oid.slice(0, 6)}`)
    await openWall(page, campaignId)
    for (const number of [1, 2, 3, 4, 5, 6]) {
      await addWallEntryViaUi(page, `Entry number ${number}`)
    }

    await page.goto(`/campaigns/${campaignId}`)

    await expect(wallPreview(page).getByRole('listitem')).toHaveCount(5)
    await expect(wallPreview(page).getByText('Entry number 6')).toBeVisible()
    await expect(wallPreview(page).getByText('Entry number 1')).toHaveCount(0)
    await wallPreview(page).getByRole('link', { name: 'Open the Wall' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Wall' })).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(6)
  })
})

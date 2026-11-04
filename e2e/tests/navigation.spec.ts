import { test, expect, type Page } from '@playwright/test'

import { campaignNav } from '../fixtures/overview'
import { PREPARED } from '../fixtures/prepared-scenario'
import { closeTable, finishActiveSceneViaApi, setUpTable, startSceneViaApi } from '../fixtures/scene-play'
import { openWall } from '../fixtures/wall'

/**
 * Traces to specs/navigation/spec.md Scenarios and specs/navigation/ux.md sections 2, 8, and 9 (PBI-NAV-001):
 * - "The Keeper returns to the Active Scene from the Wall" (NAV-UX-1, NAV-UX-2)
 * - "The Active Scene tab shows Live only while a Scene is Active" (NAV-UX-3, NAV-A11Y-5)
 * - narrow viewports and screenshots (NAV-A11Y-3, NAV-A11Y-4).
 * Exceptions, covered by unit tests (campaignSection, header, layout): the per-route tab mapping and the badge states.
 */

const CORBITT = PREPARED.firstSceneTitle

/** The Active Scene tab when no Scene is Active, and its badge count. */
async function expectNoLive(view: Page) {
  await expect(campaignNav(view).getByRole('link', { name: 'Active Scene', exact: true })).toBeVisible()
  await expect(campaignNav(view).getByText('Live')).toHaveCount(0)
}

test.describe('Campaign tabs with the Active Scene tab', () => {
  // Each journey signs in a Keeper and joins Players in isolated contexts before it checks anything, which takes longer than the default.
  test.describe.configure({ timeout: 240_000 })

  test('The Keeper returns to the Active Scene from the Wall', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Return')
    const { campaignId, sceneId, scenePath } = table.prepared

    try {
      await test.step('NAV-UX-1: the Keeper sees Overview, Active Scene, Wall, and Settings, in that order', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await expect(campaignNav(page).getByRole('link')).toHaveText(['Overview', 'Active Scene', 'Wall', 'Settings'])
      })

      await test.step('NAV-UX-1: a Player sees Overview, Active Scene, and Wall, and no Settings', async () => {
        await table.harvey.page.goto(`/campaigns/${campaignId}`)
        await expect(campaignNav(table.harvey.page).getByRole('link')).toHaveText(['Overview', 'Active Scene', 'Wall'])
      })

      await test.step('The Keeper starts the Scene and opens the Wall', async () => {
        await startSceneViaApi(page.request, table.keeperBearer, campaignId, sceneId, [table.harveyId])
        await openWall(page, campaignId)
      })

      await test.step('NAV-UX-2: selecting "Active Scene, live" shows "The Corbitt House" with the tab current', async () => {
        await campaignNav(page).getByRole('link', { name: 'Active Scene, live' }).click()
        await expect(page).toHaveURL(`/campaigns/${campaignId}/active-scene`)
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await expect(campaignNav(page).getByRole('link', { name: 'Active Scene, live' })).toHaveAttribute('aria-current', 'page')
      })

      await test.step('NAV-UX-2: Overview stays current on a Scene page', async () => {
        await page.goto(scenePath)
        await expect(page).toHaveURL(scenePath)
        await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
      })
    } finally {
      await closeTable(table)
    }
  })

  test('The Active Scene tab shows Live only while a Scene is Active', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Badge')
    const { campaignId, sceneId } = table.prepared
    const harveyPage = table.harvey.page
    const lucyPage = table.lucy.page

    try {
      await test.step('NAV-UX-3: with no Active Scene the tab shows no Live for the Keeper, a present Player, or an absent Player', async () => {
        await openWall(page, campaignId)
        await harveyPage.goto(`/campaigns/${campaignId}`)
        await openWall(lucyPage, campaignId)
        await expectNoLive(page)
        await expectNoLive(harveyPage)
        await expectNoLive(lucyPage)
      })

      await test.step('NAV-A11Y-5: the Keeper focuses the Wall tab before anything changes', async () => {
        await campaignNav(page).getByRole('link', { name: 'Wall', exact: true }).click()
        await expect(campaignNav(page).getByRole('link', { name: 'Wall', exact: true })).toHaveAttribute('aria-current', 'page')
      })

      const focusedBefore = await page.evaluate(() => document.activeElement?.textContent)

      await test.step('NAV-UX-3: starting shows "Active Scene, live" to everyone without reloading', async () => {
        await startSceneViaApi(page.request, table.keeperBearer, campaignId, sceneId, [table.harveyId])
        for (const view of [page, harveyPage, lucyPage]) {
          await expect(campaignNav(view).getByRole('link', { name: 'Active Scene, live' })).toBeVisible()
        }
      })

      await test.step('NAV-A11Y-5: the badge change moves no focus', async () => {
        await expect(await page.evaluate(() => document.activeElement?.textContent)).toBe(focusedBefore)
      })

      await test.step('NAV-UX-3: finishing removes Live for everyone', async () => {
        await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)
        await expectNoLive(page)
        await expectNoLive(harveyPage)
        await expectNoLive(lucyPage)
      })

      await test.step('NAV-A11Y-5: finishing moves no focus either', async () => {
        await expect(await page.evaluate(() => document.activeElement?.textContent)).toBe(focusedBefore)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('The tab row fits 1366px and 320px viewports with Live on', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Viewports')
    const { campaignId, sceneId } = table.prepared
    const harveyPage = table.harvey.page

    try {
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, sceneId, [table.harveyId])

      await test.step('NAV-UX-1, NAV-UX-3: the header at 1366px shows every tab with Live on', async () => {
        await page.setViewportSize({ width: 1366, height: 768 })
        await harveyPage.setViewportSize({ width: 1366, height: 768 })
        await openWall(page, campaignId)
        await harveyPage.goto(`/campaigns/${campaignId}`)
        await expect(campaignNav(page).getByRole('link')).toHaveText(['Overview', 'Active SceneLive', 'Wall', 'Settings'])
        await expect(campaignNav(page).getByRole('link', { name: 'Active Scene, live' })).toBeVisible()
        await expect(campaignNav(harveyPage).getByRole('link', { name: 'Active Scene, live' })).toBeVisible()
        await page.screenshot({ path: test.info().outputPath('keeper-1366.png') })
        await harveyPage.screenshot({ path: test.info().outputPath('player-1366.png') })
      })

      await test.step('NAV-A11Y-4: the Campaign header fits 320px and the site header holds the rest', async () => {
        await page.setViewportSize({ width: 320, height: 700 })
        // Load the page at the narrow viewport so the mount effect positions the current tab, as for a real narrow load.
        await page.reload()
        await openWall(page, campaignId)
        // Wait for Live so the badge-shift re-scroll has run before measuring.
        await expect(campaignNav(page).getByRole('link', { name: 'Active Scene, live' })).toBeVisible()
        const campaignHeader = page.locator('main header')
        const main = page.locator('main')
        const siteHeader = page.getByRole('banner')
        await expect(campaignHeader).toBeVisible()
        await expect(await campaignHeader.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
        await expect(await main.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
        const campaignBox = await campaignHeader.boundingBox()
        const mainBox = await main.boundingBox()
        expect(campaignBox).not.toBeNull()
        expect(mainBox).not.toBeNull()
        if (campaignBox && mainBox) {
          expect(campaignBox.x + campaignBox.width).toBeLessThanOrEqual(320 + 1)
          expect(mainBox.x + mainBox.width).toBeLessThanOrEqual(320 + 1)
        }
        await expect(await siteHeader.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
        await expect(await campaignNav(page).evaluate((nav) => nav.scrollWidth > nav.clientWidth)).toBe(true)
      })

      await test.step('NAV-A11Y-4: the current tab is within the visible tab row at 320px', async () => {
        const navBox = await campaignNav(page).boundingBox()
        const currentBox = await campaignNav(page).getByRole('link', { name: 'Wall', exact: true }).boundingBox()
        expect(navBox).not.toBeNull()
        expect(currentBox).not.toBeNull()
        if (navBox && currentBox) {
          expect(currentBox.x).toBeGreaterThanOrEqual(navBox.x - 1)
          expect(currentBox.x + currentBox.width).toBeLessThanOrEqual(navBox.x + navBox.width + 1)
        }
      })

      await test.step('NAV-A11Y-3: every tab stays at least 44px high at 320px', async () => {
        for (const tab of await campaignNav(page).getByRole('link').all()) {
          expect((await tab.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
        }
      })

      await test.step('Screenshots at 320px, Keeper and Player, with Live on', async () => {
        await page.screenshot({ path: test.info().outputPath('keeper-320.png') })
        await harveyPage.setViewportSize({ width: 320, height: 700 })
        await harveyPage.goto(`/campaigns/${campaignId}`)
        await expect(campaignNav(harveyPage).getByRole('link', { name: 'Active Scene, live' })).toBeVisible()
        await harveyPage.screenshot({ path: test.info().outputPath('player-320.png') })
      })
    } finally {
      await closeTable(table)
    }
  })
})

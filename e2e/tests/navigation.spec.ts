import { test, expect, type Page } from '@playwright/test'

import { API_ORIGIN } from '../fixtures/investigators'
import { mythosCreaturesApiUrl } from '../fixtures/non-player-entities'
import { campaignNav } from '../fixtures/overview'
import { PREPARED } from '../fixtures/prepared-scenario'
import {
  activeScenePath,
  closeTable,
  finishActiveSceneViaApi,
  HARVEY,
  LUCY,
  presentSection,
  revealedToSection,
  revealHandoutViaApi,
  setUpTable,
  startSceneViaApi,
} from '../fixtures/scene-play'
import { openWall } from '../fixtures/wall'

/**
 * Traces to specs/navigation/spec.md Scenarios and specs/navigation/ux.md sections 2, 3, 4, 8, and 9 (PBI-NAV-001, PBI-NAV-002):
 * - "The Keeper returns to the Active Scene from the Wall" (NAV-UX-1, NAV-UX-2)
 * - "The Active Scene tab shows Live only while a Scene is Active" (NAV-UX-3, NAV-A11Y-5)
 * - "The Keeper reads Clues in a side panel without leaving the Active Scene" (NAV-UX-4, NAV-UX-5, NAV-A11Y-2)
 * - "Full pages opened from the Active Scene lead back to it" (NAV-UX-7, NAV-UX-8)
 * - "A Player reads their own Clues in a side panel; a wrong-Investigator panel stays empty" (NAV-UX-4, NAV-UX-9)
 * - "Profile and Handout pages remember the Active Scene origin" (NAV-UX-7, NAV-A11Y-4)
 * - narrow viewports and screenshots (NAV-A11Y-3, NAV-A11Y-4).
 * Exceptions, covered by unit tests (campaignSection, header, layout, side-panel hooks and content): the per-route tab mapping,
 * the badge states, never-throwing schemas, open/replace/close history, panel focus return, and NAV-UX-6.
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

test.describe('Side panel and origin back links', () => {
  // Each journey signs in a Keeper and joins Players in isolated contexts before it checks anything, which takes longer than the default.
  test.describe.configure({ timeout: 240_000 })

  test('The Keeper reads Clues in a side panel without leaving the Active Scene', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'SidePanel')
    const { campaignId } = table.prepared
    const activeScene = new RegExp(`/campaigns/${campaignId}/active-scene$`)
    const lucyPanel = new RegExp(`/campaigns/${campaignId}/active-scene\\?panel=clues&investigator=${table.lucyId}$`)
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneHandoutIds[PREPARED.handouts[0].title], [
      table.harveyId,
      table.lucyId,
    ])

    try {
      await test.step("NAV-UX-4: the Keeper opens Lucy Ward's Clues from Investigators present without leaving the Active Scene", async () => {
        await page.goto(activeScenePath(campaignId))
        await presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        const panel = page.getByRole('dialog', { name: `${LUCY}'s Clues` })
        await expect(panel).toBeVisible()
        await expect(page).toHaveURL(lucyPanel)
        await expect(panel.getByRole('heading', { level: 2, name: `${LUCY}'s Clues` })).toBeVisible()
        await expect(panel.getByRole('heading', { level: 3, name: CORBITT })).toBeVisible()
        await expect(panel.getByRole('heading', { level: 4, name: PREPARED.handouts[0].title })).toBeVisible()
        await page.screenshot({ path: test.info().outputPath('keeper-clues-panel.png') })
        await page.screenshot({ path: '../docs/navigation/screenshots/nav-002-clues-panel.png' })
      })

      await test.step('NAV-A11Y-2: focus moves to the panel heading and Escape returns it to the opening button', async () => {
        const panel = page.getByRole('dialog', { name: `${LUCY}'s Clues` })
        await expect(panel.getByRole('heading', { level: 2, name: `${LUCY}'s Clues` })).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(panel).toBeHidden()
        await expect(presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` })).toBeFocused()
      })

      await test.step('browser back closes the panel with the heading and scroll unchanged', async () => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        const cluesButton = presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` })
        await cluesButton.scrollIntoViewIfNeeded()
        const scrollBefore = await page.evaluate(() => window.scrollY)
        await cluesButton.click()
        await expect(page.getByRole('dialog', { name: `${LUCY}'s Clues` })).toBeVisible()
        await page.goBack()
        await expect(page.getByRole('dialog')).toBeHidden()
        await expect(page).toHaveURL(activeScene)
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        expect(await page.evaluate(() => window.scrollY), 'the page under the panel is not remounted').toBe(scrollBefore)
      })

      await test.step('the Close button and a click outside the panel close it', async () => {
        await presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        const panel = page.getByRole('dialog', { name: `${LUCY}'s Clues` })
        await expect(panel).toBeVisible()
        await panel.getByRole('button', { name: 'Close' }).click()
        await expect(panel).toBeHidden()

        await presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        await expect(panel).toBeVisible()
        await page.mouse.click(20, 300)
        await expect(panel).toBeHidden()
      })

      await test.step('NAV-UX-5: reloading with panel params reopens the panel', async () => {
        await presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        await expect(page.getByRole('dialog', { name: `${LUCY}'s Clues` })).toBeVisible()
        await page.reload()
        await expect(page.getByRole('dialog', { name: `${LUCY}'s Clues` })).toBeVisible()
        await expect(page).toHaveURL(lucyPanel)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Full Clues pages opened from the Active Scene lead back to it', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'OriginBack')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneHandoutIds[PREPARED.handouts[0].title], [
      table.harveyId,
      table.lucyId,
    ])

    try {
      await test.step("NAV-UX-7: 'Open full page' carries the origin and leads back to the Active Scene", async () => {
        await page.goto(activeScenePath(campaignId))
        await presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        const panel = page.getByRole('dialog', { name: `${LUCY}'s Clues` })
        await expect(panel).toBeVisible()
        await panel.getByRole('link', { name: 'Open full page' }).click()
        await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/investigators/${table.lucyId}/clues\\?from=active-scene$`))
        await expect(page.getByRole('heading', { level: 1, name: `${LUCY}'s Clues` })).toBeVisible()
        await page.screenshot({ path: test.info().outputPath('keeper-clues-page-from-active-scene.png') })
        await page.screenshot({ path: '../docs/navigation/screenshots/nav-002-clues-page-from.png' })
        await page.getByRole('link', { name: `Back to ${CORBITT}` }).click()
        await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/active-scene$`))
        await expect(page.getByRole('dialog')).toBeHidden()
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
      })

      await test.step('NAV-UX-8: opening the Clues page directly links back to the Investigator', async () => {
        await page.goto(`/campaigns/${campaignId}/investigators/${table.lucyId}/clues`)
        await expect(page.getByRole('link', { name: `Back to ${LUCY}` })).toBeVisible()
      })

      await test.step('unknown origins fall back silently to the Investigator', async () => {
        await page.goto(`/campaigns/${campaignId}/investigators/${table.lucyId}/clues?from=wall`)
        await expect(page.getByRole('link', { name: `Back to ${LUCY}` })).toBeVisible()
        await page.goto(`/campaigns/${campaignId}/investigators/${table.lucyId}/clues?from=https://example.com`)
        await expect(page.getByRole('link', { name: `Back to ${LUCY}` })).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test("A Player reads their own Clues in a side panel, and another Investigator's panel stays empty", async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'PlayerPanel')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneHandoutIds[PREPARED.handouts[0].title], [table.harveyId])

    try {
      await test.step("NAV-UX-4: Harvey opens his own Clues and reaches the full page back to the Active Scene", async () => {
        await table.harvey.page.goto(activeScenePath(campaignId))
        await revealedToSection(table.harvey.page, HARVEY).getByRole('button', { name: `${HARVEY}'s Clues` }).click()
        const panel = table.harvey.page.getByRole('dialog', { name: `${HARVEY}'s Clues` })
        await expect(panel).toBeVisible()
        await expect(table.harvey.page).toHaveURL(new RegExp(`/campaigns/${campaignId}/active-scene\\?panel=clues$`))
        await expect(panel.getByRole('heading', { level: 4, name: PREPARED.handouts[0].title })).toBeVisible()
        await panel.getByRole('link', { name: 'Open full page' }).click()
        await expect(table.harvey.page).toHaveURL(new RegExp(`/campaigns/${campaignId}/investigator/clues\\?from=active-scene$`))
        await table.harvey.page.getByRole('link', { name: `Back to ${CORBITT}` }).click()
        await expect(table.harvey.page).toHaveURL(new RegExp(`/campaigns/${campaignId}/active-scene$`))
      })

      await test.step("NAV-UX-9: Harvey opening Lucy's panel finds nothing, with no full page to open", async () => {
        await table.harvey.page.goto(`${activeScenePath(campaignId)}?panel=clues&investigator=${table.lucyId}`)
        const panel = table.harvey.page.getByRole('dialog')
        await expect(panel).toContainText("We couldn't find that.")
        await expect(panel.getByRole('link', { name: 'Open full page' })).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Profile and Scene Handout pages remember the Active Scene origin', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'ProfileOrigin')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
    const created = await page.request.post(mythosCreaturesApiUrl(API_ORIGIN, campaignId), {
      headers: { Authorization: table.keeperBearer },
      data: { name: 'Panel Ghoul' },
    })
    expect(created.status(), 'create the Mythos Creature').toBe(201)
    const creatureId = ((await created.json()) as { id: string }).id
    const handoutPath = `${table.prepared.scenePath}/handouts/${table.prepared.sceneHandoutIds[PREPARED.handouts[0].title]}`

    try {
      await test.step('NAV-UX-7: a Human NPC page from the Active Scene links back to it', async () => {
        await page.goto(`${table.prepared.humanNpcPath}?from=active-scene`)
        await expect(page.getByRole('link', { name: `Back to ${CORBITT}` })).toBeVisible()
        await page.getByRole('link', { name: `Back to ${CORBITT}` }).click()
        await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/active-scene$`))
      })

      await test.step('NAV-UX-7: a Mythos Creature page from the Active Scene links back to it', async () => {
        await page.goto(`/campaigns/${campaignId}/mythos-creatures/${creatureId}?from=active-scene`)
        await expect(page.getByRole('link', { name: `Back to ${CORBITT}` })).toBeVisible()
      })

      await test.step('NAV-UX-7: a Scene Handout page from the Active Scene links back to it', async () => {
        await page.goto(`${handoutPath}?from=active-scene`)
        await expect(page.getByRole('link', { name: `Back to ${CORBITT}` })).toBeVisible()
      })

      await test.step('NAV-A11Y-4: at 320px the Clues panel fills the viewport with no sideways scroll', async () => {
        await page.setViewportSize({ width: 320, height: 700 })
        await page.goto(activeScenePath(campaignId))
        await presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        const panel = page.getByRole('dialog', { name: `${LUCY}'s Clues` })
        await expect(panel).toBeVisible()
        // Document-level 320px overflow comes from the pre-existing site header (~400px min-content: brand + Campaigns + Keeper id + Sign Out),
        // proven panel-closed via probe; deferred to the site-header follow-up (see PBI-NAV-001 follow-up "Site header overflows at 320px").
        // This assertion covers only what this PBI owns: the panel.
        const panelBox = await panel.boundingBox()
        expect(panelBox).not.toBeNull()
        if (panelBox) {
          expect(panelBox.x).toBeGreaterThanOrEqual(-1)
          expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(320 + 1)
        }
        await expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      })
    } finally {
      await closeTable(table)
    }
  })
})
